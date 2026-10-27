
const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");

const User = require("../models/User");

const router = express.Router();

const googleClient = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID
);

// =========================
// JWT TOKEN
// =========================

function createToken(user) {
    if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET is not configured");
    }

    return jwt.sign(
        {
            userId: user._id,
            username: user.username,
            isAdmin: user.isAdmin
        },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
    );
}

function formatUser(user) {
    return {
        id: user._id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin
    };
}

// =========================
// SIGNUP
// POST /api/auth/signup
// =========================

router.post("/signup", async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (
            typeof username !== "string" ||
            typeof email !== "string" ||
            typeof password !== "string" ||
            !username.trim() ||
            !email.trim() ||
            !password
        ) {
            return res.status(400).json({
                message: "All fields are required"
            });
        }

        if (password.length < 8 || password.length > 128) {
            return res.status(400).json({
                message: "Password must be between 8 and 128 characters"
            });
        }

        const normalizedUsername = username.trim();
        const normalizedEmail = email.trim().toLowerCase();

        const existingUser = await User.findOne({
            $or: [
                { email: normalizedEmail },
                { username: normalizedUsername }
            ]
        });

        if (existingUser) {
            return res.status(400).json({
                message: "Username or email already exists"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            username: normalizedUsername,
            email: normalizedEmail,
            password: hashedPassword
        });

        return res.status(201).json({
            message: "User created successfully",
            user: formatUser(user)
        });
    } catch (error) {
        console.error("Signup error:", error);

        if (error.code === 11000) {
            return res.status(409).json({
                message: "Username or email already exists"
            });
        }

        return res.status(500).json({
            message: "Server error"
        });
    }
});

// =========================
// NORMAL LOGIN
// POST /api/auth/login
// =========================

router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (
            typeof email !== "string" ||
            typeof password !== "string" ||
            !email.trim() ||
            !password
        ) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }

        const user = await User.findOne({
            email: email.trim().toLowerCase()
        });

        if (!user || !user.password) {
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

        return res.json({
            message: "Login successful",
            token,
            user: formatUser(user)
        });
    } catch (error) {
        console.error("Login error:", error);

        return res.status(500).json({
            message: "Server error"
        });
    }
});

// =========================
// GOOGLE LOGIN
// POST /api/auth/google
// =========================

router.post("/google", async (req, res) => {
    try {
        const { credential } = req.body;

        if (
            typeof credential !== "string" ||
            !credential.trim()
        ) {
            return res.status(400).json({
                message: "Google credential is required"
            });
        }

        if (!process.env.GOOGLE_CLIENT_ID) {
            console.error("GOOGLE_CLIENT_ID is not configured");

            return res.status(500).json({
                message: "Google login is not configured"
            });
        }

        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();

        if (
            !payload ||
            !payload.sub ||
            !payload.email ||
            payload.email_verified !== true
        ) {
            return res.status(401).json({
                message: "A verified Google email is required"
            });
        }

        const email = payload.email.trim().toLowerCase();
        const googleId = payload.sub;
        const googleName = payload.name || email.split("@")[0];

        // Find an existing Google account or account with this email.
        let user = await User.findOne({
            $or: [
                { googleId },
                { email }
            ]
        });

        if (!user) {
            let baseUsername = googleName
                .replace(/[^a-zA-Z0-9]/g, "")
                .toLowerCase()
                .slice(0, 24);

            if (!baseUsername) {
                baseUsername = "user";
            }

            let username;
            let attempts = 0;

            do {
                username =
                    baseUsername +
                    Math.floor(1000 + Math.random() * 9000);

                attempts++;
            } while (
                await User.findOne({ username }) &&
                attempts < 20
            );

            if (await User.findOne({ username })) {
                return res.status(500).json({
                    message: "Unable to create a unique username"
                });
            }

            // Generate a random password for compatibility with
            // the existing schema and normal authentication code.
            const randomPassword = crypto
                .randomBytes(32)
                .toString("hex");

            const hashedPassword = await bcrypt.hash(
                randomPassword,
                10
            );

            user = await User.create({
                username,
                email,
                password: hashedPassword,
                googleId
            });
        } else if (!user.googleId) {
            // Google has verified ownership of this email.
            // Link the existing account instead of creating a duplicate.
            user.googleId = googleId;
            await user.save();
        }

        const token = createToken(user);

        return res.json({
            message: "Google login successful",
            token,
            user: formatUser(user)
        });
    } catch (error) {
        console.error("Google authentication error:", error);

        if (error.code === 11000) {
            return res.status(409).json({
                message: "An account with these details already exists. Please try again."
            });
        }

        return res.status(401).json({
            message: "Google authentication failed"
        });
    }
});

