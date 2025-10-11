import { app } from './firebase-init.js';
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore, collection, query, where, orderBy, onSnapshot, getDoc, doc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const auth = getAuth(app);
const db = getFirestore(app);

const jobPostsListEl = document.getElementById('job-posts-list');

// --- AUTHENTICATION ---
// Protect the page: only logged-in users can see the job board.
onAuthStateChanged(auth, user => {
    if (user) {
        // User is logged in, fetch the job posts.
        listenForJobPosts();
    } else {
        // User is not logged in, redirect them.
        window.location.href = 'auth.html';
    }
});

/**
 * Listens for real-time updates to all 'Open' job posts.
 */
function listenForJobPosts() {
    const jobPostsRef = collection(db, "job_posts");
    // Create a query to get all job posts that are 'Open', ordered by most recent first.
    const q = query(jobPostsRef, where("status", "==", "Open"), orderBy("createdAt", "desc"));
    
    jobPostsListEl.innerHTML = '<p style="text-align: center; padding: 20px;">Loading open jobs...</p>';

    onSnapshot(q, async (snapshot) => {
        if (snapshot.empty) {
            jobPostsListEl.innerHTML = '<p style="text-align: center; padding: 20px;">No open job posts found at the moment.</p>';
            return;
        }

        jobPostsListEl.innerHTML = ''; 
        for (const jobDoc of snapshot.docs) {
            const jobPost = { id: jobDoc.id, ...jobDoc.data() };
            
            // Fetch the profile of the seeker who posted the job
            const userDoc = await getDoc(doc(db, "users", jobPost.seekerId));
            if (userDoc.exists()) {
                const seekerData = userDoc.data();
                renderJobPostCard(jobPost, seekerData);
            }
        }
    }, (error) => {
        console.error("Error fetching job posts:", error);
        jobPostsListEl.innerHTML = '<p style="text-align: center; padding: 20px; color: #dc3545;">Could not load job posts.</p>';
    });
}

/**
 * Creates the HTML for a single job post card and appends it to the list.
 * @param {object} jobPost The job post data from Firestore.
 * @param {object} seekerData The profile data of the user who posted the job.
 */
function renderJobPostCard(jobPost, seekerData) {
    const card = document.createElement('div');
    card.className = 'job-post-card';
    card.dataset.id = jobPost.id;

    const date = jobPost.createdAt?.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) || 'N/A';
    const budget = jobPost.budget > 0 ? `UGX ${jobPost.budget.toLocaleString()}` : 'Not specified';
    const avatar = seekerData.profilePicUrl || `https://placehold.co/80x80/10336d/a7c0e8?text=${seekerData.name.charAt(0)}`;

    card.innerHTML = `
        <div class="seeker-info">
            <img src="${avatar}" alt="${seekerData.name}" class="seeker-avatar">
            <span class="seeker-name">${seekerData.name}</span>
        </div>
        <div class="job-details">
            <h2 class="job-title">${jobPost.title}</h2>
            <div class="job-meta">
                <span><i class="fas fa-tag"></i> ${jobPost.category}</span>
                <span><i class="fas fa-calendar-alt"></i> Posted: ${date}</span>
                <span><i class="fas fa-money-bill-wave"></i> Budget: ${budget}</span>
            </div>
            <p class="job-description">${jobPost.description}</p>
        </div>
        <div class="job-actions">
            <a href="#" class="btn btn-primary">Send Proposal</a>
            <a href="#" class="btn btn-secondary">View Details</a>
        </div>
    `;

    jobPostsListEl.appendChild(card);
}