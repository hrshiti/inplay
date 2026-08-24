require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

async function runAudit() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const collections = await mongoose.connection.db.listCollections().toArray();
        let found = [];

        for (const { name } of collections) {
            const docs = await mongoose.connection.db.collection(name).find({
                $or: [
                    { 'video.url': { $regex: 'DBKR_EP_' } },
                    { 'episodes.video.url': { $regex: 'DBKR_EP_' } },
                    { 'episodes.url': { $regex: 'DBKR_EP_' } },
                    { 'mediaUrl': { $regex: 'DBKR_EP_' } },
                    { 'promoVideoUrl': { $regex: 'DBKR_EP_' } }
                ]
            }).toArray();

            for (const doc of docs) {
                found.push({ collection: name, id: doc._id, title: doc.title, doc });
            }
        }

        console.log(JSON.stringify(found, null, 2));
        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

runAudit();
