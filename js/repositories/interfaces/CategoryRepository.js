import { BaseRepository } from './BaseRepository.js';

/**
 * Category Repository Interface
 * Defines the contract for category data access
 */
export class CategoryRepository extends BaseRepository {
    /**
     * Get categories with service count
     * @returns {Promise<Array>} Array of categories with service count
     */
    async getCategoriesWithCounts() {
        throw new Error('Method not implemented');
    }
} 