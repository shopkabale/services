// This is the final code to power your services page with Algolia.
// It replaces the old services.js file entirely.

// 1. Initialize the Algolia client
// IMPORTANT: Replace these placeholders with your actual Algolia credentials.
// You can find these in your Algolia Dashboard -> Settings -> API Keys.
const searchClient = algoliasearch(
  'HQGXJ2Y7ZD',      // Your Application ID
  '2e44c7070ebafaeb6ca324daa28f36b4'  // Your public, Search-Only API Key
);

// 2. Create the main InstantSearch instance
const search = instantsearch({
  indexName: 'services',      // The name of your Algolia index
  searchClient,
});

// 3. Create and add all the search interface components ("widgets")
search.addWidgets([
  /**
   * Search Box Widget
   * This connects to the <div id="searchbox"></div> in your HTML.
   */
  instantsearch.widgets.searchBox({
    container: '#searchbox',
    placeholder: 'What service are you looking for?',
    showSubmit: true,
    showReset: false,
    templates: {
      submit({ cssClasses }, { html }) {
        return html`<button type="${cssClasses.submit}" type="submit"><i class="fas fa-search"></i></button>`;
      },
    },
  }),

  /**
   * Category Filter Widget (Refinement List)
   * This connects to the <div id="category-filters"></div> and automatically
   * creates the filter buttons based on the 'category' attribute in your data.
   */
  instantsearch.widgets.refinementList({
    container: '#category-filters',
    attribute: 'category', // The field in your data to filter on
    sortBy: ['name:asc'],
    operator: 'or', // Allow selecting multiple categories
    templates: {
      item(item, { html }) {
        return html`
          <button class="filter-btn ${item.isRefined ? 'active' : ''}" @click="${item.value}">
            ${item.label}
          </button>
        `;
      },
    },
  }),

  /**
   * Results (Hits) Widget
   * This connects to the <div id="services-grid"></div> and displays the results.
   */
  instantsearch.widgets.hits({
    container: '#services-grid',
    templates: {
      // Message to show when no results are found
      empty(results, { html }) {
        return html`<p class="loading-text">No services found for <q>${results.query}</q>.</p>`;
      },
      // This is the HTML template for each search result card.
      // It uses your existing CSS classes perfectly.
      item(hit, { html }) {
        // Use a placeholder if the provider's avatar is missing
        const providerAvatar = hit.providerAvatar || `https://placehold.co/40x40/10336d/a7c0e8?text=${(hit.providerName || 'P').charAt(0)}`;
        
        return html`
          <a href="service-detail.html?id=${hit.objectID}" class="service-card">
            <div class="card-image" style="background-image: url('${hit.coverImageUrl || 'https://placehold.co/600x400'}');"></div>
            <div class="card-content">
              <div class="provider-info">
                <img src="${providerAvatar}" alt="${hit.providerName}" class="provider-avatar">
                <span class="provider-name">${hit.providerName}</span>
              </div>
              <h3 class="service-title">${instantsearch.highlight({ attribute: 'title', hit })}</h3>
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

// 4. Start the search experience
search.start();