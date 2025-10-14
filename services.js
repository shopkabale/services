// Initialize Algolia Client
const searchClient = algoliasearch(
  'HQGXJ2Y7ZD',
  '2e44c7070ebafaeb6ca324daa28f36b4'
);

const search = instantsearch({
  indexName: 'services',
  searchClient,
});

// --- Search Box Widget ---
search.addWidgets([
  instantsearch.widgets.searchBox({
    container: '#search-container',
    placeholder: 'Search for services...',
    showSubmit: true,
    templates: {
      submit: '<button type="submit"><i class="fas fa-search"></i></button>',
      reset: () => '',
    },
  }),
]);

// --- Custom Category Filter ---
const categoryFilter = instantsearch.connectors.connectRefinementList(
  (renderOptions, isFirstRender) => {
    const { items, refine } = renderOptions;
    const container = document.querySelector('#category-filters');

    if (isFirstRender) {
      container.addEventListener('click', event => {
        const button = event.target.closest('.filter-btn');
        if (!button) return;
        const category = button.dataset.category;
        const currentRefined = items.find(item => item.isRefined);

        if (category === 'All') {
          if (currentRefined) refine(currentRefined.value); // unselect
        } else {
          refine(category); // select category
        }
      });
    }

    const currentRefinedItem = items.find(item => item.isRefined);
    container.querySelectorAll('.filter-btn').forEach(button => {
      const category = button.dataset.category;
      button.classList.toggle(
        'active',
        category === 'All'
          ? !currentRefinedItem
          : currentRefinedItem && currentRefinedItem.value === category
      );
    });
  }
)({
  attribute: 'category',
});

search.addWidgets([categoryFilter]);

// --- Hits Widget ---
const hitsWidget = instantsearch.connectors.connectHits(
  (renderOptions, isFirstRender) => {
    const { hits } = renderOptions;
    const container = document.querySelector('#services-grid');
    container.innerHTML = ''; // clear previous results

    if (hits.length === 0) {
      container.innerHTML = `<p class="loading-text">No services found.</p>`;
      return;
    }

    hits.forEach(hit => {
      const template = document.getElementById('service-card-template');
      const card = template.content.cloneNode(true);

      const serviceCard = card.querySelector('.service-card');
      serviceCard.href = `service-detail.html?id=${hit.objectID}`;

      // Card image
      card.querySelector('.card-image').style.backgroundImage =
        `url('${hit.coverImageUrl || 'https://placehold.co/600x400'}')`;

      // Provider info link
      const providerLink = card.querySelector('.provider-info-link');
      providerLink.href = `profile.html?id=${hit.providerId}`;
      card.querySelector('.provider-avatar').src =
        hit.providerAvatar || `https://placehold.co/40x40/10336d/a7c0e8?text=${(hit.providerName||'P').charAt(0)}`;
      card.querySelector('.provider-avatar').alt = hit.providerName || 'Provider';
      card.querySelector('.provider-name').textContent = hit.providerName || 'Anonymous';

      // Service title
      card.querySelector('.service-title').textContent = hit.title || 'Untitled Service';

      // Rating
      const ratingContainer = card.querySelector('.service-rating');
      const rating = hit.averageRating || 0;
      const reviewCount = hit.reviewCount || 0;
      if (reviewCount > 0) {
        const stars = '★'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating));
        ratingContainer.innerHTML = `${stars} <span class="review-count">(${reviewCount})</span>`;
      } else {
        ratingContainer.innerHTML = `<span class="review-count">No reviews yet</span>`;
      }

      // Location
      card.querySelector('.location-text').textContent = hit.location || 'Kabale';

      // Price
      card.querySelector('.price-amount').textContent = `UGX ${hit.price.toLocaleString()}`;

      // Append to grid
      container.appendChild(card);
    });
  }
);

search.addWidgets([hitsWidget]);

// --- Start InstantSearch ---
search.start();