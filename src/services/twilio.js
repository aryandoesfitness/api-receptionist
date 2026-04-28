const twilio = require('twilio');

let client;

function getClient() {
  if (!client) {
    client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
  }
  return client;
}

function formatAustralianPhone(number) {
  return number.replace(/\s+/g, '').replace(/^0/, '+61');
}

async function sendSms(to, body) {
  const formatted = formatAustralianPhone(to);
  const message = await getClient().messages.create({
    body,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: formatted,
  });
  return message.sid;
}

module.exports = { sendSms, formatAustralianPhone };
