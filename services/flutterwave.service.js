const axios = require('axios')
const BASEURL = 'https://api.flutterwave.com/v3'
const SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY
 


const billsCategories = () => {
    return axios({
        method: 'GET',
        url: `${BASEURL}/top-bill-categories?country=NG`,
        headers:{
            'Authorization':  `Bearer ${SECRET_KEY}`
        }

    })
}


const billersInformation = (category_code) => {
    return axios({
        method: 'GET',
        url: `${BASEURL}/bills/${category_code}/billers?country=NG`,
        headers:{
            'Authorization':  `Bearer ${SECRET_KEY}`
        }

    })
}

const billsInformation = (biller_code) => {
    return axios({
        method: 'GET',
        url: `${BASEURL}/billers/${biller_code}/items`,
        headers:{
            'Authorization':  `Bearer ${SECRET_KEY}`
        }

    })
}


const validateBillDetails = (item_code, biller_code, customer_unique_no) => {
    return axios({
           method: 'GET',
           url: `${BASEURL}/bill-items/${item_code}/validate?code=${biller_code}&customer=${customer_unique_no}`,
           headers:{
               'Authorization':  `Bearer ${SECRET_KEY}`
           }
       })
   }

const makeBillPayment = async (biller_code, item_code, subscriberNumber, amount, reference) => {
    try{
        const response = await axios({
            method: 'POST',
            url: `${BASEURL}/billers/${biller_code}/items/${item_code}/payment`,
            headers:{
                'Authorization':  `Bearer ${SECRET_KEY}`
            },
            data: {
                "country": "NG",
                "customer_id": subscriberNumber,
                "reference": reference,
                "amount": Number(amount),
                // "callback_url": ""
            }
        })
        return response
    }catch(error){
        return null
    }
}

const billStatus = (reference) => {
    return axios({
        method: 'GET',
        url: `${BASEURL}/bills/${reference}`,
        headers:{
            'Authorization':  `Bearer ${SECRET_KEY}`
        }
    })
}




module.exports = {
    billsCategories,
    billersInformation,
    billsInformation,
    validateBillDetails,
    makeBillPayment,
    billStatus
}

