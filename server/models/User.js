
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },

        password: {
            type: String,
            required: function () {
                return !this.googleId;
            },
            default: undefined,
        },

        googleId: {
            type: String,
            unique: true,
            sparse: true,
        },

        isAdmin: {
            type: Boolean,
            default: false,
        },

        passwordResetToken: {
            type: String,
            default: undefined,
        },

        passwordResetExpires: {
            type: Date,
            default: undefined,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("User", userSchema);
