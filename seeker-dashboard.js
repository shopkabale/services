// --- Import Firebase Services & Initialized App ---
import { app } from './firebase-init.js';
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const auth = getAuth(app);
const db = getFirestore(app);

// --- ELEMENT SELECTORS ---
const profilePictureEl = document.getElementById('profile-picture');
const profileNameEl = document.getElementById('profile-name');
const welcomeMessageEl = document.getElementById('welcome-message');
const logoutBtn = document.getElementById('logout-btn');

// --- AUTHENTICATION & DATA FETCHING ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // User is signed in.
        const uid = user.uid;

        // Fetch user's profile from Firestore.
        const userDocRef = doc(db, "users", uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
            const userData = userDoc.data();
            
            // Security Check: Ensure the user is a seeker.
            if (userData.role !== 'seeker') {
                window.location.href = 'provider-dashboard.html';
                return;
            }

            // Update the UI with the user's data.
            profileNameEl.textContent = userData.name || 'User';
            welcomeMessageEl.textContent = 'Ready to find the perfect service?';

            if (userData.profilePicUrl) {
                profilePictureEl.src = userData.profilePicUrl;
            } else {
                profilePictureEl.src = `https://placehold.co/120x120/10336d/a7c0e8?text=${(userData.name || 'S').charAt(0)}`;
            }

        } else {
            console.error("No profile document found for this user.");
            profileNameEl.textContent = 'User';
            welcomeMessageEl.textContent = 'Ready to find the perfect service?';
        }

    } else {
        // User is signed out, redirect to login page.
        console.log("User is not logged in. Redirecting...");
        window.location.href = 'auth.html';
    }
});

// --- LOGOUT LOGIC ---
logoutBtn.addEventListener('click', async (e) => {
    // Prevent the link from navigating immediately
    e.preventDefault(); 
    
    try {
        // Use Firebase to sign the user out
        await signOut(auth);
        
        // After successful sign out, the onAuthStateChanged listener above
        // will automatically trigger and redirect to auth.html.
        console.log("User signed out successfully.");
        window.location.href = 'auth.html';

    } catch (error) {
        console.error("Error signing out:", error);
        alert("Could not log out. Please try again.");
    }
});