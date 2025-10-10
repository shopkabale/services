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
const photoInput = document.getElementById('profile-photo-input');
const photoPreview = document.getElementById('photo-preview');
const seekerLabel = document.getElementById('role-seeker-label');
const providerLabel = document.getElementById('role-provider-label');

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
showLoginLink.addEventListener('click', showLoginView);

const handleRoleSelection = () => {
    const isProvider = document.querySelector('input[name="role"]:checked').value === 'provider';
    providerFields.classList.toggle('visible', isProvider);
    document.getElementById('signup-location').required = isProvider;
    document.getElementById('signup-tel').required = isProvider;
    seekerLabel.classList.toggle('selected', !isProvider);
    providerLabel.classList.toggle('selected', isProvider);
};
roleRadios.forEach(radio => radio.addEventListener('change', handleRoleSelection));
handleRoleSelection();

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
    const role = document.querySelector('input[name="role"]:checked').value;

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        await sendEmailVerification(user);

        const userProfile = { uid: user.uid, name, email, role, createdAt: new Date() };
        if (role === 'provider') {
            userProfile.location = document.getElementById('signup-location').value;
            userProfile.telephone = document.getElementById('signup-tel').value;
            userProfile.businessName = document.getElementById('signup-bname').value || '';
            userProfile.profilePicUrl = ''; 
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
            alert("Please verify your email address before logging in. Check your inbox.");
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
        let userRole = 'seeker'; 

        if (!userDoc.exists()) {
            const userProfile = {
                uid: user.uid, name: user.displayName, email: user.email,
                role: 'seeker', createdAt: new Date()
            };
            await setDoc(userDocRef, userProfile);
        } else {
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