require("dotenv").config()
const {createCustomerValidation, validateVerificationData, loginValidation, updateCustomerValidation } = require('../validations/customer.validation')
const {Customers}  = require('../models/customer.model')
const { TemporaryCustomers } = require('../models/customer_temp.model')
const { Otp } = require('../models/otp.model')
const {hashPassword, generateOtp, debitWallet, creditWallet, checkIfTransactionExists, comparePassword, getWalletByEmail, createError} = require('../utils')
const { v4: uuidv4 } = require('uuid');
const data  = require('../messages')
const jwt = require('jsonwebtoken');
const { Wallets } = require('../models/wallets.model');
const { initializePayment, verifyPayment } =  require('../services/payment.service')
const {sendMail} = require('../services/email')
const {Transactions} = require('../models/transaction.model')
const sequelize = require('../config/sequelize')
const {Services}  = require('../models/services.model')
const {operators, buyAirtimeOrData, utilityBillers, payUtilityBill,checkUtiltityTransactionStatus} = require("../services/reloadly")
const {payment_method} = require('../enum')
const ONE_HOUR = '1h'

const { billsCategories, billersInformation, billsInformation, validateBillDetails, makeBillPayment, billStatus} = require('../services/flutterwave.service')

const createCustomer = async(req, res, next) => {

   try{
    const { surname, othernames, email, password } = req.body
    const { error } = createCustomerValidation(req.body)
    if (error != undefined) throw new Error (error.details[0].message)
    const checkIfEmailExist = await Customers.findOne({where:{ email: email} })
    if(checkIfEmailExist != null) throw createError(409, data.customerExists)
    const [hash, salt] = await hashPassword(password)
    await TemporaryCustomers.create({
        customer_id: uuidv4(),
        surname: surname,
        othernames: othernames,
        email: email,
        hash: hash,
        salt: salt
    })
    const otp = generateOtp()
    await Otp.create({
        email: email,
        otp: otp
    })
sendMail(email, 'Your OTP', `Hi ${surname},\nPlease use this ${otp} to verify your mail`)
    
     res.status(200).json({
            status: data.successStatus,
            message: data.otpSent
     })
   }catch(error){
  next(error)
   }
}

const verifyEmail = async(req, res, next) => {

    try{
        const { email, otp } = req.params
        const validate = validateVerificationData(req.params)
        if(validate != undefined) throw new Error(data.invalidEmailOrOtp)

        const checkIfEmailAndOtpExist =  await Otp.findOne({where:{ email: email, otp: otp} })
       
        if(checkIfEmailAndOtpExist == null) throw new Error(data.invalidOrExpiredOtp)
    
    const convertMillisecondsToMinutes = 1000 * 60;
    const otpCreatedTime = new Date(
      checkIfEmailAndOtpExist.dataValues.created_at
    ).getTime();
    const timeNow = new Date().getTime();
    const timeDifferenceInMillisecs = timeNow - otpCreatedTime;
    const timeInMinutes = Math.floor(
      timeDifferenceInMillisecs / convertMillisecondsToMinutes
    );
    if (timeInMinutes > 10) throw new Error(messages.invalidOrExpiredOtp)
        const customerTemp = await TemporaryCustomers.findOne({where:{ email: email} })
        if(customerTemp == null ) throw createError(404, data.customerNotExist)

 await sequelize.transaction (async (t) => {
    await Customers.create({
        customer_id: customerTemp.customer_id,
        surname: customerTemp.surname,
        othernames: customerTemp.othernames,
        email: customerTemp.email,
        hash: customerTemp.hash,
        salt: customerTemp.salt,
        is_email_verified: true
    }, {transaction: t})

    await Wallets.create({
        wallet_id: uuidv4(),
        customer_id: customerTemp.customer_id,
        amount: 0.00
    }, {transaction: t}) 
    
 await Otp.destroy({
        where: {
            email: email
        }, transaction: t
    })
await TemporaryCustomers.destroy({
        where: {
            email: email
        },transaction: t
    })

})
 res.status(200).json({
            status: data.successStatus,
            message: data.emailVerified
        })

    }catch(error){
   next(error)
}
}

