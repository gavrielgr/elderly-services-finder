import { dataService } from '../main.js';

export class UIManager {
    constructor() {
        this.cardContainer = document.getElementById('services-container');
        this.categoryFilter = document.getElementById('category-filter');
        this.interestAreaFilter = document.getElementById('interest-area-filter');
        this.searchInput = document.getElementById('search-input');
        this.filterButton = document.getElementById('filter-button');
        this.clearFiltersButton = document.getElementById('clear-filters');
        this.noResultsMessage = document.getElementById('no-results-message');
        this.loadingIndicator = document.getElementById('loading-indicator');
        this.connectionStatus = document.getElementById('connection-status');
        this.lastUpdatedText = document.getElementById('last-updated');
        this.refreshButton = document.getElementById('refresh-button');

        this.isOnline = navigator.onLine;
        this.setupEventListeners();
        
        // מצב פילטרים
        this.activeFilters = {
            category: '',
            interestArea: '',
            searchText: ''
        };
    }

    setupEventListeners() {
        // עקיבה אחר מצב החיבור לאינטרנט
        window.addEventListener('online', () => this.handleConnectionChange(true));
        window.addEventListener('offline', () => this.handleConnectionChange(false));
        
        // מאזין לעדכון נתונים מהשירות
        window.addEventListener('dataUpdated', (event) => {
            console.log('Data updated event received, refreshing UI');
            this.updateLastUpdatedText(event.detail.timestamp);
            this.refreshUI();
        });

        // לחצן רענון
        if (this.refreshButton) {
            this.refreshButton.addEventListener('click', async () => {
                this.setLoading(true);
                try {
                    await dataService.refreshData(true); // רענון מאולץ
                    this.showStatusMessage('הנתונים עודכנו בהצלחה', 'success');
                } catch (error) {
                    console.error('Error refreshing data:', error);
                    this.showStatusMessage('שגיאה בעדכון הנתונים', 'error');
                } finally {
                    this.setLoading(false);
                }
            });
        }
    }

    handleConnectionChange(isOnline) {
        this.isOnline = isOnline;
        this.updateConnectionStatus();
        
        if (isOnline) {
            this.showStatusMessage('החיבור לאינטרנט חזר', 'success');
            // בדיקת עדכונים כשהאינטרנט חוזר
            dataService.checkForUpdates().then(needsRefresh => {
                if (needsRefresh) {
                    this.refreshUI();
                }
            });
        } else {
            this.showStatusMessage('אין חיבור לאינטרנט - מוצגים נתונים מקומיים', 'warning', 5000);
        }
    }

    updateConnectionStatus() {
        if (this.connectionStatus) {
            this.connectionStatus.textContent = this.isOnline ? 'מחובר' : 'לא מחובר';
            this.connectionStatus.className = this.isOnline ? 'status-connected' : 'status-disconnected';
        }
    }

    showStatusMessage(message, type = 'info', duration = 3000) {
        const statusContainer = document.getElementById('status-messages') || this.createStatusContainer();
        
        const statusElement = document.createElement('div');
        statusElement.className = `status-message status-${type}`;
        statusElement.textContent = message;
        
        statusContainer.appendChild(statusElement);
        
        // הסרה אוטומטית לאחר הזמן שנקבע
        setTimeout(() => {
            statusElement.classList.add('fade-out');
            setTimeout(() => {
                statusContainer.removeChild(statusElement);
                // הסרת המיכל אם הוא ריק
                if (statusContainer.children.length === 0) {
                    statusContainer.remove();
                }
            }, 500); // זמן ההנפשה
        }, duration);
    }

    createStatusContainer() {
        const container = document.createElement('div');
        container.id = 'status-messages';
        container.className = 'status-container';
        document.body.appendChild(container);
        return container;
    }

    setLoading(isLoading) {
        if (this.loadingIndicator) {
            this.loadingIndicator.style.display = isLoading ? 'flex' : 'none';
        }
    }

    updateLastUpdatedText(timestamp) {
        if (this.lastUpdatedText && timestamp) {
            const date = new Date(timestamp);
            const formattedDate = new Intl.DateTimeFormat('he-IL', {
                dateStyle: 'medium',
                timeStyle: 'short'
            }).format(date);
            
            this.lastUpdatedText.textContent = `עודכן לאחרונה: ${formattedDate}`;
        }
    }

