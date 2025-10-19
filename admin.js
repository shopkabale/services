import { app } from './firebase-init.js';
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
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

            if (userDoc.exists() && userDoc.data().isAdmin === true) {
                // User is a confirmed admin, NOW we load all the data.
                loadDashboardStats();
                loadUsers();
                loadServices();
            } else {
                console.warn("Access denied. User is not an admin.");
                window.location.href = 'index.html';
            }
        } else {
            console.warn("Access denied. User not logged in.");
            window.location.href = 'auth.html';
        }
    } catch (error) {
        console.error("Authentication check failed:", error);
        alert("An error occurred during authentication. Redirecting...");
        window.location.href = 'index.html';
    }
});

// --- NAVIGATION LOGIC ---
navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const viewId = link.getAttribute('data-view');
        if (!viewId) return;

        navLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        mainTitle.textContent = link.textContent;
        contentSections.forEach(section => {
            section.classList.toggle('active', section.id === viewId);
        });
    });
});

// --- DATA FETCHING FUNCTIONS ---
async function loadDashboardStats() {
    try {
        const usersCol = collection(db, 'users');
        const servicesCol = collection(db, 'services');
        const jobsCol = collection(db, 'job_posts');

        const userCount = (await getCountFromServer(usersCol)).data().count;
        const serviceCount = (await getCountFromServer(servicesCol)).data().count;
        const jobCount = (await getCountFromServer(jobsCol)).data().count;

        document.getElementById('total-users').textContent = userCount;
        document.getElementById('total-services').textContent = serviceCount;
        document.getElementById('total-job-posts').textContent = jobCount;
    } catch (error) {
        console.error("Error loading dashboard stats:", error);
        document.getElementById('total-users').textContent = 'Error';
        document.getElementById('total-services').textContent = 'Error';
        document.getElementById('total-job-posts').textContent = 'Error';
    }
}

async function loadUsers() {
    const usersTableBody = document.getElementById('users-table-body');
    usersTableBody.innerHTML = '<tr><td colspan="3">Loading users...</td></tr>';
    try {
        const snapshot = await getDocs(collection(db, 'users'));
        usersTableBody.innerHTML = '';
        if (snapshot.empty) {
            usersTableBody.innerHTML = '<tr><td colspan="3">No users found.</td></tr>';
            return;
        }
        snapshot.forEach(doc => {
            const user = doc.data();
            const row = usersTableBody.insertRow();
            row.innerHTML = `
                <td><div class="name">${user.name || 'N/A'}</div></td>
                <td>${user.email || 'N/A'}</td>
                <td>${user.isProvider ? 'Provider' : 'User'}</td>
            `;
        });
    } catch(error) {
        console.error("Error loading users:", error);
        usersTableBody.innerHTML = '<tr><td colspan="3">Could not load users.</td></tr>';
    }
}

async function loadServices() {
    const servicesTableBody = document.getElementById('services-table-body');
    servicesTableBody.innerHTML = '<tr><td colspan="5">Loading services...</td></tr>';
    try {
        const snapshot = await getDocs(collection(db, 'services'));
        const providerCache = {}; 
        servicesTableBody.innerHTML = '';
        if (snapshot.empty) {
            servicesTableBody.innerHTML = '<tr><td colspan="5">No services found.</td></tr>';
            return;
        }
        for(const serviceDoc of snapshot.docs) { 
            const service = { id: serviceDoc.id, ...serviceDoc.data() };
            let providerName = '...';

            if(service.providerId && !providerCache[service.providerId]) {
                const userDocRef = doc(db, 'users', service.providerId);
                const userDocSnap = await getDoc(userDocRef);
                if(userDocSnap.exists()) {
                    providerCache[service.providerId] = userDocSnap.data().name;
                }
            }
            providerName = providerCache[service.providerId] || 'Unknown';

            const row = servicesTableBody.insertRow();
            row.innerHTML = `
                <td><div class="name">${service.title || 'N/A'}</div></td>
                <td>${providerName}</td>
                <td>${service.category || 'N/A'}</td>
                <td>UGX ${service.price ? service.price.toLocaleString() : 'N/A'}</td>
                <td>
                    <button class="btn-danger delete-service-btn" data-id="${service.id}" data-name="${service.title}">Delete</button>
                </td>
            `;
        }
    } catch(error) {
        console.error("Error loading services:", error);
        servicesTableBody.innerHTML = '<tr><td colspan="5">Could not load services.</td></tr>';
    }
}

// --- DELETION LOGIC ---
async function handleDeleteService() {
    if (!serviceToDeleteId) return;
    confirmDeleteServiceBtn.disabled = true;
    confirmDeleteServiceBtn.textContent = 'Deleting...';

    try {
        // 1. Delete from Firestore
        await deleteDoc(doc(db, "services", serviceToDeleteId));

        // 2. Delete from Algolia using the Cloudflare Worker
        const user = auth.currentUser;
        if (!user) throw new Error("Authentication error: No user found.");
        
        const idToken = await user.getIdToken(true);
        const response = await fetch('https://services.kabaleonline.com/sync', { // Your worker URL
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
            body: JSON.stringify({ objectID: serviceToDeleteId }),
        });
        if (!response.ok) {
            console.error('Algolia delete failed:', await response.text());
        }
        
        console.log(`Service ${serviceToDeleteId} deleted successfully.`);
        loadServices(); // Reload the services list to show the change
    } catch (error) {
        console.error("Error deleting service:", error);
        alert('Failed to delete the service. Please try again.');
    } finally {
        serviceToDeleteId = null;
        confirmDeleteServiceBtn.disabled = false;
        confirmDeleteServiceBtn.textContent = 'Delete Service';
        deleteServiceModal.classList.remove('show');
    }
}

// --- EVENT LISTENERS FOR DELETION ---
document.getElementById('services-table-body').addEventListener('click', (e) => {
    if (e.target.classList.contains('delete-service-btn')) {
        serviceToDeleteId = e.target.dataset.id;
        serviceToDeleteName.textContent = `"${e.target.dataset.name}"`;
        deleteServiceModal.classList.add('show');
    }
});

confirmDeleteServiceBtn.addEventListener('click', handleDeleteService);

cancelDeleteServiceBtn.addEventListener('click', () => {
    deleteServiceModal.classList.remove('show');
    serviceToDeleteId = null;
});