import { adminAuth } from './AdminAuth.js';
import { ratingsAdmin } from './RatingsAdmin.js';

class AdminUI {
    constructor() {
        // DOM elements
        this.loginContainer = document.getElementById('login-container');
        this.adminDashboard = document.getElementById('admin-dashboard');
        this.adminEmail = document.getElementById('admin-email');
        this.logoutButton = document.getElementById('logout-button');
        this.ratingsTable = document.getElementById('ratings-tbody');
        this.loadMoreButton = document.getElementById('load-more-button');
        this.moderationModal = document.getElementById('moderation-modal');
        this.statusMessage = document.getElementById('status-message');

        // Filters
        this.statusFilter = document.getElementById('status-filter');
        this.dateFromFilter = document.getElementById('date-from');
        this.dateToFilter = document.getElementById('date-to');
        this.searchFilter = document.getElementById('search-filter');

        // State
        this.lastDoc = null;
        this.currentRatingId = null;
        this.filters = {
            status: 'all',
            dateFrom: null,
            dateTo: null,
            searchTerm: ''
        };

        // Check if we're in the right admin page (ratings module)
        // This helps when this script is loaded on an admin page that doesn't have these elements
        if (document.querySelector('.ratings-section')) {
            if (this.initializeDomElements()) {
                this.initializeEventListeners();
                this.checkAuthState();
            }
        } else {
            console.log('Admin UI initialized from inline script, not initializing event listeners');
        }
    }
    
    // Ensure DOM elements exist before trying to attach event listeners
    initializeDomElements() {
        // Only check for the elements we actually need in this page
        const missingElements = [];
        
        const requiredElements = {
            'login-container': this.loginContainer,
            'admin-dashboard': this.adminDashboard,
            'admin-email': this.adminEmail,
            'ratings-tbody': this.ratingsTable,
            'load-more-button': this.loadMoreButton,
            'moderation-modal': this.moderationModal,
            'status-message': this.statusMessage
        };
        
        // Only check elements that should exist in this page version
        for (const [name, element] of Object.entries(requiredElements)) {
            if (!element && document.getElementById(name) === null) {
                missingElements.push(name);
            }
        }
        
        if (missingElements.length > 0) {
            console.warn('Missing DOM elements:', missingElements.join(', '));
            return false;
        }
        
        return true;
    }

    initializeEventListeners() {
        // Auth listeners
        this.logoutButton?.addEventListener('click', () => this.handleLogout());

        // Filter listeners
        this.statusFilter?.addEventListener('change', () => this.handleFiltersChange());
        this.dateFromFilter?.addEventListener('change', () => this.handleFiltersChange());
        this.dateToFilter?.addEventListener('change', () => this.handleFiltersChange());
        this.searchFilter?.addEventListener('input', this.debounce(() => this.handleFiltersChange(), 500));

        // Load more listener
        this.loadMoreButton?.addEventListener('click', () => this.loadMoreRatings());

        // Modal listeners
        document.querySelector('.close-modal')?.addEventListener('click', () => this.closeModal());
        document.getElementById('confirm-reject')?.addEventListener('click', () => this.handleConfirmReject());
        document.getElementById('cancel-reject')?.addEventListener('click', () => this.closeModal());
    }

    async checkAuthState() {
        adminAuth.onAuthStateChanged((admin) => {
            if (admin) {
                this.showDashboard(admin);
            } else {
                this.showLogin();
            }
        });
    }

    async handleLogout() {
        try {
            await adminAuth.logout();
            this.showLogin();
        } catch (error) {
            this.showStatusMessage('התנתקות נכשלה', 'error');
        }
    }

    showLogin() {
        this.loginContainer.classList.remove('hidden');
        this.adminDashboard.classList.add('hidden');
    }

    showDashboard(admin) {
        this.loginContainer.classList.add('hidden');
        this.adminDashboard.classList.remove('hidden');
        this.adminEmail.textContent = admin.email;
        this.loadRatings();
    }

