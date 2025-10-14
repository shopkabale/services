// functions/search.js

// This function ONLY searches Algolia and returns the results.
// It gives your frontend 100% control over the display.
async function handleSearch(context) {
  // Get secrets
  const { env } = context;
  const ALGOLIA_APP_ID = env.VITE_ALGOLIA_APP_ID;
  const ALGOLIA_ADMIN_KEY = env.ALGOLIA_ADMIN_API_KEY; // Use admin key for searching on the server
  const ALGOLIA_INDEX_NAME = 'services';

  // Lazy load the algoliasearch library
  const algoliasearch = (await import('algoliasearch')).default;
  const client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY);
  const index = client.initIndex(ALGOLIA_INDEX_NAME);

  // Get search parameters from the URL (e.g., /search?query=plumber&category=Home)
  const url = new URL(context.request.url);
  const query = url.searchParams.get('query') || '';
  const category = url.searchParams.get('category') || '';

  const searchOptions = {
    filters: ''
  };

  // If a category is specified, add it as a filter for Algolia
  if (category && category !== 'All') {
    searchOptions.filters = `category:'${category}'`;
  }

  try {
    // Perform the search in Algolia
    const { hits } = await index.search(query, searchOptions);
    
    // Return the results as JSON
    return new Response(JSON.stringify(hits), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Algolia search error:", error);
    return new Response(JSON.stringify({ error: "Search failed" }), { status: 500 });
  }
}

export const onRequest = handleSearch;