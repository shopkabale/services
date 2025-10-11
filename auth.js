import { app } from './firebase-init.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, sendEmailVerification, applyActionCode } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { uploadToCloudinary } from './cloudinary-upload.js';

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

signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const retypePassword = document.getElementById('signup-retype-password').value;
    const location = document.getElementById('signup-location').value;
    const telephone = document.getElementById('signup-tel').value;
    const photoFile = photoInput.files[0];

    if (password !== retypePassword) {
        alert("Passwords do not match.");
        return;
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        let profilePicUrl = '';
        if (photoFile) {
            try {
                profilePicUrl = await uploadToCloudinary(photoFile);
            } catch (uploadError) {
                console.error("Profile photo upload failed:", uploadError);
                alert("Account created, but photo failed to upload.");
            }
        }

        const userProfile = { 
            uid: user.uid, name, email, role: 'user', // ALL users are created with a universal 'user' role
            isProvider: false, // We can add a flag to track if they become a provider later
            location, telephone, profilePicUrl, createdAt: new Date() 
        };
        await setDoc(doc(db, "users", user.uid), userProfile);
        
        const actionCodeSettings = { url: window.location.href, handleCodeInApp: true };
        await sendEmailVerification(user, actionCodeSettings);
        
        showVerificationView();

    } catch (error) {
        alert(`Error: ${error.message}`);
    }
});

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        if (!userCredential.user.emailVerified) {
            alert("Please verify your email address before logging in.");
            return;
        }
        window.location.href = 'dashboard.html'; // Always redirect to the universal dashboard
    } catch (error) {
        alert(`Error: ${error.message}`);
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
        window.location.href = 'dashboard.html'; // Always redirect to the universal dashboard
    } catch (error) {
        alert(`Google Sign-In Error: ${error.message}`);
    }
};

googleLoginBtn.addEventListener('click', handleGoogleSignIn);
googleSignupBtn.addEventListener('click', handleGoogleSignIn);

const handleVerificationRedirect = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('mode') === 'verifyEmail') {
        try {
            await applyActionCode(auth, urlParams.get('oobCode'));
            alert('Email verified successfully! You can now log in.');
        } catch (error) {
            alert('Error verifying email. The link may be invalid or expired.');
        }
    }
};

handleVerificationRedirect();
showLoginView();