import { authService } from '../services/authService.js';
import { ratingService } from '../services/ratingService.js';

const DEFAULT_AVATAR_URL = 'icons/default-avatar.svg';

export class RatingComponent {
    constructor(containerId, serviceId, currentService = null) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`Container element with ID '${containerId}' not found.`);
            return;
        }
        
        this.serviceId = serviceId;
        this.currentService = currentService;
        this.userRating = null;
        this.serviceRatings = [];
        this.dataLoaded = false; // Flag to prevent duplicate loads
        
        this.initialize();
    }
    
    async initialize() {
        // Create main container
        this.ratingContainer = document.createElement('div');
        this.ratingContainer.className = 'rating-component';
        this.container.appendChild(this.ratingContainer);
        
        // Initial data load and render BEFORE setting up auth listener
        await this.loadData();
        this.render();
        
        // Set up auth state listener AFTER initial load to prevent double loading
        this.unsubscribeAuth = authService.onAuthStateChange(user => this.handleAuthChange(user));
    }
    
    async handleAuthChange(user) {
        // Only reload data if we need to refresh user-specific data
        if (user || !this.dataLoaded) {
            await this.loadData();
        }
        this.render();
    }
    
    async loadData() {
        try {
            // Load user's rating if authenticated
            if (authService.isAuthenticated()) {
                this.userRating = await ratingService.getUserRating(this.serviceId);
            } else {
                this.userRating = null;
            }
            
            // Check if service has ratings or not using either field path
            const hasRatings = 
                (this.currentService?.stats?.ratings > 0) || 
                (this.currentService?.ratings?.count > 0);
            
            const hasNoRatings = 
                (this.currentService?.stats?.ratings === 0 || !this.currentService?.stats) && 
                (this.currentService?.ratings?.count === 0 || !this.currentService?.ratings);
                
            if (hasRatings) {
                // Service has ratings, use the metadata we already have
                const ratingsSource = this.currentService.stats?.ratings !== undefined ? 'stats' : 'ratings';
                console.log(`Using ratings from service object (${ratingsSource}):`, 
                    ratingsSource === 'stats' ? 
                    { average: this.currentService.stats.averageRating, count: this.currentService.stats.ratings } : 
                    this.currentService.ratings);
                this.serviceRatings = [];
            } else if (hasNoRatings) {
                // Service has no ratings, don't try to load any
                console.log('Service has no ratings, skipping API call');
                this.serviceRatings = [];
            } else {
                // Only attempt to fetch individual ratings if needed in some special case
                try {
                    this.serviceRatings = await ratingService.getServiceRatings(this.serviceId);
                } catch (error) {
                    console.log('Failed to load ratings, using service metadata instead');
                    this.serviceRatings = [];
                }
            }
            
            this.dataLoaded = true; // Mark that data has been loaded
        } catch (error) {
            console.error('Error loading rating data:', error);
        }
    }
    
    render() {
        this.ratingContainer.innerHTML = '';
        
        // Create average rating display - shown to all users
        this.renderAverageRating();
        
        // Create rating form or login prompt
        if (authService.isAuthenticated()) {
            this.renderRatingForm();
        } else {
            this.renderLoginPrompt();
        }
        
        // Create ratings list - shown to all users
        this.renderRatingsList();
    }
    
    renderAverageRating() {
        const averageRatingContainer = document.createElement('div');
        averageRatingContainer.className = 'average-rating-container';
        
        // Use service ratings directly if available
        let average = 0;
        let count = 0;
        
        if (this.currentService) {
            // First try the correct schema path
            if (this.currentService.stats?.averageRating !== undefined && this.currentService.stats?.ratings !== undefined) {
                // Get ratings from stats (correct schema)
                average = this.currentService.stats.averageRating || 0;
                count = this.currentService.stats.ratings || 0;
            } 
            // Fall back to the other path if needed
            else if (this.currentService.ratings?.average !== undefined && this.currentService.ratings?.count !== undefined) {
                // Get ratings from ratings (backward compatibility)
                average = this.currentService.ratings.average || 0;
                count = this.currentService.ratings.count || 0;
            }
        } else if (this.serviceRatings?.length > 0) {
            // Calculate from individual ratings only if necessary
            count = this.serviceRatings.length;
            const sum = this.serviceRatings.reduce((total, rating) => total + rating.overall, 0);
            average = sum / count;
        }
        
        // Average rating stars
        const starsContainer = document.createElement('div');
        starsContainer.className = 'stars-container';
        
        for (let i = 1; i <= 5; i++) {
            const star = document.createElement('span');
            star.className = 'star';
            star.textContent = i <= Math.round(average) ? '★' : '☆';
            starsContainer.appendChild(star);
        }
        
        // Average rating text
        const averageText = document.createElement('div');
        averageText.className = 'average-text';
        averageText.textContent = count > 0 
            ? `${average.toFixed(1)} (${count} דירוגים)` 
            : 'אין דירוגים עדיין';
        
        averageRatingContainer.appendChild(starsContainer);
        averageRatingContainer.appendChild(averageText);
        
        this.ratingContainer.appendChild(averageRatingContainer);
    }
    
    renderRatingForm() {
        const formContainer = document.createElement('div');
        formContainer.className = 'rating-form-container';
        
        // Form header
        const formHeader = document.createElement('h3');
        formHeader.textContent = this.userRating ? 'עדכן דירוג' : 'דרג שירות זה';
        
        // Star rating input
        const starsInput = document.createElement('div');
        starsInput.className = 'stars-input';
        
        const selectedRating = this.userRating ? this.userRating.overall : 0;
        
        // Store the selected rating in a data attribute
        starsInput.dataset.selectedRating = selectedRating;
        
        for (let i = 1; i <= 5; i++) {
            const star = document.createElement('span');
            star.className = 'star-input';
            star.textContent = i <= selectedRating ? '★' : '☆';
            star.dataset.value = i;
            star.addEventListener('click', () => this.handleStarClick(i, starsInput));
            starsInput.appendChild(star);
        }
        
        // Comment textarea
        const commentContainer = document.createElement('div');
        commentContainer.className = 'comment-container';
        
        const commentLabel = document.createElement('label');
        commentLabel.textContent = 'תגובה (אופציונלי):';
        commentLabel.setAttribute('for', 'rating-comment');
        
        const commentTextarea = document.createElement('textarea');
        commentTextarea.id = 'rating-comment';
        commentTextarea.className = 'rating-comment';
        commentTextarea.placeholder = 'כתוב את התגובה שלך כאן...';
        commentTextarea.value = this.userRating ? this.userRating.text || '' : '';
        
        commentContainer.appendChild(commentLabel);
        commentContainer.appendChild(commentTextarea);
        
        // Submit button
        const submitButton = document.createElement('button');
        submitButton.className = 'submit-rating-button';
        submitButton.textContent = this.userRating ? 'עדכן דירוג' : 'שלח דירוג';
        submitButton.addEventListener('click', () => {
            // Get the current selected rating from the data attribute
            const currentRating = parseInt(starsInput.dataset.selectedRating, 10) || 0;
            this.handleSubmitRating(currentRating, commentTextarea.value);
        });
        
        // Delete button (if editing)
        let deleteButton = null;
        if (this.userRating) {
            deleteButton = document.createElement('button');
            deleteButton.className = 'delete-rating-button';
            deleteButton.textContent = 'מחק דירוג';
            deleteButton.addEventListener('click', () => this.handleDeleteRating());
        }
        
        // Assemble form
        formContainer.appendChild(formHeader);
        formContainer.appendChild(starsInput);
        formContainer.appendChild(commentContainer);
        formContainer.appendChild(submitButton);
        if (deleteButton) {
            formContainer.appendChild(deleteButton);
        }
        
        this.ratingContainer.appendChild(formContainer);
    }
    
    renderLoginPrompt() {
        const loginPrompt = document.createElement('div');
        loginPrompt.className = 'login-prompt';
        
        const promptText = document.createElement('p');
        promptText.textContent = 'התחבר כדי לדרג את השירות';
        
        const promptSubtext = document.createElement('p');
        promptSubtext.className = 'prompt-subtext';
        promptSubtext.textContent = 'ניתן לצפות בדירוגים קיימים ללא התחברות';
        
        const loginButton = document.createElement('button');
        loginButton.className = 'login-button';
        loginButton.textContent = 'התחבר עם Google';
        loginButton.addEventListener('click', () => this.handleLogin());
        
        loginPrompt.appendChild(promptText);
        loginPrompt.appendChild(promptSubtext);
        loginPrompt.appendChild(loginButton);
        
        this.ratingContainer.appendChild(loginPrompt);
    }
    
    renderRatingsList() {
        // If we have currentService ratings but no individual ratings, 
        // show a message that individual ratings aren't available
        if (this.serviceRatings.length === 0) {
            const messageContainer = document.createElement('div');
            messageContainer.className = 'ratings-message';
            
            const messageText = document.createElement('p');
            
            // Check for ratings count in either path
            const ratingsCount = 
                (this.currentService?.stats?.ratings > 0 ? this.currentService.stats.ratings : 0) || 
                (this.currentService?.ratings?.count > 0 ? this.currentService.ratings.count : 0);
                
            if (ratingsCount > 0) {
                messageText.textContent = `יש ${ratingsCount} דירוגים לשירות זה. צפייה בדירוגים בודדים אינה זמינה כרגע.`;
            } else {
                messageText.textContent = 'אין דירוגים זמינים לשירות זה כרגע';
            }
            
            messageContainer.appendChild(messageText);
            this.ratingContainer.appendChild(messageContainer);
            return;
        }
        
        const ratingsListContainer = document.createElement('div');
        ratingsListContainer.className = 'ratings-list-container';
        
        const ratingsHeader = document.createElement('h3');
        ratingsHeader.textContent = 'דירוגים';
        ratingsListContainer.appendChild(ratingsHeader);
        
        const ratingsList = document.createElement('div');
        ratingsList.className = 'ratings-list';
        
        this.serviceRatings.forEach(rating => {
            const ratingItem = document.createElement('div');
            ratingItem.className = 'rating-item';
            
            // User info
            const userInfo = document.createElement('div');
            userInfo.className = 'rating-user-info';
            
            // User avatar - use default if not available
            const userAvatar = document.createElement('img');
            userAvatar.className = 'rating-user-avatar';
            userAvatar.src = rating.userPhotoURL || DEFAULT_AVATAR_URL;
            userAvatar.alt = 'User avatar';
            
            // Username or default
            const userName = document.createElement('div');
            userName.className = 'rating-user-name';
            userName.textContent = rating.userName || 'משתמש';
            
            userInfo.appendChild(userAvatar);
            userInfo.appendChild(userName);
            
            // Rating date
            const ratingDate = document.createElement('div');
            ratingDate.className = 'rating-date';
            // Format date if available
            if (rating.timestamp && rating.timestamp.seconds) {
                const date = new Date(rating.timestamp.seconds * 1000);
                ratingDate.textContent = date.toLocaleDateString('he-IL');
            } else if (rating.timestamp) {
                const date = new Date(rating.timestamp);
                ratingDate.textContent = date.toLocaleDateString('he-IL');
            }
            
            // Rating stars
            const ratingStars = document.createElement('div');
            ratingStars.className = 'rating-stars';
            
            for (let i = 1; i <= 5; i++) {
                const star = document.createElement('span');
                star.className = 'star';
                star.textContent = i <= rating.overall ? '★' : '☆';
                ratingStars.appendChild(star);
            }
            
            // Rating comment
            let ratingComment = null;
            if (rating.text) {
                ratingComment = document.createElement('div');
                ratingComment.className = 'rating-comment';
                ratingComment.textContent = rating.text;
            }
            
            // Assemble rating item
            ratingItem.appendChild(userInfo);
            ratingItem.appendChild(ratingDate);
            ratingItem.appendChild(ratingStars);
            if (ratingComment) {
                ratingItem.appendChild(ratingComment);
            }
            
            ratingsList.appendChild(ratingItem);
        });
        
        ratingsListContainer.appendChild(ratingsList);
        this.ratingContainer.appendChild(ratingsListContainer);
    }
    
    handleStarClick(value, starsContainer) {
        // Update the stars display
        const stars = starsContainer.querySelectorAll('.star-input');
        stars.forEach((star, index) => {
            star.textContent = index < value ? '★' : '☆';
        });
        
        // Store the selected rating value in the data attribute
        starsContainer.dataset.selectedRating = value;
    }
    
    async handleSubmitRating(rating, comment) {
        if (!rating || rating < 1 || rating > 5) {
            alert('נא לבחור דירוג בין 1 ל-5 כוכבים');
            return;
        }
        
        try {
            // Submit or update rating
            await ratingService.submitRating(this.serviceId, rating, comment);
            
            // Reload data and re-render
            await this.loadData();
            this.render();
        } catch (error) {
            console.error('Error submitting rating:', error);
            alert('שגיאה בשליחת הדירוג');
        }
    }
    
    async handleDeleteRating() {
        if (!this.userRating) {
            return;
        }
        
        if (!confirm('האם אתה בטוח שברצונך למחוק את הדירוג שלך?')) {
            return;
        }
        
        try {
            await ratingService.deleteRating(this.userRating.id);
            
            // Reload data and re-render
            await this.loadData();
            this.render();
        } catch (error) {
            console.error('Error deleting rating:', error);
            alert('שגיאה במחיקת הדירוג');
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
    
    // Clean up when component is destroyed
    destroy() {
        // Clean up event listeners
        if (this.unsubscribeAuth) {
            this.unsubscribeAuth();
        }
        
        // Remove from DOM
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
    
    // Add method to update service data and refresh the rating display
    async updateServiceData(newServiceData) {
        if (!newServiceData) {
            return;
        }
        
        // Update current service data
        this.currentService = newServiceData;
        
        // Show a brief loading animation
        if (this.ratingContainer) {
            const loader = document.createElement('div');
            loader.className = 'rating-refresh-animation';
            loader.innerHTML = '<span class="spinner"></span>';
            this.ratingContainer.appendChild(loader);
            
            // Add transition class for animation
            this.ratingContainer.classList.add('refreshing');
            
            // Small delay to show the animation
            await new Promise(resolve => setTimeout(resolve, 300));
        }
        
        // Reload data and re-render
        await this.loadData();
        this.render();
        
        // Remove animation after a brief delay
        setTimeout(() => {
            if (this.ratingContainer) {
                this.ratingContainer.classList.remove('refreshing');
                const loader = this.ratingContainer.querySelector('.rating-refresh-animation');
                if (loader) {
                    loader.remove();
                }
            }
        }, 300);
    }
}

// Export a function to create and attach the rating component to a container
export function createRatingComponent(containerId, serviceId, currentService = null) {
    return new RatingComponent(containerId, serviceId, currentService);
} 