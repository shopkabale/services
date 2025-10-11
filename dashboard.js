import { app } from './firebase-init.js';
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const auth = getAuth(app);
const db = getFirestore(app);

const profilePictureEl = document.getElementById('profile-picture');
const profileNameEl = document.getElementById('profile-name');
const welcomeMessageEl = document.getElementById('welcome-message');
const logoutBtn = document.getElementById('logout-btn');

onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
            const userData = userDoc.data();
            profileNameEl.textContent = userData.name || 'User';
            welcomeMessageEl.textContent = 'Welcome to your dashboard!';
            profilePictureEl.src = userData.profilePicUrl || `https://placehold.co/120x120/10336d/a7c0e8?text=${(userData.name || 'U').charAt(0)}`;
        } else {
            console.error("No profile document found for user. Logging out.");
            signOut(auth);
        }
    } else {
        window.location.href = 'auth.html';
    }
});

logoutBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
        await signOut(auth);
        window.location.href = 'auth.html';
    } catch (error) {
        console.error("Error signing out:", error);
    }
});