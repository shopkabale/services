import { app } from './firebase-init.js';
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore, collection, doc, addDoc, getDoc, getDocs, query, where, updateDoc, deleteDoc, Timestamp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { uploadToCloudinary } from './cloudinary-upload.js';
import { showToast, hideToast, showButtonLoader, hideButtonLoader } from './notifications.js';

const auth = getAuth(app);
const db = getFirestore(app);

// --- ALGOLIA SYNC LOGIC ---
const WORKER_URL = 'https://services.kabaleonline.com/sync';

const syncToAlgolia = async (serviceData) => {
    const user = auth.currentUser;
    if (!user) return;
    try {
        const idToken = await user.getIdToken(true);
        const response = await fetch(WORKER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
            body: JSON.stringify(serviceData),
        });
        if (!response.ok) throw new Error(`Algolia sync failed: ${await response.text()}`);
        console.log('Sync to Algolia successful for:', serviceData.objectID);
    } catch (error) {
        console.error('Algolia Sync Error:', error);
    }
};

const deleteFromAlgolia = async (objectID) => {
    const user = auth.currentUser;
    if (!user) return;
    try {
        const idToken = await user.getIdToken(true);
        const response = await fetch(WORKER_URL, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
            body: JSON.stringify({ objectID }),
        });
        if (!response.ok) throw new Error(`Algolia delete failed: ${await response.text()}`);
        console.log('Delete from Algolia successful for:', objectID);
    } catch (error) {
        console.error('Algolia Delete Error:', error);
    }
};

// --- DOM ELEMENT REFERENCES ---
const serviceForm = document.getElementById('service-form');
const myServicesList = document.getElementById('my-services-list');
const formTitle = document.getElementById('form-title');
const submitButton = serviceForm.querySelector('.btn-submit');
const imageInput = document.getElementById('cover-image-input');
const imagePreview = document.getElementById('cover-image-preview');
const deleteModal = document.getElementById('delete-modal');
const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');

// --- STATE MANAGEMENT ---
let currentUserId = null;
let editingServiceId = null;
let serviceToDeleteId = null;

// --- AUTHENTICATION ---
onAuthStateChanged(auth, user => {
    if (user) {
        currentUserId = user.uid;
        fetchAndDisplayServices(currentUserId);
    } else {
        window.location.href = 'auth.html';
    }
});

// --- CORE FUNCTIONS ---

const fetchAndDisplayServices = async (userId) => {
    myServicesList.innerHTML = '<p>Loading your services...</p>';
    const q = query(collection(db, "services"), where("providerId", "==", userId));
    try {
        const snapshot = await getDocs(q);
        myServicesList.innerHTML = '';
        if (snapshot.empty) {
            myServicesList.innerHTML = '<p>You have not listed any services yet. Add one using the form above!</p>';
            return;
        }
        snapshot.forEach(doc => {
            const service = { id: doc.id, ...doc.data() };
            const el = document.createElement('div');
            el.className = 'service-item';
            el.innerHTML = `
                <img src="${service.coverImageUrl || 'https://placehold.co/60x60/a7c0e8/0d2857?text=Img'}" alt="${service.title}" class="service-item-img">
                <div class="service-item-details">
                    <h3 class="service-item-title">${service.title}</h3>
                </div>
                <div class="service-item-actions">
                    <button class="edit-btn" data-id="${service.id}" title="Edit"><i class="fas fa-pencil-alt"></i></button>
                    <button class="delete-btn delete" data-id="${service.id}" title="Delete"><i class="fas fa-trash-alt"></i></button>
                </div>`;
            myServicesList.appendChild(el);
        });
    } catch (e) {
        console.error("Error fetching services: ", e);
        myServicesList.innerHTML = '<p>Could not load your services at this time.</p>';
    }
};

const setFormToEditMode = async (serviceId) => {
    editingServiceId = serviceId;
    formTitle.textContent = 'Edit Your Service';
    submitButton.textContent = 'Save Changes';
    try {
        const serviceDoc = await getDoc(doc(db, "services", serviceId));
        if (serviceDoc.exists()) {
            const data = serviceDoc.data();
            document.getElementById('service-title').value = data.title || '';
            document.getElementById('service-category').value = data.category || '';
            document.getElementById('service-description').value = data.description || '';
            document.getElementById('service-location').value = data.location || '';
            document.getElementById('service-price').value = data.price || 0;
            document.getElementById('price-unit').value = data.priceUnit || '';
            imagePreview.innerHTML = data.coverImageUrl ? `<img src="${data.coverImageUrl}" alt="Cover image preview">` : '<span class="placeholder-text"><i class="fas fa-camera"></i> Upload</span>';
            window.scrollTo({ top: serviceForm.offsetTop, behavior: 'smooth' });
        }
    } catch (error) {
        showToast('Failed to load service data for editing.', 'error');
        resetForm();
    }
};