const login = async(req, res, next) => {
    try{
    const { email, password } = req.body
  const validate = loginValidation(req.body);
    if (validate != undefined) throw new Error(data.invalidEmailOrPassword)
    const customer = await Customers.findOne({where:{ email: email} })
    if(customer == null) throw new Error(data.invalidEmailOrPassword)
    const match = await comparePassword(password, customer.hash);
    if(!match) throw new Error(data.invalidEmailOrPassword)
    const token = jwt.sign({email: email, _id:uuidv4()}, process.env.JWT_SECRET, {expiresIn: ONE_HOUR });
   res.setHeader('access_token', token) 
    res.status(200).json({
        status: data.successStatus,
        message: data.loginSuccess
    })
    }catch(error){
      next(error)
    }   
}

const updateCustomer = async(req, res, next) => {  
    try{
    const {customer_id} = req.params
    const { error } = updateCustomerValidation(req.body)
    if (error != undefined) throw new Error(error.details[0].message || "Something went wrong!")
    await Customers.update(req.body, {
            where: {
            customer_id: customer_id,
            },
        });
    
    res.status(200).json({
        status: data.successStatus,
        message: data.customerUpdated
    })

    }catch(error){
       next(error)
    }
 }

 const getCustomer= async (req, res, next) => {
    const {customer_id} = req.params 
    try{
const customer = await Customers.findOne({where:{customer_id: customer_id}, attributes:{exclude: ["hash", "salt", "customer_id"]}})
if(customer == null) throw createError(404, data.customerNotExist)
res.status(200).json({
    status: data.successStatus,
    message: data.customerFound,
    data: customer 
})
    }
    catch (error){
      next(error)
    }
 }

 const startWalletFunding = async(req, res, next) => { 
    try{
       const  {email} = req.params
        const { amount} = req.body
        if(amount < 1000) throw new Error('Amount must be greater than 1000')
        const response = await initializePayment(email, amount)
        res.status(200).json({
            status: data.successStatus,
            message:data.paymentInitialized,
            data: {
                payment_url : response.data.data.authorization_url,
                access_code: response.data.data.reference
            }
        })


    } catch(error){
      next(error)
  }
}

const completeWalletFunding = async(req, res, next) => {
  const  {customer_id, reference, email} = req.params
  try{
    const checkReference = await checkIfTransactionExists(reference)
    if(checkReference != null) throw new Error(data.invalidTransaction)
    const verify = await verifyPayment(reference)
    if(verify.data.data.status != "success") throw new Error(data.invalidTransaction) 
const NAIRA_CONVERSION = 100
const amount = verify.data.data.amount / NAIRA_CONVERSION

await sequelize.transaction (async (t) => {
const getWallet = await Wallets.findOne({where:{customer_id: customer_id},transaction: t})

await Transactions.create({
    transaction_id: uuidv4(),
    wallet_id: getWallet.wallet_id,
    payment_reference: reference,
    email: email,
    amount: amount,
    description: "Wallet Funding",
    transaction_type: "credit",
    status: "completed",
    service: "wallet",
    payment_means: "others"
}, {transaction: t})

const updatedAmount = Number(getWallet.amount) + amount
await Wallets.update({amount:updatedAmount}, {where:{customer_id: customer_id},transaction: t})

})
    res.status(200).json({
       status: data.successStatus,
       message: `${data.successfulFunding} ${amount}`
    })
  }
  catch(error){
 next(error)
  }
}

const getWallet = async(req, res, next) => {
const {customer_id, email} = req.params
    try{
const wallet = await Wallets.findOne({where:{customer_id: customer_id}, attributes:{exclude: ["sn", "customer_id", "created_at","modified_at" ]}})

const transactions = await Transactions.findAll({where: {email: email},attributes:{exclude: ["sn", "wallet_id","modified_at" ]},order: [["created_at", "DESC"]], limit: 20})

        res.status(200).json({
            status: data.successStatus,
            message: data.walletFetched,
            data: {
            wallet,
            transactions
        } 
        })
    } catch(error){
next(error)
    }
}


//All commented codes are initial ones written in line with reloadly's documentation. They're commented because reloadly does not have a robust system to capture all services this PayBills app aimed to render. 

// This commented getServices is getting my locally populated services.
// const getServices = async(req, res) => {
//     try{
//         const services = await Services.findAll({attributes:{exclude: ["sn", "created_at", "modified_at"]}, order: [["service_name", "ASC"]]})
//         res.status(200).json({
//             status: data.successStatus,
//             messages: data.allServices,
//             data: services
//         })
//     }
// catch(error){
//     res.status(500).json({
//         status: data.errorStatus,
//         message: error.message 
//     }) 
// }
// }


