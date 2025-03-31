export class ModalManager {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.modal = document.getElementById('service-modal');
        this.detailsContainer = document.getElementById('service-details-container');
        this.currentService = null;
        
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

    showServiceDetails(service) {
        console.log('Showing service details:', service);
        this.currentService = service;
        
        if (!this.detailsContainer) {
            console.error('Details container not found');
            return;
        }
        
        this.detailsContainer.innerHTML = '';

        // Get category name from the categories array
        const categories = this.uiManager.dataService.getCategories();
        const category = categories.find(cat => cat.id === service.category);
        const categoryName = category ? category.name : 'כללי';

        // יצירת HTML עבור פרטי השירות
        let detailsHTML = `
            <h2 class="service-details-name">${service.name}</h2>
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

        // תגיות
        if (service.interestAreas?.length > 0) {
            const areasHtml = service.interestAreas
                .map(area => {
                    // בדיקה אם האובייקט הוא מחרוזת או אובייקט עם שדה name
                    const areaName = typeof area === 'string' ? area : (area.name || '');
                    return areaName ? `<span class="service-tag">${areaName}</span>` : '';
                })
                .filter(html => html) // מסנן תגיות ריקות
                .join('');
            
            if (areasHtml) {
                detailsHTML += this.createDetailSection('תגיות', areasHtml);
            }
        } else if (service.tags?.length > 0) {
            // תמיכה בפורמט הישן של תגיות
            const tagsHtml = service.tags
                .map(tag => {
                    // בדיקה אם התג הוא מחרוזת או אובייקט עם שדה name
                    const tagName = typeof tag === 'string' ? tag : (tag.name || '');
                    return tagName ? `<span class="service-tag">${tagName}</span>` : '';
                })
                .filter(html => html) // מסנן תגיות ריקות
                .join('');
            
            if (tagsHtml) {
                detailsHTML += this.createDetailSection('תגיות', tagsHtml);
            }
        }

        // מיקום
        if (service.city || service.address) {
            let locationHtml = '';
            if (service.city) locationHtml += `<div class="city">${service.city}</div>`;
            if (service.address) locationHtml += `<div class="address">${service.address}</div>`;
            detailsHTML += this.createDetailSection('מיקום', locationHtml);
        }

        this.detailsContainer.innerHTML = detailsHTML;
        this.modal.style.display = 'block';
        
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
}
