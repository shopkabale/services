import { app } from './firebase-init.js';
import { 
    getAuth, 
    onAuthStateChanged, // Import the new function
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

// --- NEW: REDIRECT LOGIC FOR LOGGED-IN USERS ---
// This runs on page load. If the user is already logged in and verified,
// it redirects them away from the auth page to their dashboard.
onAuthStateChanged(auth, (user) => {
    if (user && user.emailVerified) {
        console.log("User is already logged in and verified. Redirecting to dashboard...");
        window.location.href = 'dashboard.html';
    }
    // If no user, or user is not verified, the script will continue and show the login/signup forms.
});


const showLoginView = (e) => { if (e) e.preventDefault(); signupContainer.style.display = 'none'; verificationNotice.style.display = 'none'; loginContainer.style.display = 'block'; };
const showSignupView = (e) => { if (e) e.preventDefault(); loginContainer.style.display = 'none'; verificationNotice.style.display = 'none'; signupContainer.style.display = 'block'; };
const showVerificationView = () => { loginContainer.style.display = 'none'; signupContainer.style.display = 'none'; verificationNotice.style.display = 'block'; };

showSignupLink.addEventListener('click', showSignupView);
showLoginLink.addEventListener('click', showLoginView);

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
        const actionCodeSettings = { url: window.location.href, handleCodeInApp: true };
        await sendEmailVerification(user, actionCodeSettings);
        
        hideToast();
        showVerificationView();

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
        if (!userCredential.user.emailVerified) {
            showToast("Please verify your email before logging in.", "error");
            hideButtonLoader(submitButton);
            return;
        }
        window.location.href = 'dashboard.html';
    } catch (error) {
        showToast(`Error: ${error.message}`, "error");
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
        try {
            await applyActionCode(auth, urlParams.get('oobCode'));
            showToast('Email verified successfully! You can now log in.', 'success');
        } catch (error) {
            showToast('Error: The verification link is invalid or expired.', 'error');
        }
        window.history.replaceState({}, document.title, window.location.pathname);
    }
};

handleVerificationRedirect();
showLoginView();