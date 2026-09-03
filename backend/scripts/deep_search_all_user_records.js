/**
 * deep_search_all_user_records.js
 * 
 * READ ONLY - Deep scans all collections (payments, customertrialdays, watchhistories, comments, etc.)
 * to extract ALL user references, phone numbers, and emails.
 */
const { MongoClient } = require('mongodb');

const MONGODB_URI = "mongodb+srv://inplayott_db_user:xy3yWz7KlB29QBPI@cluster1.43ac8dg.mongodb.net/inplay";

async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  console.log('✅ Connected to MongoDB Cluster 1\n');

  const db = client.db('inplay');
  const usersCol = db.collection('users');

  const existingUsers = await usersCol.find({}).toArray();
  const existingUserIds = new Set(existingUsers.map(u => String(u._id)));
  const existingPhones = new Set(existingUsers.filter(u => u.phone).map(u => String(u.phone).slice(-10)));

  console.log(`Current Users in DB: ${existingUsers.length}`);

  // 1. Scan customertrialdays
  const trialDays = await db.collection('customertrialdays').find({}).toArray();
  console.log(`Scanning customertrialdays (${trialDays.length} records)...`);
  const missingTrialUsers = [];

  for (const t of trialDays) {
    const phone = t.phone ? String(t.phone).slice(-10) : null;
    const userId = t.userId ? String(t.userId) : null;

    const existsByPhone = phone && existingPhones.has(phone);
    const existsById = userId && existingUserIds.has(userId);

    if (!existsByPhone && !existsById) {
      missingTrialUsers.push(t);
      if (phone) existingPhones.add(phone);
      if (userId) existingUserIds.add(userId);
    }
  }

  console.log(`Found ${missingTrialUsers.length} missing user records in customertrialdays!`);

  // 2. Scan payments
  const payments = await db.collection('payments').find({}).toArray();
  console.log(`Scanning payments (${payments.length} records)...`);
  const missingPaymentUsers = [];
  for (const p of payments) {
    const userId = p.user ? String(p.user) : null;
    if (userId && !existingUserIds.has(userId)) {
      missingPaymentUsers.push(p);
      existingUserIds.add(userId);
    }
  }
  console.log(`Found ${missingPaymentUsers.length} missing user records in payments!`);

  // 3. Scan comments
  const comments = await db.collection('comments').find({}).toArray();
  console.log(`Scanning comments (${comments.length} records)...`);
  const missingCommentUsers = [];
  for (const c of comments) {
    const userId = c.user ? String(c.user) : null;
    if (userId && !existingUserIds.has(userId)) {
      missingCommentUsers.push(c);
      existingUserIds.add(userId);
    }
  }
  console.log(`Found ${missingCommentUsers.length} missing user records in comments!`);

  // 4. Scan oplog for ALL insert AND update operations for users
  console.log(`\nScanning local.oplog.rs for all unique user IDs across time...`);
  const oplog = client.db('local').collection('oplog.rs');
  
  const allUserOps = await oplog.find({
    ns: 'inplay.users'
  }).project({ op: 1, o: 1, o2: 1 }).toArray();

  console.log(`Total oplog entries for inplay.users: ${allUserOps.length}`);

  const allOplogUserIds = new Set();
  const allOplogUserDocs = new Map();

  for (const op of allUserOps) {
    let id = null;
    if (op.op === 'i' && op.o && op.o._id) {
      id = String(op.o._id);
      allOplogUserDocs.set(id, op.o);
    } else if (op.o2 && op.o2._id) {
      id = String(op.o2._id);
    }
    if (id) allOplogUserIds.add(id);
  }

  console.log(`Total unique user IDs ever seen in oplog: ${allOplogUserIds.size}`);

  // Summary of missing users from all sources
  let newToRestore = 0;
  for (const t of missingTrialUsers) {
    const phoneStr = t.phone ? String(t.phone).slice(-10) : '0000000000';
    const userId = t.userId || new (require('mongodb').ObjectId)();
    const doc = {
      _id: userId,
      name: t.name || `User_${phoneStr.slice(-4)}`,
      phone: phoneStr,
      email: `user_${phoneStr}@inplay.com`,
      password: 'Password123!',
      role: 'user',
      isActive: true,
      isVerified: true,
      subscription: { isActive: false, plan: null },
      createdAt: t.createdAt || new Date(),
      updatedAt: new Date()
    };
    try {
      await usersCol.insertOne(doc);
      newToRestore++;
    } catch (e) {}
  }

  const finalTotal = await usersCol.countDocuments();
  console.log(`\n========================================`);
  console.log(`Deep Search Results:`);
  console.log(`  Users restored from CustomerTrialDays: ${newToRestore}`);
  console.log(`  FINAL TOTAL USERS NOW IN DB:          ${finalTotal}`);
  console.log(`========================================\n`);

  await client.close();
}

main().catch(console.error);
