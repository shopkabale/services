import { app } from './firebase-init.js';
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore, collection, query, where, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const auth = getAuth(app);
const db = getFirestore(app);

const jobPostsListEl = document.getElementById('job-posts-list');

// --- AUTHENTICATION & DATA FETCHING ---
onAuthStateChanged(auth, user => {
    if (user) {
        // User is logged in, fetch their job posts
        listenForJobPosts(user.uid);
    } else {
        // User is not logged in, redirect to the authentication page
        window.location.href = 'auth.html';
    }
});

/**
 * Listens for real-time updates to the job posts of the current user.
 * @param {string} userId The UID of the currently logged-in user.
 */
function listenForJobPosts(userId) {
    const jobPostsRef = collection(db, "job_posts");
    // Create a query to get only the job posts created by the current user, ordered by most recent first.
    const q = query(jobPostsRef, where("seekerId", "==", userId), orderBy("createdAt", "desc"));
    
    jobPostsListEl.innerHTML = '<p style="text-align: center; padding: 20px;">Loading your job posts...</p>';

    // onSnapshot listens for real-time changes to the query results.
    onSnapshot(q, (snapshot) => {
        if (snapshot.empty) {
            jobPostsListEl.innerHTML = '<p style="text-align: center; padding: 20px;">You have not posted any jobs yet. Click "Post a New Job" to get started!</p>';
            return;
        }

        // Clear the list before rendering the updated data
        jobPostsListEl.innerHTML = ''; 
        snapshot.forEach(doc => {
            const jobPost = { id: doc.id, ...doc.data() };
            renderJobPostCard(jobPost);
        });
    }, (error) => {
        console.error("Error fetching job posts:", error);
        jobPostsListEl.innerHTML = '<p style="text-align: center; padding: 20px; color: #dc3545;">Could not load your job posts. Please try again later.</p>';
    });
}

/**
 * Creates the HTML for a single job post card and appends it to the list.
 * @param {object} jobPost The job post data from Firestore.
 */
function renderJobPostCard(jobPost) {
    const card = document.createElement('div');
    card.className = 'job-post-card';
    card.dataset.id = jobPost.id;

    // Format the date nicely
    const date = jobPost.createdAt?.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) || 'N/A';
    
    const statusClass = jobPost.status === 'Open' ? 'status-open' : 'status-closed';
    const statusText = jobPost.status || 'N/A';

    card.innerHTML = `
        <div class="job-details">
            <h2 class="job-title">${jobPost.title || 'No Title'}</h2>
            <div class="job-meta">
                <span><i class="fas fa-tag"></i> ${jobPost.category || 'No Category'}</span>
                <span><i class="fas fa-calendar-alt"></i> Posted: ${date}</span>
                <span><i class="fas fa-file-alt"></i> ${jobPost.proposalCount || 0} Proposals</span>
            </div>
        </div>
        <div class="job-status">
            <span class="status-badge ${statusClass}">${statusText}</span>
            <button class="btn-action" title="View Proposals"><i class="fas fa-eye"></i></button>
            <button class="btn-action" title="Delete"><i class="fas fa-trash-alt"></i></button>
        </div>
    `;

    jobPostsListEl.appendChild(card);
}