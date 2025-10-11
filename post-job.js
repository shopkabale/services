import { app } from './firebase-init.js';
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore, collection, addDoc, Timestamp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { showToast, showButtonLoader, hideButtonLoader } from './notifications.js';

const auth = getAuth(app);
const db = getFirestore(app);

const postJobForm = document.getElementById('post-job-form');
const submitBtn = document.getElementById('submit-btn');

let currentUserId = null;

// Protect the page: only logged-in users can see this form.
onAuthStateChanged(auth, user => {
    if (user) {
        currentUserId = user.uid;
    } else {
        window.location.href = 'auth.html';
    }
});

// Handle form submission
postJobForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUserId) {
        showToast("You must be logged in to post a job.", "error");
        return;
    }

    showButtonLoader(submitBtn);
    showToast("Posting your job...", "progress");

    try {
        // Gather the form data
        const jobData = {
            seekerId: currentUserId,
            title: document.getElementById('job-title').value,
            category: document.getElementById('job-category').value,
            description: document.getElementById('job-description').value,
            budget: Number(document.getElementById('job-budget').value) || 0,
            createdAt: Timestamp.fromDate(new Date()),
            status: 'Open', // Default status for a new job
            proposalCount: 0 // Starts with zero proposals
        };

        // Save the new job post to the 'job_posts' collection in Firestore
        await addDoc(collection(db, "job_posts"), jobData);

        hideButtonLoader(submitBtn);
        showToast("Job posted successfully!", "success");

        // Redirect the user to their list of job posts after a short delay
        setTimeout(() => {
            window.location.href = 'my-job-posts.html';
        }, 1500);

    } catch (error) {
        console.error("Error posting job:", error);
        hideButtonLoader(submitBtn);
        showToast(`Error: ${error.message}`, "error");
    }
});