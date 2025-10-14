// functions/search.js (Dependency-Free Version)

// This function ONLY uses the built-in fetch command and has no imports.
// This will resolve the "Could not resolve" build error.

async function handleSearch(context) {
  // Get secrets from the Cloudflare dashboard
  const { env } = context;
  const ALGOLIA_APP_ID = env.VITE_ALGOLIA_APP_ID;
  const ALGOLIA_ADMIN_KEY = env.ALGOLIA_ADMIN_API_KEY;
  const ALGOLIA_INDEX_NAME = 'services';

  // Get search parameters from the incoming URL
  const url = new URL(context.request.url);
  const query = url.searchParams.get('query') || '';
  const category = url.searchParams.get('category') || '';

  // Prepare the search options for Algolia's API
  const searchOptions = {
    query: query,
    filters: ''
  };

  if (category && category !== 'All') {
    searchOptions.filters = `category:'${category}'`;
  }

  // This is the direct URL to Algolia's search API
  const algoliaUrl = `https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/${ALGOLIA_INDEX_NAME}/query`;

  try {
    // Perform the search by making a POST request to Algolia's API
    const response = await fetch(algoliaUrl, {
        method: 'POST',
        headers: {
            'X-Algolia-Application-ID': ALGOLIA_APP_ID,
            'X-Algolia-API-Key': ALGOLIA_ADMIN_KEY, // Use Admin key for server-side search
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(searchOptions)
    });

    if (!response.ok) {
        throw new Error(`Algolia API Error: ${await response.text()}`);
    }

    const { hits } = await response.json();
    
    // Return the results to your frontend
    return new Response(JSON.stringify(hits), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Search function error:", error);
    return new Response(JSON.stringify({ error: "Search failed" }), { status: 500 });
  }
}

export const onRequest = handleSearch;