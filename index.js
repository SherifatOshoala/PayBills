require('dotenv').config()
const express = require('express')
const app = express()
const cors = require('cors')
const helmet = require('helmet')
const compression = require("compression")
const sanitizeInputs = require('./middleware/xss')
const displayRoutes = require('express-routemap')
const port = process.env.APP_PORT || 3000
const sequelize = require('./config/sequelize')
const customerRoutes = require('./routes/customer.routes')
const servicesRoutes = require('./routes/admin_services.routes')
const invalidRoutes = require('./controllers/invalid')
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');


const customer = require('./models/customer.model')
const wallet = require('./models/wallets.model')
const service = require('./models/services.model')
const otp = require('./models/otp.model')
const tempCus = require('./models/customer_temp.model')
const transaction = require('./models/transaction.model')

const cron = require('node-cron')
const {crawlAndUpdateUtilityStatus} = require('./controllers/customer.controller')

app.use(helmet())

const allowedOrigins = ['http://localhost:2010',"http://production.com" ]
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders:['Content-Type', 'Authorization'],
  };

app.use(cors(corsOptions))
app.use(express.json())
app.use(sanitizeInputs)
app.use(compression({ threshold: 1024 }))
app.use(customerRoutes)
app.use(servicesRoutes)


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
      cron.schedule('*/2 * * * *', () => {
        console.log('running a task every minute');
        crawlAndUpdateUtilityStatus()
      }); 
    })
  })()

} catch (error) {
  console.error('Unable to connect to the database:', error);
  process.exit(1)
}


const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'PayBills Documentation',
    version: '1.0.0',
    description: 'This is a utility API documentation using Swagger.',
  },
  servers: [
    {
      url: `http://localhost:${port}`,
      description: 'Development server',
    },
    {
      url: 'http://paybills.com',
      description: 'Production server',
    }
  ]
}

const options = {
  swaggerDefinition,
  apis: ['./routes/*.js']
};

const swaggerSpec = swaggerJsdoc(options);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use((err, req, res, next) => {
  if(err.sqlMessage || err.sqlState){
     return res.status(500).json({
      status: 'error',
      message: 'Something went wrong'
  })
}else{
  return res.status(err.code || 400).json({
    status: 'error',
    message: err.message
   
  })
}
})


app.use(invalidRoutes)