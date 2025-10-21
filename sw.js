const CACHE_NAME = 'kabaleonline-pwa-v2.0'; // Increment version to force update
const OFFLINE_URL = 'offline.html';

//  Add all your core HTML and JS files to the cache list.
// This ensures the basic shell of your app works offline.
const CORE_FILES_TO_CACHE = [
  '/',
  'index.html',
  'auth.html',
  'services.html',
  'browse-jobs.html',
  'job-post-detail.html',
  'profile.html',
  'service-detail.html',
  'dashboard.html',
  'edit-profile.html',
  'inbox.html',
  'chat.html',
  'group-chat.html',
  'admin.html',
  'offline.html',
  'theme.js',
  'global-auth.js',
  'firebase-init.js',
  'notifications.js',
  'cloudinary-upload.js'
  // Add paths to your logo and any critical images you want to be available offline.
  // e.g., '/images/logo.png'
];

// 1. Install the service worker and cache the app shell
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching app shell');
        // Add the offline page to the cache initially
        cache.add(new Request(OFFLINE_URL, { cache: 'reload' }));
        return cache.addAll(CORE_FILES_TO_CACHE);
      })
  );
  self.skipWaiting();
});

// 2. Activate event to clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. Fetch event to handle network requests
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Strategy for navigation (HTML pages)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          // Try the network first.
          const networkResponse = await fetch(event.request);
          return networkResponse;
        } catch (error) {
          // If the network fails, the user is offline.
          console.log('Fetch failed; returning offline page.');
          const cache = await caches.open(CACHE_NAME);
          // Return the pre-cached offline.html page.
          return await cache.match(OFFLINE_URL);
        }
      })()
    );
  } else {
    // Strategy for other assets (CSS, JS, images) - Cache-first
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        // Return from cache if found, otherwise fetch from network.
        return cachedResponse || fetch(event.request);
      })
    );
  }
});

