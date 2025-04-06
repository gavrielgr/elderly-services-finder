import { ServiceRepository } from './interfaces/ServiceRepository.js';
import { CategoryRepository } from './interfaces/CategoryRepository.js';
import { InterestAreaRepository } from './interfaces/InterestAreaRepository.js';
import { RatingRepository } from './interfaces/RatingRepository.js';
import { UserRepository } from './interfaces/UserRepository.js';

/**
 * Repository Factory
 * Creates and returns repository implementations based on the provided type
 */
export class RepositoryFactory {
    constructor() {
        this._repositories = {};
        this._implementationProvider = null;
    }

    /**
     * Set the implementation provider
     * @param {Function} provider - Function that returns repository implementations
     */
    setImplementationProvider(provider) {
        this._implementationProvider = provider;
        // Clear cache when changing provider
        this._repositories = {};
    }

    /**
     * Get repository instance
     * @param {string} type - Repository type (e.g., 'service', 'category')
     * @returns {BaseRepository} Repository instance
     */
    get(type) {
        if (!this._implementationProvider) {
            throw new Error('No implementation provider set');
        }

        // Return cached instance if available
        if (this._repositories[type]) {
            return this._repositories[type];
        }

        // Create new instance
        const repository = this._implementationProvider(type);
        this._repositories[type] = repository;
        return repository;
    }

    /**
     * Get service repository
     * @returns {ServiceRepository} Service repository instance
     */
    getServiceRepository() {
        return this.get('service');
    }

    /**
     * Get category repository
     * @returns {CategoryRepository} Category repository instance
     */
    getCategoryRepository() {
        return this.get('category');
    }

    /**
     * Get interest area repository
     * @returns {InterestAreaRepository} Interest area repository instance
     */
    getInterestAreaRepository() {
        return this.get('interestArea');
    }

    /**
     * Get rating repository
     * @returns {RatingRepository} Rating repository instance
     */
    getRatingRepository() {
        return this.get('rating');
    }

    /**
     * Get user repository
     * @returns {UserRepository} User repository instance
     */
    getUserRepository() {
        return this.get('user');
    }
}

// Singleton instance
const repositoryFactory = new RepositoryFactory();
export default repositoryFactory; 