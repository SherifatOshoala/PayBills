
const {Sequelize, DataTypes} = require("sequelize")
const sequelize = require('../config/sequelize')


const Otp = sequelize.define("Otp", 
    {
    sn: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      references:{
        model: 'TemporaryCustomers',
        key: 'email'
      }
    },
    otp: {
      type: DataTypes.STRING,
      allowNull: false
    }
},{
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'  
})


module.exports = { Otp }
