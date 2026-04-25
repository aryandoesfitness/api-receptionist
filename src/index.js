require('dotenv').config();
const express = require('express');
const callsRouter = require('./routes/calls');
const clientsRouter = require('./routes/clients');

const app = express();
const PORT = process.env.PORT || 3000;

// Capture raw body buffer before JSON parsing — required for webhook signature validation
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/calls', callsRouter);
app.use('/api/clients', clientsRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
