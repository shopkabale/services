// --- Import Firebase Services ---
// This assumes you have set up your project to use ES modules.
// The URLs point to the Firebase CDN.
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- Initialize Firebase ---
// These variables are securely provided by Cloudflare Pages during the build process.
// Your local development environment won't have them, so we add fallbacks.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'YOUR_LOCAL_API_KEY',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase App and Services
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- UI ELEMENT SELECTORS ---
const loginContainer = document.getElementById('login-form-container');
const signupContainer = document.getElementById('signup-form-container');
const showSignupLink = document.getElementById('show-signup-link');
const showLoginLink = document.getElementById('show-login-link');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const providerFields = document.getElementById('provider-fields');
const roleRadios = document.querySelectorAll('input[name="role"]');
const photoInput = document.getElementById('profile-photo-input');
const photoPreview = document.getElementById('photo-preview');

// --- VIEW TOGGLING LOGIC ---
const showLoginView = () => {
    signupContainer.style.display = 'none';
    loginContainer.style.display = 'block';
};
const showSignupView = () => {
    loginContainer.style.display = 'none';
    signupContainer.style.display = 'block';
};
showSignupLink.addEventListener('click', showSignupView);
showLoginLink.addEventListener('click', showLoginView);

// --- DYNAMIC SIGN-UP FORM LOGIC ---
roleRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
        const isProvider = e.target.value === 'provider';
        providerFields.classList.toggle('visible', isProvider);
        document.getElementById('signup-location').required = isProvider;
        document.getElementById('signup-tel').required = isProvider;
    });
});
photoInput.addEventListener('change', () => {
    if (photoInput.files && photoInput.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => { photoPreview.src = e.target.result; };
        reader.readAsDataURL(photoInput.files[0]);
    }
});

// --- FIREBASE AUTHENTICATION LOGIC ---

// Handle Sign-Up
signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const role = document.querySelector('input[name="role"]:checked').value;

    try {
        // 1. Create user in Firebase Authentication
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // 2. Create a user profile document in Firestore
        const userProfile = {
            uid: user.uid,
            name: name,
            email: email,
            role: role,
            createdAt: new Date()
        };
        
        // Add provider-specific fields if the role is 'provider'
        if (role === 'provider') {
            userProfile.location = document.getElementById('signup-location').value;
            userProfile.telephone = document.getElementById('signup-tel').value;
            userProfile.businessName = document.getElementById('signup-bname').value || '';
            // In a real app, you would upload the photo to Cloudinary here and save the URL.
            // For now, we'll save a placeholder.
            userProfile.profilePicUrl = ''; 
        }

        await setDoc(doc(db, "users", user.uid), userProfile);

        // 3. Redirect to the correct dashboard
        redirectToDashboard(role);

    } catch (error) {
        console.error("Error signing up:", error);
        alert(`Error: ${error.message}`);
    }
});


// Handle Login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        // 1. Sign in user with Firebase Authentication
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // 2. Get the user's role from their Firestore profile
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
            const userData = userDoc.data();
            // 3. Redirect to the correct dashboard based on the stored role
            redirectToDashboard(userData.role);
        } else {
            // This is an edge case, but good to handle
            console.error("No user profile found in Firestore for this user.");
            alert("Could not find user profile. Please contact support.");
        }

    } catch (error) {
        console.error("Error signing in:", error);
        alert(`Error: ${error.message}`);
    }
});

// --- HELPER FUNCTION ---
function redirectToDashboard(role) {
    if (role === 'provider') {
        window.location.href = 'provider-dashboard.html';
    } else {
        window.location.href = 'seeker-dashboard.html';
    }
}

// Set initial view
showLoginView();

