// --- Import Firebase Services & Helpers ---
import { app } from './firebase-init.js';
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, getDocs, Timestamp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { uploadToCloudinary } from './cloudinary-upload.js';

const auth = getAuth(app);
const db = getFirestore(app);

// --- ELEMENT SELECTORS ---
const serviceForm = document.getElementById('service-form');
const imageInput = document.getElementById('cover-image-input');
const imagePreview = document.getElementById('cover-image-preview');
const myServicesList = document.getElementById('my-services-list');
const submitButton = document.querySelector('.btn-submit');

let currentUserId = null;

// --- AUTHENTICATION & INITIAL DATA LOAD ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // User is signed in.
        currentUserId = user.uid;
        await fetchAndDisplayServices(currentUserId);
    } else {
        // User is signed out, redirect.
        window.location.href = 'auth.html';
    }
});


// --- FUNCTION to fetch and display provider's services ---
const fetchAndDisplayServices = async (userId) => {
    if (!userId) return;
    myServicesList.innerHTML = '<p>Loading your services...</p>'; // Show a loading state

    const servicesRef = collection(db, "services");
    const q = query(servicesRef, where("providerId", "==", userId));
    
    try {
        const querySnapshot = await getDocs(q);
        myServicesList.innerHTML = ''; // Clear loading state

        if (querySnapshot.empty) {
            myServicesList.innerHTML = '<p>You have not listed any services yet.</p>';
            return;
        }

        querySnapshot.forEach((doc) => {
            const service = doc.data();
            const serviceElement = document.createElement('div');
            serviceElement.className = 'service-item';
            serviceElement.innerHTML = `
                <img src="${service.coverImageUrl || 'https://placehold.co/80x80'}" alt="${service.title}" class="service-item-img">
                <div class="service-item-details">
                    <h3 class="service-item-title">${service.title}</h3>
                    <p class="service-item-status">Active</p>
                </div>
                <div class="service-item-actions">
                    <button title="Edit"><i class="fas fa-pencil-alt"></i></button>
                    <button class="delete" title="Delete"><i class="fas fa-trash-alt"></i></button>
                </div>
            `;
            myServicesList.appendChild(serviceElement);
        });
    } catch (error) {
        console.error("Error fetching services:", error);
        myServicesList.innerHTML = '<p>Could not load your services.</p>';
    }
};


// --- FORM SUBMISSION LOGIC ---
serviceForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUserId) {
        alert('You must be logged in to post a service.');
        return;
    }

    const imageFile = imageInput.files[0];
    if (!imageFile) {
        alert('Please upload a cover image for your service.');
        return;
    }

    submitButton.disabled = true;
    submitButton.textContent = 'Publishing...';

    try {
        // 1. Upload image to Cloudinary
        const coverImageUrl = await uploadToCloudinary(imageFile);

        // 2. Gather form data
        const serviceData = {
            providerId: currentUserId,
            title: document.getElementById('service-title').value,
            category: document.getElementById('service-category').value,
            description: document.getElementById('service-description').value,
            location: document.getElementById('service-location').value,
            price: Number(document.getElementById('service-price').value),
            priceUnit: document.getElementById('price-unit').value,
            coverImageUrl: coverImageUrl,
            createdAt: Timestamp.fromDate(new Date())
        };

        // 3. Save service data to Firestore
        const docRef = await addDoc(collection(db, "services"), serviceData);
        console.log("Service published with ID: ", docRef.id);

        // 4. Reset form and refresh the list
        serviceForm.reset();
        imagePreview.innerHTML = '<span class="placeholder-text"><i class="fas fa-camera"></i> Click to Upload</span>';
        await fetchAndDisplayServices(currentUserId);
        
        alert('Service published successfully!');

    } catch (error) {
        console.error("Error publishing service:", error);
        alert('There was an error publishing your service. Please try again.');
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Publish Service';
    }
});


// --- IMAGE PREVIEW LOGIC ---
imageInput.addEventListener('change', () => {
    if (imageInput.files && imageInput.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.innerHTML = '';
            const img = document.createElement('img');
            img.src = e.target.result;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'cover';
            imagePreview.appendChild(img);
        };
        reader.readAsDataURL(imageInput.files[0]);
    }
});