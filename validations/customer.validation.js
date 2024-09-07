const Joi = require('joi');


const createCustomerValidation = (data) =>  {
    const customerSchema =  Joi.object({
        surname: Joi.string().required(),
        othernames: Joi.string().required(),
        email: Joi.string().email().required(),
        password: Joi.string().required()
    })
    return customerSchema.validate(data)
}

const validateVerificationData = (data) => {
    const validateVerificationDataSchema =  Joi.object({
      email: Joi.string().email().required(),
  otp: Joi.string().required()
    })
    const {error} = validateVerificationDataSchema.validate(data)
    return error
  
  }
  
  const loginValidation = (data) => {
    const emailAndPasswordValidationSchema = Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().required()
    })
  const {error} = emailAndPasswordValidationSchema.validate(data)
  return error
  }

const updateCustomerValidation = (data) =>  {
    const customerSchema =  Joi.object({
        surname: Joi.string(),
        othernames: Joi.string(),
        phone: Joi.string()
    }).or('surname', "othernames", "phone")
    return customerSchema.validate(data)
}

module.exports = {
    createCustomerValidation,
    validateVerificationData,
    loginValidation,
    updateCustomerValidation
}