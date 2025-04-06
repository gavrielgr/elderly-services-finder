import { BaseRepository } from './BaseRepository.js';

/**
 * Rating Repository Interface
 * Defines the contract for rating data access
 */
export class RatingRepository extends BaseRepository {
    /**
     * Get ratings by service
     * @param {string} serviceId - Service ID
     * @returns {Promise<Array>} Array of ratings
     */
    async getByService(serviceId) {
        throw new Error('Method not implemented');
    }
    
    /**
     * Get average rating for service
     * @param {string} serviceId - Service ID
     * @returns {Promise<Object>} Object with average and count
     */
    async getAverageForService(serviceId) {
        throw new Error('Method not implemented');
    }
    
    /**
     * Get ratings submitted by user
     * @param {string} userId - User ID
     * @returns {Promise<Array>} Array of ratings
     */
    async getByUser(userId) {
        throw new Error('Method not implemented');
    }
} 