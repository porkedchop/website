const body = document.body;
const themeToggle = document.getElementById('theme-toggle');
const themeStatus = document.getElementById('theme-status');

themeToggle.addEventListener('change', () => {
    if (themeToggle.checked) {
        // Light Mode
        body.classList.add('light-mode');
        themeStatus.textContent = 'Light';
    } else {
        // Dark Mode
        body.classList.remove('light-mode');
        themeStatus.textContent = 'Dark';
    }
});
