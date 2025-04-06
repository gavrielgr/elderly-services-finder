import { BaseRepository } from './BaseRepository.js';

/**
 * User Repository Interface
 * Defines the contract for user data access
 */
export class UserRepository extends BaseRepository {
    /**
     * Get current authenticated user
     * @returns {Promise<Object|null>} User object or null if not authenticated
     */
    async getCurrentUser() {
        throw new Error('Method not implemented');
    }
    
    /**
     * Sign in user
     * @param {string} email - User email
     * @param {string} password - User password
     * @returns {Promise<Object>} User object
     */
    async signIn(email, password) {
        throw new Error('Method not implemented');
    }
    
    /**
     * Sign out current user
     * @returns {Promise<boolean>} Success status
     */
    async signOut() {
        throw new Error('Method not implemented');
    }
    
    /**
     * Get user profile
     * @param {string} userId - User ID
     * @returns {Promise<Object|null>} User profile or null if not found
     */
    async getProfile(userId) {
        throw new Error('Method not implemented');
    }
    
    /**
     * Update user profile
     * @param {string} userId - User ID
     * @param {Object} profileData - Updated profile data
     * @returns {Promise<Object>} Updated profile
     */
    async updateProfile(userId, profileData) {
        throw new Error('Method not implemented');
    }
} 