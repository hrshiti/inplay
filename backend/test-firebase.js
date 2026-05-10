require('dotenv').config();
const { admin } = require('./services/firebaseService');

console.log('--- Firebase Initialization Test ---');
console.log('FIREBASE_SERVICE exists:', !!process.env.FIREBASE_SERVICE);
console.log('Admin apps length:', admin.apps.length);
if (admin.apps.length > 0) {
    console.log('Project ID:', admin.apps[0].options.credential.projectId || 'N/A');
    console.log('SUCCESS: Firebase is initialized!');
} else {
    console.log('FAILURE: Firebase is NOT initialized!');
}
process.exit();