const getServices = async(req, res) => {
    try{
        const services = await billsCategories()
        res.status(200).json({
            status: data.successStatus,
            messages: data.allServices,
            data: services.data.data
        })
    }
catch(error){
    res.status(500).json({
        status: data.errorStatus,
        message: error.response.data.message ||  "Sorry, we cannot process your request at this moment!"
    }) 
}
}


// const getOperators = async(req, res) => {
// try{
// const AllOperators = await operators()
// const operatorType = req.query.data || null
// let filteredOperators = null
// if(operatorType == "true"){
// filteredOperators = AllOperators.filter( op => op.data == true || op.bundle == true)
// }else{
//     filteredOperators = AllOperators.filter( op => op.data == false && op.bundle == false && !op.name.includes("Bundle"))
// }

// res.status(200).json({
//     status: data.successStatus,
//     message: data.airtimeOperatorsFetched,
//     data: filteredOperators
// })
// }catch(error){
//     res.status(500).json({
//         status: data.errorStatus,
//         message: error.message ||  "Sorry, we cannot process your request at the moment!"
//     })
// }
// }


const getBillers= async(req, res) => {
    try{
        const {category_code} = req.params
    const allBillers = await billersInformation(category_code)
    res.status(200).json({
        status: data.successStatus,
        message: `${category} ${data.operatorsFetched}`,
        data: allBillers.data.data
    })
    }catch(error){
        res.status(500).json({
            status: data.errorStatus,
            message: error.response.data.message ||  "Sorry, we cannot process your request at this moment!"
        })
    }
    }

const getBills = async(req, res) => {
try{
    const {biller_code} = req.params
    const allBills = await billsInformation(biller_code)
    res.status(200).json({
        status: data.successStatus,
        message: `${biller_code} ${data.billsFetched}`,
        data: allBills.data.data
    })

}catch(error){
    res.status(500).json({
        status: data.errorStatus,
        message: error.response.data.message || "Sorry, we cannot process your request at this moment!"
    })
}
}

const validateSubscriberBillDetails = async(req, res) => {
    try{
const {item_code, biller_code} = req.params
const {subscriber_no} = req.body
const validate = await validateBillDetails(item_code, biller_code, subscriber_no)
res.status(200).json({
    status: data.successStatus,
    message: data.validationSuccessful,
    data: validate.data.data
})
    }catch(error){
        res.status(500).json({
            status: data.errorStatus,
            message: error.response.data.message ||  "Sorry, we cannot process your request at this moment!"
        })
    }
}

// const purchaseAirtime = async (req, res) => {
// const {customer_id, email} = req.params
// const {recipientPhone, operatorID, amount, payment_means} = req.body
// try{
//     const service = "AIRTIME"
//     switch (payment_means) {
//         case payment_method.WALLET: 
//         const transaction_reference = await debitWallet(amount,customer_id,email,service, "Wallet Debit for Airtime Purchase")
//         if(transaction_reference == null) throw new Error(data.insufficientFunds)
//             const proceedToBuyAirtime = processAirtimeOrData(operatorID, amount, email, recipientPhone)
//         if(proceedToBuyAirtime == false){
//             await creditWallet(amount,customer_id,email,transaction_reference,'Refund for failed airtime purchase')
//             throw new Error (data.airtimePurchaseFailed)
//         }else{
//         await Transactions.update({ status: 'completed'}, {where: { payment_reference: transaction_reference}})
//         }
//         break;

//         case payment_method.OTHERS: 
//         const {reference} = req.body
//         const checkReference = await checkIfTransactionExists(reference)
//         if (checkReference != null) throw new Error(data.invalidTransaction)
//             const verify = await verifyPayment(reference)
//         if(!verify || verify.data.data.status != "success") throw new Error(data.invalidTransaction) 
//         const NAIRA_CONVERSION = 100
//         const amountToBePurchased = verify.data.data.amount / NAIRA_CONVERSION
//         const proceedToAirtime = processAirtime(operatorID, amount, email, recipientPhone)
//         if(proceedToAirtime == false){
//             throw new Error (data.airtimePurchaseFailed)
//         }else{
//       await Transactions.create({
//                 transaction_id: uuidv4(),
//                 wallet_id: null,
//                 amount: amountToBePurchased,
//                 description: 'Airtime purchase',
//                 email: email,
//                 transaction_type: 'debit',
//                 status: 'completed',
//                 service: 'AIRTIME',
//                 payment_means: payment_means.OTHERS,
//                 payment_reference: reference
//             })
//         }
//         break;
//     default: 
//     throw new Error (data.invalidPaymentMeans)
//     }

