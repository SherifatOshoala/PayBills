require("dotenv").config()
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);


const sendMail = (email, subject, text) => {

    const msg = {
      to: email,
      from: process.env.SENDGRID_EMAIL_SENDER,
      subject: subject,
      text: text,
    }

    sgMail.send(msg).then(()=>console.log('OTP Email sent')).catch(error =>console.log(error));

}

module.exports = {
    sendMail
}

