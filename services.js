// This is the final and perfected search.js file.
// The item template is a direct HTML mirror of your beautiful service-card design.

// 1. Initialize the Algolia client (Your keys should already be here)
const searchClient = algoliasearch(
  'HQGXJ2Y7ZD',
  '2e44c7070ebafaeb6ca324daa28f36b4'
);

const search = instantsearch({
  indexName: 'services',
  searchClient,
});

// 2. Add the widgets
search.addWidgets([
  // --- Search Box ---
  instantsearch.widgets.searchBox({
    container: '#search-container',
    inputSelector: '#search-input',
    placeholder: 'What service are you looking for?',
    showSubmit: true,
    templates: {
      submit: '<button type="submit"><i class="fas fa-search"></i></button>',
      reset: () => '',
    },
  }),

  // --- Custom Category Filters ---
  instantsearch.connectors.connectRefinementList(
    (renderOptions, isFirstRender) => {
      const { items, refine } = renderOptions;
      const container = document.querySelector('#category-filters');

      if (isFirstRender) {
        container.addEventListener('click', event => {
          const button = event.target.closest('.filter-btn');
          if (button) {
            const category = button.dataset.category;
            if (category === 'All') {
              const currentRefined = items.find(item => item.isRefined);
              if (currentRefined) refine(currentRefined.value);
            } else {
              refine(category);
            }
          }
        });
      }
      
      const currentRefinedItem = items.find(item => item.isRefined);
      const allButtons = container.querySelectorAll('.filter-btn');

      allButtons.forEach(button => {
        const category = button.dataset.category;
        if (category === 'All') {
          button.classList.toggle('active', !currentRefinedItem);
        } else {
          button.classList.toggle('active', currentRefinedItem && currentRefinedItem.value === category);
        }
      });
    }
  )({
    attribute: 'category',
  }),

  // --- Search Results (Hits) ---
  instantsearch.widgets.hits({
    container: '#services-grid',
    templates: {
      empty: (results) => `<p class="loading-text">No services found for "${results.query}".</p>`,
      
      // THIS IS THE CORRECTED, HIGH-FIDELITY HTML TEMPLATE
      item: (hit) => {
        const providerAvatar = hit.providerAvatar || `https://placehold.co/40x40/10336d/a7c0e8?text=${(hit.providerName || 'P').charAt(0)}`;
        const coverImage = hit.coverImageUrl || 'https://placehold.co/600x400';
        // Use Algolia's highlighting feature for the title
        const highlightedTitle = instantsearch.highlight({ attribute: 'title', hit });

        // This is a direct, line-by-line copy of your service card structure
        return `
          <a href="service-detail.html?id=${hit.objectID}" class="service-card">
            <div class="card-image" style="background-image: url('${coverImage}');"></div>
            <div class="card-content">
              <div class="provider-info">
                <img src="${providerAvatar}" alt="${hit.providerName}" class="provider-avatar">
                <span class="provider-name">${hit.providerName || 'Anonymous'}</span>
              </div>
              <h3 class="service-title">${highlightedTitle}</h3>
              <p class="service-location">
                <i class="fas fa-map-marker-alt"></i> ${hit.location || 'Kabale'}
              </p>
              <div class="card-footer">
                <div class="price">
                  <span>From </span>UGX ${hit.price.toLocaleString()}
                </div>
              </div>
            </div>
          </a>
        `;
      },
    },
  }),
]);

// 3. Start the search
search.start();