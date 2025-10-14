// This is the final services.js with correct linking to the profile page.

// 1. Initialize Algolia Client (Remember to replace your keys)
const searchClient = algoliasearch(
  'HQGXJ2Y7ZD',
  '2e44c7070ebafaeb6ca324daa28f36b4'
);

const search = instantsearch({
  indexName: 'services',
  searchClient,
});

// 2. Add Widgets
search.addWidgets([
  // --- Search Box Widget ---
  instantsearch.widgets.searchBox({
    container: '#search-container',
    placeholder: 'Search for services...',
    showSubmit: true,
    templates: {
      submit: '<button type="submit"><i class="fas fa-search"></i></button>',
      reset: () => '',
    },
  }),

  // --- Custom Category Filters (Connector) ---
  instantsearch.connectors.connectRefinementList(
    (renderOptions, isFirstRender) => {
      const { items, refine } = renderOptions;
      const container = document.querySelector('#category-filters');

      if (isFirstRender) {
        container.addEventListener('click', event => {
          const button = event.target.closest('.filter-btn');
          if (button) {
            const category = button.dataset.category;
            const currentRefined = items.find(item => item.isRefined);
            if (category === 'All') {
              if (currentRefined) refine(currentRefined.value); // Unselect current filter
            } else {
              refine(category); // Select new filter
            }
          }
        });
      }
      
      const currentRefinedItem = items.find(item => item.isRefined);
      container.querySelectorAll('.filter-btn').forEach(button => {
        const category = button.dataset.category;
        button.classList.toggle('active', (category === 'All') ? !currentRefinedItem : (currentRefinedItem && currentRefinedItem.value === category));
      });
    }
  )({
    attribute: 'category',
  }),

  // --- Search Results (Hits) Widget using the HTML Template ---
  instantsearch.widgets.hits({
    container: '#services-grid',
    templates: {
      empty: (results) => `<p class="loading-text">No services found for "${results.query}".</p>`,
      
      item: (hit, { html }) => {
        // Find the template in the HTML
        const template = document.getElementById('service-card-template');
        // Clone its content
        const card = template.content.cloneNode(true);

        // Fill the cloned template with data from the search result (the 'hit')
        card.querySelector('.service-card').href = `service-detail.html?id=${hit.objectID}`;
        card.querySelector('.card-image').style.backgroundImage = `url('${hit.coverImageUrl || 'https://placehold.co/600x400'}')`;
        
        // --- THIS IS THE FIX FOR PROFILE LINKING ---
        const providerInfoLink = card.querySelector('.provider-info-link');
        providerInfoLink.href = `profile.html?id=${hit.providerId}`;

        const providerAvatar = hit.providerAvatar || `https://placehold.co/40x40/10336d/a7c0e8?text=${(hit.providerName || 'P').charAt(0)}`;
        card.querySelector('.provider-avatar').src = providerAvatar;
        card.querySelector('.provider-avatar').alt = hit.providerName || 'Provider';
        card.querySelector('.provider-name').textContent = hit.providerName || 'Anonymous';
        
        card.querySelector('.service-title').innerHTML = instantsearch.highlight({ attribute: 'title', hit });

        // --- RENDER THE STAR RATING ---
        const rating = hit.averageRating || 0;
        const reviewCount = hit.reviewCount || 0;
        const ratingContainer = card.querySelector('.service-rating');
        if (reviewCount > 0) {
            const roundedRating = Math.round(rating);
            const stars = '★'.repeat(roundedRating) + '☆'.repeat(5 - roundedRating);
            ratingContainer.innerHTML = `${stars} <span class="review-count">(${reviewCount})</span>`;
        } else {
            ratingContainer.innerHTML = `<span class="review-count">No reviews yet</span>`;
        }

        card.querySelector('.location-text').textContent = hit.location || 'Kabale';
        card.querySelector('.price-amount').textContent = `UGX ${hit.price.toLocaleString()}`;

        // Return the raw HTML of the filled-in card
        const tempDiv = document.createElement('div');
        tempDiv.appendChild(card);
        return tempDiv.innerHTML;
      },
    },
  }),
]);

// 3. Start Search
search.start();