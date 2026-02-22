import admin from "firebase-admin";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const FILE = "api/config/firebase.config.js";

// Initialize Firebase Admin SDK
// You need to download the service account key from Firebase Console
// Go to Project Settings > Service Accounts > Generate New Private Key
// Save it as firebase-service-account.json in the config folder

console.log(`[${FILE}] [init] starting Firebase Admin initialization`);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let firebaseAdmin;

try {
  const serviceAccountPath = join(
    __dirname,
    "pilgrim-itinerary-odisha-firebase-adminsdk-fbsvc-c490868502.json",
  );
  console.log(
    `[${FILE}] [init] reading service account file: ${serviceAccountPath}`,
  );

  const serviceAccountRaw = readFileSync(serviceAccountPath, "utf-8");
  console.log(`[${FILE}] [init] service account file read OK`);

  const serviceAccount = JSON.parse(serviceAccountRaw);
  console.log(`[${FILE}] [init] service account JSON parsed OK`);

  firebaseAdmin = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: "pilgrim-itinerary-odisha",
  });

  console.log(`[${FILE}] [init] Firebase Admin initialized successfully`);
} catch (error) {
  console.error(
    `[${FILE}] [init] Firebase Admin initialization failed:`,
    error.message,
  );
  console.log(
    `[${FILE}] [init] continuing without Firebase - Places API will still work`,
  );
}

export default firebaseAdmin;
