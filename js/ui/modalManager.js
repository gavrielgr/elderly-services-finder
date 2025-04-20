export class ModalManager {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.modal = document.getElementById('service-modal');
        this.detailsContainer = document.getElementById('service-details-container');
        this.currentService = null;
        this.ratingComponent = null;
        
        this.initModal();
    }
    
    initModal() {
        // Close the modal when the X is clicked
        const closeButton = document.querySelector('.close-modal');
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                this.modal.style.display = 'none';
            });
        }

        // Close when clicking outside of the modal content
        window.addEventListener('click', (event) => {
            if (event.target === this.modal) {
                this.modal.style.display = 'none';
            }
        });

        // Set up call button event
        const callButton = document.getElementById('call-button');
        if (callButton) {
            callButton.addEventListener('click', () => {
                if (this.currentService && this.currentService.contact?.phone?.length > 0) {
                    const phoneNumber = this.currentService.contact.phone[0].number;
                    window.location.href = `tel:${phoneNumber}`;
                }
            });
        }

        // Set up share button event
        const shareButton = document.getElementById('share-button');
        if (shareButton) {
            shareButton.addEventListener('click', () => {
                this.shareService();
            });
        }
    }

    async showServiceDetails(service) {
        console.log('Showing service details:', service);
        this.currentService = service;
        
        if (!this.detailsContainer) {
            console.error('Details container not found');
            return;
        }
        
        // Set the modal title
        const modalTitle = document.getElementById('modal-title');
        if (modalTitle) {
            modalTitle.textContent = service.name;
        }
        
        // Check if the service needs to be refreshed (implement versioned cache)
        const needsRefresh = await this.uiManager.dataService.checkServiceVersion(service.id);
        if (needsRefresh) {
            // Get the latest version from the server
            console.log('Service has been updated, fetching latest version');
            const updatedService = await this.uiManager.dataService.getServiceById(service.id, true);
            if (updatedService) {
                this.currentService = updatedService;
                service = updatedService;
                // Update title if service was refreshed
                if (modalTitle) {
                    modalTitle.textContent = updatedService.name;
                }
            }
        }
        
        this.detailsContainer.innerHTML = '';

        // Get category name from the categories array
        const categories = this.uiManager.dataService.getCategories();
        let categoryName = 'כללי';

        // בדיקה עבור שדה category (מבנה ישן) - כעת הסטנדרט
        if (service.category && categories) {
            const category = categories.find(cat => cat.id === service.category);
            if (category) {
                categoryName = category.name;
            }
        }

        // יצירת HTML עבור פרטי השירות
        let detailsHTML = `
            <div class="service-category">${categoryName}</div>
            ${service.description ? `<p class="service-details-description">${service.description}</p>` : ''}
        `;

        // גישה ליצירת קשר
        const contact = service.contact || {};

        // טיפול בטלפונים
        if (contact.phone?.length > 0) {
            const phoneListHTML = contact.phone
                .map(p => {
                    const number = p.number;
                    const description = p.description;
                    return `<a href="tel:${number}" class="phone-link">${number}</a>${description ? ` - ${description}` : ''}`;
                })
                .join('<br>');
            
            detailsHTML += this.createDetailSection('טלפון', phoneListHTML);
        }

        // טיפול בדוא"ל
        if (contact.email?.length > 0) {
            const emailListHTML = contact.email
                .map(e => {
                    const address = e.address;
                    const description = e.description;
                    return `<a href="mailto:${address}" class="email-link">${address}</a>${description ? ` - ${description}` : ''}`;
                })
                .join('<br>');
            
            detailsHTML += this.createDetailSection('דוא"ל', emailListHTML);
        }

        // טיפול באתרים
        if (contact.website?.length > 0) {
            const websiteLinks = contact.website
                .map(w => {
                    const url = w.url;
                    const description = w.description;
                    const fullUrl = url.startsWith('http') ? url : `https://${url}`;
                    return `<a href="${fullUrl}" target="_blank" rel="noopener noreferrer">${url}</a>${description ? ` - ${description}` : ''}`;
                })
                .join('<br>');
            
            detailsHTML += this.createDetailSection('אתר אינטרנט', websiteLinks);
        }

        // Log the service object right before tag generation
        console.log("Service object before tag generation:", JSON.stringify(service));

        // תגיות
        let tagsHtmlContent = ''; // Initialize variable to hold tag HTML
        if (service.interestAreas?.length > 0) {
            // New format: Use interestAreas
            const interestAreasData = this.uiManager.dataService.getInterestAreas() || [];
            console.log('Interest Areas Data for Lookup:', interestAreasData); // Log the data used for lookup
            tagsHtmlContent = service.interestAreas
                .map(area => {
                    console.log(`Processing interest area:`, area); // Log each area being processed
                    if (typeof area === 'string') {
                        const interestArea = interestAreasData.find(a => a.id === area);
                        console.log(`Lookup result for ${area}:`, interestArea); // Log the result of the find
                        const tagName = interestArea?.name || area; // Use name or fallback to ID
                        const tagHtml = `<span class="service-tag">${tagName}</span>`;
                        console.log(`Generated HTML: ${tagHtml}`); // Log the generated HTML
                        return tagHtml;
                    } else if (typeof area === 'object' && area.name) {
                        const tagHtml = `<span class="service-tag">${area.name}</span>`;
                        console.log(`Generated HTML for object: ${tagHtml}`); // Log the generated HTML
                        return tagHtml;
                    }
                    return '';
                })
                .filter(html => html)
                .join('');
        } else if (service.tags?.length > 0) {
            // Old format: Fallback to tags
            tagsHtmlContent = service.tags
                .map(tag => {
                    const tagName = typeof tag === 'string' ? tag : (tag.name || '');
                    return tagName ? `<span class="service-tag">${tagName}</span>` : '';
                })
                .filter(html => html)
                .join('');
        }

        // Add the tags section if any tags were found
        if (tagsHtmlContent) {
            detailsHTML += this.createDetailSection('תגיות', tagsHtmlContent);
        }

        // מיקום
        if (service.city || service.address) {
            let locationHtml = '';
            if (service.city) locationHtml += `<div class="city">${service.city}</div>`;
            if (service.address) locationHtml += `<div class="address">${service.address}</div>`;
            detailsHTML += this.createDetailSection('מיקום', locationHtml);
        }

        // Add rating container with refresh button
        detailsHTML += `
            <div class="rating-section">
                <div class="rating-header">
                    <h3>דירוגים</h3>
                    <button id="refresh-ratings-button" class="refresh-ratings-button" title="רענן דירוגים">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38"/>
                        </svg>
                    </button>
                </div>
                <div id="service-rating-container"></div>
            </div>`;

        this.detailsContainer.innerHTML = detailsHTML;
        this.modal.style.display = 'block';
        
        // Initialize rating component
        this.initRatingComponent(service.id);
        
        // Set up refresh button event listener
        const refreshButton = document.getElementById('refresh-ratings-button');
        if (refreshButton) {
            refreshButton.addEventListener('click', () => this.refreshRatings());
        }
        
        // Configure call button
        const callButton = document.getElementById('call-button');
        if (callButton) {
            const hasPhone = contact.phone?.length > 0;
            if (hasPhone) {
                callButton.style.display = 'block';
                const phoneNumber = contact.phone[0].number;
                callButton.dataset.phone = phoneNumber;
            } else {
                callButton.style.display = 'none';
            }
        }

        // Configure share button
        const shareButton = document.getElementById('share-button');
        if (shareButton) {
            shareButton.style.display = 'block';
        }
    }
    
    createDetailSection(title, content) {
        return `
            <div class="service-detail-section">
                <h3 class="detail-title">${title}</h3>
                <div class="detail-content">${content}</div>
            </div>
        `;
    }
    
    shareService() {
        if (!this.currentService) return;
        
        const serviceName = this.currentService.name;
        const serviceDescription = this.currentService.description || '';
        
        // Generate text to share
        const shareText = `שירות: ${serviceName}\n\n${serviceDescription}`;
        
        // Check if the navigator.share API is available
        if (navigator.share) {
            navigator.share({
                title: serviceName,
                text: shareText
            }).catch(error => {
                console.error('Error sharing:', error);
                this.fallbackShare(shareText);
            });
        } else {
            this.fallbackShare(shareText);
        }
    }
    
    fallbackShare(text) {
        // Fallback for browsers that don't support navigator.share
        // Create a temporary input element
        const input = document.createElement('textarea');
        input.value = text;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        
        alert('הטקסט הועתק ללוח. כעת תוכל להדביק אותו בכל מקום.');
    }
    
    async initRatingComponent(serviceId) {
        try {
            // Import Rating Component dynamically
            const RatingModule = await import('../components/RatingComponent.js');
            
            // Clean up previous rating component if exists
            if (this.ratingComponent) {
                this.ratingComponent.destroy();
                this.ratingComponent = null;
            }
            
            // Create new rating component
            this.ratingComponent = RatingModule.createRatingComponent('service-rating-container', serviceId, this.currentService);
        } catch (error) {
            console.error('Error initializing rating component:', error);
        }
    }

    // Add a new method to refresh ratings
    async refreshRatings() {
        if (!this.currentService || !this.ratingComponent) {
            return;
        }
        
        console.log('Refreshing ratings for service:', this.currentService.id);
        
        // Show loading indicator on the button
        const refreshButton = document.getElementById('refresh-ratings-button');
        if (refreshButton) {
            refreshButton.classList.add('loading');
            refreshButton.innerHTML = '<span class="loading-spinner"></span>';
        }
        
        try {
            // Fetch the latest service data including ratings
            const updatedService = await this.uiManager.dataService.getServiceById(this.currentService.id, true);
            
            if (updatedService) {
                // Update the current service with the new data
                this.currentService = updatedService;
                
                // Update the rating component
                await this.ratingComponent.updateServiceData(this.currentService);
            }
        } catch (error) {
            console.error('Error refreshing ratings:', error);
        } finally {
            // Restore the refresh button
            if (refreshButton) {
                refreshButton.classList.remove('loading');
                refreshButton.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38"/>
                    </svg>
                `;
            }
        }
    }
}