//     res.status(201).json({
//  status: data.successStatus,
//  message: data.airtimePurchased
//     })
// }catch(error){
//     res.status(500).json({
//         status: data.errorStatus,
//         message: error.message || "Something went wrong!"
//     })
// }

// }

// const purchaseData = async (req, res) => {
//     const {customer_id, email} = req.params
//     const {recipientPhone, operatorID, amount, payment_means} = req.body
//     try{
//         const service = "DATA SUBSCRIPTION"
//         switch (payment_means) {
//             case payment_method.WALLET: 
//             const transaction_reference = await debitWallet(amount,customer_id,email,service, "Wallet Debit for Data Subscription")
//             if(transaction_reference == null) throw new Error(data.insufficientFunds)
//                 const proceedToBuyData = processAirtimeOrData(operatorID, amount, email, recipientPhone)
//             if(proceedToBuyData == false){
//                 await creditWallet(amount,customer_id,email,transaction_reference,'Refund for failed Data Subscription')
//                 throw new Error (data.dataSubscriptionFailed)
//             }else{
//             await Transactions.update({ status: 'completed'}, {where: { payment_reference: transaction_reference}})
//             }
//             break;
    
//             case payment_method.OTHERS: 
//             const {reference} = req.body
//             const checkReference = await checkIfTransactionExists(reference)
//             if (checkReference != null) throw new Error(data.invalidTransaction)
//                 const verify = await verifyPayment(reference)
//             if(!verify || verify.data.data.status != "success") throw new Error(data.invalidTransaction) 
//             const NAIRA_CONVERSION = 100
//             const amountToBePurchased = verify.data.data.amount / NAIRA_CONVERSION
//             const proceedToData = processAirtimeOrData(operatorID, amount, email, recipientPhone)
//             if(proceedToData == false){
//                 throw new Error (data.dataSubscriptionFailed)
//             }else{
//           await Transactions.create({
//                     transaction_id: uuidv4(),
//                     wallet_id: null,
//                     amount: amountToBePurchased,
//                     description: 'data subscription',
//                     email: email,
//                     transaction_type: 'debit',
//                     status: 'completed',
//                     service: 'DATA SUBSCRIPTION',
//                     payment_means: payment_means.OTHERS,
//                     payment_reference: reference
//                 })
//             }
//             break;

//         default: 
//         throw new Error (data.invalidPaymentMeans)
//         }
    
//         res.status(201).json({
//      status: data.successStatus,
//      message: data.dataSubscriptionSuccess
//         })
//     }catch(error){
//         res.status(500).json({
//             status: data.errorStatus,
//             message: error.message || "Something went wrong!"
//         })
//     }
// }

// const getUtilityBillers = async(req, res) => {
//     try{
//         const biller_type = req.query.biller_type || ''
//         const billers = await utilityBillers(biller_type)
// res.status(200).json({
//     status: data.successStatus,
//     message: data.billersFetched,
//     data: billers.content
// })
//     }
// catch(error){
//     res.status(500).json({
//         status: data.errorStatus,
//         message: error.message || "Something went wrong while fetching billers"
//     })
// }
// }

// const payForUtility = async(req, res) => {
// try{
//     const { customer_id, email } = req.params 
//     const { subscriberAccountNumber, amount, billerId , description, payment_means } = req.body
//     const service = 'UTILITY'
//     switch (payment_means) {
//         case payment_method.WALLET: 
//         const transaction_reference = await debitWallet(amount,customer_id,email,service, "Wallet Debit for Utility")
//         if(transaction_reference == null) throw new Error(data.insufficientFunds)
//             const proceedToPurchaseUtility = await processUtilityPayment(subscriberAccountNumber, amount, billerId, description, payment_means, transaction_reference, email )
//         if(!proceedToPurchaseUtility) throw new Error (data.utilityPurchaseFailed)
//             break;

