import { ServiceRepository } from '../interfaces/ServiceRepository.js';
import { collection, getDocs, getDoc, doc, query, where, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../config/firebase.js';
import { saveToIndexedDB, getFromIndexedDB } from '../../services/storageService.js';

/**
 * Firebase implementation of ServiceRepository
 */
export class FirebaseServiceRepository extends ServiceRepository {
    constructor() {
        super();
        this.collectionName = 'services';
        this.collection = collection(db, this.collectionName);
        this.cacheKey = 'services-cache';
    }

    /**
     * Get all services
     * @returns {Promise<Array>} Array of services
     */
    async getAll() {
        try {
            // Try to get from cache first
            const cachedData = await getFromIndexedDB(this.cacheKey);
            if (cachedData?.services && cachedData.timestamp) {
                const now = new Date();
                const cacheTime = new Date(cachedData.timestamp);
                const hoursSinceCache = (now - cacheTime) / (1000 * 60 * 60);
                
                // If cache is less than 2 hours old, use it
                if (hoursSinceCache < 2) {
                    console.log('Using cached services data');
                    return cachedData.services;
                }
            }

            // Fetch from Firebase
            const snapshot = await getDocs(this.collection);
            const services = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Save to cache
            await saveToIndexedDB(this.cacheKey, {
                services,
                timestamp: new Date().toISOString()
            });

            return services;
        } catch (error) {
            console.error('Error getting services:', error);
            
            // If we have cached data, return it even if it's old
            const cachedData = await getFromIndexedDB(this.cacheKey);
            if (cachedData?.services) {
                console.log('Using cached services data due to error');
                return cachedData.services;
            }
            
            throw error;
        }
    }

    /**
     * Get service by ID
     * @param {string} id - Service ID
     * @returns {Promise<Object|null>} Service or null if not found
     */
    async getById(id) {
        try {
            // Try to get from cache first
            const cachedData = await getFromIndexedDB(this.cacheKey);
            if (cachedData?.services) {
                const cachedService = cachedData.services.find(s => s.id === id);
                if (cachedService) {
                    return cachedService;
                }
            }

            // Fetch from Firebase
            const docRef = doc(db, this.collectionName, id);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                return {
                    id: docSnap.id,
                    ...docSnap.data()
                };
            }
            
            return null;
        } catch (error) {
            console.error(`Error getting service with ID ${id}:`, error);
            throw error;
        }
    }

    /**
     * Create new service
     * @param {Object} data - Service data
     * @returns {Promise<Object>} Created service with ID
     */
    async create(data) {
        try {
            // Add metadata
            const serviceData = {
                ...data,
                metadata: {
                    ...data.metadata,
                    created: new Date().toISOString(),
                    updated: new Date().toISOString()
                }
            };

            // Add to Firebase
            const docRef = await addDoc(this.collection, serviceData);
            
            // Clear cache
            await saveToIndexedDB(this.cacheKey, null);
            
            return {
                id: docRef.id,
                ...serviceData
            };
        } catch (error) {
            console.error('Error creating service:', error);
            throw error;
        }
    }

    /**
     * Update existing service
     * @param {string} id - Service ID
     * @param {Object} data - Updated service data
     * @returns {Promise<Object>} Updated service
     */
    async update(id, data) {
        try {
            // Add updated timestamp
            const serviceData = {
                ...data,
                metadata: {
                    ...data.metadata,
                    updated: new Date().toISOString()
                }
            };

            // Update in Firebase
            const docRef = doc(db, this.collectionName, id);
            await updateDoc(docRef, serviceData);
            
            // Clear cache
            await saveToIndexedDB(this.cacheKey, null);
            
            return {
                id,
                ...serviceData
            };
        } catch (error) {
            console.error(`Error updating service with ID ${id}:`, error);
            throw error;
        }
    }

    /**
     * Delete service
     * @param {string} id - Service ID
     * @returns {Promise<boolean>} Success status
     */
    async delete(id) {
        try {
            // Delete from Firebase
            const docRef = doc(db, this.collectionName, id);
            await deleteDoc(docRef);
            
            // Clear cache
            await saveToIndexedDB(this.cacheKey, null);
            
            return true;
        } catch (error) {
            console.error(`Error deleting service with ID ${id}:`, error);
            throw error;
        }
    }

    /**
     * Get services by category
     * @param {string} categoryId - Category ID
     * @returns {Promise<Array>} Array of services
     */
    async getByCategory(categoryId) {
        try {
            // Try to get from cache first
            const cachedData = await getFromIndexedDB(this.cacheKey);
            if (cachedData?.services) {
                return cachedData.services.filter(s => 
                    s.category === categoryId || s.categoryId === categoryId
                );
            }

            // Fetch from Firebase
            const q = query(
                this.collection,
                where('category', '==', categoryId)
            );
            
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error(`Error getting services for category ${categoryId}:`, error);
            throw error;
        }
    }

    /**
     * Get services by interest area
     * @param {string} interestAreaId - Interest area ID
     * @returns {Promise<Array>} Array of services
     */
    async getByInterestArea(interestAreaId) {
        try {
            // Try to get from cache first
            const cachedData = await getFromIndexedDB(this.cacheKey);
            if (cachedData?.services) {
                return cachedData.services.filter(s => 
                    s.interestAreas && 
                    (Array.isArray(s.interestAreas) ? 
                        s.interestAreas.includes(interestAreaId) : 
                        s.interestAreas === interestAreaId)
                );
            }

            // This is complex to query directly in Firestore
            // so we'll get all services and filter in memory
            const services = await this.getAll();
            return services.filter(s => 
                s.interestAreas && 
                (Array.isArray(s.interestAreas) ? 
                    s.interestAreas.includes(interestAreaId) : 
                    s.interestAreas === interestAreaId)
            );
        } catch (error) {
            console.error(`Error getting services for interest area ${interestAreaId}:`, error);
            throw error;
        }
    }

    /**
     * Search services by text
     * @param {string} query - Search query
     * @returns {Promise<Array>} Array of matching services
     */
    async search(query) {
        if (!query || query.trim() === '') {
            return this.getAll();
        }

        try {
            // This needs to be done client-side since Firestore
            // doesn't support full-text search
            const services = await this.getAll();
            const lowerQuery = query.toLowerCase().trim();
            
            return services.filter(service => {
                // Search in name
                if (service.name && service.name.toLowerCase().includes(lowerQuery)) {
                    return true;
                }
                
                // Search in description
                if (service.description && service.description.toLowerCase().includes(lowerQuery)) {
                    return true;
                }
                
                // Search in tags/interest areas
                if (service.tags && Array.isArray(service.tags)) {
                    for (const tag of service.tags) {
                        if (typeof tag === 'string' && tag.toLowerCase().includes(lowerQuery)) {
                            return true;
                        }
                        if (typeof tag === 'object' && tag.name && tag.name.toLowerCase().includes(lowerQuery)) {
                            return true;
                        }
                    }
                }
                
                if (service.interestAreas && Array.isArray(service.interestAreas)) {
                    for (const area of service.interestAreas) {
                        if (typeof area === 'string' && area.toLowerCase().includes(lowerQuery)) {
                            return true;
                        }
                        if (typeof area === 'object' && area.name && area.name.toLowerCase().includes(lowerQuery)) {
                            return true;
                        }
                    }
                }
                
                return false;
            });
        } catch (error) {
            console.error(`Error searching services for "${query}":`, error);
            throw error;
        }
    }

    /**
     * Check if service has been updated since timestamp
     * @param {string} id - Service ID
     * @param {string|Date} timestamp - Timestamp to compare against
     * @returns {Promise<boolean>} True if service has been updated
     */
    async checkVersion(id, timestamp) {
        try {
            const service = await this.getById(id);
            if (!service) {
                return false;
            }
            
            if (!service.metadata || !service.metadata.updated) {
                return true; // No metadata, assume it needs update
            }
            
            const lastUpdated = new Date(service.metadata.updated);
            const compareTime = timestamp instanceof Date ? timestamp : new Date(timestamp);
            
            return lastUpdated > compareTime;
        } catch (error) {
            console.error(`Error checking version for service ${id}:`, error);
            return true; // Assume it needs update on error
        }
    }
} 