require("dotenv").config()
const {createCustomerValidation, validateVerificationData, loginValidation, updateCustomerValidation } = require('../validations/customer.validation')
const {Customers}  = require('../models/customer.model')
const { TemporaryCustomers } = require('../models/customer_temp.model')
const { Otp } = require('../models/otp.model')
const {hashPassword, generateOtp} = require('../utils')
const { v4: uuidv4 } = require('uuid');
const data  = require('../messages')
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Wallets } = require('../models/wallets.model');
const { initializePayment, verifyPayment } =  require('../services/payment.service')
const {sendMail} = require('../services/email')
const {Transactions} = require('../models/transaction.model')
const ONE_HOUR = '1h'

const createCustomer = async(req, res) => {

   try{
    const { surname, othernames, email, password } = req.body
    const { error } = createCustomerValidation(req.body)
    if (error != undefined) throw new Error(error.details[0].message) 
     const checkIfEmailExist = await Customers.findOne({where:{ email: email} })
 
    if(checkIfEmailExist != null ) throw new Error(data.customerExist)
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
    res.status(400).json({
        status: "error",
        message: error.message
    })
   }
}

const verifyEmail = async(req, res) => {

    try{
        const { email, otp } = req.params
        const validate = validateVerificationData(req.params)
        console.log(validate)
        if(validate != undefined) throw new Error(data.invalidEmailOrOtp)

        const checkIfEmailAndOtpExist =  await Otp.findOne({where:{ email: email, otp: otp} })
       
        if(checkIfEmailAndOtpExist == null ) throw new Error(data.invalidOrExpiredOtp)
    
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
        if(customerTemp == null ) throw new Error(data.customerNotExist)

        await Customers.create({
            customer_id: customerTemp.customer_id,
            surname: customerTemp.surname,
            othernames: customerTemp.othernames,
            email: customerTemp.email,
            hash: customerTemp.hash,
            salt: customerTemp.salt,
            is_email_verified: true
        })

        await Wallets.create({
            wallet_id: uuidv4(),
            customer_id: customerTemp.customer_id,
            amount: 0.00
        }) 
        
     await Otp.destroy({
            where: {
                email: email
            }
        })
    await TemporaryCustomers.destroy({
            where: {
                email: email
            }
        })
       
 res.status(200).json({
            status: data.successStatus,
            message: data.emailVerified
        })

    }catch(error){
        res.status(400).json({
            status: data.errorStatus,
            message: error.message
        })
    }
    
}

const login = async(req, res) => {
    try{
    const { email, password } = req.body
  const validate = loginValidation(req.body);
    if (validate != undefined) throw new Error(data.invalidEmailOrPassword)
    const customer = await Customers.findOne({where:{ email: email} })
    if(customer == null) throw new Error(data.invalidEmailOrPassword)
    const match = await bcrypt.compare(password, customer.hash);
    if(!match) throw new Error(data.invalidEmailOrPassword)
    const token = jwt.sign({email: email, _id:uuidv4()}, process.env.JWT_SECRET, {expiresIn: ONE_HOUR });
   res.setHeader('access_token', token) 
    res.status(200).json({
        status: data.successStatus,
        message: data.loginSuccess
    })
    }catch(error){
        res.status(400).json({
            status: data.errorStatus,
            message: error.message
        })
    }   
}

const updateCustomer = async(req, res) => {  
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
        res.status(400).json({
            status: data.errorStatus,
            message: error.message
        })
    }
 }

 const getCustomer= async (req, res) => {
    const {customer_id} = req.params 
    try{
const customer = await Customers.findOne({where:{customer_id: customer_id}, attributes:{exclude: ["hash", "salt", "customer_id"]}})
if(customer == null) throw new Error (data.customerNotExist)
res.status(200).json({
    status: data.successStatus,
    message: data.customerFound,
    data: customer 
})
    }
    catch (error){
        res.status(400).json({
            status: data.errorStatus,
            message: error.message
        })
    }
 }

 const startWalletFunding = async(req, res) => { 
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
        res.status(400).json({
            status: data.errorStatus,
            message: error.message
        
        })
  }
}

const completeWalletFunding = async(req, res) => {
  const  {customer_id, reference, email} = req.params
  try{
    const checkReference = await Transactions.findOne({where:{payment_reference: reference, status: "completed"}})
    if(checkReference != null) throw new Error(data.invalidTransaction)
    const verify = await verifyPayment(reference)
    if(verify.data.data.status != "success") throw new Error(data.invalidTransaction) 

const getWallet = await Wallets.findOne({where:{customer_id: customer_id}})
const NAIRA_CONVERSION = 100
const amount = verify.data.data.amount / NAIRA_CONVERSION
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
})
const updatedAmount = Number(getWallet.amount) + amount
await Wallets.update({amount:updatedAmount}, {where:{customer_id: customer_id}})


    res.status(200).json({
       status: data.successStatus,
       message: `${data.successfulFunding} ${amount}`
    })
  }
  catch(error){
    res.status(500).json({
        status: data.errorStatus,
        message: error.message
    })
  }

}

const getWallet = async(req, res) => {
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
res.status(500).json({
    status: data.errorStatus,
    message: error.message
})
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
    getWallet
}