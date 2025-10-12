// This is the final and most robust services.js
// It uses the HTML <template> tag to guarantee the layout is perfect.

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
        
        const providerAvatar = hit.providerAvatar || `https://placehold.co/40x40/10336d/a7c0e8?text=${(hit.providerName || 'P').charAt(0)}`;
        card.querySelector('.provider-avatar').src = providerAvatar;
        card.querySelector('.provider-avatar').alt = hit.providerName || 'Provider';
        card.querySelector('.provider-name').textContent = hit.providerName || 'Anonymous';
        
        // Use html function for safe highlighting
        card.querySelector('.service-title').innerHTML = instantsearch.highlight({ attribute: 'title', hit });

        card.querySelector('.location-text').textContent = hit.location || 'Kabale';
        card.querySelector('.price-amount').textContent = `UGX ${hit.price.toLocaleString()}`;

        // Return the raw HTML of the filled-in card
        // This is a workaround to get the final HTML string for InstantSearch
        const tempDiv = document.createElement('div');
        tempDiv.appendChild(card);
        return tempDiv.innerHTML;
      },
    },
  }),
]);

// 3. Start Search
search.start();