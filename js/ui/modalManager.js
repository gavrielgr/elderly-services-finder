import { RouterService } from '../services/routerService.js';

export class ModalManager {
    constructor(uiManager) {
        console.log('ModalManager: Constructor called');
        this.uiManager = uiManager;
        this.modal = document.getElementById('service-modal');
        this.detailsContainer = document.getElementById('service-details-container');
        this.currentService = null;
        this.ratingComponent = null;
        
        console.log('ModalManager: Modal element found:', !!this.modal);
        console.log('ModalManager: Details container found:', !!this.detailsContainer);
        
        console.log('ModalManager: Creating RouterService');
        this.router = new RouterService();
        
        console.log('ModalManager: Setting up router callback');
        // Set up router callback
        this.router.setRouteChangeCallback(async (serviceSlug) => {
            console.log('ModalManager: Router callback triggered with serviceSlug:', serviceSlug);
            if (serviceSlug) {
                // URL changed to a service - open it from share link (this will update URL)
                console.log('ModalManager: Opening service modal from share link for slug:', serviceSlug);
                await this.openServiceFromShareLink(serviceSlug);
            } else {
                // URL changed to main page - close modal
                console.log('ModalManager: Closing modal, returning to main page');
                this.closeModal();
            }
        });
        
        console.log('ModalManager: Router callback set successfully');
        
        this.setupEventListeners();
        console.log('ModalManager: Constructor completed');
    }
    
    setupEventListeners() {
        console.log('ModalManager: Setting up event listeners');
        
        // Wait a bit to ensure DOM is fully ready
        setTimeout(() => {
            this.setupModalEventListeners();
        }, 100);
    }
    
