const express = require('express')
const router = express.Router()
const { createCustomer, updateCustomer, verifyEmail, login, getCustomer, startWalletFunding, completeWalletFunding, getWallet } = require('../controllers/customer.controller')
const {authorisation} = require('../middleware/authorisation')

router.post('/customer', createCustomer); 

router.patch('/verify-email/:email/:otp', verifyEmail);

router.patch('/customer', authorisation, updateCustomer);

router.post('/customer/login', login);

router.get('/customer', authorisation, getCustomer)

router.post('/customer/wallet-funding/start',authorisation, startWalletFunding);

router.post('/customer/wallet-funding/complete/:reference', authorisation, completeWalletFunding)

router.get('/customer/wallet', authorisation, getWallet)


module.exports = router;