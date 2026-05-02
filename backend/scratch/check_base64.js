const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'config', 'firebase-service.json');
const json = JSON.parse(fs.readFileSync(filePath, 'utf8'));
const key = json.private_key;

const match = key.match(/-----BEGIN PRIVATE KEY-----([\s\S]*)-----END PRIVATE KEY-----/);
if (match) {
    const base64 = match[1].replace(/\s/g, '');
    console.log('Base64 length:', base64.length);
    console.log('Length % 4:', base64.length % 4);
    
    // Try to decode it
    try {
        const buf = Buffer.from(base64, 'base64');
        console.log('Buffer length:', buf.length);
        console.log('Decoded successfully');
    } catch (e) {
        console.log('Decode failed:', e.message);
    }
} else {
    console.log('No match');
}
