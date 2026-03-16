const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const crypto = require('crypto');
const nodeMailer = require('nodemailer')
const app = express();
const port = 8081;
const cors = require('cors');
const nodemailer = require("nodemailer");
app.use(cors());
app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json());
const jwt = require('jsonwebtoken');
const User = require("./models/user");
const Order = require("./models/orders");
const { request } = require('http');


mongoose.connect("mongodb+srv://cpgunda:YMphqQSn74b2gI9l@datas.7jod7zz.mongodb.net/?retryWrites=true&w=majority&appName=datas",{
    useNewUrlParser:true,
    useUnifiedTopology:true,
}).then(()=>{
    console.log("mongodb is connected")
})
.catch((err)=>{
    console.log("connection error", err)
});
const sendVerificationEmail = async(email, verificationToken)=>{
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: "charvig61@gmail.com",
            pass: "dpyw uwua opik vrbv"
        }
    });
    const mailoptions = {
        from: "amazon.com",
        to: email, 
        subject: "Email Verification",
        text: `Please click the following link to verify your email: http://localhost:8081/verify/${verificationToken}`,
    };
    try{
        await transporter.sendMail(mailoptions);
        console.log("verification email sent successfully");
    }
    catch(error){
        console.error("error sending verification email", error);
    }
}


app.post("/register", async(req, res)=>{
    try {
        const {name, email, password} = req.body;
        const existingUser = await User.findOne({email});
        if(existingUser) {
            console.log("email already registered: ", email);
            return res.status(400).json({message: "Email already registered"});
        }
        const newUser = new User ({name, email, password});
        await newUser.save();
        console.log("New User Registered: ", newUser);
        sendVerificationEmail(newUser.email, newUser.verificationToken);
        res.status(201).json({
            message: "registration successful, please check your email for notification"
        });
    }
    catch(error){
        console.log("error during registration: ", error);
        res.status(500).json({message: "registration failed"})
    }
});
app.get("/verify/:token", async(req, res)=>{
    try {
        const token = req.params.token;
        const user =  await User.findOne({verificationToken: token});
        if (!user){
            return res.status(404).json({message: "Invalid verification token"})
        }
        user.verified = true;
        user.verificationToken = undefined;
        await user.save();
        res.status(200).json({message: "email verified successfully"});

    } catch(error){res.status(500).json({message: "email verification failed"})};
});
const generateSecretKey = ()=>{
    const secretKey = crypto.randomBytes(32).toString("hex");
    return secretKey;
}
const secretKey = generateSecretKey();

app.post('/login', async(req, res)=>{
    try {
        const {email, password} = req.body;
        const user = await User.findOne({email});
        if(!user) {
            return res.status(401).json({message: "Invalid email or password"});
            
        }
        if (user.password!== password ){
            return res.status(401).json({message: "Invalid Password"});
        }
        const token = jwt.sign({userId: user._id}, secretKey);
        res.status(200).json({token})
        
    }
    catch(error){
        res.status(500).json({message: "Login failed"})
    }
})
app.post("/addresses", async(req, res)=>{
    try {
        const {userId, address} = req.body;
        const user = await User.findById(userId);
        if(!user) {
            return res.status(404).json({message: "User Not Found"});
            

        }
        user.addresses.push(address);
            await user.save();
            res.status(200).json({message: "Address created successfully"});

        

    }

    catch(error){
        res.status(500).json({message: "Error adding addresses"})
    }
})
app.post("/addresses/:userId", async (req, res)=>{
    try {
        const userId = req.params.userId;
        const user = await User.findById(userId);

        if(!user) {
            return res.status(404).json({message: "user not found"});
        }
        const addresses = user.addresses;
        res.status(200).json({addresses});
    }
    catch (error){
        res.status(500).json({message: "Error retreiving the addresses"})
    }

});

app.get("/profile/:userId", async(req, res)=>{
    try {
        const userId = req.params.userId;
        const user = await User.findById(userId);
        if(!user) {
            return res.status(404).json({message: "User Not Found"});
        }
        res.status(200).json({user});
    }
    catch (error){
        res.status(500).json({message: "Error retrieving the user profile"});
    }
});

app.post("/orders", async(req, res)=>{
    try {
    const{userId, cartItems, totalPrice, shippingAddress, paymentMethod} = req.body;
    const user = await User.findById(userId);
    if (!user){
        return res.status(404).json({message: "user not found"});
        
    }
    const products = cartItems.map((item)=>({
        name: item?.title,
        quantity: item.quantity,
        price: item.price,
        image: item?.image
    }));
    const order = new Order({
        user: userId, 
        products: products,
        totalPrice: totalPrice,
        shippingAddress: shippingAddress,
        paymentMethod: paymentMethod,

    });
    await order.save();
    res.status(200).json({message: "order created successfully"});

    }
    catch (error) {
        console.log("error creating orders", error);
        res.status(500).json({message: "error creating order"});
    }
});

app.get("/orders/:userId", async(req, res)=>{
    try {
        const userId = req.params.userId;
        const orders = await Order.find({user: userId}).populate("user");
        if(!orders||orders.length === 0){
            return res.status(404).json({message: "no orders found from this user"});

        }
        res.status(200).json({orders});


    }
    catch (error) {
        res.status(500).json({message: "error"});

    }
});


app.listen(port,()=>{
    console.log("server is running on port 8081")
});

