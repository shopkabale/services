import { app } from './firebase-init.js';
import { getFirestore, doc, getDoc, collection, query, where, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";

const db = getFirestore(app);
const auth = getAuth();

// Get the provider's ID from the URL query parameter
const urlParams = new URLSearchParams(window.location.search);
const providerId = urlParams.get('id');

const profileLayout = document.querySelector('.profile-layout');
let currentUser = null;

onAuthStateChanged(auth, (user) => {
    currentUser = user;
    // We can re-run the main function if needed, for now just store the user
});

if (!providerId) {
    profileLayout.innerHTML = '<div class="container"><h1>Provider not found.</h1><p>No provider ID was specified in the URL.</p></div>';
} else {
    loadFullProfile(providerId);
}

/**
 * Main function to load and render all profile data.
 * @param {string} providerId The ID of the provider to load.
 */
async function loadFullProfile(providerId) {
    try {
        // --- 1. Fetch Provider's Main Profile ---
        const providerDocRef = doc(db, 'users', providerId);
        const providerDocSnap = await getDoc(providerDocRef);

        if (!providerDocSnap.exists()) {
            profileLayout.innerHTML = '<div class="container"><h1>Provider not found.</h1><p>This user may no longer exist.</p></div>';
            return;
        }
        const providerData = providerDocSnap.data();

        // --- 2. Fetch Provider's Services ---
        const servicesQuery = query(collection(db, "services"), where("providerId", "==", providerId));
        const servicesSnapshot = await getDocs(servicesQuery);
        const services = servicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // --- 3. Fetch All Reviews for All Services ---
        let allReviews = [];
        for (const service of services) {
            const reviewsQuery = query(collection(db, `services/${service.id}/reviews`), orderBy('createdAt', 'desc'));
            const reviewsSnapshot = await getDocs(reviewsQuery);
            reviewsSnapshot.forEach(doc => {
                allReviews.push(doc.data());
            });
        }
        // Sort all reviews together by date
        allReviews.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
        
        // --- 4. Render Everything ---
        renderProfileHeader(providerData, allReviews);
        renderAboutSection(providerData);
        renderServicesGrid(services);
        renderReviewsList(allReviews);

    } catch (error) {
        console.error("Error loading full profile:", error);
        profileLayout.innerHTML = '<div class="container"><h1>Error</h1><p>There was a problem loading this profile.</p></div>';
    }
}

/**
 * Renders the top profile card with avatar, name, stats, etc.
 */
function renderProfileHeader(provider, reviews) {
    const headerCard = document.querySelector('.profile-header-card');
    
    // Calculate average rating from all reviews
    let totalRating = 0;
    reviews.forEach(r => totalRating += r.rating);
    const averageRating = reviews.length > 0 ? (totalRating / reviews.length).toFixed(1) : "No ratings";

    headerCard.querySelector('.profile-picture').src = provider.profilePicUrl || `https://placehold.co/140x140?text=${provider.name.charAt(0)}`;
    headerCard.querySelector('.profile-picture').alt = provider.name;
    headerCard.querySelector('.profile-name').textContent = provider.name;
    headerCard.querySelector('.profile-tagline').textContent = provider.tagline || 'Service Provider'; // Assuming a 'tagline' field exists
    
    const metaLocation = headerCard.querySelector('.profile-meta .meta-item:nth-child(1)');
    const metaRating = headerCard.querySelector('.profile-meta .meta-item:nth-child(2)');
    metaLocation.innerHTML = `<i class="fas fa-map-marker-alt"></i> ${provider.location}`;
    metaRating.innerHTML = `<i class="fas fa-star"></i> ${averageRating} Stars (${reviews.length} Reviews)`;
    
    const contactBtn = headerCard.querySelector('.btn-contact');
    contactBtn.href = `chat.html?recipientId=${providerId}`;
    contactBtn.innerHTML = `<i class="fas fa-envelope"></i> Contact ${provider.name.split(' ')[0]}`;

    // Disable contact button if user is viewing their own profile
    if (currentUser && currentUser.uid === providerId) {
        contactBtn.style.pointerEvents = 'none';
        contactBtn.style.backgroundColor = '#555';
        contactBtn.textContent = 'This is your profile';
    }
}

/**
 * Renders the "About Me" section.
 */
function renderAboutSection(provider) {
    const aboutSection = document.querySelector('.about-me p');
    aboutSection.textContent = provider.about || 'This provider has not written a bio yet.'; // Assuming an 'about' field
}

/**
 * Renders the grid of services offered by the provider.
 */
function renderServicesGrid(services) {
    const grid = document.querySelector('.services-grid');
    grid.innerHTML = ''; // Clear static content
    if (services.length === 0) {
        grid.innerHTML = '<p>This provider has not listed any services yet.</p>';
        return;
    }
    services.forEach(service => {
        const card = document.createElement('a');
        card.href = `service-detail.html?id=${service.id}`;
        card.className = 'service-card';
        card.innerHTML = `
            <img src="${service.coverImageUrl || 'https://placehold.co/400x150'}" class="service-card-img" alt="${service.title}">
            <div class="service-card-content">
                <h3 class="service-card-title">${service.title}</h3>
                <p class="service-card-price">From UGX ${service.price.toLocaleString()}</p>
            </div>
        `;
        grid.appendChild(card);
    });
}

/**
 * Renders the list of all reviews for the provider.
 */
async function renderReviewsList(reviews) {
    const reviewsContainer = document.querySelector('.content-section:last-child');
    reviewsContainer.innerHTML = '<h2 class="section-title">Client Reviews</h2>'; // Reset and add title
    
    if (reviews.length === 0) {
        reviewsContainer.innerHTML += '<p>This provider has no reviews yet.</p>';
        return;
    }

    for (const review of reviews) {
        const reviewerDoc = await getDoc(doc(db, 'users', review.reviewerId));
        const reviewerData = reviewerDoc.exists() ? reviewerDoc.data() : { name: 'Anonymous' };
        
        const reviewEl = document.createElement('div');
        reviewEl.className = 'review';
        reviewEl.innerHTML = `
            <img src="${reviewerData.profilePicUrl || `https://placehold.co/50x50?text=${reviewerData.name.charAt(0)}`}" alt="${reviewerData.name}" class="reviewer-avatar">
            <div class="review-content">
                <div class="review-header">
                    <span class="reviewer-name">${reviewerData.name}</span>
                    <div class="review-rating">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</div>
                </div>
                <p class="review-text">${review.text}</p>
            </div>
        `;
        reviewsContainer.appendChild(reviewEl);
    }
}