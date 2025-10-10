document.addEventListener('DOMContentLoaded', () => {
    // --- MOCK USER DATA for a Provider ---
    // In a real application, this would be fetched from Firebase after a user logs in.
    const providerUser = {
        name: 'Samuel Ampeire',
        profilePic: 'https://placehold.co/120x120/10336d/a7c0e8?text=S.A',
    };

    // --- ELEMENT SELECTORS ---
    const profilePictureEl = document.getElementById('profile-picture');
    const profileNameEl = document.getElementById('profile-name');
    const welcomeMessageEl = document.getElementById('welcome-message');

    // --- CORE FUNCTION to update the dashboard view ---
    function updateProviderDashboard() {
        if (profilePictureEl) profilePictureEl.src = providerUser.profilePic;
        if (profileNameEl) profileNameEl.textContent = providerUser.name;
        if (welcomeMessageEl) welcomeMessageEl.textContent = 'Welcome to your provider dashboard!';
    }

    // --- INITIALIZATION ---
    // This function runs once when the page loads to set the initial state.
    updateProviderDashboard();
});
