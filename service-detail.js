import { app } from './firebase-init.js';
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const db = getFirestore(app);

// --- ELEMENT SELECTORS ---
const contentContainer = document.getElementById('content-container');
const loadingState = document.getElementById('loading-state');
const serviceCategoryEl = document.getElementById('service-category');
const serviceTitleEl = document.getElementById('service-title');
const serviceCoverImageEl = document.getElementById('service-cover-image');
const serviceDescriptionEl = document.getElementById('service-description');
const providerAvatarEl = document.getElementById('provider-avatar');
const providerNameEl = document.getElementById('provider-name');
const providerLocationEl = document.getElementById('provider-location');
const servicePriceEl = document.getElementById('service-price');
const contactBtn = document.getElementById('contact-btn');

// --- MAIN FUNCTION ---
const loadServiceDetails = async () => {
    // 1. Get the Service ID from the URL
    const urlParams = new URLSearchParams(window.location.search);
    const serviceId = urlParams.get('id');

    if (!serviceId) {
        loadingState.innerHTML = '<p>Error: No service specified. Please go back and select a service.</p>';
        return;
    }

    try {
        // 2. Fetch the specific service document from Firestore
        const serviceDocRef = doc(db, "services", serviceId);
        const serviceDoc = await getDoc(serviceDocRef);

        if (!serviceDoc.exists()) {
            loadingState.innerHTML = '<p>Error: Service not found.</p>';
            return;
        }

        const serviceData = serviceDoc.data();

        // 3. Fetch the provider's profile using the providerId from the service
        const providerDocRef = doc(db, "users", serviceData.providerId);
        const providerDoc = await getDoc(providerDocRef);
        
        if (!providerDoc.exists()) {
            loadingState.innerHTML = '<p>Error: Provider not found.</p>';
            return;
        }
        
        const providerData = providerDoc.data();

        // 4. Update the HTML with the fetched data
        document.title = `${serviceData.title} | KabaleOnline`;
        serviceCategoryEl.textContent = serviceData.category;
        serviceTitleEl.textContent = serviceData.title;
        serviceCoverImageEl.src = serviceData.coverImageUrl;
        serviceDescriptionEl.innerHTML = `<p>${serviceData.description.replace(/\n/g, '</p><p>')}</p>`; // Convert newlines to paragraphs
        
        providerAvatarEl.src = providerData.profilePicUrl || `https://placehold.co/100x100/10336d/a7c0e8?text=${providerData.name.charAt(0)}`;
        providerNameEl.textContent = providerData.name;
        providerLocationEl.innerHTML = `<i class="fas fa-map-marker-alt"></i> ${providerData.location}`;
        
        servicePriceEl.innerHTML = `UGX ${serviceData.price.toLocaleString()} <span>/ ${serviceData.priceUnit}</span>`;
        
        // In a real app, this would link to the chat page with the provider's ID
        contactBtn.href = `chat.html?userId=${providerData.uid}`;

        // 5. Show the content and hide the loading message
        loadingState.style.display = 'none';
        contentContainer.style.display = 'block';

    } catch (error) {
        console.error("Error loading service details:", error);
        loadingState.innerHTML = '<p>An error occurred while loading the service. Please try again later.</p>';
    }
};

// Run the function when the page loads
loadServiceDetails();