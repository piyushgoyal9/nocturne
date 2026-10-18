const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { OAuth2Client } = require("google-auth-library");

const User = require("../models/User");

const router = express.Router();

/* =========================
GOOGLE AUTH CLIENT
========================= */

const googleClient = new OAuth2Client(
process.env.GOOGLE_CLIENT_ID
);

/* =========================
CREATE JWT TOKEN
========================= */

function createToken(user) {


return jwt.sign(
    {
        userId: user._id,
        username: user.username,
        isAdmin: user.isAdmin
    },
    process.env.JWT_SECRET,
    {
        expiresIn: "7d"
    }
);


}

/* =========================
SIGNUP
========================= */

router.post("/signup", async (req, res) => {

try {

    const {
        username,
        email,
        password
    } = req.body;


    if (!username || !email || !password) {

        return res.status(400).json({
            message: "All fields are required"
        });

    }


    const existingUser = await User.findOne({
        $or: [
            { email },
            { username }
        ]
    });


    if (existingUser) {

        return res.status(400).json({
            message: "Username or email already exists"
        });

    }


    const hashedPassword = await bcrypt.hash(
        password,
        10
    );


    const user = await User.create({

        username,
        email,
        password: hashedPassword

    });


    res.status(201).json({

        message: "User created successfully",

        user: {

            id: user._id,
            username: user.username,
            email: user.email,
            isAdmin: user.isAdmin

        }

    });

} catch (error) {

    console.error(error);

    res.status(500).json({
        message: "Server error"
    });

}


});

/* =========================
NORMAL LOGIN
========================= */

router.post("/login", async (req, res) => {

try {

    const {
        email,
        password
    } = req.body;


    if (!email || !password) {

        return res.status(400).json({
            message: "Email and password are required"
        });

    }


    const user = await User.findOne({
        email: email.toLowerCase()
    });


    if (!user) {

        return res.status(401).json({
            message: "Invalid email or password"
        });

    }


    const passwordMatch = await bcrypt.compare(
        password,
        user.password
    );


    if (!passwordMatch) {

        return res.status(401).json({
            message: "Invalid email or password"
        });

    }


    const token = createToken(user);


    res.json({

        message: "Login successful",

        token,

        user: {

            id: user._id,
            username: user.username,
            email: user.email,
            isAdmin: user.isAdmin

        }

    });

} catch (error) {

    console.error(error);

    res.status(500).json({
        message: "Server error"
    });


}});

/* =========================
GOOGLE LOGIN
========================= */

router.post("/google", async (req, res) => {


try {

    const { credential } = req.body;


    if (!credential) {

        return res.status(400).json({
            message: "Google credential is required"
        });

    }


    const ticket = await googleClient.verifyIdToken({

        idToken: credential,

        audience: process.env.GOOGLE_CLIENT_ID

    });


    const payload = ticket.getPayload();


    const email = payload.email;
    const googleId = payload.sub;

    const googleName =
        payload.name ||
        email.split("@")[0];


    let user = await User.findOne({
        email
    });


    /* =========================
       CREATE GOOGLE USER
    ========================= */

    if (!user) {

        let baseUsername =
            googleName
                .replace(
                    /[^a-zA-Z0-9]/g,
                    ""
                )
                .toLowerCase();


        if (!baseUsername) {

            baseUsername = "user";

        }


        let username =
            baseUsername +
            Math.floor(
                1000 +
                Math.random() * 9000
            );


        /* Make sure username is unique */

        while (
            await User.findOne({
                username
            })
        ) {

            username =
                baseUsername +
                Math.floor(
                    1000 +
                    Math.random() * 9000
                );

        }


        /* Random password for Google users */

        const randomPassword =
            require("crypto")
                .randomBytes(32)
                .toString("hex");


        const hashedPassword =
            await bcrypt.hash(
                randomPassword,
                10
            );


        user = await User.create({

            username,

            email,

            password:
                hashedPassword,

            googleId

        });

    }


    /* =========================
       CREATE JWT
    ========================= */

    const token =
        createToken(user);


    res.json({

        message:
            "Google login successful",

        token,

        user: {

            id:
                user._id,

            username:
                user.username,

            email:
                user.email,

            isAdmin:
                user.isAdmin

        }

    });

} catch (error) {

    console.error(
        "Google authentication error:",
        error
    );


    res.status(401).json({

        message:
            "Google authentication failed"

    });

}


});

module.exports = router;
