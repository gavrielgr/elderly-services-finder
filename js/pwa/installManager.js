export class InstallManager {
    constructor() {
        this.deferredPrompt = null; // Store the beforeinstallprompt event
        this.installPrompt = document.getElementById('install-prompt');
        this.androidInstructions = document.getElementById('android-instructions');
        this.iosInstructions = document.getElementById('ios-instructions');
        this.androidPreloader = document.getElementById('android-instructions-preloader');
        this.headerInstallButton = document.getElementById('header-install-button');
        
        // Check if already in standalone mode (PWA installed)
        if (this.isStandalone()) {
            this.hideInstallElements();
        } else {
            this.initializeListeners();
        }

        // Listen for the beforeinstallprompt event
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault(); // Prevent the default mini-infobar
            this.deferredPrompt = e; // Save the event for later use
            this.updateHeaderInstallButton(); // Update the install button visibility
        });

        // Listen for the appinstalled event
        window.addEventListener('appinstalled', () => {
            console.log('App was installed');
            this.deferredPrompt = null; // Clear the deferred prompt
            this.updateHeaderInstallButton(); // Hide the install button
        });

        this.updateHeaderInstallButton(); // Initial check for install button visibility
    }

    initializeListeners() {
        // Add event listeners for buttons
        this.headerInstallButton?.addEventListener('click', () => this.handleInstall());
    }

    hideInstallElements() {
        if (this.headerInstallButton) {
            this.headerInstallButton.style.display = 'none';
        }
        if (this.installPrompt) {
            this.installPrompt.classList.remove('show');
            this.installPrompt.style.display = 'none';
        }
    }

    updateHeaderInstallButton() {
        if (this.deferredPrompt && this.headerInstallButton) {
            this.headerInstallButton.style.display = 'block';
        } else if (this.headerInstallButton) {
            this.headerInstallButton.style.display = 'none';
        }
    }

    async handleInstall() {
        if (!this.deferredPrompt) return;

        this.deferredPrompt.prompt(); // Show the install prompt
        const choiceResult = await this.deferredPrompt.userChoice;
        if (choiceResult.outcome === 'accepted') {
            console.log('User accepted the install prompt');
        } else {
            console.log('User dismissed the install prompt');
        }
        this.deferredPrompt = null; // Clear the deferred prompt
        this.updateHeaderInstallButton(); // Update the button visibility
    }

    isStandalone() {
        return window.matchMedia('(display-mode: standalone)').matches || 
               window.navigator.standalone === true;
    }

    isInstallable() {
        // Check if the app is not in standalone mode and the deferredPrompt is available
        return !this.isStandalone() && !!this.deferredPrompt;
    }
}
