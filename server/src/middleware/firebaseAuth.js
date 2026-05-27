const { admin, isFirebaseAdminReady } = require('../config/firebaseAdmin');

async function firebaseAuth(req, res, next) {
  if (!isFirebaseAdminReady()) {
    return res.status(503).json({
      message: 'Firebase Admin is not configured yet.',
    });
  }

  const header = req.headers.authorization || '';

  if (!header.startsWith('Bearer ')) {
    return res.status(401).json({
      message: 'Missing Firebase Bearer token.',
    });
  }

  try {
    const idToken = header.replace('Bearer ', '').trim();
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.firebaseUser = decodedToken;
    next();
  } catch (error) {
    return res.status(401).json({
      message: 'Invalid Firebase token.',
      error: error.message,
    });
  }
}

module.exports = firebaseAuth;
