const fs = require('fs');

const admin = require('firebase-admin');

let firebaseInitialized = false;

function buildCredentialFromEnv() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  return {
    projectId,
    clientEmail,
    privateKey: privateKey.replace(/\\n/g, '\n'),
  };
}

function buildCredentialFromFile() {
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

  if (!serviceAccountPath || !fs.existsSync(serviceAccountPath)) {
    return null;
  }

  return require(serviceAccountPath);
}

function initializeFirebaseAdmin() {
  if (firebaseInitialized) {
    return true;
  }

  const serviceAccount = buildCredentialFromFile() || buildCredentialFromEnv();

  if (!serviceAccount) {
    console.warn('Firebase Admin not configured. Add a service account file or env credentials.');
    return false;
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  firebaseInitialized = true;
  console.log('Firebase Admin initialized');
  return true;
}

function isFirebaseAdminReady() {
  return firebaseInitialized;
}

module.exports = {
  admin,
  initializeFirebaseAdmin,
  isFirebaseAdminReady,
};
