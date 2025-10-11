// This script runs on EVERY page to manage the user's login state.
import { app } from './firebase-init.js';
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";

const auth = getAuth(app);

// --- DOM ELEMENT SELECTORS ---
// These elements exist on the public-facing pages (index, services, etc.)
const loginLink = document.getElementById('login-link');
const dashboardLink = document.getElementById('dashboard-link');

// This element only exists on the dashboard pages
const logoutBtn = document.getElementById('logout-btn');

// --- GLOBAL AUTHENTICATION LISTENER ---
// This runs on every page load and checks the user's status.
onAuthStateChanged(auth, (user) => {
    if (user && user.emailVerified) {
        // --- USER IS LOGGED IN and VERIFIED ---
        if (loginLink) {
            loginLink.style.display = 'none'; // Hide the "Login" button
        }
        if (dashboardLink) {
            dashboardLink.style.display = 'inline-flex'; // Show the "Dashboard" button
        }
    } else {
        // --- USER IS LOGGED OUT or NOT VERIFIED ---
        if (loginLink) {
            loginLink.style.display = 'inline-flex'; // Show the "Login" button
        }
        if (dashboardLink) {
            dashboardLink.style.display = 'none'; // Hide the "Dashboard" button
        }
    }
});

// --- GLOBAL LOGOUT HANDLER ---
// If a logout button exists on the current page, add the event listener.
if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
            await signOut(auth);
            // After successful sign out, redirect to the homepage.
            window.location.href = 'index.html';
        } catch (error) {
            console.error("Error signing out:", error);
            alert("Could not log out. Please try again.");
        }
    });
}