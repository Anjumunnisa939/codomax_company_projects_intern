const mongoose = require("mongoose");
const dns = require("dns");

dns.setServers(["8.8.8.8"]);

const connectDB = async () => {
    try {
        if (!process.env.MONGO_URL) {
            throw new Error("MONGO_URL is not configured.");
        }

        await mongoose.connect(process.env.MONGO_URL);

        console.log("MongoDB connected successfully");
    } catch (error) {
        console.error("MongoDB connection failed:", error.message);
        throw error;
    }
};

module.exports = connectDB;
