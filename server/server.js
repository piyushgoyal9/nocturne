
const dns = require("dns");
const path = require("path");
require("dotenv").config({
    path: path.resolve(__dirname, "../.env")
});

dns.setServers([
    "8.8.8.8",
    "8.8.4.4"
]);

// =========================
// CONFIG CHECK
// =========================

// =========================
// CONFIG CHECK
// =========================

console.log("MONGO_URI loaded:", !!process.env.MONGO_URI);
console.log("JWT_SECRET loaded:", !!process.env.JWT_SECRET);
console.log("GOOGLE_CLIENT_ID loaded:", !!process.env.GOOGLE_CLIENT_ID);

console.log("B2_ENDPOINT loaded:", !!process.env.B2_ENDPOINT);
console.log("B2_BUCKET loaded:", !!process.env.B2_BUCKET);
console.log("B2_KEY_ID loaded:", !!process.env.B2_KEY_ID);
console.log("B2_APPLICATION_KEY loaded:", !!process.env.B2_APPLICATION_KEY);

// Password reset email configuration
console.log("RESEND_API_KEY loaded:", !!process.env.RESEND_API_KEY);
console.log("RESET_EMAIL_FROM loaded:", !!process.env.RESET_EMAIL_FROM);
console.log("FRONTEND_URL loaded:", !!process.env.FRONTEND_URL);
// =========================
// IMPORTS
// =========================

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const authRoutes = require("./routes/auth");
const songRoutes = require("./routes/songs");

// =========================
// APP
// =========================

const app = express();

app.use(cors());
app.use(express.json());

// =========================
// ROUTES
// =========================

app.use("/api/auth", authRoutes);
app.use("/api/songs", songRoutes);

app.get("/", (req, res) => {
    res.send("Nocturne API is running");
});

// =========================
// MONGODB
// =========================

mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
        console.log("MongoDB connected successfully");
    })
    .catch((error) => {
        console.error(
            "MongoDB connection failed:",
            error.message
        );
    });

// =========================
// SERVER
// =========================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Nocturne server running on port ${PORT}`);
});
