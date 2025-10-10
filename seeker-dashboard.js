document.addEventListener('DOMContentLoaded', () => {
    // --- MOCK USER DATA for a Seeker ---
    // In a real application, this would be fetched from Firebase after a user logs in.
    const seekerUser = {
        name: 'Jane Doe',
        profilePic: 'https://placehold.co/120x120/10336d/a7c0e8?text=J.D',
    };

    // --- ELEMENT SELECTORS ---
    const profilePictureEl = document.getElementById('profile-picture');
    const profileNameEl = document.getElementById('profile-name');
    const welcomeMessageEl = document.getElementById('welcome-message');

    // --- CORE FUNCTION to update the dashboard view ---
    function updateSeekerDashboard() {
        if (profilePictureEl) profilePictureEl.src = seekerUser.profilePic;
        if (profileNameEl) profileNameEl.textContent = seekerUser.name;
        if (welcomeMessageEl) welcomeMessageEl.textContent = 'Ready to find the perfect service?';
    }

    // --- INITIALIZATION ---
    // This function runs once when the page loads to set the initial state.
    updateSeekerDashboard();
});
