import { app } from './firebase-init.js';
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const db = getFirestore(app);
const auth = getAuth();

// --- DOM ELEMENT REFERENCES ---
const container = document.getElementById('job-detail-container');

// --- STATE ---
const urlParams = new URLSearchParams(window.location.search);
const jobId = urlParams.get('id');
let currentUser = null;

// --- INITIALIZATION ---
// Listen for user login status changes
onAuthStateChanged(auth, user => {
    currentUser = user;
    // Reload the content to ensure the correct button state is shown
    if (jobId) {
        loadJobDetails(); 
    }
});

// Check if a job ID exists in the URL
if (!jobId) {
    container.innerHTML = '<h1>Job Not Found</h1><p>The job ID is missing from the URL.</p>';
}

/**
 * Fetches the job and the poster's data from Firestore.
 */
async function loadJobDetails() {
    try {
        const jobRef = doc(db, 'job_posts', jobId);
        const jobSnap = await getDoc(jobRef);

        if (!jobSnap.exists()) {
            container.innerHTML = '<h1>Job Not Found</h1><p>This job may have been removed.</p>';
            return;
        }

        const jobData = jobSnap.data();
        const seekerRef = doc(db, 'users', jobData.seekerId);
        const seekerSnap = await getDoc(seekerRef);
        const seekerData = seekerSnap.exists() ? seekerSnap.data() : { name: 'Unknown User' };

        renderJobDetails(jobData, seekerData);
    } catch (error) {
        console.error("Error loading job details:", error);
        container.innerHTML = '<h1>Error</h1><p>Could not load job details.</p>';
    }
}

/**
 * Renders the fetched data into the page.
 * @param {object} job - The job data object from Firestore.
 * @param {object} seeker - The user data object for the job poster.
 */
function renderJobDetails(job, seeker) {
    container.innerHTML = ''; // Clear "Loading..." message

    const layout = document.createElement('div');
    layout.className = 'job-detail-layout';

    const isOwnJob = currentUser && currentUser.uid === job.seekerId;
    let buttonHtml;

    if (!currentUser) {
        // Case 1: User is not logged in
        buttonHtml = `<a href="auth.html" class="btn-action">Login to Send Proposal</a>`;
    } else if (isOwnJob) {
        // Case 2: User is viewing their own job post
        buttonHtml = `<a href="#" class="btn-action" disabled>This is Your Post</a>`;
    } else {
        // Case 3: Logged-in user viewing someone else's post
        buttonHtml = `<a href="chat.html?recipientId=${job.seekerId}" class="btn-action">Send Proposal</a>`;
    }

    // Construct the page's inner HTML
    layout.innerHTML = `
        <div class="job-main-content">
            <p class="job-category">${job.category || 'General'}</p>
            <h1>${job.title}</h1>
            <h2 class="section-title">Job Description</h2>
            <p class="job-description">${job.description.replace(/\n/g, '<br>')}</p>
        </div>
        <aside class="poster-sidebar">
            <div class="card">
                <h3>Posted By</h3>
                <a href="profile.html?id=${job.seekerId}">
                    <img src="${seeker.profilePicUrl || `https://placehold.co/100x100?text=${seeker.name.charAt(0)}`}" alt="${seeker.name}" class="poster-avatar">
                </a>
                <a href="profile.html?id=${job.seekerId}" class="poster-name">${seeker.name}</a>
                <div class="budget-display">
                    <span>Budget</span>
                    <p class="price">UGX ${job.budget.toLocaleString()}</p>
                </div>
                ${buttonHtml}
            </div>
        </aside>
    `;
    container.appendChild(layout);
}