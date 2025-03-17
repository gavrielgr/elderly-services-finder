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
        this.currentService = service;
        if (!this.detailsContainer) return;

        let detailsHTML = `<h2 class="service-name">${service.name}</h2>`;
        
        if (service.description) {
            detailsHTML += this.createDetailSection('תיאור', service.description);
        }
        
        if (service.phone) {
            const phoneLinks = service.phone.split(',')
                .map(p => p.trim())
                .map(phone => {
                    const encodedPhone = phone.startsWith('*') ? 
                        encodeURIComponent(phone) : phone.replace(/\D/g, '');
                    return `<a href="tel:${encodedPhone}">${phone}</a>`;
                })
                .join(', ');
            
            detailsHTML += this.createDetailSection('טלפון', phoneLinks);
        }

        if (service.email) {
            detailsHTML += this.createDetailSection(
                'דוא"ל',
                `<a href="mailto:${service.email}">${service.email}</a>`
            );
        }

        if (service.website) {
            const url = service.website.startsWith('http') ? 
                service.website : `https://${service.website}`;
            detailsHTML += this.createDetailSection(
                'אתר אינטרנט',
                `<a href="${url}" target="_blank" rel="noopener noreferrer">${service.website}</a>`
            );
        }

        if (service.tags?.length > 0) {
            const tagsHtml = service.tags
                .map(tag => `<span class="service-tag">${tag}</span>`)
                .join('');
            detailsHTML += this.createDetailSection('תגיות', tagsHtml);
        }

        this.detailsContainer.innerHTML = detailsHTML;
        this.modal.style.display = 'block';
        
        // Configure call button
        const callButton = document.getElementById('call-button');
        if (callButton) {
            if (service.phone && /\d/.test(service.phone)) {
                callButton.style.display = 'block';
                callButton.dataset.phone = service.phone.split(',')[0].replace(/\D/g, '');
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
        if (this.currentService?.phone && callButton?.dataset.phone) {
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
        if (service.phone) contact.push(`טלפון: ${service.phone}`);
        if (service.email) contact.push(`דוא"ל: ${service.email}`);
        if (service.website) contact.push(`אתר: ${service.website}`);
        
        if (contact.length > 0) {
            parts.push('\nפרטי התקשרות:\n' + contact.join('\n'));
        }
        
        if (service.category) {
            parts.push(`\nקטגוריה: ${service.category}`);
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
