export async function onRequest(context) {
  // Handle POST requests for creating/updating records
  if (context.request.method === 'POST') {
    return await handleCreateOrUpdate(context);
  }
  
  // Handle DELETE requests for removing records
  if (context.request.method === 'DELETE') {
    return await handleDelete(context);
  }

  // For GET requests or other methods, show a helpful message
  return new Response(
    "This function is running. Use a POST to create/update or a DELETE to remove a record.",
    { status: 200 }
  );
}

// --- LOGIC FOR CREATING OR UPDATING ---
async function handleCreateOrUpdate(context) {
  const { env, request } = context;
  const ALGOLIA_APP_ID = env.VITE_ALGOLIA_APP_ID;
  const ALGOLIA_ADMIN_KEY = env.ALGOLIA_ADMIN_API_KEY;
  const FIREBASE_WEB_API_KEY = env.FIREBASE_WEB_API_KEY;
  const ALGOLIA_INDEX_NAME = 'services';
  
  try {
    const idToken = request.headers.get('Authorization')?.split('Bearer ')[1];
    if (!idToken) return new Response('Missing Authorization Header.', { status: 401 });

    // Verify user token with Google's servers
    const authUrl = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_WEB_API_KEY}`;
    const authResponse = await fetch(authUrl, { method: 'POST', body: JSON.stringify({ idToken }) });
    if (!authResponse.ok) return new Response('Invalid user token.', { status: 401 });
    
    const serviceData = await request.json();
    if (!serviceData || !serviceData.objectID) return new Response('Missing service data or objectID.', { status: 400 });
    
    // Send data to Algolia's servers
    const algoliaUrl = `https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/${ALGOLIA_INDEX_NAME}/${serviceData.objectID}`;
    const algoliaResponse = await fetch(algoliaUrl, {
      method: 'PUT',
      headers: { 'X-Algolia-Application-ID': ALGOLIA_APP_ID, 'X-Algolia-API-Key': ALGOLIA_ADMIN_KEY },
      body: JSON.stringify(serviceData),
    });

    if (!algoliaResponse.ok) throw new Error('Failed to save data to Algolia.');

    return new Response(JSON.stringify({ success: true, message: 'Synced to Algolia' }), { headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Error in handleCreateOrUpdate:', error.message);
    return new Response('An internal error occurred.', { status: 500 });
  }
}

// --- NEW LOGIC FOR DELETING ---
async function handleDelete(context) {
  const { env, request } = context;
  const ALGOLIA_APP_ID = env.VITE_ALGOLIA_APP_ID;
  const ALGOLIA_ADMIN_KEY = env.ALGOLIA_ADMIN_API_KEY;
  const FIREBASE_WEB_API_KEY = env.FIREBASE_WEB_API_KEY;
  const ALGOLIA_INDEX_NAME = 'services';
  
  try {
    const idToken = request.headers.get('Authorization')?.split('Bearer ')[1];
    if (!idToken) return new Response('Missing Authorization Header.', { status: 401 });

    const authUrl = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_WEB_API_KEY}`;
    const authResponse = await fetch(authUrl, { method: 'POST', body: JSON.stringify({ idToken }) });
    if (!authResponse.ok) return new Response('Invalid user token.', { status: 401 });
    
    const { objectID } = await request.json();
    if (!objectID) return new Response('Missing objectID.', { status: 400 });
    
    // Send delete request to Algolia's servers
    const algoliaUrl = `https://${ALGOLIA_APP_ID}.algolia.net/1/indexes/${ALGOLIA_INDEX_NAME}/${objectID}`;
    const algoliaResponse = await fetch(algoliaUrl, {
      method: 'DELETE',
      headers: { 'X-Algolia-Application-ID': ALGOLIA_APP_ID, 'X-Algolia-API-Key': ALGOLIA_ADMIN_KEY },
    });

    if (!algoliaResponse.ok) throw new Error('Failed to delete data from Algolia.');

    return new Response(JSON.stringify({ success: true, message: 'Deleted from Algolia' }), { headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Error in handleDelete:', error.message);
    return new Response('An internal error occurred.', { status: 500 });
  }
}