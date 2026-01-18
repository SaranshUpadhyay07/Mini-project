import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Initialize Firebase Admin SDK
// You need to download the service account key from Firebase Console
// Go to Project Settings > Service Accounts > Generate New Private Key
// Save it as firebase-service-account.json in the config folder

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let firebaseAdmin;

try {
  const serviceAccount = JSON.parse(
    readFileSync(join(__dirname, 'firebase-service-account.json'), 'utf-8')
  );
  
  firebaseAdmin = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'pilgrim-itinerary-odisha'
  });
  
  console.log('✅ Firebase Admin initialized successfully');
} catch (error) {
  console.error('❌ Firebase Admin initialization failed:', error.message);
  console.log('⚠️  Please download the service account key from Firebase Console');
}

export default firebaseAdmin;
