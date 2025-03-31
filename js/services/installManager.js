export class InstallManager {
    constructor() {
        this.deferredPrompt = null;
        this.installButton = null;
        this.setupEventListeners();
    }

    setupEventListeners() {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            this.showInstallButton();
        });

        window.addEventListener('appinstalled', () => {
            this.deferredPrompt = null;
            this.hideInstallButton();
        });
    }

    showInstallButton() {
        if (!this.installButton) {
            this.installButton = document.createElement('button');
            this.installButton.id = 'install-button';
            this.installButton.textContent = 'התקן אפליקציה';
            this.installButton.addEventListener('click', () => this.installApp());
            document.body.appendChild(this.installButton);
        }
        this.installButton.style.display = 'block';
    }

    hideInstallButton() {
        if (this.installButton) {
            this.installButton.style.display = 'none';
        }
    }

    async installApp() {
        if (!this.deferredPrompt) {
            return;
        }
        this.deferredPrompt.prompt();
        const { outcome } = await this.deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);
        this.deferredPrompt = null;
        this.hideInstallButton();
    }
}

export const installManager = new InstallManager(); 