const mongoose = require("mongoose");
const crypto = require("crypto");

const blogSchema = new mongoose.Schema({
    id: {
        type: String,
        default: () => crypto.randomUUID(),
        unique: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },

    content: {
        type: String,
        required: true,
        trim: true
    },

    authorId: {
        type: String,
        required: true
    },

    authorEmail: {
        type: String,
        required: true
    },

    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("Blog", blogSchema);