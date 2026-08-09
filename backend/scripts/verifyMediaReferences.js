/**
 * Report database records whose media files are missing from disk.
 *
 * The mirror image of cleanupOrphanedMedia: that script finds files nothing
 * points at, this one finds pointers with no file. Read-only - it never
 * deletes or modifies anything.
 *
 * Usage (from backend/):
 *   node scripts/verifyMediaReferences.js
 *   node scripts/verifyMediaReferences.js --full    # list every broken path
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { UPLOAD_BASE } = require('../config/multerStorage');

const SHOW_ALL = process.argv.includes('--full');

const decodeSafe = (input) => {
    try {
        return decodeURIComponent(input);
    } catch {
        return input;
    }
};

const toAbsolute = (uploadsPath) =>
    path.join(UPLOAD_BASE, uploadsPath.replace('/uploads/', '').replace(/\//g, path.sep));

/**
 * Every distinct media reference in a document, each as a group of candidate
 * spellings. A reference counts as present when ANY candidate exists on disk -
 * the same rule cleanupOrphanedMedia uses to decide a file is in use, so the
 * two scripts can never disagree about the same reference.
 */
const collectReferenceGroups = (value, groups) => {
    if (!value) return;

    if (typeof value === 'string') {
        let index = value.indexOf('/uploads/');

        while (index !== -1) {
            const tail = value.slice(index);
            const candidates = new Set();

            for (const raw of [tail, tail.split(/["'?]/)[0], tail.split(/\s/)[0]]) {
                const cleaned = raw.trim().replace(/[),\]]+$/, '');
                if (!cleaned || cleaned === '/uploads/') continue;
                candidates.add(cleaned);
                candidates.add(decodeSafe(cleaned));
            }

            if (candidates.size > 0) groups.push([...candidates]);
            index = value.indexOf('/uploads/', index + 1);
        }
        return;
    }
    if (Array.isArray(value)) {
        value.forEach(v => collectReferenceGroups(v, groups));
        return;
    }
    if (typeof value === 'object') {
        Object.values(value).forEach(v => collectReferenceGroups(v, groups));
    }
};

const run = async () => {
    await mongoose.connect(process.env.MONGODB_URI);

    const { host, name } = mongoose.connection;
    console.log(`Database : ${name} @ ${host}`);
    console.log(`Uploads  : ${UPLOAD_BASE}`);
    console.log('Mode     : READ ONLY (nothing is modified)\n');

    const collections = await mongoose.connection.db.listCollections().toArray();
    const brokenByCollection = {};
    let totalRefs = 0;
    let totalBroken = 0;

    for (const { name: collectionName } of collections) {
        const docs = await mongoose.connection.db.collection(collectionName).find({}).toArray();

        for (const doc of docs) {
            const groups = [];
            collectReferenceGroups(doc, groups);

            for (const candidates of groups) {
                totalRefs++;
                const exists = candidates.some(c => fs.existsSync(toAbsolute(c)));
                if (exists) continue;

                totalBroken++;
                const entry = {
                    id: String(doc._id),
                    title: doc.title || doc.name || doc.phone || '(untitled)',
                    ref: candidates[0] // the fullest spelling, before any truncation
                };
                (brokenByCollection[collectionName] ||= []).push(entry);
            }
        }
    }

    console.log(`Media references found : ${totalRefs}`);
    console.log(`Pointing at a missing file : ${totalBroken}\n`);

    if (totalBroken === 0) {
        console.log('✅ Every media reference resolves to a file on disk.');
    } else {
        for (const [collectionName, entries] of Object.entries(brokenByCollection)) {
            console.log(`${collectionName} - ${entries.length} broken reference(s)`);
            const shown = SHOW_ALL ? entries : entries.slice(0, 5);
            shown.forEach(e => console.log(`   ${e.title}  [${e.id}]\n      ${e.ref}`));
            if (!SHOW_ALL && entries.length > 5) console.log(`   ... and ${entries.length - 5} more`);
            console.log('');
        }
        if (!SHOW_ALL) console.log('Re-run with --full to list every broken reference.');
    }

    await mongoose.disconnect();
};

if (require.main === module) {
    run().catch(error => {
        console.error('Verification failed:', error);
        process.exit(1);
    });
}

module.exports = { collectReferenceGroups, toAbsolute };
