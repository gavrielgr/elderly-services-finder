export class RouterService {
    constructor() {
        this.currentServiceId = null;
        this.onServiceRouteChange = null;
        this.initialRouteChecked = false;
        console.log('RouterService: Constructor called');
    }

    // Find service by slug
    async findServiceBySlug(slug, dataService) {
        if (!slug || !dataService) return null;
        
        try {
            // Get all services to search through
            const services = await dataService.getAllServices();
            if (!services || !Array.isArray(services)) return null;
            
            // Find service by matching slug
            const service = services.find(s => {
                const serviceSlug = dataService.createSlug(s.name);
                return serviceSlug === slug;
            });
            
            return service || null;
        } catch (error) {
            console.error('Error finding service by slug:', error);
            return null;
        }
    }

    // Set the callback for route changes
    setRouteChangeCallback(callback) {
        console.log('RouterService: setRouteChangeCallback called with:', typeof callback);
        this.onServiceRouteChange = callback;
        console.log('Router: Callback set, checking initial route if not already done');
        
        // If we haven't checked the initial route yet and now have a callback, check it
        if (!this.initialRouteChecked) {
            this.checkInitialRoute();
        }
    }

    // Check the initial route (only called after callback is set)
    checkInitialRoute() {
        console.log('RouterService: checkInitialRoute called, callback available:', !!this.onServiceRouteChange, 'already checked:', this.initialRouteChecked);
        if (this.onServiceRouteChange && !this.initialRouteChecked) {
            console.log('Router: Checking initial route with callback available');
            this.initialRouteChecked = true;
            this.handleRouteChange();
        } else {
            console.log('RouterService: checkInitialRoute - callback not available or already checked');
        }
    }

    init() {
        console.log('RouterService: init called');
        // Handle browser back/forward buttons
        window.addEventListener('popstate', (event) => {
            console.log('RouterService: popstate event triggered');
            this.handleRouteChange();
        });

        // Handle hash changes
        window.addEventListener('hashchange', (event) => {
            console.log('RouterService: hashchange event triggered');
            this.handleRouteChange();
        });

        // Don't check initial route here - wait for callback to be set
        console.log('Router: Initialized, waiting for callback to be set');
    }

    // Handle route changes (from browser navigation or direct URL access)
    async handleRouteChange() {
        const hash = window.location.hash;
        console.log('Router: Checking route change, hash:', hash);
        
        const serviceMatch = hash.match(/^#service\/([^?]+)/);
        if (serviceMatch) {
            const serviceSlug = serviceMatch[1];
            console.log('Router: Found service slug in hash:', serviceSlug);
            console.log('Router: Decoded slug:', decodeURIComponent(serviceSlug));
            
            if (this.onServiceRouteChange) {
                this.onServiceRouteChange(serviceSlug);
            } else {
                console.warn('Router: No route change callback set');
            }
        } else {
            console.log('Router: No service in hash, main page route');
            if (this.currentServiceId !== null) {
                console.log('Router: Clearing service ID, notifying listeners');
                if (this.onServiceRouteChange) {
                    this.onServiceRouteChange(null);
                } else {
                    console.warn('Router: No route change callback set');
                }
            }
        }
    }

    // Navigate to a service using its slug
    navigateToService(serviceSlug) {
        if (serviceSlug) {
            window.location.hash = `#service/${serviceSlug}`;
            this.currentServiceId = serviceSlug;
        }
    }

    // Navigate back to main page
    navigateToMain() {
        window.location.hash = '';
        this.currentServiceId = null;
    }

    // Check if currently viewing a service
    isViewingService() {
        return this.currentServiceId !== null;
    }
}
