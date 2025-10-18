// --- Import Firebase Services ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";

// --- IMPORTANT: PASTE YOUR FIREBASE CONFIGURATION KEYS HERE ---
// Replace the placeholder values below with the actual keys from your Firebase project settings.
const firebaseConfig = {
  apiKey: "AIzaSyBLf0fZUFGXS9NMS3rMr8Iisy-siAAiIyI",
  authDomain: "kabale-20ec4.firebaseapp.com",
  projectId: "kabale-20ec4",
  storageBucket: "kabale-20ec4.firebasestorage.app",
  messagingSenderId: "792218710477",
  appId: "1:792218710477:web:5a32cc3177ddba98ff5484",
  measurementId: "G-5XQRYNC9TW"
};


// Initialize the Firebase App with your configuration
const app = initializeApp(firebaseConfig);

// Export the initialized 'app' instance for other scripts to use
export { app };