

const {Sequelize, DataTypes} = require("sequelize")
const sequelize = require('../config/sequelize')


const Transactions = sequelize.define("Transaction", 
    {
    sn: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true
    },
    transaction_id: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    wallet_id: {
        type: DataTypes.STRING,
        allowNull: true,
        /*
            I need to add a reference to the wallet table but I 
            decided to allow the wallet id to be null
            in case a customer wants to make a transaction without a wallet. 
            So when the wallet id is null I assume that the customer is making 
            a transaction without a wallet using other payment methods
        */
    },
    payment_reference:{
    type: DataTypes.STRING,
    allowNull: true
},
    email: {
        type: DataTypes.STRING,
        allowNull: false
        /**
         * I need to add a reference to the customer table
         * so that I can easily get the customer details
         * but I decided to allow the email because
         * there could be a transaction without a customer_id but
         * have the email of the customer instead
         */
    },
    amount: {
        type: DataTypes.DECIMAL,
        allowNull: false,
        defaultValue: 0.00
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    transaction_type: {
        type: DataTypes.ENUM,
        values: ['credit', 'debit'],
    },
    status: {
        type: DataTypes.ENUM,
        values: ['pending', 'completed', 'failed'],
        defaultValue: 'pending'
    },
    service: {
        type: DataTypes.STRING,
        allowNull: true
    },
    payment_means: {
        type: DataTypes.ENUM,
        values: ['wallet', 'others']
    }

},{
  timestamps: true,
  createdAt: "created_at",
  updatedAt: "modified_at"  
  
})


module.exports = { Transactions }
