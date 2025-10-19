import { app } from './firebase-init.js';
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
// --- NEW: Import query functions ---
import { getFirestore, doc, getDoc, setDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { uploadToCloudinary } from './cloudinary-upload.js';
import { showToast, hideToast, showButtonLoader, hideButtonLoader } from './notifications.js';

const auth = getAuth(app);
const db = getFirestore(app);

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

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
            populateForm(userDoc.data());
        } else {
            populateForm(user);
        }
    } else {
        window.location.href = 'auth.html';
    }
});

function populateForm(userData) {
    photoPreview.src = userData.profilePicUrl || userData.photoURL || `https://placehold.co/100x100?text=${(userData.name || userData.displayName || 'U').charAt(0)}`;
    fullNameInput.value = userData.name || userData.displayName || '';
    emailInput.value = userData.email || '';
    // ... (rest of your populateForm function is the same) ...
}

photoInput.addEventListener('change', () => { /* ... (unchanged) ... */ });

// --- THIS IS THE UPDATED FORM SUBMISSION LOGIC ---
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

        const photoFile = photoInput.files[0];
        if (photoFile) {
            showToast('Uploading photo...', 'progress');
            updatedData.profilePicUrl = await uploadToCloudinary(photoFile);
            hideToast();
        }

        showToast('Saving profile...', 'progress');
        const userDocRef = doc(db, "users", currentUser.uid);
        await setDoc(userDocRef, updatedData, { merge: true });
        hideToast();

        // --- NEW: Re-sync all services with the updated profile info ---
        showToast('Updating your service listings...', 'progress');
        
        // 1. Get the final, up-to-date user data
        const finalUserDoc = await getDoc(userDocRef);
        const finalUserData = finalUserDoc.data();

        // 2. Find all services by this user in Firestore
        const servicesQuery = query(collection(db, 'services'), where('providerId', '==', currentUser.uid));
        const servicesSnapshot = await getDocs(servicesQuery);

        // 3. For each service, call the sync worker to update it in Algolia
        if (!servicesSnapshot.empty) {
            const idToken = await currentUser.getIdToken(true);
            
            for (const serviceDoc of servicesSnapshot.docs) {
                let serviceData = serviceDoc.data();
                // Update the provider info on the service object
                serviceData.providerName = finalUserData.name;
                serviceData.providerAvatar = finalUserData.profilePicUrl;
                serviceData.objectID = serviceDoc.id; // Add objectID for Algolia
                
                // Call the sync worker
                await fetch('/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
                    body: JSON.stringify(serviceData)
                });
            }
        }
        hideToast();
        // --- END OF NEW LOGIC ---

        showToast('Profile updated successfully!', 'success');
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);

    } catch (error) {
        hideToast();
        console.error("Error updating profile:", error);
        showToast("Error updating profile. Please try again.", 'error');
    } finally {
        hideButtonLoader(submitBtn);
    }
});