import { app } from './firebase-init.js';
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    query, 
    orderBy, 
    onSnapshot, 
    addDoc, 
    serverTimestamp,
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const auth = getAuth(app);
const db = getFirestore(app);

const messageArea = document.getElementById('message-area');
const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message-input');
const backButton = document.getElementById('back-button');

let currentUser = null;
let unsubscribe = null; // To stop the listener when the user leaves

// 1. Check Authentication State
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // User is logged in
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
            currentUser = {
                uid: user.uid,
                name: userDoc.data().name
            };
            // Set back button link based on role
            backButton.href = userDoc.data().role === 'provider' ? 'provider-dashboard.html' : 'seeker-dashboard.html';
            listenForMessages();
        } else {
            // Can't find user profile, redirect
             window.location.href = 'auth.html';
        }
    } else {
        // User is not logged in, redirect
        window.location.href = 'auth.html';
    }
});

// 2. Listen for Real-Time Messages
function listenForMessages() {
    const messagesRef = collection(db, "group-chat");
    const q = query(messagesRef, orderBy("createdAt", "asc"));

    unsubscribe = onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
                const messageData = change.doc.data();
                renderMessage(messageData);
            }
        });
        // Scroll to the bottom on new message
        messageArea.scrollTop = messageArea.scrollHeight;
    });
}

// 3. Render a Single Message to the Screen
function renderMessage(data) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message';

    const isOwnMessage = data.userId === currentUser.uid;
    if (isOwnMessage) {
        messageDiv.classList.add('own-message');
    }

    messageDiv.innerHTML = `
        <div class="message-avatar">${data.userName.charAt(0).toUpperCase()}</div>
        <div class="message-content">
            <div class="message-sender">${data.userName}</div>
            <p class="message-bubble">${data.text}</p>
        </div>
    `;
    messageArea.appendChild(messageDiv);
}

// 4. Handle Sending a New Message
chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const messageText = messageInput.value.trim();

    if (messageText && currentUser) {
        try {
            await addDoc(collection(db, "group-chat"), {
                text: messageText,
                userId: currentUser.uid,
                userName: currentUser.name,
                createdAt: serverTimestamp()
            });
            // Clear the input field
            messageInput.value = '';
        } catch (error) {
            console.error("Error sending message: ", error);
        }
    }
});

// Clean up the listener if the user navigates away
window.addEventListener('beforeunload', () => {
    if (unsubscribe) {
        unsubscribe();
    }
});