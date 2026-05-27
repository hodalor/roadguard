const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const { isFirebaseAdminReady } = require('./config/firebaseAdmin');
const apiRoutes = require('./routes');

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || '*',
  })
);
app.use(morgan('dev'));
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'RoadGuard Ghana API',
    firebaseAdminReady: isFirebaseAdminReady(),
    timestamp: new Date().toISOString(),
  });
});

app.use('/api', apiRoutes);

module.exports = app;
