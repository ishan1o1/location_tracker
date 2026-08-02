const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/locationTracker');
        console.log(`[INFO] MongoDB Connected: ${conn.connection.host}`);
    } catch (err) {
        console.error(`[ERROR] MongoDB Connection Error: ${err.message}`);
        // Do not crash process, log error and allow application handling
    }
};

module.exports = connectDB;
