// browse-jobs.js

import { app } from './firebase-init.js';
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { 
    getFirestore, collection, getDocs, doc, getDoc, query, where, addDoc, serverTimestamp, orderBy 
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

let currentUser = null;
let selectedJob = null; // To store data of the job being applied for

// --- INITIALIZATION ---
onAuthStateChanged(auth, (user) => {
    if (user && user.emailVerified) {
        currentUser = user;
        fetchAndDisplayJobs();
    } else {
        window.location.href = 'auth.html'; // Redirect if not logged in
    }
});

// --- FETCH AND DISPLAY JOBS ---
async function fetchAndDisplayJobs() {
    if (!jobsGrid) return;
    jobsGrid.innerHTML = '<p>Loading job posts...</p>';
    
    try {
        const jobsRef = collection(db, "job_posts");
        const q = query(jobsRef, orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            jobsGrid.innerHTML = '<p>No jobs posted yet. Be the first!</p>';
            return;
        }

        jobsGrid.innerHTML = '';
        for (const jobDoc of snapshot.docs) {
            const job = { id: jobDoc.id, ...jobDoc.data() };
            
            // Don't show jobs posted by the current user
            if (job.seekerId === currentUser.uid) continue;

            const seekerDoc = await getDoc(doc(db, "users", job.seekerId));
            const seekerData = seekerDoc.exists() ? seekerDoc.data() : { name: 'Anonymous' };
            
            const card = document.createElement('div');
            card.className = 'job-card';
            card.innerHTML = `
                <h3>${job.title}</h3>
                <p class="job-poster">Posted by: ${seekerData.name}</p>
                <p class="job-description">${job.description.substring(0, 100)}...</p>
                <div class="job-footer">
                    <span class="job-budget">Budget: UGX ${job.budget.toLocaleString()}</span>
                    <button class="btn-primary send-proposal-btn" data-job-id="${job.id}">Send Proposal</button>
                </div>
            `;
            jobsGrid.appendChild(card);
        }
    } catch (error) {
        console.error("Error fetching jobs:", error);
        jobsGrid.innerHTML = '<p>Could not load jobs at this time.</p>';
    }
}

// --- PROPOSAL MODAL LOGIC ---

// Open the modal and pre-fill the form
jobsGrid.addEventListener('click', async (e) => {
    if (e.target.classList.contains('send-proposal-btn')) {
        const jobId = e.target.dataset.jobId;
        try {
            const jobDoc = await getDoc(doc(db, "job_posts", jobId));
            if (jobDoc.exists()) {
                selectedJob = { id: jobDoc.id, ...jobDoc.data() };
                proposalJobTitle.textContent = selectedJob.title;
                // Pre-fill the message with a template
                proposalMessageTextarea.value = `Hello, I'm interested in your job post for "${selectedJob.title}". I believe I have the skills and experience to deliver great results.\n\n[Please add more details about your qualifications here].\n\nI look forward to hearing from you.`;
                proposalModal.classList.add('show');
            }
        } catch (error) {
            showToast('Could not load job details.', 'error');
        }
    }
});

// Close the modal
closeProposalModalBtn.addEventListener('click', () => {
    proposalModal.classList.remove('show');
});
proposalModal.addEventListener('click', (e) => {
    if (e.target === proposalModal) {
        proposalModal.classList.remove('show');
    }
});

// Handle form submission
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
        // Find or create a one-on-one conversation
        const conversationId = [currentUser.uid, selectedJob.seekerId].sort().join('_');
        const conversationRef = doc(db, "conversations", conversationId);
        
        const messagesRef = collection(conversationRef, "messages");
        
        // Send the proposal as a message
        await addDoc(messagesRef, {
            text: messageText,
            senderId: currentUser.uid,
            createdAt: serverTimestamp()
        });
        
        showToast('Proposal sent successfully!', 'success');
        proposalModal.classList.remove('show');
    } catch (error) {
        console.error("Error sending proposal:", error);
        showToast('Failed to send proposal.', 'error');
    } finally {
        hideButtonLoader(submitButton);
    }
});