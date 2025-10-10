import { app } from './firebase-init.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const auth = getAuth(app);
const db = getFirestore(app);

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

const showLoginView = (event) => {
    if (event) event.preventDefault(); // FIX: Prevent default link behavior
    signupContainer.style.display = 'none';
    loginContainer.style.display = 'block';
};
const showSignupView = (event) => {
    if (event) event.preventDefault(); // FIX: Prevent default link behavior
    loginContainer.style.display = 'none';
    signupContainer.style.display = 'block';
};

showSignupLink.addEventListener('click', showSignupView);
showLoginLink.addEventListener('click', showLoginView);

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

signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const role = document.querySelector('input[name="role"]:checked').value;

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        const userProfile = {
            uid: user.uid,
            name: name,
            email: email,
            role: role,
            createdAt: new Date()
        };
        
        if (role === 'provider') {
            userProfile.location = document.getElementById('signup-location').value;
            userProfile.telephone = document.getElementById('signup-tel').value;
            userProfile.businessName = document.getElementById('signup-bname').value || '';
            userProfile.profilePicUrl = ''; 
        }

        await setDoc(doc(db, "users", user.uid), userProfile);
        redirectToDashboard(role);

    } catch (error) {
        console.error("Error signing up:", error);
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

        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
            const userData = userDoc.data();
            redirectToDashboard(userData.role);
        } else {
            console.error("No user profile found in Firestore for this user.");
            alert("Could not find user profile. Please contact support.");
        }

    } catch (error) {
        console.error("Error signing in:", error);
        alert(`Error: ${error.message}`);
    }
});

function redirectToDashboard(role) {
    if (role === 'provider') {
        window.location.href = 'provider-dashboard.html';
    } else {
        window.location.href = 'seeker-dashboard.html';
    }
}

showLoginView();