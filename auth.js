// --- UI ELEMENT SELECTORS ---
const authWrapper = document.querySelector('.auth-wrapper');
const dashboardWrapper = document.getElementById('dashboard-wrapper');
const loginContainer = document.getElementById('login-form-container');
const signupContainer = document.getElementById('signup-form-container');
const showSignupLink = document.getElementById('show-signup-link');
const showLoginLink = document.getElementById('show-login-link');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const logoutBtn = document.getElementById('logout-btn');
const switchRoleBtn = document.getElementById('switch-role-btn');
const providerFields = document.getElementById('provider-fields');
const roleRadios = document.querySelectorAll('input[name="role"]');
const photoInput = document.getElementById('profile-photo-input');
const photoPreview = document.getElementById('photo-preview');

// --- SIMULATED USER STATE ---
const currentUser = {
    name: '',
    email: '',
    baseRole: 'seeker', // The role they signed up with
    currentView: 'seeker' // The view they are currently using
};

// --- VIEW TOGGLING LOGIC ---
const showLoginView = () => {
    signupContainer.style.display = 'none';
    loginContainer.style.display = 'block';
};
const showSignupView = () => {
    loginContainer.style.display = 'none';
    signupContainer.style.display = 'block';
};
showSignupLink.addEventListener('click', showSignupView);
showLoginLink.addEventListener('click', showLoginView);

// --- DYNAMIC SIGN-UP FORM LOGIC ---
roleRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
        const isProvider = e.target.value === 'provider';
        providerFields.classList.toggle('visible', isProvider);
        // Make provider fields required only when visible
        document.getElementById('signup-location').required = isProvider;
        document.getElementById('signup-tel').required = isProvider;
    });
});

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


// --- DASHBOARD LOGIC ---
const updateDashboard = () => {
    document.getElementById('welcome-heading').textContent = `Welcome, ${currentUser.name}!`;
    const dashboardContent = document.getElementById('dashboard-content');
    let contentHTML = '';
    
    if (currentUser.currentView === 'provider') {
        document.getElementById('welcome-subheading').textContent = "Here's an overview of your provider activity.";
        switchRoleBtn.innerHTML = `<i class="fas fa-search"></i> Switch to Seeker View`;
        contentHTML = `
            <div class="dashboard-card"> <i class="fas fa-user-edit"></i> <h3>Build Your Profile</h3> <p>A great profile attracts clients. Add your skills, photo, and a compelling bio.</p> <a href="#">Complete Profile &rarr;</a> </div>
            <div class="dashboard-card"> <i class="fas fa-th-list"></i> <h3>Manage Services</h3> <p>Add new services, update existing ones, and set your pricing to start getting hired.</p> <a href="#">View My Services &rarr;</a> </div>
            <div class="dashboard-card"> <i class="fas fa-inbox"></i> <h3>Check Inbox</h3> <p>You have 0 new messages. Respond to client inquiries quickly to win more jobs.</p> <a href="#">Open Inbox &rarr;</a> </div>
        `;
    } else { // Seeker View
        document.getElementById('welcome-subheading').textContent = "Ready to find the perfect service? Start here.";
        // Only show the switch button if their base role is a provider
        if(currentUser.baseRole === 'provider') {
            switchRoleBtn.style.display = 'inline-flex';
            switchRoleBtn.innerHTML = `<i class="fas fa-handshake"></i> Switch to Provider View`;
        } else {
            switchRoleBtn.style.display = 'none';
        }
        contentHTML = `
            <div class="dashboard-card"> <i class="fas fa-search"></i> <h3>Find a Service</h3> <p>Browse categories or search for a specific skill to find the perfect provider for your task.</p> <a href="https://services.kabaleonline.com/#services">Browse Services &rarr;</a> </div>
            <div class="dashboard-card"> <i class="fas fa-tasks"></i> <h3>Manage Job Posts</h3> <p>Keep track of the jobs you've posted and the providers you've hired for your projects.</p> <a href="#">View My Posts &rarr;</a> </div>
            <div class="dashboard-card"> <i class="fas fa-inbox"></i> <h3>Check Inbox</h3> <p>You have 0 new messages. Communicate with providers about your projects.</p> <a href="#">Open Inbox &rarr;</a> </div>
        `;
    }
    dashboardContent.innerHTML = contentHTML;
};

const showDashboard = () => {
    updateDashboard();
    authWrapper.classList.add('hidden');
    dashboardWrapper.classList.remove('hidden');
};

const showAuth = () => {
    dashboardWrapper.classList.add('hidden');
    authWrapper.classList.remove('hidden');
    showLoginView();
};

// --- EVENT LISTENERS ---
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    currentUser.email = document.getElementById('login-email').value;
    currentUser.name = currentUser.email.split('@')[0] || 'User';
    // In a real app, you would fetch the user's baseRole from your database
    currentUser.baseRole = 'provider'; // For demo purposes, assume login user is provider
    currentUser.currentView = 'seeker'; // Default view for provider is seeker
    showDashboard();
});

signupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    currentUser.name = document.getElementById('signup-name').value || 'New User';
    currentUser.email = document.getElementById('signup-email').value;
    currentUser.baseRole = document.querySelector('input[name="role"]:checked').value;
    currentUser.currentView = currentUser.baseRole;
    showDashboard();
});

logoutBtn.addEventListener('click', showAuth);

switchRoleBtn.addEventListener('click', () => {
    currentUser.currentView = currentUser.currentView === 'seeker' ? 'provider' : 'seeker';
    updateDashboard();
});

// Set initial view on page load
showAuth();
