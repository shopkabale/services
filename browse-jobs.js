import { app } from './firebase-init.js';
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore, collection, query, where, orderBy, onSnapshot, getDoc, doc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const auth = getAuth(app);
const db = getFirestore(app);

const jobPostsListEl = document.getElementById('job-posts-list');
const filterButtons = document.querySelectorAll('.filter-btn');

onAuthStateChanged(auth, user => {
    if (user) {
        listenForJobPosts();
    } else {
        window.location.href = 'auth.html';
    }
});

function listenForJobPosts(categoryFilter = 'All') {
    const jobPostsRef = collection(db, "job_posts");
    let q;

    if (categoryFilter === 'All' || !categoryFilter) {
        q = query(jobPostsRef, where("status", "==", "Open"), orderBy("createdAt", "desc"));
    } else {
        q = query(jobPostsRef, where("status", "==", "Open"), where("category", "==", categoryFilter), orderBy("createdAt", "desc"));
    }
    
    jobPostsListEl.innerHTML = '<p style="text-align: center; padding: 20px;">Loading open jobs...</p>';

    onSnapshot(q, async (snapshot) => {
        if (snapshot.empty) {
            jobPostsListEl.innerHTML = `<p style="text-align: center; padding: 20px;">No open jobs found in the "${categoryFilter}" category.</p>`;
            return;
        }

        jobPostsListEl.innerHTML = ''; 
        for (const jobDoc of snapshot.docs) {
            const jobPost = { id: jobDoc.id, ...jobDoc.data() };
            
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
            <a href="job-post-detail.html?id=${jobPost.id}" class="btn btn-secondary">View Details</a>
        </div>
    `;

    jobPostsListEl.appendChild(card);
}

// Add event listeners for filter buttons
filterButtons.forEach(button => {
    button.addEventListener('click', () => {
        filterButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        const category = button.textContent;
        listenForJobPosts(category);
    });
});