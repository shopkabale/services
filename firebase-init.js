// --- Import Firebase Services ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";

// --- IMPORTANT: PASTE YOUR FIREBASE CONFIGURATION KEYS HERE ---
// Replace the placeholder values below with the actual keys from your Firebase project settings.
const firebaseConfig = {
  apiKey: "AIzaSyAQsTpibEtyPOEztSK8uMWSK97ehJ7J-Bc",
  authDomain: "kabale-online.firebaseapp.com",
  projectId: "kabale-online",
  storageBucket: "kabale-online.firebasestorage.app",
  messagingSenderId: "773630007249",
  appId: "1:773630007249:web:99727d36a517b5ff3632f0"
};


// Initialize the Firebase App with your configuration
const app = initializeApp(firebaseConfig);

// Export the initialized 'app' instance for other scripts to use
export { app };