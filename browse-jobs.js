// In browse-jobs.js

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

        // This part creates the conversation and is correct
        await setDoc(conversationRef, {
            participants: [currentUser.uid, selectedJob.seekerId],
            lastMessageText: messageText,
            lastMessageTimestamp: serverTimestamp(),
            lastSenderId: currentUser.uid,
            lastRead: { [currentUser.uid]: serverTimestamp() }
        }, { merge: true });

        const messagesRef = collection(conversationRef, "messages");
        
        // This sends the message and is correct
        await addDoc(messages-ref, {
            text: messageText,
            senderId: currentUser.uid,
            createdAt: serverTimestamp()
        });

        showToast('Proposal sent! Redirecting to chat...', 'success');
        
        // --- THIS IS THE FIX ---
        // Instead of sending the conversationId, we send the recipientId,
        // which is what your chat.js file is expecting.
        window.location.href = `chat.html?recipientId=${selectedJob.seekerId}`;

    } catch (error) {
        console.error("Error sending proposal:", error);
        showToast('Failed to send proposal.', 'error');
        hideButtonLoader(submitButton);
    }
});