import { app } from './firebase-init.js';
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    doc, 
    getDoc, 
    addDoc, 
    setDoc, 
    query, 
    orderBy, 
    onSnapshot, 
    serverTimestamp, 
    updateDoc 
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const auth = getAuth(app);
const db = getFirestore(app);

// --- Get all necessary HTML elements ---
const messageArea = document.getElementById('message-area');
const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message-input');
const chatHeaderName = document.getElementById('chat-header-name');
const chatHeaderAvatar = document.getElementById('chat-header-avatar');

const urlParams = new URLSearchParams(window.location.search);
const recipientId = urlParams.get('recipientId'); // From "Contact Provider" button
let conversationId = urlParams.get('id');       // From inbox list

let currentUser = null;
let unsubscribe = null; // To stop the real-time listener later

// --- Main Authentication Check ---
// This runs on page load to protect the page and start the chat logic.
onAuthStateChanged(auth, async (user) => {
    if (user && user.emailVerified) {
        currentUser = user;
        
        if (recipientId) {
            // SCENARIO 1: Came from a "Contact" button.
            // We need to find or create the conversation.
            await findOrCreateConversation(recipientId);
        } else if (conversationId) {
            // SCENARIO 2: Came from the inbox list with a specific conversation ID.
            // We can set up the chat directly.
            await setupChat(conversationId);
        } else {
            // If neither ID is present, the URL is invalid.
            alert("Error: No user or conversation specified.");
            window.location.href = 'inbox.html';
        }
    } else {
        // If user is not logged in, redirect them.
        window.location.href = 'auth.html';
    }
});

/**
 * Finds an existing conversation or creates a new one, then redirects to the correct URL.
 * @param {string} recipientId The user ID of the person to chat with.
 */
async function findOrCreateConversation(recipientId) {
    if (currentUser.uid === recipientId) {
        alert("You cannot start a conversation with yourself.");
        window.history.back(); // Go back to the previous page (e.g., service-detail)
        return;
    }
    
    // Create a predictable, unique ID for the chat room between two users.
    const newConversationId = [currentUser.uid, recipientId].sort().join('_');
    const convoDocRef = doc(db, "conversations", newConversationId);
    
    const convoDoc = await getDoc(convoDocRef);

    if (!convoDoc.exists()) {
        // If the conversation does not exist, create it.
        await setDoc(convoDocRef, {
            participants: [currentUser.uid, recipientId],
            lastMessageTimestamp: serverTimestamp()
        });
    }
    
    // Redirect the page to the correct URL with the conversation ID.
    // This simplifies the logic by ensuring the page always operates with a conversationId.
    window.location.href = `chat.html?id=${newConversationId}`;
}

/**
 * Sets up the chat interface for a given conversation ID.
 * @param {string} convoId The ID of the conversation document in Firestore.
 */
async function setupChat(convoId) {
    // 1. Fetch conversation details to get the other participant's ID.
    const convoDocRef = doc(db, "conversations", convoId);
    const convoDoc = await getDoc(convoDocRef);

    if (!convoDoc.exists() || !convoDoc.data().participants.includes(currentUser.uid)) {
        alert("Error: You do not have permission to view this conversation.");
        window.location.href = 'inbox.html';
        return;
    }

    const otherUserId = convoDoc.data().participants.find(p => p !== currentUser.uid);
    const otherUserDoc = await getDoc(doc(db, "users", otherUserId));

    if (otherUserDoc.exists()) {
        const otherUser = otherUserDoc.data();
        chatHeaderName.textContent = otherUser.name;
        chatHeaderAvatar.src = otherUser.profilePicUrl || `https://placehold.co/45x45/10336d/a7c0e8?text=${otherUser.name.charAt(0)}`;
    }

    // 2. Listen for real-time messages in the sub-collection.
    const messagesRef = collection(db, `conversations/${convoId}/messages`);
    const q = query(messagesRef, orderBy("createdAt", "asc"));

    unsubscribe = onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
                renderMessage(change.doc.data());
            }
        });
        // Scroll to the bottom to show the newest message.
        messageArea.scrollTop = messageArea.scrollHeight;
    });
}

/**
 * Renders a single message bubble to the screen.
 * @param {object} data The message data from Firestore.
 */
function renderMessage(data) {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message';
    
    if (data.senderId === currentUser.uid) {
        msgDiv.classList.add('sent');
        msgDiv.innerHTML = `<p class="message-bubble">${data.text}</p>`;
    } else {
        msgDiv.classList.add('received');
        msgDiv.innerHTML = `<p class="message-bubble">${data.text}</p>`;
    }
    messageArea.appendChild(msgDiv);
}

// --- Event Listener for Sending a Message ---
chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = messageInput.value.trim();
    if (text && currentUser && conversationId) {
        messageInput.value = ''; // Clear input immediately for better UX
        try {
            // Add new message to the messages sub-collection
            await addDoc(collection(db, `conversations/${conversationId}/messages`), {
                text,
                senderId: currentUser.uid,
                createdAt: serverTimestamp()
            });

            // Update the parent conversation document with the last message details for the inbox view
            await updateDoc(doc(db, "conversations", conversationId), {
                lastMessageText: text,
                lastMessageTimestamp: serverTimestamp()
            });
        } catch (error) {
            console.error("Error sending message:", error);
            alert("Could not send message.");
            messageInput.value = text; // Restore text if sending failed
        }
    }
});

// Clean up the real-time listener when the user leaves the page to prevent memory leaks.
window.addEventListener('beforeunload', () => {
    if (unsubscribe) {
        unsubscribe();
    }
});