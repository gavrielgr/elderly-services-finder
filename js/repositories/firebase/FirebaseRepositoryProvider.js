import { FirebaseServiceRepository } from './FirebaseServiceRepository.js';
import { FirebaseCategoryRepository } from './FirebaseCategoryRepository.js';

/**
 * Firebase Repository Provider
 * Creates Firebase implementations of repositories based on type
 */
export function createFirebaseRepositoryProvider() {
    // Initialize Firebase repositories
    const serviceRepository = new FirebaseServiceRepository();
    const categoryRepository = new FirebaseCategoryRepository();
    
    // Return the provider function
    return function(type) {
        switch(type) {
            case 'service':
                return serviceRepository;
            case 'category':
                return categoryRepository;
            // We'll implement others as needed
            default:
                throw new Error(`No Firebase repository implementation for type: ${type}`);
        }
    };
} 