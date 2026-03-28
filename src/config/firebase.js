const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
// For production: use a service account JSON file
// Set FIREBASE_SERVICE_ACCOUNT_PATH env var to the path of your service account JSON
// Or set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY individually

let firebaseInitialized = false;

function initializeFirebase() {
  if (firebaseInitialized) return;

  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else if (process.env.FIREBASE_PROJECT_ID) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
    } else {
      console.warn('Firebase credentials not configured. Push notifications will be logged but not sent.');
      return;
    }

    firebaseInitialized = true;
    console.log('Firebase Admin SDK initialized');
  } catch (error) {
    console.error('Firebase initialization error:', error.message);
  }
}

initializeFirebase();

module.exports = { admin, firebaseInitialized: () => firebaseInitialized };
