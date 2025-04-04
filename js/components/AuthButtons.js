import { authService } from '../services/authService.js';

const DEFAULT_AVATAR_URL = 'icons/default-avatar.svg';

export class AuthButtons {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`Container element with ID '${containerId}' not found.`);
            return;
        }
        
        this.initialize();
    }
    
    initialize() {
        // Create auth buttons container
        this.authButtonsContainer = document.createElement('div');
        this.authButtonsContainer.className = 'auth-buttons';
        this.container.appendChild(this.authButtonsContainer);
        
        // Set up auth state listener
        authService.onAuthStateChange(user => this.updateUI(user));
    }
    
    updateUI(user) {
        this.authButtonsContainer.innerHTML = '';
        
        if (user) {
            // User is signed in, show profile and logout button
            const userInfo = document.createElement('div');
            userInfo.className = 'user-info';
            
            // User avatar
            const avatar = document.createElement('img');
            avatar.className = 'user-avatar';
            avatar.src = user.photoURL || DEFAULT_AVATAR_URL;
            avatar.alt = 'User avatar';
            avatar.onerror = () => {
                avatar.src = DEFAULT_AVATAR_URL;
            };
            
            // User name and logout button container
            const userDetails = document.createElement('div');
            userDetails.className = 'user-details';
            
            const userName = document.createElement('span');
            userName.className = 'user-name';
            userName.textContent = user.name || 'User';
            
            const logoutButton = document.createElement('button');
            logoutButton.className = 'logout-button';
            logoutButton.textContent = 'התנתק';
            logoutButton.addEventListener('click', () => this.handleLogout());
            
            userDetails.appendChild(userName);
            userDetails.appendChild(logoutButton);
            
            userInfo.appendChild(avatar);
            userInfo.appendChild(userDetails);
            
            this.authButtonsContainer.appendChild(userInfo);
        } else {
            // User is signed out, show login button
            const loginButton = document.createElement('button');
            loginButton.className = 'login-button';
            loginButton.textContent = 'התחבר עם Google';
            loginButton.addEventListener('click', () => this.handleLogin());
            
            this.authButtonsContainer.appendChild(loginButton);
        }
    }
    
    async handleLogin() {
        try {
            await authService.loginWithGoogle();
        } catch (error) {
            console.error('Login failed:', error);
            alert('התחברות נכשלה. אנא נסה שוב מאוחר יותר.');
        }
    }
    
    async handleLogout() {
        try {
            await authService.logout();
        } catch (error) {
            console.error('Logout failed:', error);
            alert('התנתקות נכשלה. אנא נסה שוב מאוחר יותר.');
        }
    }
}

// Export a function to create and attach the auth buttons to a container
export function createAuthButtons(containerId) {
    return new AuthButtons(containerId);
} 