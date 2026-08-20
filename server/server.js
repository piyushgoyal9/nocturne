
const dns = require("dns");

dns.setServers([
    "8.8.8.8",
    "8.8.4.4"
]);
const authRoutes = require("./routes/auth");
const songRoutes = require("./routes/songs");
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");

require("dotenv").config({
    path: path.join(__dirname, "../.env")
});

console.log("MONGO_URI loaded:", !!process.env.MONGO_URI);

const app = express();

app.use(cors());
app.use(express.json());


app.use("/api/auth", authRoutes);
app.use("/api/songs", songRoutes);
app.use(
    "/uploads",
    express.static(
        path.join(__dirname, "uploads")
    )
);

/* =========================
   MONGODB
========================= */

mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
        console.log("MongoDB connected successfully");
    })
    .catch((error) => {
        console.error("MongoDB connection failed:", error.message);
    });


/* =========================
   TEST ROUTE
========================= */

app.get("/", (req, res) => {
    res.send("Nocturne API is running");
});


/* =========================
   SERVER
========================= */

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Nocturne server running on port ${PORT}`);
});