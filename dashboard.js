import { app } from './firebase-init.js';
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const auth = getAuth(app);
const db = getFirestore(app);

const profilePictureEl = document.getElementById('profile-picture');
const profileNameEl = document.getElementById('profile-name');
const welcomeMessageEl = document.getElementById('welcome-message');

// This listener is now only responsible for fetching and displaying the user's data.
// The security redirect and logout are handled by global-auth.js.
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
            // If the user's profile is somehow missing, the global script will handle logout.
            console.error("No profile document found for user.");
        }
    }
    // If user is not logged in, global-auth.js will redirect them.
});