    async loadRatings(reset = true) {
        try {
            if (reset) {
                this.lastDoc = null;
                this.ratingsTable.innerHTML = '';
            }

            const result = await ratingsAdmin.getRatings({
                status: this.filters.status,
                lastDoc: this.lastDoc,
                searchTerm: this.filters.searchTerm,
                dateFrom: this.filters.dateFrom,
                dateTo: this.filters.dateTo
            });

            this.renderRatings(result.ratings);
            this.lastDoc = result.lastDoc;
            this.loadMoreButton.parentElement.classList.toggle('hidden', !result.hasMore);

        } catch (error) {
            this.showStatusMessage('טעינת דירוגים נכשלה', 'error');
        }
    }

    async loadMoreRatings() {
        await this.loadRatings(false);
    }

    renderRatings(ratings) {
        const html = ratings.map(rating => this.createRatingRow(rating)).join('');
        
        if (this.lastDoc) {
            this.ratingsTable.insertAdjacentHTML('beforeend', html);
        } else {
            this.ratingsTable.innerHTML = html;
        }
    }

    createRatingRow(rating) {
        const date = new Date(rating.timestamp.seconds * 1000).toLocaleDateString('he-IL');
        
        return `
            <tr>
                <td>${date}</td>
                <td>${rating.serviceName}</td>
                <td>${'★'.repeat(rating.overall)}${'☆'.repeat(5-rating.overall)}</td>
                <td>${rating.text || ''}</td>
                <td>${this.getStatusDisplay(rating.moderation?.status)}</td>
                <td>
                    ${this.getActionButtons(rating)}
                </td>
            </tr>
        `;
    }

    getStatusDisplay(status) {
        const statusMap = {
            'pending': 'ממתין',
            'approved': 'מאושר',
            'rejected': 'נדחה',
            'flagged': 'מסומן'
        };
        return statusMap[status] || 'ממתין';
    }

    getActionButtons(rating) {
        if (rating.moderation?.status === 'approved') {
            return `
                <button class="action-button reject-button" 
                        onclick="window.adminUI.showRejectModal('${rating.id}')">
                    דחה
                </button>
            `;
        }
        
        if (rating.moderation?.status === 'rejected') {
            return `
                <button class="action-button approve-button"
                        onclick="window.adminUI.handleApprove('${rating.id}')">
                    אשר
                </button>
            `;
        }

        return `
            <button class="action-button approve-button"
                    onclick="window.adminUI.handleApprove('${rating.id}')">
                אשר
            </button>
            <button class="action-button reject-button"
                    onclick="window.adminUI.showRejectModal('${rating.id}')">
                דחה
            </button>
        `;
    }

    async handleApprove(ratingId) {
        try {
            await ratingsAdmin.approveRating(ratingId);
            this.showStatusMessage('הדירוג אושר בהצלחה', 'success');
            this.loadRatings();
        } catch (error) {
            this.showStatusMessage('אישור הדירוג נכשל', 'error');
        }
    }

    showRejectModal(ratingId) {
        this.currentRatingId = ratingId;
        this.moderationModal.classList.remove('hidden');
        document.getElementById('rejection-reason').value = '';
    }

    async handleConfirmReject() {
        const reason = document.getElementById('rejection-reason').value;
        if (!reason) {
            this.showStatusMessage('נא להזין סיבת דחייה', 'error');
            return;
        }

        try {
            await ratingsAdmin.removeRating(this.currentRatingId, reason);
            this.closeModal();
            this.showStatusMessage('הדירוג נדחה בהצלחה', 'success');
            this.loadRatings();
        } catch (error) {
            this.showStatusMessage('דחיית הדירוג נכשלה', 'error');
        }
    }

    closeModal() {
        this.moderationModal.classList.add('hidden');
        this.currentRatingId = null;
    }

    handleFiltersChange() {
        this.filters = {
            status: this.statusFilter.value,
            dateFrom: this.dateFromFilter.value ? new Date(this.dateFromFilter.value) : null,
            dateTo: this.dateToFilter.value ? new Date(this.dateToFilter.value) : null,
            searchTerm: this.searchFilter.value
        };
        this.loadRatings();
    }

    showStatusMessage(message, type) {
        this.statusMessage.textContent = message;
        this.statusMessage.className = `status-message ${type}`;
        this.statusMessage.classList.remove('hidden');
        
        setTimeout(() => {
            this.statusMessage.classList.add('hidden');
        }, 3000);
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// Initialize and expose to window for event handlers
window.adminUI = new AdminUI(); 