// READ-ONLY. Single GET call against Razorpay API. No writes.
require('dotenv').config();
const Razorpay = require('razorpay');

async function main() {
  const rzp = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
  const orderId = 'order_TPmWun2pfleeD3'; // the real order_id from the user's failing 149 purchase attempt

  const order = await rzp.orders.fetch(orderId);
  console.log('--- Order ---');
  console.log(JSON.stringify({
    id: order.id, amount: order.amount, currency: order.currency,
    status: order.status, receipt: order.receipt, notes: order.notes,
    created_at: order.created_at
  }, null, 2));

  const payments = await rzp.orders.fetchPayments(orderId);
  console.log('\n--- Payments for this order ---');
  payments.items.forEach(p => console.log(JSON.stringify({
    id: p.id, amount: p.amount, status: p.status, method: p.method, notes: p.notes
  }, null, 2)));
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
