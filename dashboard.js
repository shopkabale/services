document.addEventListener('DOMContentLoaded', () => {

    // --- MOCK USER DATA ---
    // In a real application, this data would be fetched from Firebase after a user logs in.
    const currentUser = {
        name: 'Samuel Ampeire',
        profilePic: 'https://placehold.co/120x120/10336d/a7c0e8?text=S.A',
        // 'baseRole' is the role they signed up with. This doesn't change.
        baseRole: 'provider',
        // 'currentView' is the mode they are currently using. This can be toggled.
        currentView: 'provider'
    };

    // --- ELEMENT SELECTORS ---
    const profilePictureEl = document.getElementById('profile-picture');
    const profileNameEl = document.getElementById('profile-name');
    const welcomeMessageEl = document.getElementById('welcome-message');
    const mainMenuGridEl = document.getElementById('main-menu-grid');
    const switchViewBtn = document.getElementById('switch-view-btn');

    // --- TEMPLATES for dynamic content ---
    const providerMenuItems = `
        <a href="manage-service.html" class="menu-item">
            <div class="icon"><i class="fas fa-plus-circle"></i></div>
            <span class="label">Add Service</span>
        </a>
        <a href="#" class="menu-item">
            <div class="icon"><i class="fas fa-th-list"></i></div>
            <span class="label">My Services</span>
        </a>
        <a href="#" class="menu-item">
            <div class="icon"><i class="fas fa-inbox"></i></div>
            <span class="label">Inbox</span>
        </a>
        <a href="#" class="menu-item">
            <div class="icon"><i class="fas fa-user-edit"></i></div>
            <span class="label">Edit Profile</span>
        </a>
        <a href="#" class="menu-item">
            <div class="icon"><i class="fas fa-chart-line"></i></div>
            <span class="label">Analytics</span>
        </a>
        <a href="#" class="menu-item">
            <div class="icon"><i class="fas fa-wallet"></i></div>
            <span class="label">Earnings</span>
        </a>
    `;

    const seekerMenuItems = `
        <a href="services.html" class="menu-item">
            <div class="icon"><i class="fas fa-search"></i></div>
            <span class="label">Find Services</span>
        </a>
        <a href="#" class="menu-item">
            <div class="icon"><i class="fas fa-tasks"></i></div>
            <span class="label">My Job Posts</span>
        </a>
        <a href="#" class="menu-item">
            <div class="icon"><i class="fas fa-inbox"></i></div>
            <span class="label">Inbox</span>
        </a>
        <a href="#" class="menu-item">
            <div class="icon"><i class="fas fa-user-cog"></i></div>
            <span class="label">My Profile</span>
        </a>
    `;

    // --- CORE FUNCTION to update the dashboard view ---
    function updateDashboardView() {
        // Update profile header (this stays the same regardless of view)
        profilePictureEl.src = currentUser.profilePic;
        profileNameEl.textContent = currentUser.name;

        // Update content based on the current view
        if (currentUser.currentView === 'provider') {
            welcomeMessageEl.textContent = 'Welcome to your provider dashboard!';
            mainMenuGridEl.innerHTML = providerMenuItems;
            switchViewBtn.innerHTML = `<i class="fas fa-search"></i> Switch to Seeker View`;
        } else { // Seeker view
            welcomeMessageEl.textContent = 'You are currently in seeker mode.';
            mainMenuGridEl.innerHTML = seekerMenuItems;
            switchViewBtn.innerHTML = `<i class="fas fa-handshake"></i> Switch to Provider View`;
        }
        
        // A user who signed up only as a 'seeker' cannot switch to a provider view.
        if (currentUser.baseRole === 'seeker') {
            switchViewBtn.style.display = 'none';
        } else {
            switchViewBtn.style.display = 'inline-flex';
        }
    }

    // --- EVENT LISTENERS ---
    switchViewBtn.addEventListener('click', (event) => {
        // FIX: Prevent the browser's default click action (which causes the scroll to top).
        event.preventDefault();
        
        // Toggle the current view
        currentUser.currentView = currentUser.currentView === 'provider' ? 'seeker' : 'provider';
        
        // Re-render the dashboard with the new view
        updateDashboardView();
    });

    // --- INITIALIZATION ---
    // This function runs once when the page loads to set the initial state.
    updateDashboardView();
});

