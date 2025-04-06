import repositoryFactory from './RepositoryFactory.js';
import { createFirebaseRepositoryProvider } from './firebase/FirebaseRepositoryProvider.js';
import { initializeFirebase } from '../config/firebase.js';

/**
 * Initialize the repository layer
 * Set up the repository factory with the appropriate implementation provider
 */
export async function initializeRepositories() {
    try {
        // Initialize Firebase first
        await initializeFirebase();
        
        // Create and set Firebase repository provider
        const firebaseProvider = createFirebaseRepositoryProvider();
        repositoryFactory.setImplementationProvider(firebaseProvider);
        
        console.log('Repository layer initialized with Firebase provider');
        return repositoryFactory;
    } catch (error) {
        console.error('Failed to initialize repositories:', error);
        throw error;
    }
}

// Export the factory for direct use after initialization
export { repositoryFactory }; 