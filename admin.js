import { app } from './firebase-init.js';
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore, collection, doc, getDoc, getDocs, getCountFromServer } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const auth = getAuth(app);
const db = getFirestore(app);

// --- AUTHENTICATION AND SECURITY CHECK ---
onAuthStateChanged(auth, async (user) => {
    if (user && user.emailVerified) {
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists() && userDoc.data().role === 'admin') {
            // User is a confirmed admin, proceed to load the dashboard
            const userData = userDoc.data();
            document.getElementById('admin-name').textContent = userData.name || 'Admin';
            document.getElementById('admin-avatar').src = userData.profilePicUrl || `https://placehold.co/40x40?text=${(userData.name || 'A').charAt(0)}`;
            
            loadDashboardStats();
            loadAllDataTables();
        } else {
            // User is not an admin, show access denied message and redirect
            document.body.innerHTML = `<div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; text-align:center; padding:20px;"><h1>Access Denied</h1><p>You do not have permission. Redirecting...</p></div>`;
            setTimeout(() => window.location.href = 'index.html', 3000);
        }
    } else {
        // User is not logged in
        window.location.href = 'auth.html';
    }
});

// --- DATA FETCHING ---
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
    // Fetch all data in parallel for speed
    const [users, services, jobs] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'services')),
        getDocs(collection(db, 'job_posts'))
    ]);

    // Populate Users Table
    const usersTableBody = document.getElementById('users-table-body');
    usersTableBody.innerHTML = '';
    users.forEach(doc => {
        const user = doc.data();
        const role = user.role === 'admin' ? 'Admin' : (user.isProvider ? 'Provider' : 'User');
        const row = usersTableBody.insertRow();
        row.innerHTML = `<td>${user.name||'N/A'}</td><td>${user.email||'N/A'}</td><td>${role}</td>`;
    });

    // Populate Services Table (with provider name caching)
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
        const row = servicesTableBody.insertRow();
        row.innerHTML = `<td>${service.title||'N/A'}</td><td>${providerName}</td><td>${service.category||'N/A'}</td><td>UGX ${service.price?service.price.toLocaleString():'N/A'}</td>`;
    }

    // Populate Jobs Table
    const jobsTableBody = document.getElementById('jobs-table-body');
    jobsTableBody.innerHTML = '';
    for (const jobDoc of jobs.docs) {
        const job = jobDoc.data();
        let seekerName = providerCache[job.seekerId]; // Re-use the same cache
        if (!seekerName && job.seekerId) {
            const userDocSnap = await getDoc(doc(db, 'users', job.seekerId));
            if (userDocSnap.exists()) {
                seekerName = userDocSnap.data().name;
                providerCache[job.seekerId] = seekerName;
            }
        }
        seekerName = seekerName || 'Unknown';
        const row = jobsTableBody.insertRow();
        row.innerHTML = `<td>${job.title||'N/A'}</td><td>${seekerName}</td><td>UGX ${job.budget?job.budget.toLocaleString():'N/A'}</td>`;
    }
}

// --- ACCORDION LOGIC ---
const accordionItems = document.querySelectorAll('.accordion-item');
accordionItems.forEach(item => {
    const header = item.querySelector('.accordion-header');
    header.addEventListener('click', () => {
        // Close other open items
        accordionItems.forEach(otherItem => {
            if (otherItem !== item) {
                otherItem.classList.remove('active');
            }
        });
        // Toggle the clicked item
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
