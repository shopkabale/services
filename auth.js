import { app } from './firebase-init.js';
import { 
    getAuth, 
    onAuthStateChanged,
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
    sendEmailVerification,
    applyActionCode,
    sendPasswordResetEmail
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
const verificationEmailDisplay = document.getElementById('verification-email-display');
const resendVerificationBtn = document.getElementById('resend-verification-btn');
const goBackToSignupLink = document.getElementById('go-back-to-signup');
const forgotPasswordLink = document.getElementById('forgot-password-link');
const passwordResetModal = document.getElementById('password-reset-modal');
const closeResetModalBtn = document.getElementById('close-reset-modal-btn');
const passwordResetForm = document.getElementById('password-reset-form');

let userForVerification = null;

// --- Helper function for friendly error messages ---
function getFriendlyAuthError(errorCode) {
    switch (errorCode) {
        case 'auth/invalid-credential':
        case 'auth/user-not-found':
        case 'auth/wrong-password':
            return 'Invalid email or password. Please try again.';
        case 'auth/email-already-in-use':
            return 'An account with this email address already exists.';
        case 'auth/weak-password':
            return 'Your password should be at least 6 characters long.';
        case 'auth/too-many-requests':
            return 'Access to this account has been temporarily disabled. Please reset your password or try again later.';
        default:
            return 'An unexpected error occurred. Please try again.';
    }
}

// --- Centralized Redirect Function ---
async function redirectUser(user) {
    const userDocRef = doc(db, "users", user.uid);
    try {
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists() && userDoc.data().isAdmin === true) {
            window.location.href = 'admin.html';
        } else {
            window.location.href = 'dashboard.html';
        }
    } catch (error) {
        console.error("Redirect check failed:", error);
        window.location.href = 'dashboard.html'; // Default redirect
    }
}

// --- REDIRECT LOGIC FOR USERS ALREADY LOGGED IN ---
onAuthStateChanged(auth, (user) => {
    // This only handles users who are already logged in when they first land on the auth page.
    if (user && user.emailVerified) {
        redirectUser(user);
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

const showVerificationView = (user) => {
    userForVerification = user;
    if (user && user.email) {
        verificationEmailDisplay.textContent = user.email;
    }
    loginContainer.style.display = 'none';
    signupContainer.style.display = 'none';
    verificationNotice.style.display = 'block';
};

// --- Event Listeners ---
showSignupLink.addEventListener('click', showSignupView);
showLoginLink.addEventListener('click', showLoginView);
goBackToSignupLink.addEventListener('click', showSignupView);

resendVerificationBtn.addEventListener('click', async () => {
    if (!userForVerification) {
        showToast("Could not find user data. Please try signing up again.", "error");
        return;
    }
    const resendButton = resendVerificationBtn;
    showButtonLoader(resendButton);
    try {
        const actionCodeSettings = { url: window.location.origin, handleCodeInApp: true };
        await sendEmailVerification(userForVerification, actionCodeSettings);
        showToast("A new verification link has been sent!", "success");
    } catch (error) {
        showToast(getFriendlyAuthError(error.code), "error");
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
            icon.classList.replace('fa-eye', 'fa-eye-slash');
        } else {
            passwordInput.type = 'password';
            icon.classList.replace('fa-eye-slash', 'fa-eye');
        }
    });
});

// Event Listeners for Password Reset Modal
forgotPasswordLink.addEventListener('click', (e) => {
    e.preventDefault();
    passwordResetModal.classList.add('show');
});

closeResetModalBtn.addEventListener('click', () => {
    passwordResetModal.classList.remove('show');
});

passwordResetModal.addEventListener('click', (e) => {
    if (e.target === passwordResetModal) {
        passwordResetModal.classList.remove('show');
    }
});

// --- Main Auth Logic ---

// Password Reset Form Submission
passwordResetForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitButton = passwordResetForm.querySelector('.btn-submit');
    showButtonLoader(submitButton);
    const email = document.getElementById('reset-email').value;

    try {
        await sendPasswordResetEmail(auth, email);
        showToast('Password reset link sent! Please check your email.', 'success');
        passwordResetModal.classList.remove('show');
    } catch (error) {
        showToast(getFriendlyAuthError(error.code), "error");
    } finally {
        hideButtonLoader(submitButton);
    }
});

// Signup Form Submission
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
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        let profilePicUrl = '';
        if (photoFile) {
            profilePicUrl = await uploadToCloudinary(photoFile);
        }
        const userProfile = { 
            uid: user.uid, name, email, role: 'user', isProvider: false,
            location, telephone, profilePicUrl, createdAt: new Date() 
        };
        await setDoc(doc(db, "users", user.uid), userProfile);
        const actionCodeSettings = { url: window.location.origin, handleCodeInApp: true };
        await sendEmailVerification(user, actionCodeSettings);
        showVerificationView(user); 
    } catch (error) {
        showToast(getFriendlyAuthError(error.code), "error");
    } finally {
        hideButtonLoader(submitButton);
    }
});

// Login Form Submission
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitButton = loginForm.querySelector('.btn-submit');
    showButtonLoader(submitButton);
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        if (!user.emailVerified) {
            showToast("Your email is not verified. Please check your inbox.", "warning");
            showVerificationView(user);
            hideButtonLoader(submitButton);
            return;
        }
        await redirectUser(user);
    } catch (error) {
        showToast(getFriendlyAuthError(error.code), "error");
        hideButtonLoader(submitButton);
    }
});

// Google Sign-In
const handleGoogleSignIn = async () => {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
            // Returning user, send to dashboard
            await redirectUser(user);
        } else {
            // New user, create basic profile and send to edit profile page
            const userProfile = {
                uid: user.uid, name: user.displayName || '', email: user.email,
                role: 'user', isProvider: false, createdAt: new Date(), 
                profilePicUrl: user.photoURL || '',
                telephone: '', location: '', tagline: '', about: ''
            };
            await setDoc(userDocRef, userProfile);
            // Redirect to complete profile
            window.location.href = 'edit-profile.html';
        }

    } catch (error) {
        showToast(getFriendlyAuthError(error.code), "error");
    }
};
googleLoginBtn.addEventListener('click', handleGoogleSignIn);
googleSignupBtn.addEventListener('click', handleGoogleSignIn);

// Verification Link Handling
const handleVerificationRedirect = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('mode') === 'verifyEmail') {
        const oobCode = urlParams.get('oobCode');
        if (!oobCode) return;
        try {
            await applyActionCode(auth, oobCode);
            showToast('Email verified successfully! You can now log in.', 'success');
            showLoginView();
        } catch (error) {
            showToast('Error: The verification link is invalid or expired.', 'error');
        }
        window.history.replaceState({}, document.title, window.location.pathname);
    }
};

// --- Initial Setup ---
handleVerificationRedirect();
showLoginView();