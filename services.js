// This script performs a backend search and renders the results.

const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const categoryFilters = document.getElementById('category-filters');
const servicesGrid = document.getElementById('services-grid');
const cardTemplate = document.getElementById('service-card-template');
 
let currentQuery = '';
let currentCategory = 'All';

// Function to fetch data from your Cloudflare worker and render it
async function fetchAndRenderServices() {
    servicesGrid.innerHTML = '<p class="loading-text">Loading...</p>';

    const searchUrl = `/search?query=${encodeURIComponent(currentQuery)}&category=${encodeURIComponent(currentCategory)}`;

    try {
        const response = await fetch(searchUrl);
        if (!response.ok) throw new Error('Search request failed');
        
        const hits = await response.json();
        servicesGrid.innerHTML = ''; 

        if (hits.length === 0) {
            servicesGrid.innerHTML = `<p class="loading-text">No services found.</p>`;
            return;
        }

        hits.forEach(hit => {
            const cardNode = cardTemplate.content.cloneNode(true);
            
            // Set links
            cardNode.querySelector('.card-image-link').href = `service-detail.html?id=${hit.objectID}`;
            cardNode.querySelector('.provider-info-link').href = `profile.html?id=${hit.providerId}`;
            cardNode.querySelector('.card-content-link').href = `service-detail.html?id=${hit.objectID}`;

            // Populate data
            cardNode.querySelector('.card-image').style.backgroundImage = `url('${hit.coverImageUrl || 'https://placehold.co/600x400'}')`;
            const providerAvatar = hit.providerAvatar || `https://placehold.co/40x40/10336d/a7c0e8?text=${(hit.providerName || 'P').charAt(0)}`;
            cardNode.querySelector('.provider-avatar').src = providerAvatar;
            cardNode.querySelector('.provider-name').textContent = hit.providerName || 'Anonymous';
            cardNode.querySelector('.service-title').textContent = hit.title;
            cardNode.querySelector('.location-text').textContent = hit.location || 'Kabale';
            cardNode.querySelector('.price-amount').textContent = `UGX ${hit.price.toLocaleString()}`;

            const ratingContainer = cardNode.querySelector('.service-rating');
            if (hit.reviewCount > 0) {
                const roundedRating = Math.round(hit.averageRating || 0);
                ratingContainer.innerHTML = `${'★'.repeat(roundedRating)}${'☆'.repeat(5 - roundedRating)} <span class="review-count">(${hit.reviewCount})</span>`;
            } else {
                ratingContainer.innerHTML = `<span class="review-count">No reviews yet</span>`;
            }
            
            servicesGrid.appendChild(cardNode);
        });
    } catch (error) {
        console.error('Error fetching services:', error);
        servicesGrid.innerHTML = '<p class="loading-text">Sorry, there was an error loading services.</p>';
    }
}

// Event Listeners for search and filtering
searchButton.addEventListener('click', () => {
    currentQuery = searchInput.value.trim();
    fetchAndRenderServices();
});

searchInput.addEventListener('keyup', (event) => {
    if (event.key === 'Enter') {
        currentQuery = searchInput.value.trim();
        fetchAndRenderServices();
    }
});

categoryFilters.addEventListener('click', (event) => {
    const button = event.target.closest('.filter-btn');
    if (button) {
        // This is the corrected logic for the filters
        categoryFilters.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        currentCategory = button.dataset.category;
        fetchAndRenderServices();
    }
});

// Initial load when the page opens
fetchAndRenderServices();