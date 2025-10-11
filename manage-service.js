import { app } from './firebase-init.js';
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore, collection, doc, addDoc, getDoc, getDocs, query, where, updateDoc, deleteDoc, Timestamp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { uploadToCloudinary } from './cloudinary-upload.js';
import { showToast, hideToast, showButtonLoader, hideButtonLoader } from './notifications.js';

const auth = getAuth(app);
const db = getFirestore(app);

const serviceForm = document.getElementById('service-form');
const myServicesList = document.getElementById('my-services-list');
const formTitle = document.getElementById('form-title');
const submitButton = document.querySelector('.btn-submit');
const imageInput = document.getElementById('cover-image-input');
const imagePreview = document.getElementById('cover-image-preview');
const deleteModal = document.getElementById('delete-modal');
const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');

let currentUserId = null;
let editingServiceId = null; // To track if we are editing or creating
let serviceToDeleteId = null;

onAuthStateChanged(auth, user => {
    if (user) {
        currentUserId = user.uid;
        fetchAndDisplayServices(currentUserId);
    } else {
        window.location.href = 'auth.html';
    }
});

const fetchAndDisplayServices = async (userId) => {
    myServicesList.innerHTML = '<p>Loading...</p>';
    const q = query(collection(db, "services"), where("providerId", "==", userId));
    try {
        const snapshot = await getDocs(q);
        myServicesList.innerHTML = '';
        if (snapshot.empty) {
            myServicesList.innerHTML = '<p>You have not listed any services yet.</p>';
            return;
        }
        snapshot.forEach(doc => {
            const service = { id: doc.id, ...doc.data() };
            const el = document.createElement('div');
            el.className = 'service-item';
            el.innerHTML = `
                <img src="${service.coverImageUrl || 'https://placehold.co/60x60'}" alt="${service.title}" class="service-item-img">
                <div class="service-item-details"><h3 class="service-item-title">${service.title}</h3></div>
                <div class="service-item-actions">
                    <button class="edit-btn" data-id="${service.id}"><i class="fas fa-pencil-alt"></i></button>
                    <button class="delete-btn delete" data-id="${service.id}"><i class="fas fa-trash-alt"></i></button>
                </div>`;
            myServicesList.appendChild(el);
        });
    } catch (e) {
        myServicesList.innerHTML = '<p>Could not load services.</p>';
    }
};

const setFormToEditMode = async (serviceId) => {
    editingServiceId = serviceId;
    formTitle.textContent = 'Edit Service';
    submitButton.textContent = 'Save Changes';
    try {
        const serviceDoc = await getDoc(doc(db, "services", serviceId));
        if (serviceDoc.exists()) {
            const data = serviceDoc.data();
            document.getElementById('service-title').value = data.title;
            document.getElementById('service-category').value = data.category;
            document.getElementById('service-description').value = data.description;
            document.getElementById('service-location').value = data.location;
            document.getElementById('service-price').value = data.price;
            document.getElementById('price-unit').value = data.priceUnit;
            imagePreview.innerHTML = `<img src="${data.coverImageUrl}" alt="Cover image preview">`;
            window.scrollTo({ top: serviceForm.offsetTop, behavior: 'smooth' });
        }
    } catch (error) {
        showToast('Failed to load service data for editing.', 'error');
    }
};

const resetForm = () => {
    editingServiceId = null;
    formTitle.textContent = 'Add a New Service';
    submitButton.textContent = 'Publish Service';
    serviceForm.reset();
    imagePreview.innerHTML = '<span class="placeholder-text"><i class="fas fa-camera"></i> Upload</span>';
};

serviceForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUserId) return;
    showButtonLoader(submitButton);

    const serviceData = {
        title: document.getElementById('service-title').value,
        category: document.getElementById('service-category').value,
        description: document.getElementById('service-description').value,
        location: document.getElementById('service-location').value,
        price: Number(document.getElementById('service-price').value),
        priceUnit: document.getElementById('price-unit').value,
        providerId: currentUserId,
    };

    try {
        const imageFile = imageInput.files[0];
        if (imageFile) {
            showToast('Uploading image...', 'progress');
            serviceData.coverImageUrl = await uploadToCloudinary(imageFile);
            hideToast();
        }

        if (editingServiceId) {
            showToast('Updating service...', 'progress');
            const serviceDocRef = doc(db, "services", editingServiceId);
            await updateDoc(serviceDocRef, serviceData);
            hideToast();
            showToast('Service updated successfully!', 'success');
        } else {
            showToast('Publishing service...', 'progress');
            serviceData.createdAt = Timestamp.fromDate(new Date());
            await addDoc(collection(db, "services"), serviceData);
            hideToast();
            showToast('Service published successfully!', 'success');
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
    if (e.target.closest('.edit-btn')) {
        const serviceId = e.target.closest('.edit-btn').dataset.id;
        setFormToEditMode(serviceId);
    }
    if (e.target.closest('.delete-btn')) {
        serviceToDeleteId = e.target.closest('.delete-btn').dataset.id;
        deleteModal.classList.add('show');
    }
});

cancelDeleteBtn.addEventListener('click', () => {
    deleteModal.classList.remove('show');
    serviceToDeleteId = null;
});

confirmDeleteBtn.addEventListener('click', async () => {
    if (!serviceToDeleteId) return;
    showButtonLoader(confirmDeleteBtn);
    try {
        await deleteDoc(doc(db, "services", serviceToDeleteId));
        showToast('Service deleted successfully.', 'success');
        fetchAndDisplayServices(currentUserId);
    } catch (error) {
        showToast('Failed to delete service.', 'error');
    } finally {
        hideButtonLoader(confirmDeleteBtn);
        deleteModal.classList.remove('show');
        serviceToDeleteId = null;
    }
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