    refreshUI() {
        this.renderServices();
    }

    async init() {
        try {
            this.setLoading(true);
            this.updateConnectionStatus();
            
            const result = await dataService.refreshData();
            if (result) {
                this.updateLastUpdatedText(dataService.getLastUpdated());
                this.initializeFilters();
                this.setupFilterListeners();
                this.refreshUI();
            } else {
                this.showStatusMessage('לא ניתן לטעון נתונים מעודכנים, מוצגים נתונים מקומיים', 'warning');
                // ננסה להשתמש במה שיש
                this.initializeFilters();
                this.setupFilterListeners();
                this.refreshUI();
            }
        } catch (error) {
            console.error('Error initializing UI:', error);
            this.showStatusMessage('שגיאה בטעינת הנתונים', 'error');
        } finally {
            this.setLoading(false);
        }
    }

    initializeFilters() {
        try {
            const categories = dataService.getCategories();
            
            // איפוס הפילטרים
            if (this.categoryFilter) {
                this.categoryFilter.innerHTML = '';
                
                // אפשרות "הכל"
                const allOption = document.createElement('option');
                allOption.value = '';
                allOption.textContent = 'כל הקטגוריות';
                this.categoryFilter.appendChild(allOption);
                
                // הוספת כל הקטגוריות
                categories.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category.id;
                    option.textContent = category.name;
                    this.categoryFilter.appendChild(option);
                });
            }
            
