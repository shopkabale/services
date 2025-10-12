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
    sendPasswordResetEmail // NEW: Import password reset function
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

// --- NEW: Elements for Password Reset ---
const forgotPasswordLink = document.getElementById('forgot-password-link');
const passwordResetModal = document.getElementById('password-reset-modal');
const closeResetModalBtn = document.getElementById('close-reset-modal-btn');
const passwordResetForm = document.getElementById('password-reset-form');

let userForVerification = null;

// --- REDIRECT LOGIC FOR LOGGED-IN USERS ---
onAuthStateChanged(auth, (user) => {
    if (user && user.emailVerified) {
        console.log("User is already logged in and verified. Redirecting...");
        
        // Check if user is an admin to redirect to the correct dashboard
        const userDocRef = doc(db, "users", user.uid);
        getDoc(userDocRef).then(userDoc => {
            if (userDoc.exists() && userDoc.data().isAdmin === true) {
                window.location.href = 'admin.html';
            } else {
                window.location.href = 'dashboard.html';
            }
        }).catch(() => {
            // Default redirect if Firestore check fails
            window.location.href = 'dashboard.html';
        });
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
        showToast(`Error: ${error.message}`, "error");
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

// --- NEW: Event Listeners for Password Reset Modal ---
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

// NEW: Password Reset Form Submission
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
        showToast(`Error: ${error.message}`, 'error');
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
        showToast(`Error: ${error.message}`, "error");
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
        // Redirect logic is now handled by onAuthStateChanged
    } catch (error) {
        showToast(`Login Error: ${error.message}`, "error");
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
        if (!userDoc.exists()) {
            const userProfile = {
                uid: user.uid, name: user.displayName, email: user.email,
                role: 'user', isProvider: false, createdAt: new Date(), 
                profilePicUrl: user.photoURL || ''
            };
            await setDoc(userDocRef, userProfile);
        }
        // Redirect logic is now handled by onAuthStateChanged
    } catch (error) {
        showToast(`Google Sign-In Error: ${error.message}`, "error");
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

// Initial setup
handleVerificationRedirect();
showLoginView();