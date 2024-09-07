

const {Sequelize, DataTypes} = require("sequelize")
const sequelize = require('../config/sequelize')


const Wallets = sequelize.define("Wallet", 
    {
    sn: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true
    },
    wallet_id: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    customer_id: {
        type: DataTypes.STRING,
        allowNull: false,
        references:{
            model: 'Customers',
            key: 'customer_id'
          }
    },
    amount: {
        type: DataTypes.DECIMAL,
        allowNull: false,
        defaultValue: 0.00
    }

},{
  timestamps: true,
  createdAt: "created_at",
  updatedAt: "modified_at"  
  
})


module.exports = { Wallets }
