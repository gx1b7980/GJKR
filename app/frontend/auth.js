async function checkAuthStatus() {
    try {
        const response = await fetch('/api/user');
        if (!response.ok) {
            if (response.status === 404) {
                // Redirect to auth.html if not authenticated
                if (!window.location.pathname.endsWith('auth.html')) {
                    window.location.href = 'auth.html';
                }
                return;
            }
            throw new Error(`Error: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        if (data.isLoggedIn) {
            showLoggedInState(data.user.username);
        }
    } catch (error) {
        console.error('Error checking auth status:', error);
        // Optional: Redirect to auth.html on fetch error
        if (!window.location.pathname.endsWith('auth.html')) {
            window.location.href = 'auth.html';
        }
    }
}

// Show the specified modal
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) {
        console.error(`Modal with id "${modalId}" not found.`);
        return;
    }
    modal.style.display = 'block';
}

// Hide the specified modal
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) {
        console.error(`Modal with id "${modalId}" not found.`);
        return;
    }
    modal.style.display = 'none';

    const errorMessage = modal.querySelector('.error-message');
    if (errorMessage) errorMessage.style.display = 'none';

    const form = modal.querySelector('form');
    if (form) form.reset();
}

// Handle Login Submission
async function handleLogin(event) {
    event.preventDefault();
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    const errorMessage = document.getElementById('login-error-message');

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Login failed.');
        }

        alert('Login successful!');
        window.location.href = '/'; // Redirect to the home page or dashboard
    } catch (error) {
        errorMessage.textContent = error.message;
        errorMessage.style.display = 'block';
    }
}

// Handle Sign-Up Submission
async function handleSignup(event) {
    event.preventDefault();
    const username = document.getElementById('signup-username').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm-password').value;
    const errorMessage = document.getElementById('signup-error-message');

    if (password !== confirmPassword) {
        errorMessage.textContent = 'Passwords do not match.';
        errorMessage.style.display = 'block';
        return;
    }

    try {
        const response = await fetch('/api/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });

        const data = await response.json();
        console.log(data);
        if (!response.ok) {
            throw new Error(data.message || 'Sign-up failed.');
        }

        alert('Sign-up successful! Please log in.');
        closeModal('signup-modal');
        showModal('login-modal');
    } catch (error) {
        errorMessage.textContent = error.message;
        errorMessage.style.display = 'block';
    }
}

// Show Login Modal by Default
document.addEventListener('DOMContentLoaded', () => {
    showModal('login-modal');
});
