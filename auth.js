import { app } from './firebase-init.js';
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
    sendEmailVerification
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc 
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

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
const providerFields = document.getElementById('provider-fields');
const roleRadios = document.querySelectorAll('input[name="role"]');

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
const showVerificationView = () => {
    loginContainer.style.display = 'none';
    signupContainer.style.display = 'none';
    verificationNotice.style.display = 'block';
};

showSignupLink.addEventListener('click', showSignupView);
showLoginLink.addEventListener('click', showSignupView); // Both links on signup form now go to login
document.querySelectorAll('#show-login-link').forEach(el => el.addEventListener('click', showLoginView));


roleRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
        const isProvider = e.target.value === 'provider';
        providerFields.classList.toggle('visible', isProvider);
        document.getElementById('signup-location').required = isProvider;
        document.getElementById('signup-tel').required = isProvider;
    });
});

signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const role = document.querySelector('input[name="role"]:checked').value;

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await sendEmailVerification(user);

        const userProfile = {
            uid: user.uid, name, email, role, createdAt: new Date()
        };
        if (role === 'provider') {
            userProfile.location = document.getElementById('signup-location').value;
            userProfile.telephone = document.getElementById('signup-tel').value;
            userProfile.businessName = document.getElementById('signup-bname').value || '';
        }
        await setDoc(doc(db, "users", user.uid), userProfile);
        
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
        const user = userCredential.user;

        if (!user.emailVerified) {
            alert("Please verify your email address before logging in. Check your inbox for a verification link.");
            return;
        }

        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
            redirectToDashboard(userDoc.data().role);
        } else {
            alert("Could not find user profile.");
        }
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

        let userRole = 'seeker'; // Default role

        if (!userDoc.exists()) {
            // New user, create their profile
            const userProfile = {
                uid: user.uid,
                name: user.displayName,
                email: user.email,
                role: 'seeker', // New Google sign-ups default to seeker
                createdAt: new Date()
            };
            await setDoc(userDocRef, userProfile);
        } else {
            // Existing user, get their role
            userRole = userDoc.data().role;
        }
        
        redirectToDashboard(userRole);

    } catch (error) {
        alert(`Google Sign-In Error: ${error.message}`);
    }
};

googleLoginBtn.addEventListener('click', handleGoogleSignIn);
googleSignupBtn.addEventListener('click', handleGoogleSignIn);

function redirectToDashboard(role) {
    window.location.href = role === 'provider' ? 'provider-dashboard.html' : 'seeker-dashboard.html';
}

showLoginView();