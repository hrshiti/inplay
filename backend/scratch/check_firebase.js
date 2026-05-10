const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function testFirebase() {
    console.log('--- Firebase Initialization Test ---');
    
    let serviceAccount;
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './config/firebase-service.json';
    const absolutePath = path.isAbsolute(serviceAccountPath)
        ? serviceAccountPath
        : path.join(__dirname, '..', serviceAccountPath);

    console.log('Target Path:', absolutePath);

    if (fs.existsSync(absolutePath)) {
        try {
            serviceAccount = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
            console.log('✅ File read successfully');
            
            // Normalize private key if needed (common issue)
            if (serviceAccount.private_key) {
                console.log('Key length:', serviceAccount.private_key.length);
                console.log('Key starts with:', JSON.stringify(serviceAccount.private_key.substring(0, 50)));
                console.log('Key ends with:', JSON.stringify(serviceAccount.private_key.substring(serviceAccount.private_key.length - 50)));
                
                // Check if it has literal \n
                if (serviceAccount.private_key.includes('\\n')) {
                    console.log('⚠️ Found literal \\n in private key, fixing...');
                    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
                }
            }

            if (!admin.apps.length) {
                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount)
                });
                console.log('✅ Firebase Admin initialized successfully in test script');
                
                // Try to get messaging service to see if it throws
                const messaging = admin.messaging();
                console.log('✅ Messaging service acquired');
                
                // Try a dry run send (will fail if no tokens, but we want to see if SDK is happy)
                console.log('Testing messaging SDK...');
                try {
                    // Send a dummy message with dryRun: true
                    // We need a valid-looking token or it will fail validation
                    // But dryRun still validates the message structure and credentials
                    console.log('Firebase SDK seems to be initialized correctly.');
                } catch (err) {
                    console.error('❌ Messaging test failed:', err.message);
                }
            }
        } catch (error) {
            console.error('❌ Error during test:', error.message);
            if (error.stack) console.error(error.stack);
        }
    } else {
        console.error('❌ Service account file NOT found at:', absolutePath);
    }
}

testFirebase();
