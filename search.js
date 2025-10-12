// This is the full code for search.js

// 1. Initialize the Algolia client
const searchClient = algoliasearch(
  'YOUR_ALGOLIA_APP_ID',      // <-- Replace with your App ID
  'YOUR_SEARCH_ONLY_API_KEY'  // <-- Replace with your Search-Only API Key
);

const search = instantsearch({
  indexName: 'services',      // The name of your Algolia index
  searchClient,
});

// 2. Create and add the search widgets
search.addWidgets([
  // Search Box Widget
  instantsearch.widgets.searchBox({
    container: '#searchbox',
    placeholder: 'Search for plumbers, developers, etc.',
    showSubmit: true,
    showReset: false,
  }),

  // Category Filter Widget
  instantsearch.widgets.refinementList({
    container: '#category-filters',
    attribute: 'category', // The field in your data to filter on
    sortBy: ['name:asc'],
    templates: {
      item(item, { html }) {
        return html`
          <button class="filter-btn ${item.isRefined ? 'active' : ''}">
            ${item.label}
          </button>
        `;
      },
    },
  }),

  // Results (Hits) Widget
  instantsearch.widgets.hits({
    container: '#services-grid',
    templates: {
      empty(results, { html }) {
        return html`<p class="loading-text">No results found for <q>${results.query}</q>.</p>`;
      },
      // This is the template for each search result card
      item(hit, { html }) {
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

// 3. Start the search
search.start();