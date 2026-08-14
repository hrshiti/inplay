// READ-ONLY. Pure local HMAC computation - no network calls, no DB writes.
require('dotenv').config();
const crypto = require('crypto');

const secret = process.env.RAZORPAY_KEY_SECRET;
const payment_id = 'pay_TPmX43khHDfmOY';
const order_id = 'order_TPmWun2pfleeD3';
const subscription_id = 'sub_TPmWuDTDEArPcN'; // real subscription tied to this exact user/timestamp
const actualSignature = '051d55d7d07d11b2759e4b7d2b1d9f501729a798318d33aa28609f32e1ac4315';
const loggedExpected = 'f92719243e0e3bbcfdb58b22ea66696fe8aa278663c2276bb9db0b976db0e512';

const hmac = (data) => crypto.createHmac('sha256', secret).update(data).digest('hex');

const candidates = {
  'order_id|payment_id (current Lifetime formula)': `${order_id}|${payment_id}`,
  'payment_id|order_id (reversed)': `${payment_id}|${order_id}`,
  'payment_id|subscription_id (standard subscription formula)': `${payment_id}|${subscription_id}`,
  'subscription_id|payment_id (reversed)': `${subscription_id}|${payment_id}`,
};

console.log('Actual razorpay_signature received: ', actualSignature);
console.log('Logged expectedSignature (Lifetime): ', loggedExpected);
console.log('');

for (const [label, data] of Object.entries(candidates)) {
  const sig = hmac(data);
  const matchesActual = sig === actualSignature;
  const matchesLogged = sig === loggedExpected;
  console.log(`${label}`);
  console.log(`  data: "${data}"`);
  console.log(`  hmac: ${sig}`);
  console.log(`  matches ACTUAL razorpay_signature: ${matchesActual ? '*** YES ***' : 'no'}`);
  console.log(`  matches logged expectedSignature:  ${matchesLogged ? 'yes' : 'no'}`);
  console.log('');
}