const resetForm = () => {
    editingServiceId = null;
    formTitle.textContent = 'Add a New Service';
    submitButton.textContent = 'Publish Service';
    serviceForm.reset();
    imagePreview.innerHTML = '<span class="placeholder-text"><i class="fas fa-camera"></i> Upload</span>';
};

// --- EVENT LISTENERS ---

serviceForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUserId) return;
    showButtonLoader(submitButton);

    const userDocRef = doc(db, "users", currentUserId);
    const userDoc = await getDoc(userDocRef);
    if (!userDoc.exists()) {
        showToast('Error: Could not find your user profile.', 'error');
        hideButtonLoader(submitButton);
        return;
    }
    const providerProfile = userDoc.data();

    const title = document.getElementById('service-title').value;
    const category = document.getElementById('service-category').value;
    const location = document.getElementById('service-location').value;
    
    const serviceData = {
        title: title,
        category: category,
        description: document.getElementById('service-description').value,
        location: location,
        price: Number(document.getElementById('service-price').value),
        priceUnit: document.getElementById('price-unit').value,
        providerId: currentUserId,
        providerName: providerProfile.name,
        providerAvatar: providerProfile.profilePicUrl || ''
    };

    try {
        const imageFile = imageInput.files[0];
        let previousImageUrl = null;
        if(editingServiceId) {
            const docSnap = await getDoc(doc(db, "services", editingServiceId));
            if (docSnap.exists()) {
                previousImageUrl = docSnap.data().coverImageUrl;
                // Preserve existing review data when updating
                serviceData.reviewCount = docSnap.data().reviewCount || 0;
                serviceData.averageRating = docSnap.data().averageRating || 0;
            }
        }
        serviceData.coverImageUrl = previousImageUrl || '';
        if (imageFile) {
            showToast('Uploading image...', 'progress');
            serviceData.coverImageUrl = await uploadToCloudinary(imageFile);
            hideToast();
        }

        const keywords = new Set([...title.toLowerCase().split(' '), ...category.toLowerCase().split(' '), ...location.toLowerCase().split(' ')]);
        serviceData.searchKeywords = Array.from(keywords);

        if (editingServiceId) {
            showToast('Updating service...', 'progress');
            await updateDoc(doc(db, "services", editingServiceId), serviceData);
            showToast('Service updated successfully!', 'success');
            const dataForAlgolia = { ...serviceData, objectID: editingServiceId };
            await syncToAlgolia(dataForAlgolia);
        } else {
            showToast('Publishing service...', 'progress');
            serviceData.createdAt = Timestamp.fromDate(new Date());
            // --- NEW: Initialize rating fields for new services ---
            serviceData.reviewCount = 0;
            serviceData.averageRating = 0;

            const docRef = await addDoc(collection(db, "services"), serviceData);
            showToast('Service published successfully!', 'success');
            const dataForAlgolia = { ...serviceData, objectID: docRef.id, createdAt: new Date().toISOString() };
            await syncToAlgolia(dataForAlgolia);
        }

        resetForm();
        fetchAndDisplayServices(currentUserId);
    } catch (error) {
        hideToast();
        showToast(`Error: ${error.message}`, 'error');
    } finally {
        hideButtonLoader(submitButton);
    }
});

myServicesList.addEventListener('click', e => {
    const editBtn = e.target.closest('.edit-btn');
    if (editBtn) {
        setFormToEditMode(editBtn.dataset.id);
        return;
    }
    
    const deleteBtn = e.target.closest('.delete-btn');
    if (deleteBtn) {
        serviceToDeleteId = deleteBtn.dataset.id;
        deleteModal.classList.add('show');
    }
});

confirmDeleteBtn.addEventListener('click', async () => {
    if (!serviceToDeleteId) return;
    showButtonLoader(confirmDeleteBtn);
    const serviceIdToDelete = serviceToDeleteId;
    try {
        await deleteDoc(doc(db, "services", serviceIdToDelete));
        showToast('Service deleted successfully.', 'success');
        await deleteFromAlgolia(serviceIdToDelete);
        fetchAndDisplayServices(currentUserId);
    } catch (error) {
        showToast('Failed to delete service.', 'error');
    } finally {
        hideButtonLoader(confirmDeleteBtn);
        deleteModal.classList.remove('show');
        serviceToDeleteId = null;
    }
});

cancelDeleteBtn.addEventListener('click', () => {
    deleteModal.classList.remove('show');
    serviceToDeleteId = null;
});

imageInput.addEventListener('change', () => {
    if (imageInput.files && imageInput.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.innerHTML = `<img src="${e.target.result}" alt="Cover image preview">`;
        };
        reader.readAsDataURL(imageInput.files[0]);
    }
});