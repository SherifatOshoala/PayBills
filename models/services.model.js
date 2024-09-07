

const {Sequelize, DataTypes} = require("sequelize")
const sequelize = require('../config/sequelize')


const Services = sequelize.define("Service", 
    {
    sn: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true
    },
    service_id: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    service_name: {
        type: DataTypes.STRING,
        allowNull: false,
    }

},{
  timestamps: true,
  createdAt: "created_at",
  updatedAt: "modified_at"  
  
})


module.exports = { Services }
