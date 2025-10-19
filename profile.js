import { app } from './firebase-init.js';
import { getFirestore, doc, getDoc, collection, query, where, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";

const db = getFirestore(app);
const auth = getAuth();

const urlParams = new URLSearchParams(window.location.search);
const providerId = urlParams.get('id');

const profileContainer = document.getElementById('profile-container');
let currentUser = null;

onAuthStateChanged(auth, (user) => {
    currentUser = user;
    // Reload profile if the user logs in/out, to update button states
    if (providerId) {
        loadFullProfile(providerId);
    }
});

if (!providerId) {
    profileContainer.innerHTML = '<h1>Provider not found.</h1><p>No provider ID was specified in the URL.</p>';
}

async function loadFullProfile(providerId) {
    try {
        profileContainer.innerHTML = '<p>Loading profile...</p>';

        // 1. Fetch the provider's main profile data
        const providerDocRef = doc(db, 'users', providerId);
        const providerDocSnap = await getDoc(providerDocRef);

        if (!providerDocSnap.exists()) {
            profileContainer.innerHTML = '<h1>Provider not found.</h1><p>This user may no longer exist.</p>';
            return;
        }
        const providerData = providerDocSnap.data();

        // 2. Fetch all services offered by this provider
        const servicesQuery = query(collection(db, "services"), where("providerId", "==", providerId));
        const servicesSnapshot = await getDocs(servicesQuery);
        const services = servicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // 3. Fetch all reviews from all of the provider's services
        let allReviews = [];
        let totalRating = 0;
        for (const service of services) {
            const reviewsQuery = query(collection(db, `services/${service.id}/reviews`), orderBy('createdAt', 'desc'));
            const reviewsSnapshot = await getDocs(reviewsQuery);
            reviewsSnapshot.forEach(doc => {
                const reviewData = doc.data();
                allReviews.push(reviewData);
                totalRating += reviewData.rating;
            });
        }
        // Sort all collected reviews by date
        allReviews.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());

        const averageRating = allReviews.length > 0 ? (totalRating / allReviews.length).toFixed(1) : "No ratings";

        // 4. Render the entire page with the collected data
        renderFullPage(providerData, services, allReviews, averageRating);

    } catch (error) {
        console.error("Error loading full profile:", error);
        profileContainer.innerHTML = '<h1>Error</h1><p>There was a problem loading this profile.</p>';
    }
}

async function renderFullPage(provider, services, reviews, averageRating) {
    profileContainer.innerHTML = ''; // Clear "Loading..." message

    // --- Logic to create the Founding Member badge if applicable ---
    let badgeHTML = '';
    if (provider.isFoundingMember === true) {
        badgeHTML = '<span class="badge">🏅 Founding Member</span>';
    }

    // 1. Build Header Card
    const headerCard = document.createElement('div');
    headerCard.className = 'profile-header-card';
    const contactBtnHref = currentUser && currentUser.uid === providerId ? '#' : `chat.html?recipientId=${providerId}`;
    const contactBtnText = currentUser && currentUser.uid === providerId ? 'This is Your Profile' : `Contact ${provider.name.split(' ')[0]}`;
    const contactBtnStyle = currentUser && currentUser.uid === providerId ? 'style="pointer-events: none; background-color: #555;"' : '';

    headerCard.innerHTML = `
        <img src="${provider.profilePicUrl || `https://placehold.co/140x140?text=${provider.name.charAt(0)}`}" alt="${provider.name}" class="profile-picture">
        <div class="profile-info">
            <div class="profile-name-wrapper">
                <h1 class="profile-name">${provider.name}</h1>
                ${badgeHTML}
            </div>
            <p class="profile-tagline">${provider.tagline || 'Service Provider'}</p>
            <div class="profile-meta">
                <span class="meta-item"><i class="fas fa-map-marker-alt"></i> ${provider.location}</span>
                <span class="meta-item"><i class="fas fa-star"></i> ${averageRating} Stars (${reviews.length} Reviews)</span>
            </div>
            <a href="${contactBtnHref}" class="btn-contact" ${contactBtnStyle}><i class="fas fa-envelope"></i> ${contactBtnText}</a>
        </div>
    `;
    profileContainer.appendChild(headerCard);

    // 2. Build About Section
    const aboutSection = document.createElement('div');
    aboutSection.className = 'content-section about-me';
    aboutSection.innerHTML = `
        <h2 class="section-title">About Me</h2>
        <p>${provider.about || 'This provider has not written a bio yet.'}</p>
    `;
    profileContainer.appendChild(aboutSection);

    // 3. Build Services Section
    const servicesSection = document.createElement('div');
    servicesSection.className = 'content-section';
    let servicesGridHTML = '';
    if (services.length > 0) {
        services.forEach(service => {
            servicesGridHTML += `
                <a href="service-detail.html?id=${service.id}" class="service-card">
                    <img src="${service.coverImageUrl || 'https://placehold.co/400x150'}" class="service-card-img" alt="${service.title}">
                    <div class="service-card-content">
                        <h3 class="service-card-title">${service.title}</h3>
                        <p class="service-card-price">From UGX ${service.price.toLocaleString()}</p>
                    </div>
                </a>`;
        });
    } else {
        servicesGridHTML = '<p>This provider has not listed any services yet.</p>';
    }
    servicesSection.innerHTML = `
        <h2 class="section-title">My Services</h2>
        <div class="services-grid">${servicesGridHTML}</div>
    `;
    profileContainer.appendChild(servicesSection);

    // 4. Build Reviews Section
    const reviewsSection = document.createElement('div');
    reviewsSection.className = 'content-section';
    let reviewsHTML = '';
    if (reviews.length > 0) {
        // Fetch reviewer names asynchronously to avoid slowing down the page
        const reviewPromises = reviews.map(async (review) => {
            const reviewerDoc = await getDoc(doc(db, 'users', review.reviewerId));
            const reviewerData = reviewerDoc.exists() ? reviewerDoc.data() : { name: 'Anonymous' };
            return `
                <div class="review">
                    <img src="${reviewerData.profilePicUrl || `https://placehold.co/50x50?text=${reviewerData.name.charAt(0)}`}" alt="${reviewerData.name}" class="reviewer-avatar">
                    <div class="review-content">
                        <div class="review-header">
                            <span class="reviewer-name">${reviewerData.name}</span>
                            <div class="review-rating">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</div>
                        </div>
                        <p class="review-text">${review.text}</p>
                    </div>
                </div>`;
        });
        reviewsHTML = (await Promise.all(reviewPromises)).join('');
    } else {
        reviewsHTML = '<p>This provider has no reviews yet.</p>';
    }
    reviewsSection.innerHTML = `
        <h2 class="section-title">Client Reviews</h2>
        ${reviewsHTML}
    `;
    profileContainer.appendChild(reviewsSection);
}