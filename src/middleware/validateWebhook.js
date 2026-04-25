const { validateSignature } = require('../services/retell');

function validateWebhook(req, res, next) {
  const signature = req.headers['x-retell-signature'];
  const rawBody = req.rawBody;
  const apiKey = process.env.RETELL_API_KEY;

  if (!validateSignature(rawBody, signature, apiKey)) {
    return res.status(401).json({ error: 'Invalid webhook signature' });
  }

  next();
}

module.exports = validateWebhook;
