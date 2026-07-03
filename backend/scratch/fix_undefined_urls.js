const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI is not defined in .env');
    process.exit(1);
}

// Function to recursively find and replace 'undefined/uploads' with '/uploads' in an object/value
const fixObjectUrls = (obj) => {
    let changed = false;
    if (!obj) return { obj, changed };

    if (typeof obj === 'string') {
        if (obj.startsWith('undefined/uploads')) {
            return { obj: obj.replace('undefined/uploads', '/uploads'), changed: true };
        }
        return { obj, changed };
    }

    if (Array.isArray(obj)) {
        for (let i = 0; i < obj.length; i++) {
            const res = fixObjectUrls(obj[i]);
            if (res.changed) {
                obj[i] = res.obj;
                changed = true;
            }
        }
        return { obj, changed };
    }

    if (typeof obj === 'object') {
        // Skip mongoose internal properties
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key) && !key.startsWith('$') && key !== '_id') {
                const res = fixObjectUrls(obj[key]);
                if (res.changed) {
                    obj[key] = res.obj;
                    changed = true;
                }
            }
        }
    }

    return { obj, changed };
};

const runFix = async () => {
    try {
        console.log('📡 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB successfully.');

        // Get list of all registered collections/models
        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();

        console.log(`📋 Found ${collections.length} collections. Processing...`);

        for (const col of collections) {
            const name = col.name;
            // Skip system collections
            if (name.startsWith('system.')) continue;

            console.log(`🔍 Processing collection: ${name}...`);
            const collection = db.collection(name);
            const cursor = collection.find({});

            let updatedCount = 0;
            while (await cursor.hasNext()) {
                const doc = await cursor.next();
                const { obj: fixedDoc, changed } = fixObjectUrls(doc);

                if (changed) {
                    // Update document in db
                    await collection.replaceOne({ _id: doc._id }, fixedDoc);
                    updatedCount++;
                }
            }

            if (updatedCount > 0) {
                console.log(`   ✨ Updated ${updatedCount} documents in "${name}"`);
            }
        }

        console.log('🎉 Database cleanup completed successfully!');
        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during database cleanup:', error);
        if (mongoose.connection.readyState !== 0) {
            await mongoose.connection.close();
        }
        process.exit(1);
    }
};

runFix();
