// functions/updateProvider.js

// This function will use the Firebase Admin SDK. You must have the FIREBASE_ADMIN_KEY_JSON secret set up in Cloudflare.
// If you don't, get it from your central database project: Firebase Console -> Project Settings -> Service Accounts -> Generate new private key.
import admin from 'firebase-admin';

async function handleUpdateProvider(context) {
  const { env, request } = context;
  const FIREBASE_ADMIN_KEY = JSON.parse(env.FIREBASE_ADMIN_KEY_JSON);

  try {
    // Initialize Admin SDK to talk to your central database
    if (!admin.apps.length) {
      admin.initializeApp({ credential: admin.credential.cert(FIREBASE_ADMIN_KEY) });
    }
    const db = admin.firestore();

    // Verify the user's token to ensure this is a secure request
    const idToken = request.headers.get('Authorization')?.split('Bearer ')[1];
    if (!idToken) return new Response('Unauthorized', { status: 401 });
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const userId = decodedToken.uid;

    // Get the new profile data from the request
    const { name, profilePicUrl } = await request.json();
    if (!name || !profilePicUrl) {
      return new Response('Missing name or profilePicUrl', { status: 400 });
    }

    // --- Find all services by this provider in Firestore ---
    const servicesQuery = db.collection('services').where('providerId', '==', userId);
    const servicesSnapshot = await servicesQuery.get();
    
    if (servicesSnapshot.empty) {
      console.log("Provider has no services to update.");
      return new Response(JSON.stringify({ success: true, message: 'No services to update.' }));
    }

    // --- Update Firestore and Prepare for Algolia ---
    const firestoreBatch = db.batch();
    const algoliaObjectsToUpdate = [];

    servicesSnapshot.forEach(doc => {
      const serviceRef = doc.ref;
      firestoreBatch.update(serviceRef, { providerName: name, providerAvatar: profilePicUrl });
      algoliaObjectsToUpdate.push({
        objectID: doc.id,
        providerName: name,
        providerAvatar: profilePicUrl
      });
    });

    // --- Execute the updates ---
    await firestoreBatch.commit();
    
    // --- Now, update Algolia ---
    const algoliasearch = (await import('algoliasearch')).default;
    const client = algoliasearch(env.VITE_ALGOLIA_APP_ID, env.ALGOLIA_ADMIN_API_KEY);
    const index = client.initIndex('services');
    await index.partialUpdateObjects(algoliaObjectsToUpdate);

    return new Response(JSON.stringify({ success: true, message: `${algoliaObjectsToUpdate.length} services updated.` }));

  } catch (error) {
    console.error("Error in updateProvider worker:", error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

export const onRequestPost = handleUpdateProvider;