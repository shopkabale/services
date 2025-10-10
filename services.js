// --- Import Firebase Services & Initialized App ---
import { app } from './firebase-init.js';
import { getFirestore, collection, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const db = getFirestore(app);

// --- ELEMENT SELECTORS ---
const servicesGrid = document.getElementById('services-grid');

// --- FUNCTION to fetch and display all services ---
const displayAllServices = async () => {
    if (!servicesGrid) return;

    try {
        // 1. Fetch all documents from the "services" collection
        const servicesSnapshot = await getDocs(collection(db, "services"));
        
        if (servicesSnapshot.empty) {
            servicesGrid.innerHTML = '<p class="loading-text">No services have been listed yet. Be the first!</p>';
            return;
        }

        servicesGrid.innerHTML = ''; // Clear the loading message

        // 2. Loop through each service document
        for (const serviceDoc of servicesSnapshot.docs) {
            const service = { id: serviceDoc.id, ...serviceDoc.data() };

            // 3. Fetch the provider's profile data from the "users" collection
            let providerName = 'Anonymous';
            let providerAvatar = 'https://placehold.co/40x40'; // Default avatar

            if (service.providerId) {
                const userDocRef = doc(db, "users", service.providerId);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) {
                    const providerData = userDoc.data();
                    providerName = providerData.name || 'Provider';
                    providerAvatar = providerData.profilePicUrl || `https://placehold.co/40x40/10336d/a7c0e8?text=${providerName.charAt(0)}`;
                }
            }
            
            // 4. Create the HTML for the service card
            const card = document.createElement('a');
            card.href = `service-detail.html?id=${service.id}`; // Link to the detail page
            card.className = 'service-card';
            card.innerHTML = `
                <div class="card-image" style="background-image: url('${service.coverImageUrl || 'https://placehold.co/600x400'}');"></div>
                <div class="card-content">
                    <div class="provider-info">
                        <img src="${providerAvatar}" alt="${providerName}" class="provider-avatar">
                        <span class="provider-name">${providerName}</span>
                    </div>
                    <h3 class="service-title">${service.title}</h3>
                    <p class="service-location"><i class="fas fa-map-marker-alt"></i> ${service.location}</p>
                    <div class="card-footer">
                        <!-- Ratings can be added here later -->
                        <div class="price"><span>From </span>UGX ${service.price.toLocaleString()}</div>
                    </div>
                </div>
            `;
            
            // 5. Append the card to the grid
            servicesGrid.appendChild(card);
        }

    } catch (error) {
        console.error("Error fetching services:", error);
        servicesGrid.innerHTML = '<p class="loading-text">Could not load services. Please try again later.</p>';
    }
};

// --- INITIALIZATION ---
// Run the function when the page loads.
displayAllServices();