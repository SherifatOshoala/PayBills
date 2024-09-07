require('dotenv').config()
const express = require('express')
const app = express()
const displayRoutes = require('express-routemap')
const port = process.env.APP_PORT || 3000
const sequelize = require('./config/sequelize')
const customerRoutes = require('./routes/customer.routes')
const invalidRoutes = require('./controllers/invalid')

const customer = require('./models/customer.model')
const wallet = require('./models/wallets.model')
const service = require('./models/services.model')
const otp = require('./models/otp.model')
const tempCus = require('./models/customer_temp.model')
const transaction = require('./models/transaction.model')

app.use(express.json())
app.use(customerRoutes)
app.get('/', (req, res) => {
  res.status(200).json({
    status: "success",
    message: 'Welcome to PayBills!'
})
})

try {
  (async()=> {
    await sequelize.authenticate();
    await sequelize.sync();
    console.log('Connection has been established successfully.');
    app.listen(port, () => {
      displayRoutes(app)
      console.log(`PayBills listening on port ${port}`)
    })
  })()

} catch (error) {
  console.error('Unable to connect to the database:', error);
  process.exit(1)
}


app.use(invalidRoutes)


