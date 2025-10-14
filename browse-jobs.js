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

let currentUser = null;
let selectedJob = null; 

// --- INITIALIZATION ---
onAuthStateChanged(auth, (user) => {
    if (user && user.emailVerified) {
        currentUser = user;
        fetchAndDisplayJobs();
    } else {
        window.location.href = 'auth.html';
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
            
            const seekerDoc = await getDoc(doc(db, "users", job.seekerId));
            const seekerData = seekerDoc.exists() ? seekerDoc.data() : { name: 'Anonymous' };
            
            const card = document.createElement('div');
            card.className = 'job-card';
            
            // Disable the proposal button if the current user is the one who posted the job
            const isOwnJob = currentUser.uid === job.seekerId;
            const buttonHtml = isOwnJob 
                ? `<button class="btn-primary" disabled>This is Your Post</button>`
                : `<button class="btn-primary send-proposal-btn" data-job-id="${job.id}">Send Proposal</button>`;

            card.innerHTML = `
                <h3>${job.title}</h3>
                <p class="job-poster">Posted by: ${seekerData.name}</p>
                <p class="job-description">${job.description.substring(0, 100)}...</p>
                <div class="job-footer">
                    <span class="job-budget">Budget: UGX ${job.budget.toLocaleString()}</span>
                    ${buttonHtml}
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
jobsGrid.addEventListener('click', async (e) => {
    if (e.target.classList.contains('send-proposal-btn')) {
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

closeProposalModalBtn.addEventListener('click', () => {
    proposalModal.classList.remove('show');
});
proposalModal.addEventListener('click', (e) => {
    if (e.target === proposalModal) {
        proposalModal.classList.remove('show');
    }
});

// --- HANDLE PROPOSAL FORM SUBMISSION ---
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

        // This object matches what your inbox.js file expects
        await setDoc(conversationRef, {
            participants: [currentUser.uid, selectedJob.seekerId],
            lastMessageText: messageText,
            lastMessageTimestamp: serverTimestamp(),
            lastSenderId: currentUser.uid,
            lastRead: {
                [currentUser.uid]: serverTimestamp()
            }
        }, { merge: true });

        const messagesRef = collection(conversationRef, "messages");
        await addDoc(messagesRef, {
            text: messageText,
            senderId: currentUser.uid,
            createdAt: serverTimestamp()
        });

        showToast('Proposal sent! Redirecting to chat...', 'success');
        
        // Redirect to the chat page using the recipient's ID
        window.location.href = `chat.html?recipientId=${selectedJob.seekerId}`;

    } catch (error) {
        console.error("Error sending proposal:", error);
        showToast('Failed to send proposal.', 'error');
        hideButtonLoader(submitButton);
    }
});