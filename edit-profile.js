import { app } from './firebase-init.js';
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { uploadToCloudinary } from './cloudinary-upload.js';
import { showToast, hideToast, showButtonLoader, hideButtonLoader } from './notifications.js';


const auth = getAuth(app);
const db = getFirestore(app);

// --- ELEMENT SELECTORS ---
const photoInput = document.getElementById('profile-photo-input');
const photoPreview = document.getElementById('photo-preview');
const fullNameInput = document.getElementById('full-name');
const emailInput = document.getElementById('email');
const telephoneInput = document.getElementById('telephone');
const locationInput = document.getElementById('location');
const taglineInput = document.getElementById('tagline');
const aboutInput = document.getElementById('about');
const editProfileForm = document.getElementById('edit-profile-form');
const backToDashboardBtn = document.getElementById('back-to-dashboard-btn');
const submitBtn = document.getElementById('submit-btn');

let currentUser = null;

// --- AUTHENTICATION & DATA FETCHING ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        // Fetch and populate the form with existing user data
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
            populateForm(userDoc.data());
        } else {
            // This can happen for a brand new Google user
            console.warn("No profile document found, using auth data as a fallback.");
            populateForm(user); // Populate with basic data from auth
        }
    } else {
        // Not logged in, redirect
        window.location.href = 'auth.html';
    }
});

// --- FUNCTION to populate form with user data ---
function populateForm(userData) {
    photoPreview.src = userData.profilePicUrl || userData.photoURL || `https://placehold.co/100x100/10336d/a7c0e8?text=${(userData.name || userData.displayName || 'U').charAt(0)}`;
    fullNameInput.value = userData.name || userData.displayName || '';
    emailInput.value = userData.email || '';
    telephoneInput.value = userData.telephone || '';
    locationInput.value = userData.location || '';
    taglineInput.value = userData.tagline || '';
    aboutInput.value = userData.about || '';

    // Set back button based on role
    if (userData.isProvider) {
        backToDashboardBtn.href = 'provider-dashboard.html';
    } else {
        backToDashboardBtn.href = 'dashboard.html';
    }
}

// --- EVENT LISTENERS ---

// Photo Preview Logic
photoInput.addEventListener('change', () => {
    if (photoInput.files && photoInput.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            photoPreview.src = e.target.result;
        };
        reader.readAsDataURL(photoInput.files[0]);
    }
});

// Form Submission Logic
editProfileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    showButtonLoader(submitBtn);

    try {
        const updatedData = {
            name: fullNameInput.value,
            telephone: telephoneInput.value,
            location: locationInput.value,
            tagline: taglineInput.value,
            about: aboutInput.value,
        };

        // Check if a new photo was uploaded
        const photoFile = photoInput.files[0];
        if (photoFile) {
            showToast('Uploading photo...', 'progress');
            const imageUrl = await uploadToCloudinary(photoFile);
            updatedData.profilePicUrl = imageUrl;
            hideToast();
        }

        // Update the user's document in Firestore
        showToast('Saving profile...', 'progress');
        const userDocRef = doc(db, "users", currentUser.uid);
        await updateDoc(userDocRef, updatedData);
        hideToast();
        showToast('Profile updated successfully!', 'success');

        // After saving, send the user to their dashboard.
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500); // Wait 1.5 seconds to allow user to see success message

    } catch (error) {
        hideToast();
        console.error("Error updating profile:", error);
        showToast("Error updating profile. Please try again.", 'error');
    } finally {
        hideButtonLoader(submitBtn);
    }
});