// =========================
// FORGOT PASSWORD
// POST /api/auth/forgot-password
// =========================

router.post("/forgot-password", async (req, res) => {
    try {
        const { email } = req.body;

        if (typeof email !== "string" || !email.trim()) {
            return res.status(400).json({
                message: "Email is required"
            });
        }

        if (
            !process.env.RESEND_API_KEY ||
            !process.env.RESET_EMAIL_FROM ||
            !process.env.FRONTEND_URL
        ) {
            console.error(
                "Password reset email configuration is missing"
            );

            return res.status(503).json({
                message: "Password reset email service is not configured"
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const user = await User.findOne({
            email: normalizedEmail
        });

        const genericResponse = {
            message:
                "If an account exists for that email, a reset link will be sent."
        };

        if (!user) {
            return res.json(genericResponse);
        }

        // Invalidate any previous reset token.
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;

        const rawToken = crypto.randomBytes(32).toString("hex");

        const tokenHash = crypto
            .createHash("sha256")
            .update(rawToken)
            .digest("hex");

        user.passwordResetToken = tokenHash;
        user.passwordResetExpires = new Date(
            Date.now() + 15 * 60 * 1000
        );

        await user.save();

        const frontendUrl = process.env.FRONTEND_URL.replace(/\/+$/, "");

        const resetUrl =
            `${frontendUrl}/reset-password.html?token=` +
            encodeURIComponent(rawToken);

        const emailResponse = await fetch(
            "https://api.resend.com/emails",
            {
                method: "POST",
                headers: {
                    Authorization:
                        `Bearer ${process.env.RESEND_API_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    from: process.env.RESET_EMAIL_FROM,
                    to: [normalizedEmail],
                    subject: "Reset your Nocturne password",
                    html: `
                        <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto">
                            <h2>Reset your Nocturne password</h2>
                            <p>We received a request to reset your password.</p>
                            <p>
                                <a href="${resetUrl}"
                                   style="display:inline-block;padding:12px 20px;background:#6c4cff;color:white;text-decoration:none;border-radius:6px">
                                    Reset Password
                                </a>
                            </p>
                            <p>This link expires in 15 minutes and can only be used once.</p>
                            <p>If you did not request this, you can ignore this email.</p>
                        </div>
                    `
                })
            }
        );

        if (!emailResponse.ok) {
            const details = await emailResponse.text();

            console.error("Resend email error:", details);

            // Invalidate the token if the email could not be sent.
            user.passwordResetToken = undefined;
            user.passwordResetExpires = undefined;

            await user.save();

            return res.status(502).json({
                message: "Unable to send reset email. Please try again."
            });
        }

        return res.json(genericResponse);
    } catch (error) {
        console.error("Forgot password error:", error);

        return res.status(500).json({
            message: "Unable to process password reset"
        });
    }
});

// =========================
// RESET PASSWORD
// POST /api/auth/reset-password
// =========================

router.post("/reset-password", async (req, res) => {
    try {
        const { token, password } = req.body;

        if (
            typeof token !== "string" ||
            typeof password !== "string"
        ) {
            return res.status(400).json({
                message: "Reset token and new password are required"
            });
        }

        if (password.length < 8 || password.length > 128) {
            return res.status(400).json({
                message: "Password must be between 8 and 128 characters"
            });
        }

        const tokenHash = crypto
            .createHash("sha256")
            .update(token)
            .digest("hex");

        const user = await User.findOne({
            passwordResetToken: tokenHash,
            passwordResetExpires: { $gt: new Date() }
        });

        if (!user) {
            return res.status(400).json({
                message: "Reset link is invalid or has expired"
            });
        }

        user.password = await bcrypt.hash(password, 10);

        // A reset token must never be reusable.
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;

        await user.save();

        return res.json({
            message: "Password reset successful. You can now log in."
        });
    } catch (error) {
        console.error("Reset password error:", error);

        return res.status(500).json({
            message: "Unable to reset password"
        });
    }
});

module.exports = router;
