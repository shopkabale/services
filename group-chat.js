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
let unsubscribe = null; 

onAuthStateChanged(auth, async (user) => {
    if (user && user.emailVerified) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
            currentUser = {
                uid: user.uid,
                name: userDoc.data().name,
                profilePicUrl: userDoc.data().profilePicUrl
            };
            // FIX: Set the back button's href link here, after we know the user's role.
            backButton.href = 'dashboard.html'; // All users go to the same universal dashboard.
            listenForMessages();
        } else {
             window.location.href = 'auth.html';
        }
    } else {
        window.location.href = 'auth.html';
    }
});

function listenForMessages() {
    const messagesRef = collection(db, "group-chat");
    const q = query(messagesRef, orderBy("createdAt", "asc"), limit(100)); // Limit to last 100 messages

    unsubscribe = onSnapshot(q, (snapshot) => {
        messageArea.innerHTML = '';
        
        snapshot.forEach((doc) => {
            const messageData = doc.data();
            renderMessage(messageData);
        });

        // Use a slight delay to ensure the DOM has updated before scrolling
        setTimeout(() => {
            messageArea.scrollTop = messageArea.scrollHeight;
        }, 100);
        
    }, (error) => {
        console.error("Error fetching messages (Hint: Have you created the Firestore index?)", error);
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

    messageDiv.innerHTML = `
        <img src="${avatar}" alt="${data.userName}" class="message-avatar">
        <div class="message-content">
            <div class="message-sender">${data.userName}</div>
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