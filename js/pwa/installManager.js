export class InstallManager {
    constructor() {
        this.deferredPrompt = null;
        this.installPrompt = document.getElementById('install-prompt');
        this.androidInstructions = document.getElementById('android-instructions');
        this.iosInstructions = document.getElementById('ios-instructions');
        
        this.initializeListeners();
        this.checkInstallState();
    }

    initializeListeners() {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            
            if (this.shouldShowPrompt()) {
                setTimeout(() => this.showInstallPrompt(), 3000);
            }
        });

        document.getElementById('install-button-android')?.addEventListener('click', () => this.handleInstall());
        document.getElementById('later-button')?.addEventListener('click', () => this.hideInstallPrompt());
        document.getElementById('close-prompt')?.addEventListener('click', () => this.hideInstallPrompt());
    }

    isInstallable() {
        return Boolean(this.deferredPrompt);
    }

    showInstallPrompt() {
        if (!this.isMobileDevice()) return;

        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        
        if (isIOS) {
            this.androidInstructions?.classList.add('hidden');
            this.iosInstructions?.classList.remove('hidden');
        } else {
            this.androidInstructions?.classList.remove('hidden');
            this.iosInstructions?.classList.add('hidden');
        }

        this.installPrompt?.classList.add('show');
    }

    async handleInstall() {
        if (!this.deferredPrompt) return;

        const { outcome } = await this.deferredPrompt.prompt();
        this.deferredPrompt = null;
        
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
