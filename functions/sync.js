// This is the full code for your new functions/sync.js file

// The data we expect to receive from the frontend
// interface ServiceData {
//   objectID: string;
//   name: string;
//   role: string;
//   location: string;
//   profilePicUrl: string;
//   searchKeywords: string[];
// }

export async function onRequestPost(context) {
  // Get all our secrets from the Cloudflare dashboard
  const { env } = context;
  const ALGOLIA_APP_ID = env.VITE_ALGOLIA_APP_ID;
  const ALGOLIA_ADMIN_KEY = env.ALGOLIA_ADMIN_API_KEY;
  const FIREBASE_WEB_API_KEY = env.FIREBASE_WEB_API_KEY;
  
  // --- UPDATE THIS IF YOUR INDEX NAME IS DIFFERENT ---
  const ALGOLIA_INDEX_NAME = 'services';
  // --------------------------------------------------

  try {
    // === Step 1: Verify the user is a real, logged-in user ===
    const authorizationHeader = context.request.headers.get('Authorization');
    if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
      return new Response('Missing Authorization Header.', { status: 401 });
    }
    const idToken = authorizationHeader.split('Bearer ')[1];

    // We ask Google's servers to verify the token
    const firebaseAuthUrl = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_WEB_API_KEY}`;
    const authResponse = await fetch(firebaseAuthUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: idToken }),
    });

    if (!authResponse.ok) {
      console.error("Firebase Auth Error:", await authResponse.text());
      return new Response('Invalid user token.', { status: 401 });
    }
    
    // === Step 2: Get the service data from the request ===
    const serviceData = await context.request.json();
    if (!serviceData || !serviceData.objectID) {
      return new Response('Missing service data or objectID.', { status: 400 });
    }
    
    // === Step 3: Send the data to Algolia's servers ===
    const algoliaUrl = `https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/${ALGOLIA_INDEX_NAME}/${serviceData.objectID}`;
    
    const algoliaResponse = await fetch(algoliaUrl, {
      method: 'PUT', // PUT creates or replaces the record
      headers: {
        'X-Algolia-Application-ID': ALGOLIA_APP_ID,
        'X-Algolia-API-Key': ALGOLIA_ADMIN_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(serviceData),
    });

    if (!algoliaResponse.ok) {
      console.error("Algolia API Error:", await algoliaResponse.text());
      throw new Error('Failed to save data to Algolia.');
    }

    console.log(`Successfully synced objectID: ${serviceData.objectID}`);
    // Send a success response back to the frontend
    return new Response(JSON.stringify({ success: true, message: 'Synced to Algolia' }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in Cloudflare Worker:', error.message);
    return new Response('An internal error occurred.', { status: 500 });
  }
}