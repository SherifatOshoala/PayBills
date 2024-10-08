const express = require('express')
const router = express.Router()
const { createCustomer, updateCustomer, verifyEmail, login, getCustomer, startWalletFunding, completeWalletFunding, getWallet, getServices, getOperators, getBills, purchaseAirtime, purchaseData, getUtilityBillers, payForUtility, getBillers, validateSubscriberBillDetails,payForBill} = require('../controllers/customer.controller')
const {authorisation} = require('../middleware/authorisation')

// All commented routes are those pertaining to reloadly

router.post('/customer', createCustomer); 

router.patch('/verify-email/:email/:otp', verifyEmail);

router.patch('/customer', authorisation, updateCustomer);

router.post('/customer/login', login);

router.get('/customer', authorisation, getCustomer)

router.post('/customer/wallet-funding/start',authorisation, startWalletFunding);

router.post('/customer/wallet-funding/complete/:reference', authorisation, completeWalletFunding)

router.get('/customer/wallet', authorisation, getWallet)

router.get('/services', authorisation, getServices)

router.get('/billers/:category', authorisation, getBillers)

router.get('/bills/:biller_code', authorisation, getBills )

router.get('/bill/validate/:item_code/:biller_code', authorisation, validateSubscriberBillDetails )

// router.post("/customer/buy-airtime", authorisation, purchaseAirtime)

// router.post('/customer/buy-data' , authorisation, purchaseData)

// router.get("/customer/billers", authorisation, getUtilityBillers)

// router.post("/customer/utility", authorisation, payForUtility)

router.post("/customer/pay-bill", authorisation, payForBill)



module.exports = router;