import { app } from './firebase-init.js';
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const auth = getAuth(app);
const db = getFirestore(app);

const profilePictureEl = document.getElementById('profile-picture');
const profileNameEl = document.getElementById('profile-name');
const welcomeMessageEl = document.getElementById('welcome-message');
// --- NEW: Get the badge element ---
const foundingMemberBadge = document.getElementById('founding-member-badge');

onAuthStateChanged(auth, async (user) => {
    if (user && user.emailVerified) {
        const userDocRef = doc(db, "users", user.uid);
        try {
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                const userData = userDoc.data();
                profileNameEl.textContent = userData.name || 'User';
                welcomeMessageEl.textContent = 'Welcome to your dashboard!';
                profilePictureEl.src = userData.profilePicUrl || `https://placehold.co/120x120/10336d/a7c0e8?text=${(userData.name || 'U').charAt(0)}`;
                
                // --- NEW: Check for the founding member flag ---
                if (userData.isFoundingMember === true) {
                    foundingMemberBadge.style.display = 'inline-block'; // Show the badge
                }

            } else {
                console.error("No profile document found for this user. Redirecting to login.");
                window.location.href = 'auth.html';
            }
        } catch (error) {
            console.error("Error fetching user data:", error);
            window.location.href = 'auth.html';
        }
    } else {
        console.log("User not logged in or email not verified. Redirecting...");
        window.location.href = 'auth.html';
    }
});