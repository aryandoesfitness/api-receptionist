const express = require('express');
const router = express.Router();
const validateWebhook = require('../middleware/validateWebhook');
const { logCall } = require('../services/supabase');
const { sendSms } = require('../services/twilio');
const { sendEmailAlert } = require('../services/notifications');

router.post('/process', validateWebhook, (req, res) => {
  // Acknowledge immediately so Retell doesn't retry
  res.status(200).json({ received: true });

  processCallAsync(req.body).catch((err) =>
    console.error('[calls] Unhandled async error:', err.message)
  );
});

async function processCallAsync(payload) {
  if (!payload || payload.event !== 'call_ended') return;

  const call = payload.call || {};
  const analysis = call.call_analysis || {};
  const custom = analysis.custom_analysis_data || {};

  const callData = {
    call_id: call.call_id || null,
    caller_name: custom.caller_name || null,
    caller_phone: custom.caller_phone || null,
    preferred_day: custom.preferred_day || null,
    preferred_time: custom.preferred_time || null,
    reason_for_visit: custom.reason_for_visit || null,
    appointment_booked: custom.appointment_booked ?? false,
    sentiment: analysis.user_sentiment || null,
    summary: analysis.call_summary || null,
    duration_ms:
      call.end_timestamp && call.start_timestamp
        ? call.end_timestamp - call.start_timestamp
        : null,
    created_at: new Date().toISOString(),
  };

  try {
    await logCall(callData);
  } catch (err) {
    console.error('[calls] Supabase logCall failed:', err.message);
  }

  if (callData.caller_phone) {
    try {
      await sendSms(callData.caller_phone, buildSmsMessage(callData));
    } catch (err) {
      console.error('[calls] SMS send failed:', err.message);
    }
  }

  try {
    await sendEmailAlert(callData);
  } catch (err) {
    console.error('[calls] Email alert failed:', err.message);
  }
}

function buildSmsMessage(data) {
  const name = data.caller_name || 'there';
  if (data.appointment_booked) {
    const when = [data.preferred_day, data.preferred_time]
      .filter(Boolean)
      .join(' at ');
    return `Hi ${name}! Your appointment has been scheduled${when ? ` for ${when}` : ''}. We look forward to seeing you. Reply STOP to unsubscribe.`;
  }
  return `Hi ${name}! Thanks for calling. Our team will follow up with you shortly. Reply STOP to unsubscribe.`;
}

module.exports = router;
