require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate")




const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
    secret: "my little secret",
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://127.0.0.1:27017/userDB")


const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);
passport.use(User.createStrategy());


passport.serializeUser(function(user, done) {
    done(null, user.id);
});

passport.deserializeUser(async function(id, done) {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});


passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
    // userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"

},
    function (accessToken, refreshToken, profile, cb) {
        User.findOrCreate({ googleId: profile.id }, function (err, user) {
            return cb(err, user);
        });
    }
));


app.get("/", function (req, res) {
    res.render("home");
});

app.get("/auth/google", function (req, res) {
    passport.authenticate("google", { scope: ["profile"] })
});

app.get("/auth/google/secrets",
    passport.authenticate("google", { failureRedirect: "/login" }),
    function (req, res) {
        // Successfully authentication, redirect to secrets.
        res.redirect("/secrets");
    }
);

app.get("/login", function (req, res) {
    res.render("login");
});

app.get('/logout', function (req, res,) {
    req.logout(function (err) {
        if (err) {
            console.log(err);
        } else {
            res.redirect('/');
        }
    });
});


app.get("/register", function (req, res) {
    res.render("register");
});


app.get('/secrets', async function (req, res) {
    try {
      const foundUsers = await User.find({ secret: { $ne: null } });
      if (foundUsers) {
        res.render('secrets', { usersWithSecrets: foundUsers });
      }
    } catch (err) {
      console.error(err);
    }
  });



app.get("/submit", function (req, res) {
    if (req.isAuthenticated()) {
        res.render("submit");
    } else {
        res.redirect("/login");
    }
});

app.post("/submit", async function(req, res) {
    const submittedSecret = req.body.secret;

    try {
        const foundUser = await User.findById(req.user.id);
        if (foundUser) {
            foundUser.secret = submittedSecret;
            await foundUser.save();
            res.redirect("/secrets");
        }
    } catch (err) {
        console.log(err);
    }
});



app.post("/register", function (req, res) {
    User.register({ username: req.body.username }, req.body.password, function (err, user) {
        if (err) {
            console.log(err);
            res.redirect()
        } else {
            passport.authenticate("local")(req, res, function () {
                res.redirect("/secrets");
            });
        };
    });
});

app.post("/login", function (req, res) {
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });
    req.login(user, function (err) {
        if (err) {
            console.log(err);
        } else {
            passport.authenticate("local")(req, res, function () {
                res.redirect("/secrets");
            })
        }
    });
});








app.listen(3000, function () {
    console.log("Server started at port 3000!");
});