            // אתחול פילטר תחומי עניין (אם יש)
            if (this.interestAreaFilter && dataService.allServicesData?.interestAreas) {
                this.interestAreaFilter.innerHTML = '';
                
                // אפשרות "הכל"
                const allOption = document.createElement('option');
                allOption.value = '';
                allOption.textContent = 'כל תחומי העניין';
                this.interestAreaFilter.appendChild(allOption);
                
                // הוספת כל תחומי העניין
                dataService.allServicesData.interestAreas.forEach(area => {
                    const option = document.createElement('option');
                    option.value = area.id;
                    option.textContent = area.name;
                    this.interestAreaFilter.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error initializing filters:', error);
            this.showStatusMessage('שגיאה באתחול הפילטרים', 'error');
        }
    }

    setupFilterListeners() {
        // האזנה לשינויים בפילטרים
        if (this.categoryFilter) {
            this.categoryFilter.addEventListener('change', () => {
                this.activeFilters.category = this.categoryFilter.value;
                this.renderServices();
            });
        }
        
        if (this.interestAreaFilter) {
            this.interestAreaFilter.addEventListener('change', () => {
                this.activeFilters.interestArea = this.interestAreaFilter.value;
                this.renderServices();
            });
        }
        
        if (this.searchInput) {
            this.searchInput.addEventListener('input', () => {
                this.activeFilters.searchText = this.searchInput.value.trim().toLowerCase();
            });
            
            // מניעת שליחת טופס
            this.searchInput.form?.addEventListener('submit', (e) => {
                e.preventDefault();
                this.renderServices();
            });
        }
        
        if (this.filterButton) {
            this.filterButton.addEventListener('click', () => {
                this.renderServices();
            });
        }
        
        if (this.clearFiltersButton) {
            this.clearFiltersButton.addEventListener('click', () => {
                this.clearFilters();
            });
        }
    }
    
    clearFilters() {
        // איפוס כל הפילטרים
        if (this.categoryFilter) this.categoryFilter.value = '';
        if (this.interestAreaFilter) this.interestAreaFilter.value = '';
        if (this.searchInput) this.searchInput.value = '';
        
        this.activeFilters = {
            category: '',
            interestArea: '',
            searchText: ''
        };
        
        this.renderServices();
    }
    
    renderServices() {
        if (!this.cardContainer) return;
        
        try {
            const services = dataService.getData();
            if (!services || services.length === 0) {
                this.showNoResults(true, 'לא נמצאו שירותים במערכת');
                return;
            }
            
            // סינון לפי הפילטרים הפעילים
            const filteredServices = this.filterServices(services);
            
            if (filteredServices.length === 0) {
                this.showNoResults(true, 'לא נמצאו שירותים מתאימים לפילטרים');
                return;
            }
            
            // מיון השירותים לפי תאריך יצירה (מהחדש לישן)
            const sortedServices = this.sortServices(filteredServices);
            
            // הצגת השירותים
            this.cardContainer.innerHTML = '';
            this.showNoResults(false);
            
            sortedServices.forEach(service => {
                const card = this.createServiceCard(service);
                this.cardContainer.appendChild(card);
            });
            
            console.log(`Rendered ${sortedServices.length} services`);
        } catch (error) {
            console.error('Error rendering services:', error);
            this.showStatusMessage('שגיאה בהצגת השירותים', 'error');
        }
    }
    
    filterServices(services) {
        return services.filter(service => {
            // פילטר לפי קטגוריה
            if (this.activeFilters.category && service.categoryId !== this.activeFilters.category) {
                return false;
            }
            
            // פילטר לפי תחום עניין
            if (this.activeFilters.interestArea) {
                // בדיקה אם השירות מקושר לתחום העניין הנבחר
                if (!service.interestAreaIds || !service.interestAreaIds.includes(this.activeFilters.interestArea)) {
                    // בדיקה במיפויים אם קיימים
                    const mappings = dataService.allServicesData?.serviceInterestAreas || [];
                    const hasMapping = mappings.some(mapping => 
                        mapping.serviceId === service.id && 
                        mapping.interestAreaId === this.activeFilters.interestArea
                    );
                    
                    if (!hasMapping) {
                        return false;
                    }
                }
            }
            
            // פילטר לפי טקסט חיפוש
            if (this.activeFilters.searchText) {
                const searchText = this.activeFilters.searchText.toLowerCase();
                const nameMatch = service.name && service.name.toLowerCase().includes(searchText);
                const descriptionMatch = service.description && service.description.toLowerCase().includes(searchText);
                const addressMatch = service.address && service.address.toLowerCase().includes(searchText);
                
                if (!nameMatch && !descriptionMatch && !addressMatch) {
                    return false;
                }
            }
            
            return true;
        });
    }
    
    sortServices(services) {
        return [...services].sort((a, b) => {
            // מיון לפי תאריך יצירה (מהחדש לישן)
            const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
            const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
            return dateB - dateA;
        });
    }
    
    createServiceCard(service) {
        const card = document.createElement('div');
        card.className = 'service-card';
        
        // חיפוש קטגוריה
        let categoryName = 'לא מוגדר';
        if (service.categoryId) {
            const category = dataService.getCategory(service.categoryId);
            if (category) {
                categoryName = category.name;
            }
        }
        
        card.innerHTML = `
            <div class="service-header">
                <h3>${service.name || 'שם השירות חסר'}</h3>
                <span class="category-tag">${categoryName}</span>
            </div>
            <p class="service-description">${service.description || 'אין תיאור'}</p>
            <div class="service-details">
                ${service.address ? `<p><strong>כתובת:</strong> ${service.address}</p>` : ''}
                ${service.phone ? `<p><strong>טלפון:</strong> ${service.phone}</p>` : ''}
                ${service.email ? `<p><strong>אימייל:</strong> ${service.email}</p>` : ''}
                ${service.website ? `<p><strong>אתר:</strong> <a href="${service.website}" target="_blank">קישור לאתר</a></p>` : ''}
            </div>
        `;
        
        // הוספת לחצן צור קשר אם יש מידע ליצירת קשר
        if (service.phone || service.email || service.website) {
            const contactButton = document.createElement('button');
            contactButton.className = 'contact-button';
            contactButton.textContent = 'צור קשר';
            contactButton.addEventListener('click', () => this.showContactInfo(service));
            
            card.appendChild(contactButton);
        }
        
        return card;
    }
    
    showContactInfo(service) {
        alert(`ליצירת קשר עם ${service.name}:
${service.phone ? `טלפון: ${service.phone}` : ''}
${service.email ? `אימייל: ${service.email}` : ''}
${service.website ? `אתר: ${service.website}` : ''}`);
    }
    
    showNoResults(show, message = 'לא נמצאו שירותים מתאימים') {
        if (!this.noResultsMessage) return;
        
        this.noResultsMessage.style.display = show ? 'block' : 'none';
        this.noResultsMessage.textContent = message;
    }
} 