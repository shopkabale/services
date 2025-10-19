document.addEventListener("DOMContentLoaded", function() {
    const themeToggle = document.getElementById('theme-toggle');
    if (!themeToggle) return;

    // Function to apply the theme
    const applyTheme = (theme) => {
        // Remove existing theme classes
        document.body.classList.remove('light-mode', 'dark-mode');
        // Add the new theme class
        document.body.classList.add(theme);
        // Update localStorage
        localStorage.setItem('theme', theme);
        // Update the toggle button icon
        themeToggle.textContent = theme === 'light-mode' ? '☀️' : '🌙';
    };

    // Get the theme from localStorage or default to dark-mode
    const currentTheme = localStorage.getItem('theme') || 'dark-mode';
    applyTheme(currentTheme);

    // Add click event listener to the toggle button
    themeToggle.addEventListener('click', () => {
        const newTheme = document.body.classList.contains('light-mode') ? 'dark-mode' : 'light-mode';
        applyTheme(newTheme);
    });
});


// --- ADD THIS CODE TO THE END OF YOUR THEME.JS FILE ---

// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('Service Worker registered with scope:', registration.scope);
      })
      .catch((error) => {
        console.error('Service Worker registration failed:', error);
      });
  });
}

