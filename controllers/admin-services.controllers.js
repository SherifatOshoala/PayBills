const data  = require('../messages')
const {Services}  = require('../models/services.model')
const { v4: uuidv4 } = require('uuid');


const createService = (req, res) => {
const {service_name} = req.body
try{
    if (!service_name.trim() || service_name.trim().length < 4) throw new Error (data.invalidService)
    const checkIfServiceExists= Services.findOne({where: {service_name: service_name}})
if(checkIfServiceExists != null) throw new Error (data.serviceExists)

Services.create({
    service_id: uuidv4(),
    service_name
})
res.status(201).json({
    status: data.successStatus,
    message: data.serviceCreated
})
} catch(error){
res.status(500).json({
    status: data.errorStatus,
    message: error.message
})
}
}


module.exports = {
    createService
}