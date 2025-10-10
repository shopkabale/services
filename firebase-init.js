// --- Import Firebase Services ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";

// --- IMPORTANT: REPLACE WITH YOUR ACTUAL FIREBASE CONFIG KEYS ---
// You get these keys from your Firebase project settings.
// This is the ONLY place you need to put your keys.
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAQsTpibEtyPOEztSK8uMWSK97ehJ7J-Bc",
  authDomain: "kabale-online.firebaseapp.com",
  projectId: "kabale-online",
  storageBucket: "kabale-online.firebasestorage.app",
  messagingSenderId: "773630007249",
  appId: "1:773630007249:web:99727d36a517b5ff3632f0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// NOTE: It is okay to have these keys here. These specific Firebase keys are designed 
// to be public and are necessary for the front-end to connect to your Firebase services. 
// Your security is handled by Firebase's "Security Rules" on the backend.

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Export the initialized app instance so other scripts can use it
export { app };

