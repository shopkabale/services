// This is the final and most robust services.js
// It uses the HTML <template> tag to guarantee the layout is perfect.

const searchClient = algoliasearch(
  'HQGXJ2Y7ZD',
  '2e44c7070ebafaeb6ca324daa28f36b4'
);

const search = instantsearch({
  indexName: 'services',
  searchClient,
});

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
              if (currentRefined) refine(currentRefined.value);
            } else {
              refine(category);
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
  )({ attribute: 'category' }),

  instantsearch.widgets.hits({
    container: '#services-grid',
    templates: {
      empty: (results) => `<p class="loading-text">No services found for "${results.query}".</p>`,
      
      item: (hit, { html }) => {
        const template = document.getElementById('service-card-template');
        const cardNode = template.content.cloneNode(true);
        
        // --- Set all links ---
        const serviceUrl = `service-detail.html?id=${hit.objectID}`;
        const providerUrl = `profile.html?id=${hit.providerId}`;
        cardNode.querySelector('.card-image-link').href = serviceUrl;
        cardNode.querySelector('.provider-info-link').href = providerUrl;
        cardNode.querySelector('.card-content-link').href = serviceUrl;

        // --- Populate the card ---
        cardNode.querySelector('.card-image').style.backgroundImage = `url('${hit.coverImageUrl || 'https://placehold.co/600x400'}')`;
        
        const providerAvatar = hit.providerAvatar || `https://placehold.co/40x40/10336d/a7c0e8?text=${(hit.providerName || 'P').charAt(0)}`;
        cardNode.querySelector('.provider-avatar').src = providerAvatar;
        cardNode.querySelector('.provider-avatar').alt = hit.providerName || 'Provider';
        cardNode.querySelector('.provider-name').textContent = hit.providerName || 'Anonymous';
        
        cardNode.querySelector('.service-title').innerHTML = instantsearch.highlight({ attribute: 'title', hit });

        const rating = hit.averageRating || 0;
        const reviewCount = hit.reviewCount || 0;
        const ratingContainer = cardNode.querySelector('.service-rating');
        if (reviewCount > 0) {
            const roundedRating = Math.round(rating);
            const stars = '★'.repeat(roundedRating) + '☆'.repeat(5 - roundedRating);
            ratingContainer.innerHTML = `${stars} <span class="review-count">(${reviewCount})</span>`;
        } else {
            ratingContainer.innerHTML = `<span class="review-count">No reviews yet</span>`;
        }

        cardNode.querySelector('.location-text').textContent = hit.location || 'Kabale';
        cardNode.querySelector('.price-amount').textContent = `UGX ${hit.price.toLocaleString()}`;

        const tempDiv = document.createElement('div');
        tempDiv.appendChild(cardNode);
        return tempDiv.innerHTML;
      },
    },
  }),
]);

search.start();