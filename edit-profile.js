document.addEventListener('DOMContentLoaded', () => {

    // --- MOCK USER DATA ---
    // In a real app, this would be fetched from Firebase.
    const mockUser = {
        name: 'Samuel Ampeire',
        email: 'samuel@example.com',
        profilePic: 'https://placehold.co/100x100/10336d/a7c0e8?text=S.A',
        telephone: '0712345678',
        location: 'Kabale Town',
        businessName: 'Sam Tech Solutions',
        role: 'provider' // 'provider' or 'seeker'
    };

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
    const backToDashboardBtn = document.querySelector('.btn-back');

    // --- FUNCTION to populate form with user data ---
    function populateForm() {
        photoPreview.src = mockUser.profilePic;
        fullNameInput.value = mockUser.name;
        emailInput.value = mockUser.email;
        telephoneInput.value = mockUser.telephone || '';
        locationInput.value = mockUser.location || '';

        // Only show business name field for providers
        if (mockUser.role === 'provider') {
            businessNameGroup.style.display = 'block';
            businessNameInput.value = mockUser.businessName || '';
        } else {
            businessNameGroup.style.display = 'none';
        }
        
        // Dynamically set the "Back" button link
        if (mockUser.role === 'provider') {
            backToDashboardBtn.href = 'provider-dashboard.html';
        } else {
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
    editProfileForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // In a real app, you would gather the data and send it to Firebase here.
        const updatedData = {
            name: fullNameInput.value,
            telephone: telephoneInput.value,
            location: locationInput.value,
            businessName: businessNameInput.value,
            // You would also handle uploading the new profile picture to Firebase Storage.
        };
        
        console.log('Saving data:', updatedData);
        
        // Simulate a successful save
        alert('Profile updated successfully!');
        
        // Optionally redirect back to the dashboard
        // window.location.href = backToDashboardBtn.href;
    });

    // --- INITIALIZATION ---
    populateForm();

});
