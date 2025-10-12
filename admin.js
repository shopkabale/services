import { app } from './firebase-init.js';
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore, collection, doc, getDoc, getDocs, getCountFromServer, deleteDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const auth = getAuth(app);
const db = getFirestore(app);

const mainTitle = document.getElementById('main-title');
const navLinks = document.querySelectorAll('.nav-link');
const contentSections = document.querySelectorAll('.content-section');

// --- NEW: Modal element references ---
const deleteServiceModal = document.getElementById('delete-service-modal');
const cancelDeleteServiceBtn = document.getElementById('cancel-delete-service-btn');
const confirmDeleteServiceBtn = document.getElementById('confirm-delete-service-btn');
const serviceToDeleteName = document.getElementById('service-to-delete-name');
let serviceToDeleteId = null;

// --- CRITICAL: SECURITY CHECK ---
onAuthStateChanged(auth, async (user) => {
    if (user && user.emailVerified) {
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists() && userDoc.data().isAdmin === true) {
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
});

// --- Navigation Logic ---
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

// --- Data Fetching Functions ---
async function loadDashboardStats() {
    // ... (This function is unchanged)
}

async function loadUsers() {
    // ... (This function is unchanged)
}

async function loadServices() {
    const servicesTableBody = document.getElementById('services-table-body');
    servicesTableBody.innerHTML = '<tr><td colspan="5">Loading services...</td></tr>'; // Changed colspan to 5
    const snapshot = await getDocs(collection(db, 'services'));

    const providerCache = {}; 

    servicesTableBody.innerHTML = '';
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
        // --- NEW: Added a 5th column for Actions ---
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
}

// --- NEW: Function to handle service deletion ---
async function handleDeleteService() {
    if (!serviceToDeleteId) return;
    confirmDeleteServiceBtn.disabled = true;
    confirmDeleteServiceBtn.textContent = 'Deleting...';

    try {
        // 1. Delete from Firestore
        await deleteDoc(doc(db, "services", serviceToDeleteId));

        // 2. Delete from Algolia using the Cloudflare Worker
        // We need the current user's token to authenticate the request
        const user = auth.currentUser;
        if (user) {
            const idToken = await user.getIdToken(true);
            await fetch('https://services.kabaleonline.com/sync', { // Your worker URL
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
                body: JSON.stringify({ objectID: serviceToDeleteId }),
            });
        }
        
        console.log(`Service ${serviceToDeleteId} deleted successfully.`);
        // Reload the services list to show the change
        loadServices();

    } catch (error) {
        console.error("Error deleting service:", error);
        alert('Failed to delete the service. Please try again.');
    } finally {
        // Reset and hide the modal
        serviceToDeleteId = null;
        confirmDeleteServiceBtn.disabled = false;
        confirmDeleteServiceBtn.textContent = 'Delete Service';
        deleteServiceModal.classList.remove('show');
    }
}

// --- NEW: Event listeners for delete functionality ---

// Listen for clicks on the delete buttons in the services table
document.getElementById('services-table-body').addEventListener('click', (e) => {
    if (e.target.classList.contains('delete-service-btn')) {
        serviceToDeleteId = e.target.dataset.id;
        serviceToDeleteName.textContent = e.target.dataset.name;
        deleteServiceModal.classList.add('show');
    }
});

// Handle the final "Confirm" click in the modal
confirmDeleteServiceBtn.addEventListener('click', handleDeleteService);

// Handle the "Cancel" click in the modal
cancelDeleteServiceBtn.addEventListener('click', () => {
    deleteServiceModal.classList.remove('show');
    serviceToDeleteId = null;
});