const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'config', 'firebase-service.json');
const serviceAccount = JSON.parse(fs.readFileSync(filePath, 'utf8'));

let key = serviceAccount.private_key;

// 1. Remove literal \n if they exist (though we confirmed they are real newlines)
key = key.replace(/\\n/g, '\n');

// 2. Extract base64 part
const match = key.match(/-----BEGIN PRIVATE KEY-----([\s\S]*)-----END PRIVATE KEY-----/);
if (match) {
    let base64 = match[1].replace(/\s/g, ''); // Remove all whitespace
    
    // 3. Re-wrap base64 at 64 characters (standard PEM)
    const wrapped = base64.match(/.{1,64}/g).join('\n');
    const newKey = `-----BEGIN PRIVATE KEY-----\n${wrapped}\n-----END PRIVATE KEY-----\n`;
    
    serviceAccount.private_key = newKey;
    
    try {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        }, 'test-fix');
        console.log('✅ SUCCESS: Key fixed by re-wrapping!');
        
        // If it works, save it back to the file
        // fs.writeFileSync(filePath, JSON.stringify(serviceAccount, null, 2));
    } catch (e) {
        console.log('❌ FAILURE: Even re-wrapping did not help:', e.message);
    }
} else {
    console.log('❌ FAILURE: Could not find BEGIN/END headers in key');
}
