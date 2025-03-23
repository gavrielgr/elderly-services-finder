export class InstallManager {
    constructor() {
        this.deferredPrompt = null;
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
            this.checkInstallState();
        }
    }

    initializeListeners() {
        // Listen for install prompt event
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            
            // Update the header button visibility
            this.updateHeaderInstallButton();
            
            if (this.shouldShowPrompt()) {
                setTimeout(() => this.showInstallPrompt(), 3000);
            }
        });
        
        // Add event listener for app installed event
        window.addEventListener('appinstalled', () => {
            console.log('App was installed');
            this.deferredPrompt = null;
            this.updateHeaderInstallButton();
        });
        
        // Add event listeners for buttons
        document.getElementById('install-button-android')?.addEventListener('click', () => this.handleInstall());
        document.getElementById('later-button')?.addEventListener('click', () => this.hideInstallPrompt());
        document.getElementById('close-prompt')?.addEventListener('click', () => this.hideInstallPrompt());
        this.headerInstallButton?.addEventListener('click', () => this.handleInstall());
    }

    // New method to hide all installation-related elements
    hideInstallElements() {
        // Hide the install button in header
        if (this.headerInstallButton) {
            this.headerInstallButton.style.display = 'none';
        }
        
        // Make sure the install prompt is hidden
        if (this.installPrompt) {
            this.installPrompt.classList.remove('show');
            // Additional measure to ensure it's not displayed
            this.installPrompt.style.display = 'none';
        }
    }

    isInstallable() {
        // Don't report as installable if already in standalone mode
        if (this.isStandalone()) {
            return false;
        }
        return Boolean(this.deferredPrompt);
    }

    showInstallPrompt() {
        // Don't show if in standalone mode
        if (this.isStandalone() || !this.isMobileDevice()) {
            return;
        }
        
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        
        if (isIOS) {
            this.androidInstructions?.classList.add('hidden');
            this.androidPreloader?.classList.add('hidden');
            this.iosInstructions?.classList.remove('hidden');
        } else {
            // Show preloader first
            if (this.androidPreloader) {
                this.androidPreloader.classList.remove('hidden');
            }
            
            // Short delay to ensure smooth transition
            setTimeout(() => {
                if (this.androidInstructions) {
                    this.androidInstructions.classList.remove('hidden');
                    if (this.androidPreloader) {
                        this.androidPreloader.classList.add('hidden');
                    }
                }
            }, 300);
            
            this.iosInstructions?.classList.add('hidden');
        }

        this.installPrompt?.classList.add('show');
    }

    updateHeaderInstallButton() {
        // Don't show button if in standalone mode
        if (this.isStandalone()) {
            if (this.headerInstallButton) {
                this.headerInstallButton.classList.remove('available');
            }
            return;
        }
        
        if (this.deferredPrompt && this.headerInstallButton) {
            this.headerInstallButton.classList.add('available');
        } else if (this.headerInstallButton) {
            this.headerInstallButton.classList.remove('available');
        }
    }

    async handleInstall() {
        if (!this.deferredPrompt) return;
        
        const { outcome } = await this.deferredPrompt.prompt();
        this.deferredPrompt = null;
        this.updateHeaderInstallButton();
        
        if (outcome === 'accepted') {
            console.log('User accepted the install prompt');
        }
        
        this.hideInstallPrompt();
    }

    hideInstallPrompt() {
        this.installPrompt?.classList.remove('show');
        this.saveDismissalTime();
    }

    shouldShowPrompt() {
        if (!this.isMobileDevice()) return false;
        if (this.isStandalone()) return false;

        const lastDismissed = localStorage.getItem('installPromptDismissed');
        if (!lastDismissed) return true;

        const now = new Date().getTime();
        const dismissedTime = parseInt(lastDismissed);
        const sevenDays = 7 * 24 * 60 * 60 * 1000;
        
        return now - dismissedTime > sevenDays;
    }

    checkInstallState() {
        if (this.isStandalone()) {
            console.log('App is already installed');
            this.hideInstallElements();
            return;
        }

        if (this.isMobileDevice() && this.shouldShowPrompt()) {
            if (!this.deferredPrompt && /iPad|iPhone|iPod/.test(navigator.userAgent)) {
                setTimeout(() => this.showInstallPrompt(), 3000);
            }
        }
    }

    isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    isStandalone() {
        return window.matchMedia('(display-mode: standalone)').matches || 
               window.navigator.standalone === true;
    }

    saveDismissalTime() {
        localStorage.setItem('installPromptDismissed', new Date().getTime().toString());
    }
}
