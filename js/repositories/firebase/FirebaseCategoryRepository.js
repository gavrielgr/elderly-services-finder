import { CategoryRepository } from '../interfaces/CategoryRepository.js';
import { collection, getDocs, getDoc, doc, addDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { db } from '../../config/firebase.js';
import { saveToIndexedDB, getFromIndexedDB } from '../../services/storageService.js';

/**
 * Firebase implementation of CategoryRepository
 */
export class FirebaseCategoryRepository extends CategoryRepository {
    constructor() {
        super();
        this.collectionName = 'categories';
        this.collection = collection(db, this.collectionName);
        this.cacheKey = 'categories-cache';
    }

    /**
     * Get all categories
     * @returns {Promise<Array>} Array of categories
     */
    async getAll() {
        try {
            // Try to get from cache first
            const cachedData = await getFromIndexedDB(this.cacheKey);
            if (cachedData?.categories && cachedData.timestamp) {
                const now = new Date();
                const cacheTime = new Date(cachedData.timestamp);
                const hoursSinceCache = (now - cacheTime) / (1000 * 60 * 60);
                
                // If cache is less than 24 hours old, use it
                if (hoursSinceCache < 24) {
                    console.log('Using cached categories data');
                    return cachedData.categories;
                }
            }

            // Fetch from Firebase
            const snapshot = await getDocs(this.collection);
            const categories = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Save to cache
            await saveToIndexedDB(this.cacheKey, {
                categories,
                timestamp: new Date().toISOString()
            });

            return categories;
        } catch (error) {
            console.error('Error getting categories:', error);
            
            // If we have cached data, return it even if it's old
            const cachedData = await getFromIndexedDB(this.cacheKey);
            if (cachedData?.categories) {
                console.log('Using cached categories data due to error');
                return cachedData.categories;
            }
            
            throw error;
        }
    }

    /**
     * Get category by ID
     * @param {string} id - Category ID
     * @returns {Promise<Object|null>} Category or null if not found
     */
    async getById(id) {
        try {
            // Try to get from cache first
            const cachedData = await getFromIndexedDB(this.cacheKey);
            if (cachedData?.categories) {
                const cachedCategory = cachedData.categories.find(c => c.id === id);
                if (cachedCategory) {
                    return cachedCategory;
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
            console.error(`Error getting category with ID ${id}:`, error);
            throw error;
        }
    }

    /**
     * Create new category
     * @param {Object} data - Category data
     * @returns {Promise<Object>} Created category with ID
     */
    async create(data) {
        try {
            // Add metadata
            const categoryData = {
                ...data,
                metadata: {
                    ...data.metadata,
                    created: new Date().toISOString(),
                    updated: new Date().toISOString()
                }
            };

            // Add to Firebase
            const docRef = await addDoc(this.collection, categoryData);
            
            // Clear cache
            await saveToIndexedDB(this.cacheKey, null);
            
            return {
                id: docRef.id,
                ...categoryData
            };
        } catch (error) {
            console.error('Error creating category:', error);
            throw error;
        }
    }

    /**
     * Update existing category
     * @param {string} id - Category ID
     * @param {Object} data - Updated category data
     * @returns {Promise<Object>} Updated category
     */
    async update(id, data) {
        try {
            // Add updated timestamp
            const categoryData = {
                ...data,
                metadata: {
                    ...data.metadata,
                    updated: new Date().toISOString()
                }
            };

            // Update in Firebase
            const docRef = doc(db, this.collectionName, id);
            await updateDoc(docRef, categoryData);
            
            // Clear cache
            await saveToIndexedDB(this.cacheKey, null);
            
            return {
                id,
                ...categoryData
            };
        } catch (error) {
            console.error(`Error updating category with ID ${id}:`, error);
            throw error;
        }
    }

    /**
     * Delete category
     * @param {string} id - Category ID
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
            console.error(`Error deleting category with ID ${id}:`, error);
            throw error;
        }
    }

    /**
     * Get categories with service count
     * @returns {Promise<Array>} Array of categories with service count
     */
    async getCategoriesWithCounts() {
        try {
            // Get all categories first
            const categories = await this.getAll();
            
            // Get all services (ideally this would be a more efficient query)
            const servicesCollection = collection(db, 'services');
            const servicesSnapshot = await getDocs(servicesCollection);
            const services = servicesSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            // Count services per category
            const categoryCounts = {};
            services.forEach(service => {
                const categoryId = service.category || service.categoryId;
                if (categoryId) {
                    categoryCounts[categoryId] = (categoryCounts[categoryId] || 0) + 1;
                }
            });
            
            // Add counts to categories
            return categories.map(category => ({
                ...category,
                serviceCount: categoryCounts[category.id] || 0
            }));
        } catch (error) {
            console.error('Error getting categories with counts:', error);
            throw error;
        }
    }
} 