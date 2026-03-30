const mongoose = require('mongoose');

async function test() {
    // console.log("Starting diagnostics...");
    const uri = "mongodb+srv://jagananandhan07_db_user:Jagan%40631@cluster0.wktmhxi.mongodb.net/?appName=Cluster0";
    
    try {
        await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 10000,
        });
        // console.log("Connected Successfully!");
        await mongoose.disconnect();
    } catch (e) {
        // console.log("Error type:", e.name);
        // console.log("Error message:", e.message);
        if (e.reason && e.reason.servers) {
                // console.log("Detailed Server States:");
            for (const [server, status] of e.reason.servers.entries()) {
                // console.log(`Server: ${server}`);
                // console.log(`  - Type: ${status.type}`);
                // console.log(`  - Error: ${status.error ? status.error.message : 'None'}`);
            }
        }
    }
}

test();
