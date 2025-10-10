import { app } from './firebase-init.js';
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore, collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const auth = getAuth(app);
const db = getFirestore(app);

const messageArea = document.getElementById('message-area');
const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message-input');
const chatHeaderName = document.getElementById('chat-header-name');
const chatHeaderAvatar = document.getElementById('chat-header-avatar');

// Get conversation ID from the URL
const urlParams = new URLSearchParams(window.location.search);
const conversationId = urlParams.get('id');

let currentUser = null;
let unsubscribe = null;

if (!conversationId) {
    alert("No conversation specified!");
    window.location.href = 'inbox.html';
}

onAuthStateChanged(auth, user => {
    if (user) {
        currentUser = user;
        setupChat();
    } else {
        window.location.href = 'auth.html';
    }
});

async function setupChat() {
    // 1. Fetch conversation details to get the other participant's ID
    const convoDocRef = doc(db, "conversations", conversationId);
    const convoDoc = await getDoc(convoDocRef);

    if (!convoDoc.exists()) {
        alert("Conversation not found.");
        return;
    }

    const otherUserId = convoDoc.data().participants.find(p => p !== currentUser.uid);
    const otherUserDoc = await getDoc(doc(db, "users", otherUserId));

    if (otherUserDoc.exists()) {
        const otherUser = otherUserDoc.data();
        chatHeaderName.textContent = otherUser.name;
        chatHeaderAvatar.src = otherUser.profilePicUrl || `https://placehold.co/45x45/10336d/a7c0e8?text=${otherUser.name.charAt(0)}`;
    }

    // 2. Listen for messages in the sub-collection
    const messagesRef = collection(db, `conversations/${conversationId}/messages`);
    const q = query(messagesRef, orderBy("createdAt", "asc"));

    unsubscribe = onSnapshot(q, (snapshot) => {
        messageArea.innerHTML = ''; // Clear existing messages
        snapshot.forEach(doc => {
            renderMessage(doc.data());
        });
        messageArea.scrollTop = messageArea.scrollHeight; // Scroll to bottom
    });
}

function renderMessage(data) {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message';
    const isOwn = data.senderId === currentUser.uid;

    if (isOwn) {
        msgDiv.classList.add('sent');
        msgDiv.innerHTML = `<p class="message-bubble">${data.text}</p>`;
    } else {
        msgDiv.classList.add('received');
        msgDiv.innerHTML = `<p class="message-bubble">${data.text}</p>`;
    }
    messageArea.appendChild(msgDiv);
}

chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = messageInput.value.trim();
    if (text && currentUser) {
        // Add new message to the sub-collection
        await addDoc(collection(db, `conversations/${conversationId}/messages`), {
            text,
            senderId: currentUser.uid,
            createdAt: serverTimestamp()
        });

        // Update the parent conversation document with the last message details
        await updateDoc(doc(db, "conversations", conversationId), {
            lastMessageText: text,
            lastMessageTimestamp: serverTimestamp()
        });
        
        messageInput.value = '';
    }
});

// Clean up listener
window.addEventListener('beforeunload', () => {
    if (unsubscribe) unsubscribe();
});