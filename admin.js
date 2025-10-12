import { app } from './firebase-init.js';
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore, collection, doc, getDoc, getDocs,getCountFromServer } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const auth = getAuth(app);
const db = getFirestore(app);

const mainTitle = document.getElementById('main-title');
const navLinks = document.querySelectorAll('.nav-link');
const contentSections = document.querySelectorAll('.content-section');

// --- CRITICAL: SECURITY CHECK ---
onAuthStateChanged(auth, async (user) => {
    if (user && user.emailVerified) {
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        
        // If user document exists AND they have the isAdmin flag, allow access.
        if (userDoc.exists() && userDoc.data().isAdmin === true) {
            // User is an admin, load the dashboard data.
            loadDashboardStats();
            loadUsers();
            loadServices();
        } else {
            // User is not an admin, redirect them.
            console.warn("Access denied. User is not an admin.");
            window.location.href = 'index.html';
        }
    } else {
        // User is not logged in, redirect them.
        console.warn("Access denied. User not logged in.");
        window.location.href = 'auth.html';
    }
});

// --- Navigation Logic ---
navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const viewId = link.getAttribute('data-view');
        if (!viewId) return;

        // Update active link
        navLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        
        // Update main title
        mainTitle.textContent = link.textContent;
        
        // Show the correct content section
        contentSections.forEach(section => {
            section.classList.toggle('active', section.id === viewId);
        });
    });
});

// --- Data Fetching Functions ---
async function loadDashboardStats() {
    const usersCol = collection(db, 'users');
    const servicesCol = collection(db, 'services');
    const jobsCol = collection(db, 'job_posts');
    
    const userCount = (await getCountFromServer(usersCol)).data().count;
    const serviceCount = (await getCountFromServer(servicesCol)).data().count;
    const jobCount = (await getCountFromServer(jobsCol)).data().count;
    
    document.getElementById('total-users').textContent = userCount;
    document.getElementById('total-services').textContent = serviceCount;
    document.getElementById('total-job-posts').textContent = jobCount;
}

async function loadUsers() {
    const usersTableBody = document.getElementById('users-table-body');
    usersTableBody.innerHTML = '<tr><td colspan="3">Loading users...</td></tr>';
    const snapshot = await getDocs(collection(db, 'users'));
    usersTableBody.innerHTML = '';
    snapshot.forEach(doc => {
        const user = doc.data();
        const row = usersTableBody.insertRow();
        row.innerHTML = `
            <td><div class="name">${user.name || 'N/A'}</div></td>
            <td>${user.email || 'N/A'}</td>
            <td>${user.isProvider ? 'Provider' : 'User'}</td>
        `;
    });
}

async function loadServices() {
    const servicesTableBody = document.getElementById('services-table-body');
    servicesTableBody.innerHTML = '<tr><td colspan="4">Loading services...</td></tr>';
    const snapshot = await getDocs(collection(db, 'services'));
    
    // To avoid fetching the same user many times, we can cache them
    const providerCache = {}; 
    
    servicesTableBody.innerHTML = '';
    for(const doc of snapshot.docs) {
        const service = doc.data();
        let providerName = '...';

        if(service.providerId && !providerCache[service.providerId]) {
            const userDoc = await getDoc(doc(db, 'users', service.providerId));
            if(userDoc.exists()) {
                providerCache[service.providerId] = userDoc.data().name;
            }
        }
        providerName = providerCache[service.providerId] || 'Unknown';

        const row = servicesTableBody.insertRow();
        row.innerHTML = `
            <td><div class="name">${service.title || 'N/A'}</div></td>
            <td>${providerName}</td>
            <td>${service.category || 'N/A'}</td>
            <td>UGX ${service.price ? service.price.toLocaleString() : 'N/A'}</td>
        `;
    }
}