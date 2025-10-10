// --- Import Firebase Services ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";

// --- IMPORTANT: REPLACE WITH YOUR ACTUAL FIREBASE CONFIG KEYS ---
// You get these keys from your Firebase project settings.
// This is the ONLY place you need to put your keys.
const firebaseConfig = {
  apiKey: "AIzaSyAsx4bbVcaDm8vAu-KueQ58KvEN8WKmMYY",
  authDomain: "kabale-services.firebaseapp.com",
  projectId: "kabale-services",
  storageBucket: "kabale-services.firebasestorage.app",
  messagingSenderId: "317102060807",
  appId: "1:317102060807:web:155589801bb8de546641a2",
  measurementId: "G-CYVD6FVWFD"
};

// NOTE: It is okay to have these keys here. These specific Firebase keys are designed 
// to be public and are necessary for the front-end to connect to your Firebase services. 
// Your security is handled by Firebase's "Security Rules" on the backend.

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Export the initialized app instance so other scripts can use it
export { app };

