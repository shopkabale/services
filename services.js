import { app } from './firebase-init.js';
import { getFirestore, collection, getDocs, doc, getDoc, query, where } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const db = getFirestore(app);
const servicesGrid = document.getElementById('services-grid');
const filterButtons = document.querySelectorAll('.filter-btn');

const fetchAndDisplayServices = async (categoryFilter = 'All') => {
    if (!servicesGrid) return;
    servicesGrid.innerHTML = '<p class="loading-text">Loading services...</p>';

    try {
        const servicesRef = collection(db, "services");
        let q;
        
        if (categoryFilter === 'All' || !categoryFilter) {
            q = query(servicesRef);
        } else {
            q = query(servicesRef, where("category", "==", categoryFilter));
        }

        const servicesSnapshot = await getDocs(q);
        
        if (servicesSnapshot.empty) {
            servicesGrid.innerHTML = `<p class="loading-text">No services found in this category.</p>`;
            return;
        }

        servicesGrid.innerHTML = '';

        for (const serviceDoc of servicesSnapshot.docs) {
            const service = { id: serviceDoc.id, ...serviceDoc.data() };
            
            let providerName = 'Anonymous';
            let providerAvatar = 'https://placehold.co/40x40';

            if (service.providerId) {
                const userDocRef = doc(db, "users", service.providerId);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) {
                    const providerData = userDoc.data();
                    providerName = providerData.name || 'Provider';
                    // This is the key line that fetches the real profile picture URL
                    providerAvatar = providerData.profilePicUrl || `https://placehold.co/40x40/10336d/a7c0e8?text=${providerName.charAt(0)}`;
                }
            }
            
            const card = document.createElement('a');
            card.href = `service-detail.html?id=${service.id}`;
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
                        <div class="price"><span>From </span>UGX ${service.price.toLocaleString()}</div>
                    </div>
                </div>
            `;
            servicesGrid.appendChild(card);
        }
    } catch (error) {
        console.error("Error fetching services:", error);
        servicesGrid.innerHTML = '<p class="loading-text">Could not load services. Please try again later.</p>';
    }
};

filterButtons.forEach(button => {
    button.addEventListener('click', () => {
        filterButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        const category = button.textContent;
        fetchAndDisplayServices(category);
    });
});

fetchAndDisplayServices();