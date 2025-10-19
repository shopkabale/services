import { app } from './firebase-init.js';
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { 
    getFirestore, collection, getDocs, doc, getDoc, query, where, addDoc, serverTimestamp, orderBy, setDoc 
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { showToast, hideToast, showButtonLoader, hideButtonLoader } from './notifications.js';

const auth = getAuth(app);
const db = getFirestore(app);

// --- DOM ELEMENTS ---
const jobsGrid = document.getElementById('jobs-grid');
const proposalModal = document.getElementById('proposal-modal');
const closeProposalModalBtn = document.getElementById('close-proposal-modal-btn');
const proposalJobTitle = document.getElementById('proposal-job-title');
const proposalForm = document.getElementById('proposal-form');
const proposalMessageTextarea = document.getElementById('proposal-message');
// --- NEW: Elements for Search and Filter ---
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const categoryFilters = document.getElementById('category-filters');

// --- STATE MANAGEMENT ---
let currentUser = null;
let selectedJob = null; 
let allJobs = []; // Cache all jobs to filter on the client-side
let currentQuery = '';
let currentCategory = 'All';

// --- INITIALIZATION ---
onAuthStateChanged(auth, (user) => {
    if (user && user.emailVerified) {
        currentUser = user;
        fetchAllJobs(); // Fetch all jobs once on page load
    } else {
        window.location.href = 'auth.html';
    }
});

// --- DATA FETCHING & RENDERING ---

// Fetches all jobs from Firestore ONCE and stores them.
async function fetchAllJobs() {
    if (!jobsGrid) return;
    jobsGrid.innerHTML = '<div class="spinner-container"><div class="spinner"></div></div>';
    
    try {
        const jobsRef = collection(db, "job_posts");
        const q = query(jobsRef, orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            jobsGrid.innerHTML = '<p style="text-align:center;">No jobs posted yet. Be the first!</p>';
            return;
        }

        // Fetch all seeker data at once and store jobs in the cache
        allJobs = await Promise.all(snapshot.docs.map(async (jobDoc) => {
            const job = { id: jobDoc.id, ...jobDoc.data() };
            const seekerDoc = await getDoc(doc(db, "users", job.seekerId));
            job.seekerData = seekerDoc.exists() ? seekerDoc.data() : { name: 'Anonymous' };
            return job;
        }));

        renderJobs(); // Render the initial, unfiltered view

    } catch (error) {
        console.error("Error fetching jobs:", error);
        jobsGrid.innerHTML = '<p style="text-align:center;">Could not load jobs at this time.</p>';
    }
}

// Renders jobs from the cached 'allJobs' array based on current filters.
function renderJobs() {
    if (!jobsGrid) return;
    jobsGrid.innerHTML = '';
    
    const filteredJobs = allJobs.filter(job => {
        const jobTitle = job.title || '';
        const jobCategory = job.category || '';
        const matchesCategory = currentCategory === 'All' || jobCategory === currentCategory;
        const matchesQuery = !currentQuery || jobTitle.toLowerCase().includes(currentQuery.toLowerCase());
        return matchesCategory && matchesQuery;
    });

    if (filteredJobs.length === 0) {
        jobsGrid.innerHTML = '<p style="text-align: center;">No jobs found matching your criteria.</p>';
        return;
    }

    filteredJobs.forEach(job => {
        const card = document.createElement('a');
        card.href = `job-post-detail.html?id=${job.id}`;
        card.className = 'job-card';
        
        const isOwnJob = currentUser.uid === job.seekerId;
        const buttonHtml = isOwnJob 
            ? `<button class="btn-primary" disabled>This is Your Post</button>`
            : `<button class="btn-primary send-proposal-btn" data-job-id="${job.id}">Send Proposal</button>`;

        const avatar = job.seekerData.profilePicUrl || `https://placehold.co/50x50?text=${job.seekerData.name.charAt(0)}`;
        
        card.innerHTML = `
            <div class="job-header">
                <img src="${avatar}" alt="${job.seekerData.name}" class="seeker-avatar">
                <div class="job-title-group">
                    <h3>${job.title}</h3>
                    <p class="job-poster">Posted by: ${job.seekerData.name}</p>
                </div>
            </div>
            <p class="job-description">${job.description.substring(0, 100)}...</p>
            <div class="job-footer">
                <span class="job-budget">Budget: UGX ${job.budget.toLocaleString()}</span>
                ${buttonHtml}
            </div>
        `;
        jobsGrid.appendChild(card);
    });
}

// --- EVENT LISTENERS for Search and Filter ---
searchButton.addEventListener('click', () => {
    currentQuery = searchInput.value.trim();
    renderJobs();
});

searchInput.addEventListener('keyup', (event) => {
    if (event.key === 'Enter') {
        currentQuery = searchInput.value.trim();
        renderJobs();
    }
});

categoryFilters.addEventListener('click', (event) => {
    const button = event.target.closest('.filter-btn');
    if (button) {
        categoryFilters.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        currentCategory = button.dataset.category;
        renderJobs();
    }
});


// --- PROPOSAL MODAL LOGIC (UNCHANGED) ---
jobsGrid.addEventListener('click', async (e) => {
    if (e.target.classList.contains('send-proposal-btn')) {
        e.preventDefault(); 
        const jobId = e.target.dataset.jobId;
        try {
            const jobDoc = await getDoc(doc(db, "job_posts", jobId));
            if (jobDoc.exists()) {
                selectedJob = { id: jobDoc.id, ...jobDoc.data() };
                proposalJobTitle.textContent = selectedJob.title;
                proposalMessageTextarea.value = `Hello, I'm interested in your job post for "${selectedJob.title}". I believe I have the skills and experience to deliver great results.\n\n[Please add more details about your qualifications here].\n\nI look forward to hearing from you.`;
                proposalModal.classList.add('show');
            }
        } catch (error) {
            showToast('Could not load job details.', 'error');
        }
    }
});

// --- MODAL CLOSE HANDLERS (UNCHANGED) ---
closeProposalModalBtn.addEventListener('click', () => {
    proposalModal.classList.remove('show');
});
proposalModal.addEventListener('click', (e) => {
    if (e.target === proposalModal) {
        proposalModal.classList.remove('show');
    }
});

// --- HANDLE PROPOSAL FORM SUBMISSION (UNCHANGED) ---
proposalForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitButton = proposalForm.querySelector('.btn-submit');
    showButtonLoader(submitButton);

    const messageText = proposalMessageTextarea.value.trim();
    if (!messageText || !selectedJob || !currentUser) {
        showToast('Something went wrong. Please try again.', 'error');
        hideButtonLoader(submitButton);
        return;
    }

    try {
        const conversationId = [currentUser.uid, selectedJob.seekerId].sort().join('_');
        const conversationRef = doc(db, "conversations", conversationId);

        await setDoc(conversationRef, {
            participants: [currentUser.uid, selectedJob.seekerId],
            lastMessageText: messageText,
            lastMessageTimestamp: serverTimestamp(),
            lastSenderId: currentUser.uid,
            lastRead: { [currentUser.uid]: serverTimestamp() }
        }, { merge: true });

        const messagesRef = collection(conversationRef, "messages");
        await addDoc(messagesRef, {
            text: messageText,
            senderId: currentUser.uid,
            createdAt: serverTimestamp()
        });

        showToast('Proposal sent! Redirecting to chat...', 'success');
        window.location.href = `chat.html?recipientId=${selectedJob.seekerId}`;

    } catch (error) {
        console.error("Error sending proposal:", error);
        showToast('Failed to send proposal.', 'error');
        hideButtonLoader(submitButton);
    }
});