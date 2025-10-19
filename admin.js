import { app } from './firebase-init.js';
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore, collection, doc, getDoc, getDocs, getCountFromServer, deleteDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const auth = getAuth(app);
const db = getFirestore(app);

// --- DOM ELEMENT REFERENCES ---
const mainTitle = document.getElementById('main-title');
const navLinks = document.querySelectorAll('.nav-link');
const contentSections = document.querySelectorAll('.content-section');
const deleteServiceModal = document.getElementById('delete-service-modal');
const cancelDeleteServiceBtn = document.getElementById('cancel-delete-service-btn');
const confirmDeleteServiceBtn = document.getElementById('confirm-delete-service-btn');
const serviceToDeleteName = document.getElementById('service-to-delete-name');
let serviceToDeleteId = null;

// --- CRITICAL: AUTHENTICATION AND SECURITY CHECK ---
onAuthStateChanged(auth, async (user) => {
    try {
        if (user && user.emailVerified) {
            const userDocRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userDocRef);

            // --- THIS IS THE FIX ---
            // We now check for `role === 'admin'` to match your database structure.
            if (userDoc.exists() && userDoc.data().role === 'admin') {
                // SUCCESS: User is a confirmed admin. Load all dashboard data.
                document.getElementById('admin-name').textContent = userDoc.data().name || 'Admin';
                document.getElementById('admin-avatar').src = userDoc.data().profilePicUrl || `https://placehold.co/40x40?text=A`;
                
                loadDashboardStats();
                loadAllDataTables();
            } else {
                // --- ACCESS DENIED: User is NOT an admin ---
                // Show a clear access denied message with a redirect countdown.
                document.body.innerHTML = `
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; text-align: center; padding: 20px; color: var(--text-primary); background-color: var(--bg-primary);">
                        <h1 style="font-size: 2.5rem;">🔒 Access Denied</h1>
                        <p style="font-size: 1.2rem; margin-top: 10px;">You do not have permission to view this page.</p>
                        <p style="margin-top: 30px;">Redirecting you to the homepage in <span id="countdown">5</span> seconds...</p>
                    </div>
                `;
                
                let countdown = 5;
                const countdownElement = document.getElementById('countdown');
                const interval = setInterval(() => {
                    countdown--;
                    if (countdownElement) countdownElement.textContent = countdown;
                    if (countdown <= 0) {
                        clearInterval(interval);
                        window.location.href = 'index.html';
                    }
                }, 1000);
            }
        } else {
            // User is not logged in.
            console.warn("Access denied. User not logged in.");
            window.location.href = 'auth.html';
        }
    } catch (error) {
        console.error("Authentication check failed:", error);
        window.location.href = 'index.html';
    }
});

// --- DATA FETCHING FUNCTIONS ---
async function loadDashboardStats() {
    try {
        const userCount = (await getCountFromServer(collection(db, 'users'))).data().count;
        const serviceCount = (await getCountFromServer(collection(db, 'services'))).data().count;
        const jobCount = (await getCountFromServer(collection(db, 'job_posts'))).data().count;
        document.getElementById('total-users').textContent = userCount;
        document.getElementById('total-services').textContent = serviceCount;
        document.getElementById('total-job-posts').textContent = jobCount;
    } catch (error) { console.error("Error loading stats:", error); }
}

async function loadAllDataTables() {
    const [users, services, jobs] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'services')),
        getDocs(collection(db, 'job_posts'))
    ]);

    const usersTableBody = document.getElementById('users-table-body');
    usersTableBody.innerHTML = '';
    users.forEach(doc => {
        const user = doc.data();
        const role = user.role === 'admin' ? 'Admin' : (user.isProvider ? 'Provider' : 'User');
        usersTableBody.insertRow().innerHTML = `<td>${user.name||'N/A'}</td><td>${user.email||'N/A'}</td><td>${role}</td>`;
    });

    const servicesTableBody = document.getElementById('services-table-body');
    servicesTableBody.innerHTML = '';
    const providerCache = {};
    for (const serviceDoc of services.docs) {
        const service = serviceDoc.data();
        let providerName = providerCache[service.providerId];
        if (!providerName && service.providerId) {
            const userDocSnap = await getDoc(doc(db, 'users', service.providerId));
            if (userDocSnap.exists()) {
                providerName = userDocSnap.data().name;
                providerCache[service.providerId] = providerName;
            }
        }
        providerName = providerName || 'Unknown';
        servicesTableBody.insertRow().innerHTML = `<td>${service.title||'N/A'}</td><td>${providerName}</td><td>${service.category||'N/A'}</td><td>UGX ${service.price?service.price.toLocaleString():'N/A'}</td>`;
    }

    const jobsTableBody = document.getElementById('jobs-table-body');
    jobsTableBody.innerHTML = '';
    for (const jobDoc of jobs.docs) {
        const job = jobDoc.data();
        let seekerName = providerCache[job.seekerId];
        if (!seekerName && job.seekerId) {
            const userDocSnap = await getDoc(doc(db, 'users', job.seekerId));
            if (userDocSnap.exists()) {
                seekerName = userDocSnap.data().name;
                providerCache[job.seekerId] = seekerName;
            }
        }
        seekerName = seekerName || 'Unknown';
        jobsTableBody.insertRow().innerHTML = `<td>${job.title||'N/A'}</td><td>${seekerName}</td><td>UGX ${job.budget?job.budget.toLocaleString():'N/A'}</td>`;
    }
}

// --- ACCORDION LOGIC ---
const accordionItems = document.querySelectorAll('.accordion-item');
accordionItems.forEach(item => {
    const header = item.querySelector('.accordion-header');
    header.addEventListener('click', () => {
        accordionItems.forEach(otherItem => { if (otherItem !== item) otherItem.classList.remove('active'); });
        item.classList.toggle('active');
    });
});

// --- LOGOUT BUTTON ---
const logoutBtn = document.getElementById('logout-btn');
logoutBtn.addEventListener('click', async () => {
    try {
        await signOut(auth);
        window.location.href = 'index.html';
    } catch (error) {
        console.error("Error signing out:", error);
    }
});