import { BaseRepository } from './BaseRepository.js';

/**
 * Interest Area Repository Interface
 * Defines the contract for interest area data access
 */
export class InterestAreaRepository extends BaseRepository {
    /**
     * Get interest areas by service
     * @param {string} serviceId - Service ID
     * @returns {Promise<Array>} Array of interest areas
     */
    async getByService(serviceId) {
        throw new Error('Method not implemented');
    }
} 