import { app } from './firebase-init.js';
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const auth = getAuth(app);
const db = getFirestore(app);

const profilePictureEl = document.getElementById('profile-picture');
const profileNameEl = document.getElementById('profile-name');
const welcomeMessageEl = document.getElementById('welcome-message');
const providerSection = document.getElementById('provider-section');
const becomeProviderSection = document.getElementById('become-provider-section');

onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
            const userData = userDoc.data();
            
            // Populate header
            profileNameEl.textContent = userData.name || 'User';
            welcomeMessageEl.textContent = 'Welcome to your dashboard!';
            profilePictureEl.src = userData.profilePicUrl || `https://placehold.co/120x120/10336d/a7c0e8?text=${(userData.name || 'U').charAt(0)}`;
            
            // Show provider sections based on the 'isProvider' flag
            if (userData.isProvider) {
                providerSection.style.display = 'block';
                becomeProviderSection.style.display = 'none';
            } else {
                providerSection.style.display = 'none';
                becomeProviderSection.style.display = 'block';
            }

        } else {
            console.error("No profile document found for user.");
        }
    }
    // The redirect for non-logged-in users is handled by global-auth.js
});