import { app } from './firebase-init.js';
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";

const auth = getAuth(app);

// --- Header Links ---
const loginLinkHeader = document.getElementById('login-link');
const dashboardLinkHeader = document.getElementById('dashboard-link');

// --- Footer Links ---
const footerQuickLinks = document.getElementById('footer-quick-links');

// --- Logout Triggers ---
// Use querySelectorAll to handle logout buttons in both the dashboard and potentially the footer
const logoutTriggers = document.querySelectorAll('#logout-btn, #footer-logout-link');

// Create footer list items once
const footerLoginLi = document.createElement('li');
footerLoginLi.innerHTML = `<a href="auth.html">Login / Sign Up</a>`;

const footerDashboardLi = document.createElement('li');
footerDashboardLi.innerHTML = `<a href="dashboard.html">My Dashboard</a>`;

const footerLogoutLi = document.createElement('li');
footerLogoutLi.innerHTML = `<a href="#" id="footer-logout-link">Logout</a>`;


onAuthStateChanged(auth, (user) => {
    // Clear dynamic footer links before adding the correct ones
    if (footerQuickLinks) {
         // A simple way to remove the dynamic links without affecting the static ones
        const dynamicLinks = footerQuickLinks.querySelectorAll('.dynamic-link');
        dynamicLinks.forEach(link => link.remove());
    }

    if (user && user.emailVerified) {
        // --- USER IS LOGGED IN ---
        if (loginLinkHeader) loginLinkHeader.style.display = 'none';
        if (dashboardLinkHeader) dashboardLinkHeader.style.display = 'inline-flex';

        if (footerQuickLinks) {
            footerDashboardLi.className = 'dynamic-link';
            footerLogoutLi.className = 'dynamic-link';
            footerQuickLinks.appendChild(footerDashboardLi);
            footerQuickLinks.appendChild(footerLogoutLi);
        }

    } else {
        // --- USER IS LOGGED OUT ---
        if (loginLinkHeader) loginLinkHeader.style.display = 'inline-flex';
        if (dashboardLinkHeader) dashboardLinkHeader.style.display = 'none';
        
        if (footerQuickLinks) {
            footerLoginLi.className = 'dynamic-link';
            footerQuickLinks.appendChild(footerLoginLi);
        }
    }
});

// A single logout handler for any logout button/link on the page
document.body.addEventListener('click', async (event) => {
    if (event.target.matches('#logout-btn') || event.target.matches('#footer-logout-link')) {
        event.preventDefault();
        try {
            await signOut(auth);
            window.location.href = 'index.html';
        } catch (error) {
            console.error("Error signing out:", error);
        }
    }
});