//         case payment_method.OTHERS: 
//         const {reference} = req.body
//         const checkReference = await checkIfTransactionExists(reference)
//         if (checkReference != null) throw new Error(data.invalidTransaction)
//             const verify = await verifyPayment(reference)
//         if(!verify || verify.data.data.status != "success") throw new Error(data.invalidTransaction) 
//         const NAIRA_CONVERSION = 100
//         const amountToBePurchased = verify.data.data.amount / NAIRA_CONVERSION
//         const proceedToUtility = await processUtilityPayment(subscriberAccountNumber, amountToBePurchased, billerId, description, payment_means,reference, email )
//         if(!proceedToUtility) throw new Error (data.utilityPurchaseFailed)
//             break;

//         default: 
//         throw new Error (data.invalidPaymentMeans)
//         }

//     res.status(200).json({
//         status: data.successStatus,
//         message: data.billPaymentProcessing
//     })
// }catch(error){
//     res.status(500).json({
//         status: data.errorStatus,
//         message: error.message
//         })
    
// }
// }


const payForBill = async(req, res, next) => {
    try{
        const { customer_id, email } = req.params 
        const { biller_code, biller_name, bill_category, item_code, subscriberNumber, amount, description, payment_means } = req.body
        switch (payment_means) {
            case payment_method.WALLET: 
            const transaction_reference = await debitWallet(amount,customer_id,email,bill_category, `Wallet Debit for ${biller_name}`)
            if(transaction_reference == null) throw createError(402,data.insufficientFunds)
            const proceedToPayment = await processBillPayment(biller_code, item_code, subscriberNumber, amount, transaction_reference)
        if(proceedToPayment == false){
            await creditWallet(amount,customer_id,email,transaction_reference,`Refund for failed ${bill_category} payment`)
            await Transactions.update({ status: 'failed'},{where:{payment_reference: transaction_reference}})
            throw createError(402, data.billPaymentFailed)
        }else if(proceedToPayment == null) throw createError(402, data.billPaymentFailed)
        else await Transactions.update({ status: 'completed'}, {where:{ payment_reference: transaction_reference}})
            break;
    
            case payment_method.OTHERS: 
            const {reference} = req.body
            const checkReference = await checkIfTransactionExists(reference)
            if (checkReference != null) throw new Error(data.invalidTransaction)
                const verify = await verifyPayment(reference)
            if(!verify || verify.data.data.status != "success") throw new Error(data.invalidTransaction) 
            const NAIRA_CONVERSION = 100
            const amountToBePurchased = verify.data.data.amount / NAIRA_CONVERSION
            const proceedToMakePayment = await processBillPayment(biller_code, item_code, subscriberNumber, amountToBePurchased,reference)
            if(!proceedToMakePayment) throw createError(402,data.billPaymentFailed)
            else{
                          await Transactions.create({
                                    transaction_id: uuidv4(),
                                    wallet_id: null,
                                    amount: amountToBePurchased,
                                    description: `${bill_category} purchase`,
                                    email: email,
                                    transaction_type: 'debit',
                                    status: 'completed',
                                    service: bill_category,
                                    payment_means: payment_means.OTHERS,
                                    payment_reference: reference
                                })
                            }
                break;
    
            default: 
            throw new Error (data.invalidPaymentMeans)
            }
    
        res.status(200).json({
            status: data.successStatus,
            message: data.billPaymentSuccessful
        })
    }catch(error){
        next(error) 
    }
    }
    


   async function processBillPayment(biller_code, item_code, subscriberNumber, amount, transaction_reference){
    const makePayment = await makeBillPayment(biller_code, item_code, subscriberNumber, amount, transaction_reference)
    if(!makePayment || makePayment.data.status != "success") {
      return false
    }else{
    const verifyBillPayment = await billStatus(transaction_reference)
    if(verifyBillPayment.data.status != 'success') return null
    if(verifyBillPayment.data.data.status == 'successful') return true
    }
}

// async function processAirtimeOrData(operatorID, amount, email, recipientPhone){
//     const airtimeOrData = await buyAirtimeOrData(operatorID, amount, email, recipientPhone)
//     const response = Object.keys(airtimeOrData).includes("status")
//     if(!response){
//       return false
//     }else{
//        return true
//     }
// }
// async function processUtilityPayment(amountId=null, subscriberAccountNumber, amount, billerId , description, payment_means, transaction_reference, email){
//     const proceedToBuyUtility= await payUtilityBill(amountId, subscriberAccountNumber, amount, billerId, description)
//     if(payment_means == payment_method.WALLET){
//         await Transactions.update({ transaction_id: proceedToBuyUtility.data.referenceId}, {where: { payment_reference: transaction_reference}})
//   }else{
//       await Transactions.create({
//           transaction_id: response.data.referenceId,
//           wallet_id: null,
//           amount: amount,
//           description: 'Utiltity purchase',
//           email: email,
//           transaction_type: 'debit',
//           status: 'pending',
//           service: 'UTILITY',
//           payment_means: payment_method.OTHERS,
//           payment_reference: transaction_reference
//       })
//   }
//   return true

