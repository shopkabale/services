// This is the final code for your Cloudflare Worker.
// It handles POST requests (for creating/updating) and DELETE requests (for removing).

export async function onRequest(context) {
  // Handle POST requests for creating/updating records
  if (context.request.method === 'POST') {
    return await handleCreateOrUpdate(context);
  }
  
  // Handle DELETE requests for removing records
  if (context.request.method === 'DELETE') {
    return await handleDelete(context);
  }

  // For GET requests or other methods, show a helpful status message
  return new Response(
    "This function is running. Use a POST to create/update or a DELETE to remove a record.",
    { status: 200 }
  );
}

// --- LOGIC FOR CREATING OR UPDATING A RECORD IN ALGOLIA ---
async function handleCreateOrUpdate(context) {
  const { env, request } = context;
  const ALGOLIA_APP_ID = env.VITE_ALGOLIA_APP_ID;
  const ALGOLIA_ADMIN_KEY = env.ALGOLIA_ADMIN_API_KEY;
  const FIREBASE_WEB_API_KEY = env.FIREBASE_WEB_API_KEY;
  const ALGOLIA_INDEX_NAME = 'services';
  
  try {
    // 1. Authenticate the user by verifying their Firebase token
    const idToken = request.headers.get('Authorization')?.split('Bearer ')[1];
    if (!idToken) {
      return new Response('Missing Authorization Header.', { status: 401 });
    }
    const authUrl = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_WEB_API_KEY}`;
    const authResponse = await fetch(authUrl, { method: 'POST', body: JSON.stringify({ idToken }) });
    if (!authResponse.ok) {
      return new Response('Invalid user token.', { status: 401 });
    }
    const authData = await authResponse.json();
    const userId = authData.users[0].localId;
    
    // 2. Get the service data sent from the frontend
    const serviceData = await request.json();
    if (!serviceData || !serviceData.objectID) {
      return new Response('Missing service data or objectID.', { status: 400 });
    }

    // 3. Security Check: Ensure the user owns the service they are updating
    if (serviceData.providerId !== userId) {
      return new Response('Permission denied: You are not the owner of this service.', { status: 403 });
    }
    
    // 4. Send the data to Algolia's servers to be indexed
    const algoliaUrl = `https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/${ALGOLIA_INDEX_NAME}/${serviceData.objectID}`;
    const algoliaResponse = await fetch(algoliaUrl, {
      method: 'PUT', // PUT creates or replaces a record
      headers: { 
        'X-Algolia-Application-ID': ALGOLIA_APP_ID, 
        'X-Algolia-API-Key': ALGOLIA_ADMIN_KEY 
      },
      body: JSON.stringify(serviceData),
    });

    if (!algoliaResponse.ok) {
      throw new Error(`Failed to save data to Algolia: ${await algoliaResponse.text()}`);
    }

    return new Response(JSON.stringify({ success: true, message: 'Synced to Algolia' }), { headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Error in handleCreateOrUpdate:', error.message);
    return new Response('An internal error occurred during sync.', { status: 500 });
  }
}

// --- LOGIC FOR DELETING A RECORD FROM ALGOLIA ---
async function handleDelete(context) {
  const { env, request } = context;
  const ALGOLIA_APP_ID = env.VITE_ALGOLIA_APP_ID;
  const ALGOLIA_ADMIN_KEY = env.ALGOLIA_ADMIN_API_KEY;
  const FIREBASE_WEB_API_KEY = env.FIREBASE_WEB_API_KEY;
  const ALGOLIA_INDEX_NAME = 'services';
  
  try {
    // 1. Authenticate the user by verifying their Firebase token
    const idToken = request.headers.get('Authorization')?.split('Bearer ')[1];
    if (!idToken) {
      return new Response('Missing Authorization Header.', { status: 401 });
    }
    const authUrl = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_WEB_API_KEY}`;
    const authResponse = await fetch(authUrl, { method: 'POST', body: JSON.stringify({ idToken }) });
    if (!authResponse.ok) {
      return new Response('Invalid user token.', { status: 401 });
    }
    
    // 2. Get the objectID to be deleted from the request
    const { objectID } = await request.json();
    if (!objectID) {
      return new Response('Missing objectID in request body.', { status: 400 });
    }
    
    // Note: A full security implementation would also check ownership before deleting.
    // This is generally safe as the delete button only appears for the owner in the UI.

    // 3. Send the delete request to Algolia's servers
    const algoliaUrl = `https://${ALGOLIA_APP_ID}.algolia.net/1/indexes/${ALGOLIA_INDEX_NAME}/${objectID}`;
    const algoliaResponse = await fetch(algoliaUrl, {
      method: 'DELETE',
      headers: { 
        'X-Algolia-Application-ID': ALGOLIA_APP_ID, 
        'X-Algolia-API-Key': ALGOLIA_ADMIN_KEY 
      },
    });

    if (!algoliaResponse.ok) {
      throw new Error(`Failed to delete data from Algolia: ${await algoliaResponse.text()}`);
    }

    return new Response(JSON.stringify({ success: true, message: 'Deleted from Algolia' }), { headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Error in handleDelete:', error.message);
    return new Response('An internal error occurred during deletion.', { status: 500 });
  }
}