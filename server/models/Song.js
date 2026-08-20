const mongoose = require("mongoose");

const songSchema = new mongoose.Schema({

    title: {
        type: String,
        required: true,
        trim: true
    },

    artist: {
        type: String,
        required: true,
        trim: true
    },

    audioUrl: {
        type: String,
        required: true
    },

    coverUrl: {
        type: String,
        default: ""
    },

    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    }

}, {
    timestamps: true
});

module.exports = mongoose.model("Song", songSchema);