const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'config', 'firebase-service.json');
try {
    const content = fs.readFileSync(filePath, 'utf8');
    const json = JSON.parse(content);
    const key = json.private_key;
    console.log('Key length:', key.length);
    console.log('Starts with:', key.substring(0, 30));
    console.log('Ends with:', key.substring(key.length - 30));
    
    // Check for literal backslash-n
    const hasLiteralSlashN = key.includes('\\n');
    console.log('Has literal \\n:', hasLiteralSlashN);
    
    // Try to see if it has \r\n or other weirdness
    console.log('Has \\r:', key.includes('\r'));
    
    // If we replace \n and try to initialize, does it work?
    const admin = require('firebase-admin');
    const cleanedKey = key.replace(/\\n/g, '\n');
    json.private_key = cleanedKey;
    
    try {
        admin.initializeApp({
            credential: admin.credential.cert(json)
        });
        console.log('SUCCESS: Firebase initialized with cleaned key');
    } catch (e) {
        console.log('FAILURE: Firebase failed even with cleaned key:', e.message);
    }
} catch (err) {
    console.error('Error:', err.message);
}
