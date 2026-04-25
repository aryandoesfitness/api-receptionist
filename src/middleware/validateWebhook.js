const crypto = require('crypto');
const { validateSignature } = require('../services/retell');

function validateWebhook(req, res, next) {
  const internalKey = process.env.INTERNAL_API_KEY;
  const internalHeader = req.headers['x-internal-api-key'];

  if (internalKey && internalHeader) {
    const match = crypto.timingSafeEqual(
      Buffer.from(internalHeader),
      Buffer.from(internalKey)
    );
    if (match) return next();
  }

  const signature = req.headers['x-retell-signature'];
  const rawBody = req.rawBody;
  const apiKey = process.env.RETELL_API_KEY;

  if (!validateSignature(rawBody, signature, apiKey)) {
    return res.status(401).json({ error: 'Invalid webhook signature' });
  }

  next();
}

module.exports = validateWebhook;
