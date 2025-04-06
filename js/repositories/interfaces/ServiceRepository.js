import { BaseRepository } from './BaseRepository.js';

/**
 * Service Repository Interface
 * Defines the contract for service data access
 */
export class ServiceRepository extends BaseRepository {
    /**
     * Get services by category
     * @param {string} categoryId - Category ID
     * @returns {Promise<Array>} Array of services
     */
    async getByCategory(categoryId) {
        throw new Error('Method not implemented');
    }

    /**
     * Get services by interest area
     * @param {string} interestAreaId - Interest area ID
     * @returns {Promise<Array>} Array of services
     */
    async getByInterestArea(interestAreaId) {
        throw new Error('Method not implemented');
    }

    /**
     * Search services by text
     * @param {string} query - Search query
     * @returns {Promise<Array>} Array of matching services
     */
    async search(query) {
        throw new Error('Method not implemented');
    }

    /**
     * Check if service has been updated since timestamp
     * @param {string} id - Service ID
     * @param {string|Date} timestamp - Timestamp to compare against
     * @returns {Promise<boolean>} True if service has been updated
     */
    async checkVersion(id, timestamp) {
        throw new Error('Method not implemented');
    }
} 