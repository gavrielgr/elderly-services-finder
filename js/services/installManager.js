export class InstallManager {
    constructor() {
        this.deferredPrompt = null;
        this.installButton = document.getElementById('install-button');
        
        if (this.installButton) {
            this.installButton.addEventListener('click', () => this.installApp());
        }
    }

    init() {
        window.addEventListener('beforeinstallprompt', (e) => {
            // Prevent Chrome 67 and earlier from automatically showing the prompt
            e.preventDefault();
            
            // Stash the event so it can be triggered later
            this.deferredPrompt = e;
            
            // Show the install button
            if (this.installButton) {
                this.installButton.style.display = 'block';
            }
        });

        // Listen for successful installation
        window.addEventListener('appinstalled', () => {
            // Hide the install button
            if (this.installButton) {
                this.installButton.style.display = 'none';
            }
        });
    }

    async installApp() {
        if (!this.deferredPrompt) {
            return;
        }

        // Show the install prompt
        this.deferredPrompt.prompt();
        
        // Wait for the user to respond to the prompt
        const { outcome } = await this.deferredPrompt.userChoice;
        
        // Clear the deferredPrompt so it can be garbage collected
        this.deferredPrompt = null;
        
        // Hide the install button
        if (this.installButton) {
            this.installButton.style.display = 'none';
        }
    }

    isInstallable() {
        return this.deferredPrompt !== null;
    }
}

export const installManager = new InstallManager(); 