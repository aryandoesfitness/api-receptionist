const nodemailer = require('nodemailer');

let transporter;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      family: 4, // Force IPv4 — prevents connection hangs on Railway (no IPv6)
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

function row(label, value) {
  return `<tr>
    <td style="padding:8px 12px;font-weight:bold;background:#f9f9f9;border:1px solid #e0e0e0;width:160px;">${label}</td>
    <td style="padding:8px 12px;border:1px solid #e0e0e0;">${value || '—'}</td>
  </tr>`;
}

function buildEmailHtml(data) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <h2 style="color:#333;">New Call Lead</h2>
      <table style="border-collapse:collapse;width:100%;">
        ${row('Caller Name', data.caller_name)}
        ${row('Phone', data.caller_phone)}
        ${row('Reason for Visit', data.reason_for_visit)}
        ${row('Preferred Day', data.preferred_day)}
        ${row('Preferred Time', data.preferred_time)}
        ${row('Appointment Booked', data.appointment_booked ? 'Yes' : 'No')}
        ${row('Sentiment', data.sentiment)}
        ${row('Summary', data.summary)}
      </table>
    </div>
  `;
}

async function sendEmailAlert(callData) {
  const to = process.env.CLINIC_EMAIL;
  if (!to) return;

  const callerLabel = callData.caller_name || 'Unknown Caller';
  const reasonLabel = callData.reason_for_visit || 'Inquiry';

  await getTransporter().sendMail({
    from: `"AI Receptionist" <${process.env.SMTP_USER}>`,
    to,
    subject: `New Lead: ${callerLabel} — ${reasonLabel}`,
    html: buildEmailHtml(callData),
  });
}

module.exports = { sendEmailAlert };
