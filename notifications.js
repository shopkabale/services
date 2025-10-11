// --- Global Notification and Loader System ---

// Function to show a pop-up notification (toast)
function showToast(message, type = 'info') {
    // Remove any existing toasts
    const existingToast = document.getElementById('toast-notification');
    if (existingToast) {
        existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.id = 'toast-notification';
    toast.className = `toast ${type}`;
    toast.textContent = message;

    document.body.appendChild(toast);

    // Animate in
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);

    // Automatically remove after 3 seconds, unless it's a progress message
    if (type !== 'progress') {
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.remove();
            }, 500); // Wait for fade out animation
        }, 3000);
    }
}

// Function to hide the progress toast
function hideToast() {
    const toast = document.getElementById('toast-notification');
    if (toast) {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 500);
    }
}

// Function to add a loading spinner to a button
function showButtonLoader(button) {
    button.disabled = true;
    // Save original text
    button.dataset.originalText = button.innerHTML;
    button.innerHTML = `<span class="spinner"></span> Loading...`;
}

// Function to remove the loading spinner from a button
function hideButtonLoader(button) {
    button.disabled = false;
    // Restore original text
    button.innerHTML = button.dataset.originalText || 'Submit';
}

// We need to inject the CSS for these elements into the page
function injectNotificationCSS() {
    const css = `
        .toast {
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%) translateY(-100px);
            padding: 15px 25px;
            border-radius: 8px;
            background-color: #1e293b;
            color: #ffffff;
            font-weight: 500;
            z-index: 9999;
            transition: transform 0.5s ease-in-out;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            border-left: 5px solid #007bff;
        }
        .toast.show {
            transform: translateX(-50%) translateY(0);
        }
        .toast.success {
            background-color: #28a745;
            border-left-color: #1f833a;
        }
        .toast.error {
            background-color: #dc3545;
            border-left-color: #b02a37;
        }
        .spinner {
            width: 1em;
            height: 1em;
            border: 2px solid rgba(255,255,255,0.3);
            border-radius: 50%;
            border-top-color: #fff;
            animation: spin 1s ease-in-out infinite;
            display: inline-block;
            margin-right: 8px;
            vertical-align: middle;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    `;
    const styleSheet = document.createElement("style");
    styleSheet.type = "text/css";
    styleSheet.innerText = css;
    document.head.appendChild(styleSheet);
}

// Run this immediately
injectNotificationCSS();


// Export the functions to be used in other files
export { showToast, hideToast, showButtonLoader, hideButtonLoader };