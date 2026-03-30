const mongoose = require('mongoose');
const http = require('http');

async function checkConnection() {
    // console.log("Checking public IP...");
    try {
        const ip = await new Promise((resolve, reject) => {
            http.get('http://ifconfig.me/ip', res => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => resolve(data.trim()));
            }).on('error', reject);
        });
        // console.log("Your Public IP is:", ip);
    } catch (err) {
        // console.log("Could not determine public IP:", err.message);
    }

    const MONGO_URL = "mongodb+srv://jagananandhan07_db_user:Jagan%40631@cluster0.wktmhxi.mongodb.net/?appName=Cluster0";
    // console.log("Attempting to connect to MongoDB Atlas...");
    
    try {
        await mongoose.connect(MONGO_URL, {
            serverSelectionTimeoutMS: 5000, // 5 seconds timeout
        });
        // console.log("✅ Successfully connected to MongoDB Atlas!");
        await mongoose.disconnect();
    } catch (err) {
        // console.error("❌ Connection failed:");
        // console.error("Error Name:", err.name);
        // console.error("Error Message:", err.message);
        if (err.reason) {
            // console.error("Reason:", JSON.stringify(err.reason, null, 2));
        }
    }
}

checkConnection();
