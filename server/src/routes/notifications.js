const express = require('express');

const { admin, isFirebaseAdminReady } = require('../config/firebaseAdmin');
const firebaseAuth = require('../middleware/firebaseAuth');
const DeviceToken = require('../models/DeviceToken');

const router = express.Router();

router.post('/register-token', firebaseAuth, async (req, res) => {
  const { fcmToken, platform = 'unknown' } = req.body;

  if (!fcmToken) {
    return res.status(400).json({
      message: 'fcmToken is required.',
    });
  }

  const deviceToken = await DeviceToken.findOneAndUpdate(
    { fcmToken },
    {
      userUid: req.firebaseUser.uid,
      fcmToken,
      platform,
      isActive: true,
      lastSeenAt: new Date(),
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  );

  res.status(201).json({
    message: 'FCM token registered',
    data: deviceToken,
  });
});

router.post('/send', async (req, res) => {
  if (!isFirebaseAdminReady()) {
    return res.status(503).json({
      message: 'Firebase Admin is not configured yet.',
    });
  }

  const { token, title, body, data = {} } = req.body;

  if (!token || !title || !body) {
    return res.status(400).json({
      message: 'token, title, and body are required.',
    });
  }

  try {
    const response = await admin.messaging().send({
      token,
      notification: { title, body },
      data,
    });

    res.json({
      message: 'Push notification sent',
      firebaseMessageId: response,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to send push notification.',
      error: error.message,
    });
  }
});

module.exports = router;
