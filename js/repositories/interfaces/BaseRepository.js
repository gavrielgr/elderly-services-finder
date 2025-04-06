/**
 * Base Repository Interface
 * Abstract interface that all repository implementations must extend
 */
export class BaseRepository {
    /**
     * Get all entities
     * @returns {Promise<Array>} Array of entities
     */
    async getAll() {
        throw new Error('Method not implemented');
    }

    /**
     * Get entity by ID
     * @param {string} id - Entity ID
     * @returns {Promise<Object|null>} Entity or null if not found
     */
    async getById(id) {
        throw new Error('Method not implemented');
    }

    /**
     * Create new entity
     * @param {Object} data - Entity data
     * @returns {Promise<Object>} Created entity with ID
     */
    async create(data) {
        throw new Error('Method not implemented');
    }

    /**
     * Update existing entity
     * @param {string} id - Entity ID
     * @param {Object} data - Updated entity data
     * @returns {Promise<Object>} Updated entity
     */
    async update(id, data) {
        throw new Error('Method not implemented');
    }

    /**
     * Delete entity
     * @param {string} id - Entity ID
     * @returns {Promise<boolean>} Success status
     */
    async delete(id) {
        throw new Error('Method not implemented');
    }
} 