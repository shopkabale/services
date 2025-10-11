import { app } from './firebase-init.js';
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, addDoc, query, onSnapshot, serverTimestamp, orderBy, updateDoc, runTransaction } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { showToast } from './notifications.js';

const auth = getAuth(app);
const db = getFirestore(app);

const serviceDetailContent = document.getElementById('service-detail-content');
const reviewsList = document.getElementById('reviews-list');
const reviewFormContainer = document.getElementById('review-form-container');

let currentUser = null;
const urlParams = new URLSearchParams(window.location.search);
const serviceId = urlParams.get('id');

if (!serviceId) {
    serviceDetailContent.innerHTML = '<h1>Service Not Found</h1><p>The service ID is missing from the URL.</p>';
} else {
    onAuthStateChanged(auth, (user) => {
        currentUser = user; // This will be null if logged out, or the user object if logged in
        loadServiceAndProvider();
    });
}

async function loadServiceAndProvider() {
    try {
        const serviceRef = doc(db, 'services', serviceId);
        const serviceSnap = await getDoc(serviceRef);

        if (!serviceSnap.exists()) {
            serviceDetailContent.innerHTML = '<h1>Service Not Found</h1><p>This listing may have been removed.</p>';
            return;
        }

        const serviceData = serviceSnap.data();
        const providerRef = doc(db, 'users', serviceData.providerId);
        const providerSnap = await getDoc(providerRef);
        const providerData = providerSnap.exists() ? providerSnap.data() : { name: 'Unknown Provider' };

        renderServiceDetails(serviceData, providerData);
        loadReviews(serviceData.providerId);

    } catch (error) {
        console.error("Error loading service:", error);
        serviceDetailContent.innerHTML = '<h1>Error</h1><p>Could not load service details.</p>';
    }
}

function renderServiceDetails(service, provider) {
    serviceDetailContent.innerHTML = ''; // Clear loading message
    const serviceElement = document.createElement('div');
    serviceElement.className = 'service-detail-layout';

    // This is the correct, simple link that passes the provider's ID to the chat page.
    const contactLink = `chat.html?recipientId=${service.providerId}`;

    serviceElement.innerHTML = `
        <div class="service-main-content">
            <p class="service-category">${service.category}</p>
            <h1>${service.title}</h1>
            <img src="${service.coverImageUrl}" alt="${service.title}" class="service-cover-image">
            <div class="content-section">
                <h2 class="section-title">About This Service</h2>
                <p>${service.description.replace(/\n/g, '<br>')}</p>
            </div>
        </div>
        <aside class="provider-sidebar">
            <div class="provider-card">
                <img src="${provider.profilePicUrl || `https://placehold.co/100x100?text=${provider.name.charAt(0)}`}" alt="${provider.name}" class="provider-avatar">
                <h2 class="provider-name">${provider.name}</h2>
                <p class="provider-location"><i class="fas fa-map-marker-alt"></i> ${provider.location}</p>
                <div class="price-display">UGX ${service.price.toLocaleString()} <span>/ ${service.priceUnit}</span></div>
                <a href="${contactLink}" id="contact-provider-btn" class="btn-contact"><i class="fas fa-envelope"></i> Contact Provider</a>
            </div>
        </aside>
    `;
    
    serviceDetailContent.appendChild(serviceElement);

    // Disable contact button if user is viewing their own service
    if (currentUser && currentUser.uid === service.providerId) {
        const contactBtn = document.getElementById('contact-provider-btn');
        if(contactBtn){
            contactBtn.style.pointerEvents = 'none';
            contactBtn.style.backgroundColor = '#555';
            contactBtn.textContent = 'This is your service';
        }
    }
}

function loadReviews(providerId) {
    const reviewsRef = collection(db, 'users', providerId, 'reviews');
    const q = query(reviewsRef, orderBy('createdAt', 'desc'));

    onSnapshot(q, (snapshot) => {
        reviewsList.innerHTML = '';
        if (snapshot.empty) {
            reviewsList.innerHTML = '<p>No reviews yet for this provider.</p>';
        } else {
            snapshot.forEach(docSnap => {
                const review = docSnap.data();
                // We will build the review display logic here
            });
        }
    });

    if (currentUser && currentUser.uid !== providerId) {
        reviewFormContainer.innerHTML = `
            <h4>Leave a Review for this Provider</h4>
            <form id="review-form">
                <!-- Add star rating and textarea here later -->
                <p style="margin: 15px 0;">Feature coming soon!</p>
                <button type="submit" disabled>Submit Review</button>
            </form>
        `;
    } else if (!currentUser) {
         reviewFormContainer.innerHTML = `<p>Please <a href="auth.html" style="color: var(--accent-primary);">log in</a> to leave a review.</p>`;
    }
}