    setupModalEventListeners() {
        console.log('ModalManager: Setting up modal event listeners');
        
        // Close modal when clicking outside or on close button
        if (this.modal) {
            console.log('ModalManager: Modal found, setting up click outside listener');
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) {
                    console.log('ModalManager: Clicked outside modal, closing');
                    this.closeModal();
                }
            });
            
            // Close button event listener
            const closeButton = this.modal.querySelector('.close-modal');
            if (closeButton) {
                console.log('ModalManager: Close button found, adding event listener');
                closeButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('ModalManager: Close button clicked');
                    this.closeModal();
                });
            } else {
                console.error('ModalManager: Close button not found');
            }
        } else {
            console.error('ModalManager: Modal element not found in setupModalEventListeners');
        }

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
    
    async showServiceDetails(serviceId) {
        try {
            console.log('ModalManager: Opening service details for ID:', serviceId);
            
            // Fetch the service data
            let service = await this.uiManager.dataService.getServiceById(serviceId);
            
            if (!service) {
                console.error('ModalManager: Service not found for ID:', serviceId);
                return;
            }

            // Show the modal with the service data
            this.showModal(service);
            
            // Only update URL if this is a direct navigation (not from clicking a service card)
            // We'll add a separate method for share links
            console.log('ModalManager: Service modal opened for ID:', serviceId);
            
        } catch (error) {
            console.error('ModalManager: Error opening service details:', error);
        }
    }

    // New method specifically for share links - this will update the URL
    async openServiceFromShareLink(serviceSlug) {
        try {
            console.log('ModalManager: Opening service from share link for slug:', serviceSlug);
            
            // Fetch the service data
            let service = await this.uiManager.dataService.getServiceBySlug(serviceSlug);
            
            if (!service) {
                console.error('ModalManager: Service not found for slug:', serviceSlug);
                return;
            }

            // Show the modal with the service data
            this.showModal(service);
            
            // Update URL for share links
            this.router.navigateToService(serviceSlug);
            
            console.log('ModalManager: Service modal opened from share link for slug:', serviceSlug);
            
        } catch (error) {
            console.error('ModalManager: Error opening service from share link:', error);
        }
    }
    
    createDetailSection(label, content) {
        return `
            <div class="service-detail-section">
                <div class="service-detail-label">${label}:</div>
                <div class="service-detail-value">${content}</div>
            </div>
        `;
    }
    
    shareService() {
        if (!this.currentService) return;

        const s = this.currentService;
        
        // Create optimal shareable link based on platform
        const serviceSlug = this.uiManager.dataService.createSlug(s.name);
        const shareableLink = this.isAppleDevice() ? 
            this.createAppleOptimizedLink(serviceSlug) : 
            this.createShortenedLink(serviceSlug);
        console.log(`Generated ${this.isAppleDevice() ? 'Apple-optimized' : 'SMS-friendly'} shareable link: ${shareableLink}`);
        
        // Create optimal share text based on platform
        const shareText = this.getOptimalShareText(s.name, shareableLink);
        
        if (navigator.share) {
            navigator.share({
                text: shareText
            }).catch(error => {
                console.error('Error sharing:', error);
                this.fallbackShare(shareText, shareableLink, s.name);
            });
        } else {
            this.fallbackShare(shareText, shareableLink, s.name);
        }
    }
    
    createSMSFriendlyShareText(serviceName, link) {
        // Create SMS-optimized share text
        // Keep it simple and clean for better SMS compatibility
        // Use shorter format for SMS
        return `${serviceName}\n\nקישור לשירות:\n${link}`;
    }
    
    createCompactShareText(serviceName, link) {
        // Create an even more compact format for SMS
        // This format is optimized for mobile devices and SMS
        return `${serviceName}\n${link}`;
    }
    
    createAppleMessagesShareText(serviceName, link) {
        // Create format optimized for Apple Messages (iMessage)
        // Apple Messages handles links very well, so we can use a more descriptive format
        return `${serviceName}\n\nקישור לשירות:\n${link}`;
    }
    
    isAppleDevice() {
        // Detect if user is on an Apple device (iOS, macOS)
        return /iPad|iPhone|iPod|Mac/.test(navigator.userAgent) || 
               /Mac|iOS/.test(navigator.platform);
    }
    
    getOptimalShareText(serviceName, link) {
        // Choose the best share format based on the platform
        if (this.isAppleDevice()) {
            // Apple devices can handle richer formatting
            return this.createAppleMessagesShareText(serviceName, link);
        } else {
            // Other devices get the compact format
            return this.createCompactShareText(serviceName, link);
        }
    }
    
    createShortenedLink(serviceSlug) {
        // Create a shorter, more SMS-friendly link
        // Remove unnecessary parts and keep only essential information
        const baseUrl = window.location.origin;
        const path = window.location.pathname;
        
        // If we're on the root path, use a shorter format
        if (path === '/' || path === '') {
            return `${baseUrl}#service/${serviceSlug}`;
        }
        
        return `${baseUrl}${path}#service/${serviceSlug}`;
    }
    
    createAppleOptimizedLink(serviceSlug) {
        // Create a link optimized for Apple Messages
        // Apple Messages handles links very well, so we can use the full path
        const baseUrl = window.location.origin;
        const path = window.location.pathname;
        
        // For Apple devices, we can use the full path as they handle it well
        return `${baseUrl}${path}#service/${serviceSlug}`;
    }
    
    fallbackShare(text, link, title) {
        // Fallback for browsers that don't support navigator.share
        // Use optimal format based on platform
        const fullText = this.getOptimalShareText(title, link);
        
        // Create a temporary input element
        const input = document.createElement('textarea');
        input.value = fullText;
        // Set RTL direction and alignment for the textarea
        input.style.direction = 'rtl';
        input.style.textAlign = 'right';
        input.style.fontFamily = 'Arial, sans-serif';
        input.style.fontSize = '14px';
        input.style.width = '400px';
        input.style.height = '200px';
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        
    }
    
    initRatingComponent(serviceId) {
        // Initialize rating component if it exists
        if (this.ratingComponent) {
            this.ratingComponent.init(serviceId);
        }
    }
    
    refreshRatings() {
        // Refresh ratings for current service
        if (this.currentService && this.ratingComponent) {
            this.ratingComponent.refresh();
        }
    }
    
    closeModal() {
        console.log('ModalManager: closeModal called');
        if (this.modal) {
            console.log('ModalManager: Setting modal display to none');
            this.modal.style.display = 'none';
            
            // Navigate back to main page
            this.router.navigateToMain();
            
            // Clear current service
            this.currentService = null;
            
            // Clear details container
            if (this.detailsContainer) {
                this.detailsContainer.innerHTML = '';
            }
        } else {
            console.error('ModalManager: Modal element not found in closeModal');
        }
    }

    // Show the modal with service data
    showModal(service) {
        this.currentService = service;
        
        if (!this.detailsContainer) {
            console.error('ModalManager: Details container not found');
            return;
        }
        
        // Re-setup event listeners to ensure they work
        this.setupModalEventListeners();
        
        // Set the modal title
        const modalTitle = document.getElementById('modal-title');
        if (modalTitle) {
            modalTitle.textContent = service.name;
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
                    // Create a clean email link without inline onclick
                    return `<a href="#" class="email-link" data-email="${address}" style="color: #007bff; text-decoration: underline; cursor: pointer;">${address}</a>${description ? ` - ${description}` : ''}`;
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
        this.modal.style.display = 'flex';
        console.log('ModalManager: Modal displayed with flex, current display style:', this.modal.style.display);
        
        // Add event listeners for email links to ensure they work with Chrome
        const emailLinks = this.detailsContainer.querySelectorAll('.email-link');
        emailLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const email = link.getAttribute('data-email');
                if (email) {
                    console.log('Email link clicked, attempting to open mailto:', email);
                    
                    // Create a temporary link element and click it programmatically
                    // This approach often works better with Chrome's security
                    const tempLink = document.createElement('a');
                    tempLink.href = `mailto:${email}`;
                    tempLink.style.display = 'none';
                    document.body.appendChild(tempLink);
                    
                    // Use a small delay to ensure the element is properly added to DOM
                    setTimeout(() => {
                        try {
                            tempLink.click();
                            console.log('Temporary link clicked successfully');
                        } catch (error) {
                            console.error('Error clicking temporary link:', error);
                            // Fallback: try direct navigation
                            try {
                                window.location.href = `mailto:${email}`;
                                console.log('Fallback navigation attempted');
                            } catch (error2) {
                                console.error('Fallback also failed:', error2);
                            }
                        } finally {
                            // Clean up
                            if (document.body.contains(tempLink)) {
                                document.body.removeChild(tempLink);
                            }
                        }
                    }, 10);
                }
            });
        });
        
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

        // Add WhatsApp share button if it doesn't exist
        this.addWhatsAppShareButton();
        
        // Verify close button is accessible
        const closeButton = this.modal.querySelector('.close-modal');
        if (closeButton) {
            console.log('ModalManager: Close button is accessible after modal display');
            console.log('ModalManager: Close button element:', closeButton);
            console.log('ModalManager: Close button computed style:', window.getComputedStyle(closeButton));
        } else {
            console.error('ModalManager: Close button not accessible after modal display');
        }
    }

    // Add WhatsApp share button
    addWhatsAppShareButton() {
        // Check if WhatsApp share button already exists
        if (document.getElementById('whatsapp-share-button')) {
            return;
        }

        // Create WhatsApp share button
        const whatsappButton = document.createElement('button');
        whatsappButton.id = 'whatsapp-share-button';
        whatsappButton.className = 'whatsapp-share-button';
        whatsappButton.innerHTML = '📱 WhatsApp';
        whatsappButton.title = 'שתף בווטסאפ';
        
        // Style the button
        whatsappButton.style.cssText = `
            background: #25D366;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 20px;
            margin-left: 10px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
        `;

        // Add click event
        whatsappButton.addEventListener('click', () => {
            this.shareToWhatsApp();
        });

        // Find the share button and add WhatsApp button next to it
        const shareButton = document.getElementById('share-button');
        if (shareButton && shareButton.parentNode) {
            shareButton.parentNode.insertBefore(whatsappButton, shareButton.nextSibling);
        }
    }

    // Share to WhatsApp
    shareToWhatsApp() {
        if (!this.currentService) return;

        const s = this.currentService;
        
        // Create optimal shareable link based on platform
        const serviceSlug = this.uiManager.dataService.createSlug(s.name);
        const shareableLink = this.isAppleDevice() ? 
            this.createAppleOptimizedLink(serviceSlug) : 
            this.createShortenedLink(serviceSlug);
        
        // Create optimal share text based on platform
        const whatsappText = this.getOptimalShareText(s.name, shareableLink);
        
        // Create WhatsApp URL
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;
        
        // Open WhatsApp
        window.open(whatsappUrl, '_blank');
    }
}