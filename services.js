// This is the final, corrected search.js file.
// It uses a more robust method for building the HTML to prevent display errors.

// 1. Initialize the Algolia client (remember to replace placeholders)
const searchClient = algoliasearch(
  'HQGXJ2Y7ZD',
  '2e44c7070ebafaeb6ca324daa28f36b4'
);

const search = instantsearch({
  indexName: 'services',
  searchClient,
});

// 2. Create and add the widgets
search.addWidgets([
  /**
   * Search Box Widget
   */
  instantsearch.widgets.searchBox({
    container: '#search-container',
    inputSelector: '#search-input',
    placeholder: 'What service are you looking for?',
    showSubmit: true,
    templates: {
      submit(options, { html }) {
        return html`<button type="submit"><i class="fas fa-search"></i></button>`;
      },
      reset() { return ''; }
    },
  }),

  /**
   * Custom Category Filter Widget (Connector)
   */
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
              if (currentRefined) {
                 refine(currentRefined.value); // Toggling the current one off
              }
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

  /**
   * Results (Hits) Widget
   * THIS IS THE CORRECTED PART
   */
  instantsearch.widgets.hits({
    container: '#services-grid',
    templates: {
      empty(results) {
        return `<p class="loading-text">No services found for "${results.query}".</p>`;
      },
      // This template uses standard JavaScript strings, which is more reliable.
      item(hit) {
        const providerAvatar = hit.providerAvatar || `https://placehold.co/40x40/10336d/a7c0e8?text=${(hit.providerName || 'P').charAt(0)}`;
        const highlightedTitle = instantsearch.highlight({ attribute: 'title', hit });

        return `
          <a href="service-detail.html?id=${hit.objectID}" class="service-card">
            <div class="card-image" style="background-image: url('${hit.coverImageUrl || 'https://placehold.co/600x400'}');"></div>
            <div class="card-content">
              <div class="provider-info">
                <img src="${providerAvatar}" alt="${hit.providerName}" class="provider-avatar">
                <span class="provider-name">${hit.providerName}</span>
              </div>
              <h3 class="service-title">${highlightedTitle}</h3>
              <p class="service-location"><i class="fas fa-map-marker-alt"></i> ${hit.location}</p>
              <div class="card-footer">
                <div class="price"><span>From </span>UGX ${hit.price.toLocaleString()}</div>
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