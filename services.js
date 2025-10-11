import { app } from './firebase-init.js';
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    getDoc, 
    collection, 
    query, 
    where, 
    getDocs, 
    addDoc, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { showToast } from './notifications.js';

const auth = getAuth(app);
const db = getFirestore(app);

const contentContainer = document.getElementById('content-container');
const loadingState = document.getElementById('loading-state');
const contactBtn = document.getElementById('contact-btn');
// ... other element selectors
const serviceCategoryEl = document.getElementById('service-category');
const serviceTitleEl = document.getElementById('service-title');
const serviceCoverImageEl = document.getElementById('service-cover-image');
const serviceDescriptionEl = document.getElementById('service-description');
const providerAvatarEl = document.getElementById('provider-avatar');
const providerNameEl = document.getElementById('provider-name');
const providerLocationEl = document.getElementById('provider-location');
const servicePriceEl = document.getElementById('service-price');

let currentUserId = null;
let providerId = null;

// Check for logged-in user
onAuthStateChanged(auth, (user) => {
    if (user && user.emailVerified) {
        currentUserId = user.uid;
    }
    // We don't redirect here, just store the user ID if they are logged in.
});

const loadServiceDetails = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const serviceId = urlParams.get('id');

    if (!serviceId) {
        loadingState.innerHTML = '<p>Error: No service specified.</p>';
        return;
    }

    try {
        const serviceDoc = await getDoc(doc(db, "services", serviceId));
        if (!serviceDoc.exists()) {
            loadingState.innerHTML = '<p>Error: Service not found.</p>';
            return;
        }
        const serviceData = serviceDoc.data();
        providerId = serviceData.providerId; // Store the provider's ID

        const providerDoc = await getDoc(doc(db, "users", providerId));
        if (!providerDoc.exists()) {
            loadingState.innerHTML = '<p>Error: Provider not found.</p>';
            return;
        }
        const providerData = providerDoc.data();

        // Populate the page with data
        document.title = `${serviceData.title} | KabaleOnline`;
        serviceCategoryEl.textContent = serviceData.category;
        serviceTitleEl.textContent = serviceData.title;
        serviceCoverImageEl.src = serviceData.coverImageUrl;
        serviceDescriptionEl.innerHTML = `<p>${serviceData.description.replace(/\n/g, '</p><p>')}</p>`;
        providerAvatarEl.src = providerData.profilePicUrl || `https://placehold.co/100x100/10336d/a7c0e8?text=${providerData.name.charAt(0)}`;
        providerNameEl.textContent = providerData.name;
        providerLocationEl.innerHTML = `<i class="fas fa-map-marker-alt"></i> ${providerData.location}`;
        servicePriceEl.innerHTML = `UGX ${serviceData.price.toLocaleString()} <span>/ ${serviceData.priceUnit}</span>`;

        loadingState.style.display = 'none';
        contentContainer.style.display = 'block';

    } catch (error) {
        console.error("Error loading service details:", error);
        loadingState.innerHTML = '<p>An error occurred while loading the service.</p>';
    }
};

// --- THIS IS THE NEW, CRUCIAL LOGIC ---
contactBtn.addEventListener('click', async (e) => {
    e.preventDefault();

    // 1. Check if the user is logged in
    if (!currentUserId) {
        showToast("You must be logged in to contact a provider.", "error");
        // Optional: redirect to login page after a delay
        setTimeout(() => { window.location.href = `auth.html`; }, 2000);
        return;
    }

    if (currentUserId === providerId) {
        showToast("You cannot contact yourself.", "error");
        return;
    }

    showToast("Starting conversation...", "progress");

    try {
        // 2. Check if a conversation between these two users already exists
        const conversationsRef = collection(db, "conversations");
        const q = query(conversationsRef, where("participants", "array-contains", currentUserId));
        
        const querySnapshot = await getDocs(q);
        let existingConvoId = null;

        querySnapshot.forEach(doc => {
            const convo = doc.data();
            // Check if this conversation has the provider we want to talk to
            if (convo.participants.includes(providerId)) {
                existingConvoId = doc.id;
            }
        });

        // 3. If a conversation exists, redirect to it
        if (existingConvoId) {
            window.location.href = `chat.html?id=${existingConvoId}`;
        } else {
            // 4. If not, create a new conversation
            const newConvoRef = await addDoc(conversationsRef, {
                participants: [currentUserId, providerId],
                lastMessageTimestamp: serverTimestamp(),
                lastMessageText: ''
            });
            // Redirect to the newly created chat
            window.location.href = `chat.html?id=${newConvoRef.id}`;
        }

    } catch (error) {
        console.error("Error starting conversation:", error);
        hideToast();
        showToast("Could not start conversation. Please try again.", "error");
    }
});

// Run the main function when the page loads
loadServiceDetails();