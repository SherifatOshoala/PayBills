
This is a utility service api named PayBills (in progress)

PayBills enables users purchase airtime, data, cable TV subscriptions, and gift cards. 

Clone the repository:
   ```bash 
git clone https://github.com/SherifatOshoala/PayBills

Use npm init to initialize the node(PayBills) application

Make it a git repository by using the command "git init"

Install neccessary packages like Express, Axios, Joi etc;

Recommend: use the command "npm install" to pull all the required dependencies

Create an entry point called "index.js"

create gitignore so as not to push the node_module and env file

spin up the server using node.js framework (express) - Node.js

Technologies - 
- Sequelize ORM (MySQL)
- JWT for Authentication
- Paystack API for Payments
- SendGrid API for Emails

API endpoints:

│ POST PATCH GET          │ /customer                                        │
├─────────────────────────┼──────────────────────────────────────────────────┤
│ PATCH                   │ /verify-email/:email/:otp                        │
├─────────────────────────┼──────────────────────────────────────────────────┤
│ POST                    │ /customer/login                                  │
├─────────────────────────┼──────────────────────────────────────────────────┤
│ POST                    │ /customer/wallet-funding/start                   │
├─────────────────────────┼──────────────────────────────────────────────────┤
│ POST                    │ /customer/wallet-funding/complete/:reference     │
├─────────────────────────┼──────────────────────────────────────────────────┤
│ GET                     │ /customer/wallet                                 │
├─────────────────────────┼──────────────────────────────────────────────────┤
│ GET                     │ / 


// How to use API endpoint

 app.get("/", (req, res) => {
    res.json({ message: "welcome to my server"})
 })

Feel free to submit issues or pull requests. 