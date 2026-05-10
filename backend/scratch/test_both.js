const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

function testFile(filename) {
    console.log(`\n--- Testing ${filename} ---`);
    const filePath = path.join(__dirname, '..', 'config', filename);
    if (!fs.existsSync(filePath)) {
        console.log(`File ${filename} does not exist.`);
        return;
    }
    
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const serviceAccount = JSON.parse(content);
        
        // Try as is
        try {
            const app = admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            }, filename); // Use filename as app name to allow multiple inits
            console.log(`✅ SUCCESS with ${filename} (as is)`);
            app.delete();
        } catch (e1) {
            console.log(`❌ FAILED with ${filename} (as is): ${e1.message}`);
            
            // Try cleaning (removing trailing \n or spaces)
            if (serviceAccount.private_key) {
                serviceAccount.private_key = serviceAccount.private_key.trim();
                try {
                    const app = admin.initializeApp({
                        credential: admin.credential.cert(serviceAccount)
                    }, `${filename}-cleaned`);
                    console.log(`✅ SUCCESS with ${filename} (after trim)`);
                    app.delete();
                } catch (e2) {
                    console.log(`❌ FAILED with ${filename} (after trim): ${e2.message}`);
                }
            }
        }
    } catch (err) {
        console.error(`Error reading ${filename}:`, err.message);
    }
}

testFile('firebase-service.json');
testFile('firebase-admin.json');
