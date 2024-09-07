

const {Sequelize, DataTypes} = require("sequelize")
const sequelize = require('../config/sequelize')


const TemporaryCustomers = sequelize.define("TemporaryCustomer", 
    {
    sn: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true
    },
    customer_id: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    surname: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    othernames: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true
    },
    is_email_verified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    hash: {
      type: DataTypes.TEXT,
      allowNull: false

    },
    salt: {
      type: DataTypes.TEXT,
      allowNull:false
    }

},{
  timestamps: true,
  createdAt: "created_at",
  updatedAt: "modified_at"  
  
})


module.exports = { TemporaryCustomers }
