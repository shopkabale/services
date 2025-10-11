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

// This is the main fix. We wait for the entire HTML page to be ready before running any code.
document.addEventListener('DOMContentLoaded', () => {

    const auth = getAuth(app);
    const db = getFirestore(app);

    const messageArea = document.getElementById('message-area');
    const chatForm = document.getElementById('chat-form');
    const messageInput = document.getElementById('message-input');
    const backButton = document.getElementById('back-button');

    let currentUser = null;
    let unsubscribe = null; 

    // 1. Check Authentication State
    onAuthStateChanged(auth, async (user) => {
        if (user && user.emailVerified) {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
                currentUser = {
                    uid: user.uid,
                    name: userDoc.data().name,
                    profilePicUrl: userDoc.data().profilePicUrl
                };
                
                // Now it's safe to set the href because we know the button exists.
                backButton.href = 'dashboard.html';
                
                listenForMessages();
            } else {
                 window.location.href = 'auth.html';
            }
        } else {
            window.location.href = 'auth.html';
        }
    });

    // 2. Listen for Real-Time Messages
    function listenForMessages() {
        const messagesRef = collection(db, "group-chat");
        const q = query(messagesRef, orderBy("createdAt", "asc"), limit(100));

        unsubscribe = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === "added") {
                    const messageData = change.doc.data();
                    renderMessage(messageData);
                }
            });
            // Scroll to the bottom on new message
            setTimeout(() => {
                messageArea.scrollTop = messageArea.scrollHeight;
            }, 100);
            
        }, (error) => {
            console.error("Error fetching messages (Hint: Check Firestore index)", error);
            messageArea.innerHTML = `<p style="padding: 20px; text-align: center;">Error: Could not load messages.</p>`;
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
                    profilePicUrl: currentUser.profilePicUrl || '',
                    createdAt: serverTimestamp()
                });
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
});