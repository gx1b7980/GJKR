let currentMode = 'login';

async function checkAuthStatus() {
    try {
        const response = await fetch('/api/user');
        const data = await response.json();
        if (data.isLoggedIn) {
            showLoggedInState(data.user.username);
        }
    } catch (error) {
        console.error('Error checking auth status:', error);
    }
}

function showModal(mode) {
    currentMode = mode;
    const modal = document.getElementById('auth-modal');
    const title = document.getElementById('modal-title');
    const toggleLink = document.getElementById('toggle-auth');
    const submitButton = document.getElementById('submit-button');

    modal.style.display = 'block';
    
    if (mode === 'login') {
        title.textContent = 'Login';
        toggleLink.textContent = "Don't have an account? Sign up";
        submitButton.textContent = 'Login';
        toggleLink.onclick = () => showModal('signup');
    } else {
        title.textContent = 'Create Account';
        toggleLink.textContent = 'Already have an account? Login';
        submitButton.textContent = 'Sign Up';
        toggleLink.onclick = () => showModal('login');
    }
}

function closeModal() {
    const modal = document.getElementById('auth-modal');
    const form = document.getElementById('auth-form');
    const errorMessage = document.getElementById('error-message');
    
    modal.style.display = 'none';
    form.reset();
    errorMessage.style.display = 'none';
}

async function handleAuth(event) {
    event.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('error-message');

    try {
        const endpoint = currentMode === 'login' ? '/api/login' : '/api/signup';
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Authentication failed');
        }

        showLoggedInState(username);
        closeModal();
    } catch (error) {
        errorMessage.textContent = error.message;
        errorMessage.style.display = 'block';
    }
}

document.addEventListener('DOMContentLoaded', checkAuthStatus);