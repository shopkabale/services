// --- Import Firebase Services ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";

// --- IMPORTANT: REPLACE WITH YOUR ACTUAL FIREBASE CONFIG KEYS ---
// You get these keys from your Firebase project settings.
// This is the ONLY place you need to put your keys.
const firebaseConfig = {
  apiKey: "AIzaSy...YOUR_API_KEY", // Replace with your key
  authDomain: "your-project-id.firebaseapp.com", // Replace with your domain
  projectId: "your-project-id", // Replace with your project ID
  storageBucket: "your-project-id.appspot.com", // Replace with your storage bucket
  messagingSenderId: "1234567890", // Replace with your sender ID
  appId: "1:1234567890:web:abcdef123456" // Replace with your App ID
};

// NOTE: It is okay to have these keys here. These specific Firebase keys are designed 
// to be public and are necessary for the front-end to connect to your Firebase services. 
// Your security is handled by Firebase's "Security Rules" on the backend.

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Export the initialized app instance so other scripts can use it
export { app };

