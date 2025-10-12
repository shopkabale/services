import { app } from './firebase-init.js';
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, query, onSnapshot, serverTimestamp, orderBy, runTransaction } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { showToast, hideToast } from './notifications.js';

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
        currentUser = user;
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
        const providerData = providerSnap.exists() ? { id: providerSnap.id, ...providerSnap.data() } : { name: 'Unknown Provider' };

        renderServiceDetails(serviceData, providerData);
        loadReviews(serviceId, serviceData.providerId);

    } catch (error) {
        console.error("Error loading service:", error);
        serviceDetailContent.innerHTML = '<h1>Error</h1><p>Could not load service details.</p>';
    }
}

function renderServiceDetails(service, provider) {
    serviceDetailContent.innerHTML = '';
    const serviceElement = document.createElement('div');
    serviceElement.className = 'service-detail-layout';

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
                
                <a href="profile.html?id=${provider.id}" style="text-decoration: none; color: inherit;">
                    <img src="${provider.profilePicUrl || `https://placehold.co/100x100?text=${provider.name.charAt(0)}`}" alt="${provider.name}" class="provider-avatar">
                    <h2 class="provider-name">${provider.name}</h2>
                </a>

                <p class="provider-location"><i class="fas fa-map-marker-alt"></i> ${provider.location}</p>
                <div class="price-display">UGX ${service.price.toLocaleString()} <span>/ ${service.priceUnit}</span></div>
                <a href="${contactLink}" id="contact-provider-btn" class="btn-contact"><i class="fas fa-envelope"></i> Contact Provider</a>
            </div>
        </aside>
    `;

    serviceDetailContent.appendChild(serviceElement);

    if (currentUser && currentUser.uid === service.providerId) {
        const contactBtn = document.getElementById('contact-provider-btn');
        if(contactBtn){
            contactBtn.style.pointerEvents = 'none';
            contactBtn.style.backgroundColor = '#555';
            contactBtn.textContent = 'This is your service';
        }
    }
}

async function loadReviews(serviceId, providerId) {
    const reviewsRef = collection(db, 'services', serviceId, 'reviews');
    const q = query(reviewsRef, orderBy('createdAt', 'desc'));

    onSnapshot(q, async (snapshot) => {
        reviewsList.innerHTML = '';
        if (snapshot.empty) {
            reviewsList.innerHTML = '<p>No reviews yet for this service.</p>';
        } else {
            for (const docSnap of snapshot.docs) {
                const review = docSnap.data();
                const reviewerDoc = await getDoc(doc(db, 'users', review.reviewerId));
                const reviewerData = reviewerDoc.exists() ? reviewerDoc.data() : { name: 'Anonymous' };

                const reviewEl = document.createElement('div');
                reviewEl.className = 'review-item';
                reviewEl.innerHTML = `
                    <div class="review-header">
                        <img src="${reviewerData.profilePicUrl || `https://placehold.co/45x45?text=${reviewerData.name.charAt(0)}`}" class="reviewer-avatar">
                        <div>
                            <div class="reviewer-name">${reviewerData.name}</div>
                            <div class="review-rating">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</div>
                        </div>
                    </div>
                    <p class="review-text">${review.text}</p>
                `;
                reviewsList.appendChild(reviewEl);
            }
        }
    });

    if (currentUser && currentUser.uid !== providerId) {
        const reviewRef = doc(db, "services", serviceId, "reviews", currentUser.uid);
        const reviewSnap = await getDoc(reviewRef);
        if (reviewSnap.exists()) {
            reviewFormContainer.innerHTML = '<p>You have already reviewed this service. Thank you for your feedback!</p>';
        } else {
            setupReviewForm(serviceId, providerId);
        }
    } else if (currentUser && currentUser.uid === providerId) {
        reviewFormContainer.innerHTML = '';
    } else {
         reviewFormContainer.innerHTML = `<p>Please <a href="auth.html" style="color: var(--accent-primary);">log in</a> to leave a review.</p>`;
    }
}

function setupReviewForm(serviceId, providerId) {
    reviewFormContainer.innerHTML = `
        <h4>Leave a Review</h4>
        <form id="review-form" class="review-form">
            <div class="form-group star-rating" id="star-rating">
                <span class="star" data-value="1">☆</span><span class="star" data-value="2">☆</span><span class="star" data-value="3">☆</span><span class="star" data-value="4">☆</span><span class="star" data-value="5">☆</span>
            </div>
            <div class="form-group">
                <textarea id="review-text" class="form-control" placeholder="Share your experience..." required></textarea>
            </div>
            <button type="submit" class="btn-submit" style="width: auto; padding: 10px 20px;">Submit Review</button>
        </form>
    `;

    const starRatingContainer = document.getElementById('star-rating');
    let selectedRating = 0;

    starRatingContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('star')) {
            selectedRating = parseInt(e.target.dataset.value, 10);
            const stars = starRatingContainer.querySelectorAll('.star');
            stars.forEach(s => {
                s.textContent = parseInt(s.dataset.value, 10) <= selectedRating ? '★' : '☆';
                s.classList.toggle('selected', parseInt(s.dataset.value, 10) <= selectedRating);
            });
        }
    });

    document.getElementById('review-form').addEventListener('submit', (e) => submitReview(e, serviceId, providerId, selectedRating));
}

async function submitReview(e, serviceId, providerId, rating) {
    e.preventDefault();
    const reviewText = document.getElementById('review-text').value.trim();

    if (!rating) {
        showToast('Please select a star rating.', 'error');
        return;
    }
    if (!reviewText) {
        showToast('Please write a review.', 'error');
        return;
    }

    showToast('Submitting review...', 'progress');
    try {
        await runTransaction(db, async (transaction) => {
            const serviceRef = doc(db, "services", serviceId);
            const reviewRef = doc(db, "services", serviceId, "reviews", currentUser.uid);

            const serviceDoc = await transaction.get(serviceRef);
            if (!serviceDoc.exists()) throw "Service not found.";

            const reviewDoc = await transaction.get(reviewRef);
            if (reviewDoc.exists()) throw "You have already reviewed this service.";

            const newReviewCount = (serviceDoc.data().reviewCount || 0) + 1;
            const oldRatingTotal = (serviceDoc.data().averageRating || 0) * (serviceDoc.data().reviewCount || 0);
            const newAverageRating = (oldRatingTotal + rating) / newReviewCount;

            transaction.update(serviceRef, {
                reviewCount: newReviewCount,
                averageRating: newAverageRating.toFixed(2)
            });

            transaction.set(reviewRef, {
                reviewerId: currentUser.uid,
                providerId: providerId,
                rating: rating,
                text: reviewText,
                createdAt: serverTimestamp()
            });
        });
        hideToast();
        showToast('Review submitted successfully!', 'success');
        
    } catch (error) {
        hideToast();
        showToast(`Error: ${error.toString()}`, 'error');
    }
}