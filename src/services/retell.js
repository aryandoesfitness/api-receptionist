const crypto = require('crypto');

function validateSignature(rawBody, signature, apiKey) {
  if (!signature || !rawBody || !apiKey) return false;

  const hmac = crypto.createHmac('sha256', apiKey);
  hmac.update(rawBody);
  const expected = hmac.digest('base64');

  try {
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length) return false;
    return crypto.timingSafeEqual(sigBuf, expBuf);
  } catch {
    return false;
  }
}

module.exports = { validateSignature };
