require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption");


const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

mongoose.connect("mongodb://127.0.0.1:27017/userDB")


const userSchema = new mongoose.Schema({
    email: String,
    password: String
});

userSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ["password"] });

const User = new mongoose.model("User", userSchema);


app.get("/", function (req, res) {
    res.render("home");
});

app.get("/login", function (req, res) {
    res.render("login");
});

app.get("/register", function (req, res) {
    res.render("register");
});

app.post("/register", async (req, res) => {
    try {
        const newUser = new User({
            email: req.body.username,
            password: req.body.password
        });
        await newUser.save();
        res.render("secrets");
    } catch (err) {
        console.log(err);
    }
});

app.post("/login", async function (req, res) {
    try {
        const username = req.body.username;
        const password = req.body.password;

        const foundUser = await User.findOne({ email: username });
        if (foundUser) {
            if (foundUser.password === password) {
                res.render("secrets");
            } else {
                res.status(401).send("Incorrect password");
            }
        } else {
            res.status(404).send("User not found");
        }
    } catch (err) {
        console.log(err);
        res.status(500).send("Server error");
    }
});






app.listen(3000, function () {
    console.log("Server started at port 3000!");
});


