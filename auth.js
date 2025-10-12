import { app } from './firebase-init.js';
import { 
    getAuth, 
    onAuthStateChanged,
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
    sendEmailVerification,
    applyActionCode 
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc 
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { uploadToCloudinary } from './cloudinary-upload.js';
import { showToast, hideToast, showButtonLoader, hideButtonLoader } from './notifications.js';

const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// --- UI Elements ---
const loginContainer = document.getElementById('login-form-container');
const signupContainer = document.getElementById('signup-form-container');
const verificationNotice = document.getElementById('verification-notice');
const showSignupLink = document.getElementById('show-signup-link');
const showLoginLink = document.getElementById('show-login-link');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const googleLoginBtn = document.getElementById('google-login-btn');
const googleSignupBtn = document.getElementById('google-signup-btn');
const photoInput = document.getElementById('profile-photo-input');
const photoPreview = document.getElementById('photo-preview');
const passwordToggles = document.querySelectorAll('.password-toggle');
// NEW: Elements for the interactive verification view
const verificationEmailDisplay = document.getElementById('verification-email-display');
const resendVerificationBtn = document.getElementById('resend-verification-btn');
const goBackToSignupLink = document.getElementById('go-back-to-signup');

// NEW: A variable to hold the user object for verification actions (like resending email)
let userForVerification = null;

// --- REDIRECT LOGIC FOR LOGGED-IN USERS ---
onAuthStateChanged(auth, (user) => {
    if (user && user.emailVerified) {
        console.log("User is already logged in and verified. Redirecting to dashboard...");
        window.location.href = 'dashboard.html';
    }
});

// --- View Switching Logic ---
const showLoginView = (e) => { 
    if (e) e.preventDefault(); 
    signupContainer.style.display = 'none'; 
    verificationNotice.style.display = 'none'; 
    loginContainer.style.display = 'block'; 
};

const showSignupView = (e) => { 
    if (e) e.preventDefault(); 
    loginContainer.style.display = 'none'; 
    verificationNotice.style.display = 'none'; 
    signupContainer.style.display = 'block'; 
};

// MODIFIED: This function now accepts the user object to dynamically update the view
const showVerificationView = (user) => {
    userForVerification = user; // Store the user for the "Resend" action
    if (user && user.email) {
        verificationEmailDisplay.textContent = user.email; // Display the user's email
    }
    loginContainer.style.display = 'none';
    signupContainer.style.display = 'none';
    verificationNotice.style.display = 'block';
};

// --- Event Listeners ---
showSignupLink.addEventListener('click', showSignupView);
showLoginLink.addEventListener('click', showLoginView);
// NEW: Link to go back to signup from verification view
goBackToSignupLink.addEventListener('click', showSignupView);


// NEW: Event listener for the "Resend Verification Email" button
resendVerificationBtn.addEventListener('click', async () => {
    if (!userForVerification) {
        showToast("Could not find user data. Please try signing up again.", "error");
        return;
    }

    const resendButton = resendVerificationBtn;
    showButtonLoader(resendButton);
    showToast("Sending a new verification link...", "progress");

    try {
        const actionCodeSettings = { url: window.location.origin, handleCodeInApp: true }; // Use origin for link
        await sendEmailVerification(userForVerification, actionCodeSettings);
        hideToast();
        showToast("A new verification link has been sent to your email!", "success");
    } catch (error) {
        hideToast();
        // Firebase has built-in throttling to prevent spamming
        if (error.code === 'auth/too-many-requests') {
            showToast("You've requested this too many times. Please wait a while before trying again.", "error");
        } else {
            showToast(`Error: ${error.message}`, "error");
        }
    } finally {
        hideButtonLoader(resendButton);
    }
});


photoInput.addEventListener('change', () => {
    if (photoInput.files && photoInput.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => { photoPreview.src = e.target.result; };
        reader.readAsDataURL(photoInput.files[0]);
    }
});

passwordToggles.forEach(toggle => {
    toggle.addEventListener('click', () => {
        const passwordInput = toggle.previousElementSibling;
        const icon = toggle.querySelector('i');
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            passwordInput.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    });
});

// --- Main Auth Logic ---

signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitButton = signupForm.querySelector('.btn-submit');
    showButtonLoader(submitButton);

    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const retypePassword = document.getElementById('signup-retype-password').value;
    const location = document.getElementById('signup-location').value;
    const telephone = document.getElementById('signup-tel').value;
    const photoFile = photoInput.files[0];

    if (password !== retypePassword) {
        showToast("Passwords do not match.", "error");
        hideButtonLoader(submitButton);
        return;
    }

    try {
        showToast("Creating your account...", "progress");
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        let profilePicUrl = '';
        if (photoFile) {
            showToast("Uploading profile picture...", "progress");
            profilePicUrl = await uploadToCloudinary(photoFile);
        }

        showToast("Saving your profile...", "progress");
        const userProfile = { 
            uid: user.uid, name, email, role: 'user', isProvider: false,
            location, telephone, profilePicUrl, createdAt: new Date() 
        };
        await setDoc(doc(db, "users", user.uid), userProfile);

        showToast("Sending verification email...", "progress");
        const actionCodeSettings = { url: window.location.origin, handleCodeInApp: true };
        await sendEmailVerification(user, actionCodeSettings);

        hideToast();
        // MODIFIED: Pass the new user object to the verification view
        showVerificationView(user); 

    } catch (error) {
        hideToast();
        showToast(`Error: ${error.message}`, "error");
    } finally {
        hideButtonLoader(submitButton);
    }
});

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitButton = loginForm.querySelector('.btn-submit');
    showButtonLoader(submitButton);

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // MODIFIED: Handle the case where the user exists but hasn't verified their email
        if (!user.emailVerified) {
            showToast("Your email is not verified. Please check your inbox.", "warning");
            showVerificationView(user); // Take them to the interactive verification screen
            hideButtonLoader(submitButton);
            return;
        }
        // If verified, proceed to dashboard
        window.location.href = 'dashboard.html';
    } catch (error) {
        showToast(`Login Error: ${error.message}`, "error");
        hideButtonLoader(submitButton);
    }
});

const handleGoogleSignIn = async () => {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        if (!userDoc.exists()) {
            const userProfile = {
                uid: user.uid, name: user.displayName, email: user.email,
                role: 'user', isProvider: false, createdAt: new Date(), 
                profilePicUrl: user.photoURL || ''
            };
            await setDoc(userDocRef, userProfile);
        }
        window.location.href = 'dashboard.html';
    } catch (error) {
        showToast(`Google Sign-In Error: ${error.message}`, "error");
    }
};

googleLoginBtn.addEventListener('click', handleGoogleSignIn);
googleSignupBtn.addEventListener('click', handleGoogleSignIn);

const handleVerificationRedirect = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('mode') === 'verifyEmail') {
        const oobCode = urlParams.get('oobCode');
        if (!oobCode) return;

        try {
            showToast('Verifying your email...', 'progress');
            await applyActionCode(auth, oobCode);
            hideToast();
            showToast('Email verified successfully! You can now log in.', 'success');
            // Show the login form after successful verification
            showLoginView();
        } catch (error) {
            hideToast();
            showToast('Error: The verification link is invalid or expired.', 'error');
        }
        // Clean the URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }
};

// Initial setup
handleVerificationRedirect();
showLoginView();