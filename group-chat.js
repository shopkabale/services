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
    getDoc,
    limit
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const auth = getAuth(app);
const db = getFirestore(app);

const messageArea = document.getElementById('message-area');
const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message-input');
const backButton = document.getElementById('back-button');

let currentUser = null;
let unsubscribe = null; 

// This function will handle the entire page logic
async function initializeChat() {
    onAuthStateChanged(auth, async (user) => {
        if (user && user.emailVerified) {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
                currentUser = {
                    uid: user.uid,
                    name: userDoc.data().name,
                    profilePicUrl: userDoc.data().profilePicUrl
                };
                backButton.href = 'dashboard.html';
                listenForMessages();
            } else {
                 window.location.href = 'auth.html';
            }
        } else {
            window.location.href = 'auth.html';
        }
    });
}

function listenForMessages() {
    const messagesRef = collection(db, "group-chat");
    const q = query(messagesRef, orderBy("createdAt", "asc"), limit(100));

    unsubscribe = onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
                renderMessage(change.doc.data());
            }
        });
        setTimeout(() => {
            messageArea.scrollTop = messageArea.scrollHeight;
        }, 100);
    }, (error) => {
        console.error("Error fetching messages:", error);
        messageArea.innerHTML = `<p style="padding: 20px; text-align: center;">Error: Could not load messages.</p>`;
    });
}

function renderMessage(data) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message';

    const isOwnMessage = data.userId === currentUser.uid;
    if (isOwnMessage) {
        messageDiv.classList.add('own-message');
    }

    const avatar = data.profilePicUrl || `https://placehold.co/45x45/10336d/a7c0e8?text=${(data.userName || 'U').charAt(0)}`;

    // --- UPDATED PART ---
    // The avatar and message sender are now wrapped in an <a> tag linking to the profile.
    messageDiv.innerHTML = `
        <a href="profile.html?id=${data.userId}" class="message-profile-link">
            <img src="${avatar}" alt="${data.userName}" class="message-avatar">
        </a>
        <div class="message-content">
            <a href="profile.html?id=${data.userId}" class="message-profile-link">
                <div class="message-sender">${data.userName}</div>
            </a>
            <p class="message-bubble">${data.text}</p>
        </div>
    `;
    messageArea.appendChild(messageDiv);
}

chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const messageText = messageInput.value.trim();

    if (messageText && currentUser) {
        try {
            await addDoc(collection(db, "group-chat"), {
                text: messageText,
                userId: currentUser.uid,
                userName: currentUser.name,
                profilePicUrl: currentUser.profilePicUrl || '',
                createdAt: serverTimestamp()
            });
            messageInput.value = '';
        } catch (error) {
            console.error("Error sending message: ", error);
        }
    }
});

window.addEventListener('beforeunload', () => {
    if (unsubscribe) {
        unsubscribe();
    }
});

// --- Run the main function ---
initializeChat();