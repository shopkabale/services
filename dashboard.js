import { app } from './firebase-init.js';
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const auth = getAuth(app);
const db = getFirestore(app);

const profilePictureEl = document.getElementById('profile-picture');
const profileNameEl = document.getElementById('profile-name');
const welcomeMessageEl = document.getElementById('welcome-message');

onAuthStateChanged(auth, async (user) => {
    // Check if a user is logged in AND their email is verified
    if (user && user.emailVerified) {
        const userDocRef = doc(db, "users", user.uid);
        try {
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                const userData = userDoc.data();
                profileNameEl.textContent = userData.name || 'User';
                welcomeMessageEl.textContent = 'Welcome to your dashboard!';
                profilePictureEl.src = userData.profilePicUrl || `https://placehold.co/120x120/10336d/a7c0e8?text=${(userData.name || 'U').charAt(0)}`;
            } else {
                // If the user's profile is missing, they can't use the dashboard properly
                console.error("No profile document found for this user. Redirecting to login.");
                window.location.href = 'auth.html';
            }
        } catch (error) {
            console.error("Error fetching user data:", error);
            window.location.href = 'auth.html';
        }
    } else {
        // If there is no user or their email is not verified, redirect to the login page.
        console.log("User not logged in or email not verified. Redirecting...");
        window.location.href = 'auth.html';
    }
});