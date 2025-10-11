import { app } from './firebase-init.js';
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    doc, 
    getDoc, 
    setDoc, 
    addDoc, 
    updateDoc,
    onSnapshot, 
    query, 
    orderBy, 
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const auth = getAuth(app);
const db = getFirestore(app);

// DOM Elements
const chatHeaderName = document.getElementById('chat-header-name');
const chatHeaderAvatar = document.getElementById('chat-header-avatar');
const chatMessages = document.getElementById('chat-messages');
const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message-input');

let currentUser = null;
let conversationId = null;
let recipientId = null;
let unsubscribe = null;

const urlParams = new URLSearchParams(window.location.search);
const recipientParam = urlParams.get('recipientId');

onAuthStateChanged(auth, async (user) => {
    if (!user || !user.emailVerified) {
        window.location.href = 'auth.html'; 
        return;
    }
    currentUser = user;

    if (!recipientParam) {
        chatHeaderName.textContent = 'Error';
        chatMessages.innerHTML = `<p style="padding:20px;text-align:center;">No recipient specified in the URL.</p>`;
        return;
    }
    recipientId = recipientParam;

    // Create a predictable conversation ID
    conversationId = [currentUser.uid, recipientId].sort().join('_');

    try {
        const convoRef = doc(db, 'conversations', conversationId);
        
        // This will create the conversation document if it doesn't exist, or do nothing if it does.
        await setDoc(convoRef, {
            participants: [currentUser.uid, recipientId],
            lastUpdated: serverTimestamp()
        }, { merge: true });

        // Fetch the recipient's user data to display in the header
        const userDoc = await getDoc(doc(db, 'users', recipientId));
        if(userDoc.exists()){
            const recipientData = userDoc.data();
            chatHeaderName.textContent = recipientData.name || 'User';
            chatHeaderAvatar.src = recipientData.profilePicUrl || `https://placehold.co/45x45/10336d/a7c0e8?text=${recipientData.name.charAt(0)}`;
        }

        setupMessageListener();

    } catch (err) {
        console.error('Error initializing chat:', err);
        chatMessages.innerHTML = `<p style="padding:20px;text-align:center;color:red;">Could not initialize chat.</p>`;
    }
});

function setupMessageListener() {
    if (unsubscribe) unsubscribe(); // Stop any previous listener

    const messagesRef = collection(db, 'conversations', conversationId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));
    
    unsubscribe = onSnapshot(q, (snapshot) => {
        chatMessages.innerHTML = '';
        snapshot.forEach(docSnap => {
            renderMessage(docSnap.data());
        });
        // Scroll to the latest message
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }, (error) => {
        console.error('Message listener error:', error);
        chatMessages.innerHTML = `<p style="padding:20px;text-align:center;color:red;">Failed to load messages.</p>`;
    });
}

function renderMessage(message) {
    const div = document.createElement('div');
    div.classList.add('message');
    div.classList.add(message.senderId === currentUser.uid ? 'sent' : 'received');
    
    const bubble = document.createElement('p');
    bubble.className = 'message-bubble';
    bubble.textContent = message.text || '';
    div.appendChild(bubble);
    
    chatMessages.appendChild(div);
}

chatForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = messageInput.value.trim();
    if (!text || !currentUser || !conversationId) return;

    const sendButton = chatForm.querySelector('button[type="submit"]');
    messageInput.disabled = true;
    sendButton.disabled = true;

    try {
        // Add the new message to the sub-collection
        await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
            text,
            senderId: currentUser.uid,
            createdAt: serverTimestamp()
        });

        // Update the parent conversation document for the inbox view
        await updateDoc(doc(db, 'conversations', conversationId), {
            lastMessageText: text,
            lastMessageTimestamp: serverTimestamp(),
        });

        messageInput.value = ''; // Clear input on success
    } catch (err) {
        console.error('Error sending message:', err);
        alert('Could not send message.');
    } finally {
        messageInput.disabled = false;
        sendButton.disabled = false;
        messageInput.focus();
    }
});

// Clean up listener when user leaves the page
window.addEventListener('beforeunload', () => {
    if (unsubscribe) {
        unsubscribe();
    }
});