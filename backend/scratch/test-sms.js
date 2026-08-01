const apiKey = 'g9dsRrnl7ESvyLWQwUAVrQ';
const senderId = 'BGADEC';
const phone = '6260491554';
const text = 'Welcome to the inplay powered by Appzeto.Your OTP for registration is 123456.BGADEC';
const url = `http://cloud.smsindiahub.in/vendorsms/pushsms.aspx?APIKey=${encodeURIComponent(apiKey)}&msisdn=${encodeURIComponent(phone)}&sid=${encodeURIComponent(senderId)}&msg=${encodeURIComponent(text)}&fl=0&gwid=2&peid=1001164203633432409&templateid=1007282516644508833`;

console.log('Requesting:', url);
fetch(url)
  .then(res => res.text())
  .then(data => console.log('Response:', data))
  .catch(err => console.error(err));
