import { app } from './firebase-init.js';
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore, collection, query, where, orderBy, onSnapshot, getDoc, doc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const auth = getAuth(app);
const db = getFirestore(app);

const conversationListEl = document.getElementById('conversation-list');
const backButton = document.getElementById('back-button');

onAuthStateChanged(auth, user => {
    if (user) {
        // Set the back button link dynamically based on user's role
        getDoc(doc(db, "users", user.uid)).then(userDoc => {
            if (userDoc.exists()) {
                backButton.href = userDoc.data().role === 'provider' ? 'provider-dashboard.html' : 'seeker-dashboard.html';
            }
        });
        
        // Listen for conversations
        listenForConversations(user.uid);
    } else {
        window.location.href = 'auth.html';
    }
});

function listenForConversations(userId) {
    const conversationsRef = collection(db, "conversations");
    const q = query(conversationsRef, where("participants", "array-contains", userId), orderBy("lastMessageTimestamp", "desc"));
    
    conversationListEl.innerHTML = '<p style="padding: 20px; text-align: center;">Loading conversations...</p>';

    onSnapshot(q, async (snapshot) => {
        if (snapshot.empty) {
            conversationListEl.innerHTML = '<p style="padding: 20px; text-align: center;">No conversations yet.</p>';
            return;
        }

        conversationListEl.innerHTML = ''; // Clear list
        for (const doc of snapshot.docs) {
            const convo = { id: doc.id, ...doc.data() };
            const otherParticipantId = convo.participants.find(p => p !== userId);

            if (otherParticipantId) {
                const userDoc = await getDoc(doc(db, "users", otherParticipantId));
                if (userDoc.exists()) {
                    const otherUser = userDoc.data();
                    renderConversation(convo, otherUser);
                }
            }
        }
    });
}

function renderConversation(convo, otherUser) {
    const convoLink = document.createElement('a');
    convoLink.href = `chat.html?id=${convo.id}`;
    convoLink.className = 'conversation';

    const time = convo.lastMessageTimestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || '';

    convoLink.innerHTML = `
        <img src="${otherUser.profilePicUrl || `https://placehold.co/55x55/10336d/a7c0e8?text=${otherUser.name.charAt(0)}`}" alt="Avatar" class="convo-avatar">
        <div class="convo-details">
            <div class="convo-header">
                <span class="convo-name">${otherUser.name}</span>
                <span class="convo-time">${time}</span>
            </div>
            <p class="convo-preview">${convo.lastMessageText || 'No messages yet.'}</p>
        </div>
    `;
    conversationListEl.appendChild(convoLink);
}