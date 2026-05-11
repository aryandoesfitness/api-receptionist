const express = require('express');
const router = express.Router();
const validateWebhook = require('../middleware/validateWebhook');
const { logCall, updateCallByCallId, getClientByAgentId } = require('../services/supabase');
const { sendSms } = require('../services/twilio');
const { sendEmailAlert } = require('../services/notifications');

router.post('/process', validateWebhook, (req, res) => {
  res.status(200).json({ received: true });

  processCallAsync(req.body).catch((err) =>
    console.error('[calls] Unhandled async error:', err.message)
  );
});

async function processCallAsync(payload) {
  if (!payload) return;

  console.log('[calls] event received:', payload.event);

  if (payload.event === 'call_ended') {
    await handleCallEnded(payload.call || {});
  } else if (payload.event === 'call_analyzed') {
    await handleCallAnalyzed(payload.call || {});
  } else {
    console.log('[calls] unhandled event type, ignoring:', payload.event);
  }
}

async function handleCallEnded(call) {
  const agentId = call.agent_id || null;
  console.log('[debug] agent_id from payload:', agentId);

  let clientId = null;
  try {
    const client = await getClientByAgentId(agentId);
    console.log('[debug] client lookup result:', client);
    clientId = client?.id ?? null;
  } catch (err) {
    console.error('[debug] client lookup error:', err.message);
  }

  if (!clientId) {
    console.warn('[debug] client_id is NULL — no client row matched agent_id:', agentId);
  }

  const callData = {
    call_id: call.call_id || null,
    client_id: clientId,
    transcript: call.transcript || null,
    duration_ms:
      call.end_timestamp && call.start_timestamp
        ? call.end_timestamp - call.start_timestamp
        : null,
    created_at: new Date().toISOString(),
  };

  try {
    await logCall(callData);
  } catch (err) {
    console.error('[calls] logCall failed:', err.message);
  }
}

async function handleCallAnalyzed(call) {
  const callId = call.call_id || null;
  if (!callId) {
    console.error('[calls] call_analyzed payload missing call_id');
    return;
  }

  const analysis = call.call_analysis || {};
  const custom = analysis.custom_analysis_data || {};

  console.log('[calls] call_analyzed — raw call_analysis:', JSON.stringify(analysis, null, 2));
  console.log('[calls] call_analyzed — raw custom_analysis_data:', JSON.stringify(custom, null, 2));

  const updates = {
    caller_name: custom.caller_name || null,
    caller_phone: custom.caller_phone || null,
    reason_for_visit: custom.reason_for_visit || null,
    preferred_times: custom.preferred_day && custom.preferred_time ? `${custom.preferred_day} ${custom.preferred_time}` : custom.preferred_day || custom.preferred_time || null,
    appointment_booked: custom.appointment_booked ?? false,
    sentiment: analysis.user_sentiment || null,
    summary: analysis.call_summary || null,
  };

  console.log('[calls] call_analyzed — fields being written to Supabase:', JSON.stringify(updates, null, 2));

  let updatedCall = null;
  try {
    updatedCall = await updateCallByCallId(callId, updates);
    if (!updatedCall) {
      console.warn('[calls] call_analyzed: no call row found for call_id:', callId);
    }
  } catch (err) {
    console.error('[calls] updateCallByCallId failed:', err.message);
  }

  if (!updatedCall) return;

  if (updatedCall.caller_phone) {
    try {
      await sendSms(updatedCall.caller_phone, buildSmsMessage(updatedCall));
    } catch (err) {
      console.error('[calls] SMS send failed:', err.message);
    }
  }

  try {
    await sendEmailAlert(updatedCall);
  } catch (err) {
    console.error('[calls] Email alert failed:', err.message);
  }
}

router.post('/call-start', (_req, res) => {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Australia/Sydney' }));
  const day = now.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const hour = now.getHours();
  const minute = now.getMinutes();
  const timeVal = hour * 60 + minute;

  // Clinic hours in minutes since midnight
  const hours = {
    1: { open: 8 * 60,  close: 17 * 60 }, // Mon
    2: { open: 8 * 60,  close: 17 * 60 }, // Tue
    3: { open: 8 * 60,  close: 17 * 60 }, // Wed
    4: { open: 9 * 60,  close: 18 * 60 }, // Thu
    5: { open: 9 * 60,  close: 18 * 60 }, // Fri
    6: { open: 9 * 60,  close: 13 * 60 }, // Sat
  };

  const todayHours = hours[day];
  const isOpen = todayHours && timeVal >= todayHours.open && timeVal < todayHours.close;

  const callback_message = isOpen ? 'usually within the hour' : 'first thing when we open';

  res.status(200).json({ callback_message });
});

function buildSmsMessage(data) {
  const name = data.caller_name || 'there';
  return `Hi ${name}! Thanks for calling The Dentl Studio. Our team will be in touch shortly to confirm your appointment. Reply STOP to unsubscribe.`;
}

module.exports = router;
