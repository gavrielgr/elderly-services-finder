export class ModalManager {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.modal = document.getElementById('service-modal');
        this.detailsContainer = document.getElementById('service-details-container');
        this.currentService = null;

        this.initializeListeners();
    }

    initializeListeners() {
        document.querySelector('.close-modal')?.addEventListener('click', () => this.closeModal());
        document.getElementById('call-button')?.addEventListener('click', () => this.initiateCall());
        document.getElementById('share-button')?.addEventListener('click', () => this.shareService());
        
        window.addEventListener('click', (e) => {
            if (e.target === this.modal) this.closeModal();
        });
    }

    showServiceDetails(service) {
        console.log('Showing service details:', service);
        this.currentService = service;
        if (!this.detailsContainer) return;

        // Get category name from the categories array
        const categories = this.uiManager.dataService.getCategories();
        const category = categories.find(cat => cat.id === service.category);
        const categoryName = category ? category.name : 'כללי';

        let detailsHTML = `
            <h2 class="service-name">${service.name}</h2>
            <div class="service-category">${categoryName}</div>
        `;
        
        if (service.description) {
            detailsHTML += this.createDetailSection('תיאור', service.description);
        }
        
        // טיפול בפרטי קשר
        const contact = service.contact || {};
        
        // טיפול בטלפונים
        if (contact.phone?.length > 0) {
            const phoneLinks = contact.phone
                .map(p => {
                    const number = p.number;
                    const description = p.description;
                    const encodedPhone = number.startsWith('*') ? 
                        encodeURIComponent(number) : number.replace(/\D/g, '');
                    return `<a href="tel:${encodedPhone}">${number}</a>${description ? ` - ${description}` : ''}`;
                })
                .join('<br>');
            
            detailsHTML += this.createDetailSection('טלפון', phoneLinks);
        }

        // טיפול באימיילים
        if (contact.email?.length > 0) {
            const emailLinks = contact.email
                .map(e => {
                    const address = e.address;
                    const description = e.description;
                    return `<a href="mailto:${address}">${address}</a>${description ? ` - ${description}` : ''}`;
                })
                .join('<br>');
            
            detailsHTML += this.createDetailSection('דוא"ל', emailLinks);
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
                .map(area => `<span class="service-tag">${area.name}</span>`)
                .join('');
            detailsHTML += this.createDetailSection('תגיות', areasHtml);
        } else if (service.tags?.length > 0) {
            // תמיכה בפורמט הישן של תגיות
            const tagsHtml = service.tags
                .map(tag => `<span class="service-tag">${tag}</span>`)
                .join('');
            detailsHTML += this.createDetailSection('תגיות', tagsHtml);
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
                callButton.dataset.phone = phoneNumber.replace(/\D/g, '');
            } else {
                callButton.style.display = 'none';
            }
        }
    }

    createDetailSection(label, content) {
        return `
            <div class="service-detail">
                <div class="service-detail-label">${label}</div>
                <div class="service-detail-value">${content}</div>
            </div>
        `;
    }

    closeModal() {
        if (this.modal) {
            this.modal.style.display = 'none';
            this.currentService = null;
        }
    }

    initiateCall() {
        const callButton = document.getElementById('call-button');
        if (this.currentService?.contact?.phone?.length > 0 && callButton?.dataset.phone) {
            window.location.href = `tel:${callButton.dataset.phone}`;
        }
    }

    async shareService() {
        if (!this.currentService) return;
        
        const shareText = this.createShareText();
        
        if (navigator.share) {
            try {
                await navigator.share({
                    title: this.currentService.name,
                    text: shareText
                });
            } catch (error) {
                console.error('Error sharing:', error);
                this.fallbackShare(shareText);
            }
        } else {
            this.fallbackShare(shareText);
        }
    }

    createShareText() {
        const service = this.currentService;
        const parts = [service.name];
        
        if (service.description) parts.push(service.description);
        
        const contact = [];
        if (service.contact?.phone?.length > 0) {
            contact.push(`טלפון: ${service.contact.phone.map(p => p.number).join(', ')}`);
        }
        if (service.contact?.email?.length > 0) {
            contact.push(`דוא"ל: ${service.contact.email.map(e => e.address).join(', ')}`);
        }
        if (service.contact?.website?.length > 0) {
            contact.push(`אתר אינטרנט: ${service.contact.website.map(w => w.url).join(', ')}`);
        }
        
        if (contact.length > 0) {
            parts.push('\nפרטי התקשרות:\n' + contact.join('\n'));
        }
        
        if (service.interestAreas?.length > 0) {
            parts.push(`\nתגיות: ${service.interestAreas.join(', ')}`);
        }
        
        if (service.city || service.address) {
            let location = '';
            if (service.city) location += `עיר: ${service.city}\n`;
            if (service.address) location += `כתובת: ${service.address}\n`;
            parts.push(`\nמיקום: ${location.trim()}`);
        }
        
        return parts.join('\n');
    }

    fallbackShare(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        
        try {
            document.execCommand('copy');
            this.uiManager.showStatusMessage('המידע הועתק ללוח. ניתן להדביק ולשלוח.', 'success');
        } catch (err) {
            console.error('Error copying text:', err);
            this.uiManager.showStatusMessage('לא ניתן להעתיק את המידע.', 'error');
        }
        
        document.body.removeChild(textarea);
    }
}
