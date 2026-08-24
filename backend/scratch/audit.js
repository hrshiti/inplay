require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

async function runAudit() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB.");

        const collectionsToAudit = [
            'quickbytes', 'contents', 'banners', 'promotions',
            'foryous', 'cinemasections', 'darmaasections', 'bhojpurisections'
        ];

        const report = {};

        for (const collName of collectionsToAudit) {
            const coll = mongoose.connection.db.collection(collName);
            const count = await coll.countDocuments();
            const sample = await coll.findOne({});
            
            const schema = {
                'video.url': false,
                'video.hls_url': false,
                'video.s3_url': false,
                'episodes.video.url': false,
                'episodes.video.hls_url': false,
                'episodes.video.s3_url': false
            };

            const checkSchema = (doc, schemaObj) => {
                if (!doc) return;
                
                if (doc.video) {
                    if (doc.video.url) schemaObj['video.url'] = true;
                    if (doc.video.hls_url) schemaObj['video.hls_url'] = true;
                    if (doc.video.s3_url) schemaObj['video.s3_url'] = true;
                }
                
                if (doc.episodes && Array.isArray(doc.episodes)) {
                    for (const ep of doc.episodes) {
                        if (ep.video) {
                            if (ep.video.url) schemaObj['episodes.video.url'] = true;
                            if (ep.video.hls_url) schemaObj['episodes.video.hls_url'] = true;
                            if (ep.video.s3_url) schemaObj['episodes.video.s3_url'] = true;
                        } else if (ep.url) { // Sometimes episodes directly have url (seen in migrateOriginalsToS3)
                             schemaObj['episodes.video.url'] = true;
                             if(ep.hls_url) schemaObj['episodes.video.hls_url'] = true;
                             if(ep.s3_url) schemaObj['episodes.video.s3_url'] = true;
                        }
                    }
                }
            }

            // check up to 100 documents to be sure about schema
            const docs = await coll.find({}).limit(100).toArray();
            docs.forEach(doc => checkSchema(doc, schema));

            report[collName] = {
                count,
                sampleId: sample ? sample._id : null,
                schema: schema
            };
        }

        console.log(JSON.stringify(report, null, 2));

        // QuickBytes Missing s3_url check
        const qbMissingS3 = await mongoose.connection.db.collection('quickbytes').find({
            'video.url': { $exists: true, $ne: null },
            'video.s3_url': { $exists: false }
        }).limit(20).toArray();
        console.log("QuickBytes missing S3 URL:", qbMissingS3.length);
        if (qbMissingS3.length > 0) {
            console.log("First missing S3 quickbyte title:", qbMissingS3[0].title);
            console.log("video object:", qbMissingS3[0].video);
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

runAudit();
