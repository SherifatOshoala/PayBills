const bcrypt = require('bcrypt');
const saltRound = 10    
const sequelize = require('../config/sequelize')
const data = require("../messages")
const {Wallets} = require('../models/wallets.model')
const {Transactions} = require('../models/transaction.model')

const {payment_method} = require('../enum')
const { v4: uuidv4 } = require('uuid');


const generateOtp = ()=> {
    //generate 6 digit otp
    return Math.floor(100000 + Math.random() * 900000)
}

const hashPassword = async(password) => {
    return new Promise((resolve,  reject) => {
        bcrypt.genSalt(saltRound, (err, salt) => {     
            if(err) reject(err)
            bcrypt.hash(password, salt, (err, hash) => {
                if(err) reject(err)
                resolve([hash, salt])
             })
        })
    })
   
}

const comparePassword = (password, hash) => {
    return new Promise((resolve, reject) => {
        bcrypt.compare(password, hash, 
            (err, result) => {
            if(err) reject(err)
            resolve(result)
        })
    })
}

const debitWallet = async (amt, customer_id, email,service,description) => {
    try{
        const transaction_reference = uuidv4()
        await sequelize.transaction(async (t) => {
        const wallet = await Wallets.findOne({where: {customer_id},transaction: t})
        const walletBalance = Number(wallet.amount)
        const purchaseCapacity = walletBalance - Number(amt)
            if(purchaseCapacity < 0) throw new Error (data.insufficientFunds)
            const newBalance = purchaseCapacity

        await Transactions.create({
            transaction_id: uuidv4(),
            wallet_id: wallet.wallet_id,
            payment_reference: transaction_reference,
            email: email,
            amount: amt,
            description: description ,
            transaction_type: "debit",
            status: "pending",
            service: service,
            payment_means: payment_method.WALLET
        }, {transaction: t})
       await Wallets.update({amount:newBalance}, {where: {customer_id}, transaction: t})
    })
        return transaction_reference
    }
catch(error){
    return null 
}

}

const creditWallet = async (amt, customer_id, email, reference, description) => {
    try{
        await sequelize.transaction(async (t) => {
        const wallet = await Wallets.findOne({where: {customer_id}, transaction: t})
        const newBalance = Number(wallet.amount) + Number(amt)
        
        await Transactions.create({
            transaction_id: uuidv4(),
            wallet_id: wallet.wallet_id,
            payment_reference: reference,
            email: email,
            amount: amt,
            description: description,
            transaction_type: "credit",
            status: "completed",
            service: 'AIRTIME',
            payment_means: payment_method.WALLET
        }, {transaction: t})
       await Wallets.update({amount:newBalance}, {where: {customer_id}, transaction: t})
    })
        return true
    }
catch(error){
    return false 
}

}

const checkIfTransactionExists = async(reference) => {
  return await Transactions.findOne({where:{payment_reference: reference, status: "completed"}})
}

const getWalletByEmail = async(email) => {
    const getDetails = await Customers.findOne({where: {email: email}})

    return getDetails.customer_id
}

module.exports = {
    generateOtp,
    hashPassword, 
    debitWallet,
    creditWallet,
    checkIfTransactionExists,
    comparePassword,
    getWalletByEmail
}