// }
// const crawlAndUpdateUtilityStatus = async() => {
//     try {

//         const response = await Transactions.findAll({ where: { status: 'pending', service: 'UTILITY' }  })
//         if(!response.length) {
//             console.log("nothing to do")
//             return 
//         }
//         response.forEach( async item => {
//            const transactionStatus =  await checkUtiltityTransactionStatus(item.transaction_id)
//            if(transactionStatus.data[0].transaction.status  == "SUCCESSFUL"){
//              const billerType = transactionStatus[0].transaction.billDetails.type 
//              const billerName = transactionStatus[0].transaction.billerName 
//              const subscriberNumber = transactionStatus[0].transaction.billDetails.subscriberDetails.accountNumber 
//              const pinDetails = transactionStatus[0].transaction.pinDetails

//              const message = `Your transaction was successful. Find details below:
//                               Biller: ${billerType} - Billername:  ${billerName}. 
//                               Your account is ${subscriberNumber}.
//                               Token: ${pinDetails.token} - Value: ${pinDetails.info1}
//                               `
                           
//             sendMail(item.email, message, "Suceessful Bills Transaction") 
//             await Transactions.update({ status: 'completed'}, {where: { transaction_id: item.transaction_id}})

//            }else if(transactionStatus.data[0].transaction.status  == "FAILED" 
//                     && item.payment_means == paymentMeans.WALLET){
//                         const customerId = await getWalletByEmail(email)
//                         await creditWallet(item.amount, customerId, item.email, "Wallet refund for failed utility purchase")
//                         console.log("refund successful")
//            }else{
//             console.log("here")
//            }
//         }) 
//     } catch (error) {    
// console.log("An error occurred")
//     }
// }

const crawlAndUpdateUtilityStatus = async() => {
    try {

        const response = await Transactions.findAll({ where: { status: 'pending' }  })
        if(!response.length) {
            console.log("nothing to do")
            return 
        }
        response.forEach( async item => {
           const transactionStatus =  await billStatus(item.payment_reference)

            if(transactionStatus.data.status == "success"){
                await Transactions.update({ status: 'completed'}, {where: {transaction_id: item.transaction_id}})

                const billerCategory = transactionStatus.data.data.product
                const subscriberNumber = transactionStatus.data.data.customer_id
                const amount = transactionStatus.data.data.amount 
                const transaction_date = transactionStatus.data.data.transaction_date 
                const reference = transactionStatus.data.data.tx_ref
   
                const message = `Your transaction was successful. Find the details below:
                                 Billername - ${billerCategory} . 
                                 Your account is ${subscriberNumber} .
                                 Amount: ${amount} . 
                                 Transaction Date: ${transaction_date} .
                                 Reference: ${reference} .`
                                 
                              
                sendMail(item.email, message, "Suceessful Bill Transaction!") 
                console.log("details sent to customer successfully")
   
    
           }else if(transactionStatus.data.status  == "error" 
                    && item.payment_means == paymentMeans.WALLET){
                        const customerId = await getWalletByEmail(email)
                        await creditWallet(item.amount, customerId, item.email, "Wallet refund for failed utility purchase")
                        console.log("refund successful")
                        await Transactions.update({ status: 'failed'},{where:{transaction_id:item.transaction_id}})
           }else{
            console.log("here")
           }
        }) 
    } catch(error) {    
console.log("An error occurred")
    }
}


module.exports = {
    createCustomer,
    updateCustomer,
    verifyEmail,
    login,
    getCustomer,
    startWalletFunding,
    completeWalletFunding,
    getWallet,
    getServices,
    getBillers,
    getBills,
    validateSubscriberBillDetails,
    payForBill,
    // purchaseAirtime,
    // purchaseData,
    // getUtilityBillers,
    // payForUtility,
    crawlAndUpdateUtilityStatus
}