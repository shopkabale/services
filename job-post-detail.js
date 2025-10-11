import { app } from './firebase-init.js';
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const auth = getAuth(app);
const db = getFirestore(app);

const contentContainer = document.getElementById('content-container');
const loadingState = document.getElementById('loading-state');
const jobTitleEl = document.getElementById('job-title');
const jobCategoryEl = document.getElementById('job-category');
const jobDateEl = document.getElementById('job-date');
const jobBudgetEl = document.getElementById('job-budget');
const jobDescriptionTextEl = document.getElementById('job-description-text');
const seekerAvatarEl = document.getElementById('seeker-avatar');
const seekerNameEl = document.getElementById('seeker-name');
const seekerLocationEl = document.getElementById('seeker-location');

onAuthStateChanged(auth, user => {
    if (!user) {
        // Protect this page, only logged-in users can see job details
        window.location.href = 'auth.html';
    }
});

const loadJobDetails = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const jobId = urlParams.get('id');

    if (!jobId) {
        loadingState.innerHTML = '<p>Error: No job specified.</p>';
        return;
    }

    try {
        // Fetch the job post document
        const jobDocRef = doc(db, "job_posts", jobId);
        const jobDoc = await getDoc(jobDocRef);

        if (!jobDoc.exists()) {
            loadingState.innerHTML = '<p>Error: Job post not found.</p>';
            return;
        }

        const jobData = jobDoc.data();

        // Fetch the profile of the seeker who posted the job
        const seekerDocRef = doc(db, "users", jobData.seekerId);
        const seekerDoc = await getDoc(seekerDocRef);
        
        if (!seekerDoc.exists()) {
            loadingState.innerHTML = '<p>Error: Job poster not found.</p>';
            return;
        }
        
        const seekerData = seekerDoc.data();

        // Populate the page with the fetched data
        document.title = `${jobData.title} | KabaleOnline`;
        jobTitleEl.textContent = jobData.title;
        jobCategoryEl.innerHTML = `<i class="fas fa-tag"></i> ${jobData.category}`;
        jobDateEl.innerHTML = `<i class="fas fa-calendar-alt"></i> Posted: ${jobData.createdAt.toDate().toLocaleDateString()}`;
        jobBudgetEl.innerHTML = `<i class="fas fa-money-bill-wave"></i> Budget: ${jobData.budget > 0 ? `UGX ${jobData.budget.toLocaleString()}` : 'Not Specified'}`;
        jobDescriptionTextEl.textContent = jobData.description;
        
        seekerAvatarEl.src = seekerData.profilePicUrl || `https://placehold.co/100x100/10336d/a7c0e8?text=${seekerData.name.charAt(0)}`;
        seekerNameEl.textContent = seekerData.name;
        seekerLocationEl.innerHTML = `<i class="fas fa-map-marker-alt"></i> ${seekerData.location || 'Location not specified'}`;

        loadingState.style.display = 'none';
        contentContainer.style.display = 'block';

    } catch (error) {
        console.error("Error loading job details:", error);
        loadingState.innerHTML = '<p>An error occurred while loading this job.</p>';
    }
};

loadJobDetails();