// After DOM loads, initialize auth functionality
document.addEventListener('DOMContentLoaded', async () => {
    // Elements 
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
    
    // Firebase configuration
    let firebaseConfig = null;
    
    // Initialize Firebase
    try {
        // Fetch Firebase config securely from server
        const response = await fetch('/api/config');
        if (!response.ok) {
            throw new Error(`Failed to fetch Firebase configuration: ${response.status}`);
        }
        
        firebaseConfig = await response.json();
        firebase.initializeApp(firebaseConfig);
        
        // Set up auth state listener
        firebase.auth().onAuthStateChanged(user => {
            if (user) {
                // Get user data from Firestore
                const userRef = firebase.firestore().collection('users').doc(user.uid);
                userRef.get().then(doc => {
                    let userData = {
                        uid: user.uid,
                        email: user.email,
                        name: user.displayName,
                        photoURL: user.photoURL
                    };
                    
                    if (doc.exists) {
                        // Combine with Firestore data
                        userData = { ...userData, ...doc.data() };
                    } else {
                        // Create user document if it doesn't exist
                        userRef.set({
                            email: user.email,
                            name: user.displayName,
                            photoURL: user.photoURL,
                            role: 'user',
                            status: 'active',
                            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                            lastLogin: firebase.firestore.FieldValue.serverTimestamp()
                        });
                    }
                    
                    showAuthSuccess(userData);
                    
                    // Auto-redirect after login
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
                }).catch(error => {
                    console.error('Error getting user data:', error);
                    showError('שגיאה בטעינת נתוני המשתמש');
                });
            } else {
                showLoginForm();
            }
        });
        
        // Set up Google login button
        googleLoginButton.addEventListener('click', async () => {
            try {
                showLoading();
                const provider = new firebase.auth.GoogleAuthProvider();
                await firebase.auth().signInWithPopup(provider);
                // Auth state change listener will handle the rest
            } catch (error) {
                console.error('Login error:', error);
                showError(error.message);
            }
        });
        
        // Set up logout button
        logoutButton.addEventListener('click', async () => {
            try {
                await firebase.auth().signOut();
                // Auth state change listener will handle the rest
            } catch (error) {
                console.error('Logout error:', error);
                showError(error.message);
            }
        });
        
    } catch (error) {
        console.error('Failed to initialize Firebase:', error);
        showError('שגיאה באתחול מערכת ההתחברות');
    }
    
    // UI Helper functions
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