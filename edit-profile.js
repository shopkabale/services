import { app } from './firebase-init.js';
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { uploadToCloudinary } from './cloudinary-upload.js';

const auth = getAuth(app);
const db = getFirestore(app);

// --- ELEMENT SELECTORS ---
const photoInput = document.getElementById('profile-photo-input');
const photoPreview = document.getElementById('photo-preview');
const fullNameInput = document.getElementById('full-name');
const emailInput = document.getElementById('email');
const telephoneInput = document.getElementById('telephone');
const locationInput = document.getElementById('location');
const businessNameGroup = document.getElementById('business-name-group');
const businessNameInput = document.getElementById('business-name');
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
            const userData = userDoc.data();
            populateForm(userData);
        } else {
            console.error("No profile document found for this user.");
            alert("Could not load your profile data.");
        }
    } else {
        // Not logged in, redirect
        window.location.href = 'auth.html';
    }
});

// --- FUNCTION to populate form with user data ---
function populateForm(userData) {
    photoPreview.src = userData.profilePicUrl || `https://placehold.co/100x100/10336d/a7c0e8?text=${(userData.name || 'U').charAt(0)}`;
    fullNameInput.value = userData.name || '';
    emailInput.value = userData.email || '';
    telephoneInput.value = userData.telephone || '';
    locationInput.value = userData.location || '';

    // Dynamically show/hide business name and set back button
    if (userData.role === 'provider') {
        businessNameGroup.style.display = 'block';
        businessNameInput.value = userData.businessName || '';
        backToDashboardBtn.href = 'provider-dashboard.html';
    } else {
        businessNameGroup.style.display = 'none';
        backToDashboardBtn.href = 'seeker-dashboard.html';
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

    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';

    try {
        const updatedData = {
            name: fullNameInput.value,
            telephone: telephoneInput.value,
            location: locationInput.value,
        };

        // If the user is a provider, also update the business name
        if (businessNameGroup.style.display === 'block') {
            updatedData.businessName = businessNameInput.value;
        }
        
        // Check if a new photo was uploaded
        const photoFile = photoInput.files[0];
        if (photoFile) {
            // Upload the new image to Cloudinary and get the URL
            const imageUrl = await uploadToCloudinary(photoFile);
            updatedData.profilePicUrl = imageUrl;
        }

        // Update the user's document in Firestore
        const userDocRef = doc(db, "users", currentUser.uid);
        await updateDoc(userDocRef, updatedData);

        alert('Profile updated successfully!');
        
    } catch (error) {
        console.error("Error updating profile:", error);
        alert("There was an error updating your profile. Please try again.");
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save Changes';
    }
});