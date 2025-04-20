import { authService } from './auth-bundle.js';

// After DOM loads, initialize auth functionality
document.addEventListener('DOMContentLoaded', () => {
    const loginButtons = document.getElementById('login-buttons');
    const googleLoginButton = document.getElementById('google-login');
    const loadingIndicator = document.getElementById('loading-indicator');
    const errorMessage = document.getElementById('error-message');
    const loginSuccess = document.getElementById('login-success');
    const userInfo = document.getElementById('user-info');
    const logoutButton = document.getElementById('logout-button');
    const redirectMessage = document.getElementById('redirect-message');
    
    // Get query parameters
    const urlParams = new URLSearchParams(window.location.search);
    const redirectUrl = urlParams.get('redirect') || '/';
    
    // Check if already logged in
    authService.onAuthStateChange((user) => {
        if (user) {
            showAuthSuccess(user);
            
            // Auto-redirect after login if not admin page
            if (!redirectUrl.includes('admin')) {
                redirectMessage.textContent = 'מעביר אותך בחזרה...';
                setTimeout(() => {
                    window.location.href = redirectUrl;
                }, 1500);
            } else {
                redirectMessage.textContent = 'ניתן לגשת לממשק הניהול';
                setTimeout(() => {
                    window.location.href = redirectUrl;
                }, 1500);
            }
        } else {
            showLoginForm();
        }
    });
    
    // Set up Google login button
    googleLoginButton.addEventListener('click', async () => {
        try {
            showLoading();
            const user = await authService.loginWithGoogle();
            if (user) {
                showAuthSuccess(user);
            } else {
                showLoginForm();
            }
        } catch (error) {
            showError(error.message);
        }
    });
    
    // Set up logout button
    logoutButton.addEventListener('click', async () => {
        try {
            await authService.logout();
            showLoginForm();
        } catch (error) {
            showError(error.message);
        }
    });
    
    function showLoading() {
        loginButtons.style.display = 'none';
        loadingIndicator.style.display = 'flex';
        errorMessage.style.display = 'none';
        loginSuccess.style.display = 'none';
    }
    
    function showLoginForm() {
        loginButtons.style.display = 'flex';
        loadingIndicator.style.display = 'none';
        errorMessage.style.display = 'none';
        loginSuccess.style.display = 'none';
    }
    
    function showError(message) {
        loginButtons.style.display = 'flex';
        loadingIndicator.style.display = 'none';
        errorMessage.style.display = 'block';
        errorMessage.textContent = message || 'שגיאה בתהליך ההתחברות';
        loginSuccess.style.display = 'none';
    }
    
    function showAuthSuccess(user) {
        loginButtons.style.display = 'none';
        loadingIndicator.style.display = 'none';
        errorMessage.style.display = 'none';
        loginSuccess.style.display = 'block';
        
        // Display user info
        const displayName = user.name || user.email || 'משתמש';
        const photoHTML = user.photoURL ? 
            `<img src="${user.photoURL}" alt="${displayName}" class="user-avatar">` : 
            `<div class="user-avatar-placeholder">${displayName.charAt(0)}</div>`;
            
        userInfo.innerHTML = `
            <div class="user-avatar-container">
                ${photoHTML}
            </div>
            <div class="user-details">
                <div class="user-name">${displayName}</div>
                <div class="user-email">${user.email || ''}</div>
            </div>
        `;
    }
}); 