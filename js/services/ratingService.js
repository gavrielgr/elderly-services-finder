import { 
    collection, 
    doc,
    addDoc,
    getDoc,
    getDocs,
    query,
    where,
    orderBy,
    limit,
    updateDoc,
    deleteDoc,
    runTransaction,
    serverTimestamp 
} from 'firebase/firestore';
import { initializeFirebase } from '../config/firebase.js';
import { authService } from './authService.js';

class RatingService {
    constructor() {
        this.initialize();
    }
    
    async initialize() {
        try {
            const { db } = await initializeFirebase();
            this.db = db;
        } catch (error) {
            console.error('Failed to initialize RatingService:', error);
            throw error;
        }
    }
    
    async submitRating(serviceId, rating, comment, currentUser = null) {
        if (!serviceId || !rating) {
            throw new Error('Service ID and rating are required');
        }

        try {
            const { db } = await initializeFirebase();
            this.db = db;

            // Get current user if not provided
            const user = currentUser || authService.getCurrentUser();
            if (!user) {
                throw new Error('User must be logged in to submit a rating');
            }
            
            // Check if the user has already rated this service
            const existingRating = await this.getUserRating(serviceId, user);
            
            if (existingRating) {
                // Update existing rating
                await updateDoc(doc(this.db, 'ratings', existingRating.id), {
                    overall: rating,
                    text: comment || '',
                    updatedAt: serverTimestamp()
                });
                
                // Update service stats
                await this.updateServiceStats(serviceId);
                return existingRating.id;
            } else {
                // Create new rating
                const newRating = {
                    serviceId: serviceId,
                    userId: user.uid,
                    userName: user.name || user.email || 'Anonymous',
                    userPhotoURL: user.photoURL || null,
                    overall: rating,
                    text: comment || '',
                    timestamp: serverTimestamp(),
                    moderation: {
                        status: 'approved',
                        reviewedAt: null,
                        reviewedBy: null,
                        rejectionReason: null
                    }
                };
                
                const docRef = await addDoc(collection(this.db, 'ratings'), newRating);
                
                // Update service stats
                await this.updateServiceStats(serviceId);
                return docRef.id;
            }
        } catch (error) {
            console.error('Error submitting rating:', error);
            throw error;
        }
    }
    
    async getUserRating(serviceId, currentUser = null) {
        try {
            const { db } = await initializeFirebase();
            this.db = db;

            // Get current user if not provided
            const user = currentUser || authService.getCurrentUser();
            if (!user) {
                return null;
            }
            
            // Query for rating by this user for this service
            const ratingsQuery = query(
                collection(this.db, 'ratings'),
                where('serviceId', '==', serviceId),
                where('userId', '==', user.uid)
            );
            
            const snapshot = await getDocs(ratingsQuery);
            
            if (snapshot.empty) {
                return null;
            }
            
            // Return the first rating found
            const doc = snapshot.docs[0];
            return {
                id: doc.id,
                ...doc.data()
            };
        } catch (error) {
            console.error('Error getting user rating:', error);
            return null;
        }
    }
    
    async getServiceRatings(serviceId, maxResults = 10, page = 1) {
        if (!serviceId) {
            throw new Error('Service ID is required');
        }
        
        try {
            // Try using the server API endpoint with pagination
            const serverUrl = window.location.origin.replace('5173', '5001');
            const response = await fetch(`${serverUrl}/api/ratings/${serviceId}?limit=${maxResults}&page=${page}`);
            
            if (response.ok) {
                const data = await response.json();
                return data.ratings || [];
            } else {
                // As a fallback, try to get ratings directly from Firestore
                console.warn('Server API failed to retrieve ratings. Attempting direct Firestore access.');
                
                // Initialize Firebase and get db reference
                const { db } = await initializeFirebase();
                this.db = db;
                
                // Calculate pagination offsets
                const offset = (page - 1) * maxResults;
                
                // Query to get approved ratings for this service with pagination
                const ratingsQuery = query(
                    collection(this.db, 'ratings'),
                    where('serviceId', '==', serviceId),
                    where('moderation.status', '==', 'approved'),
                    orderBy('timestamp', 'desc'),
                    limit(maxResults)
                );
                
                // Get all ratings that match this query
                const snapshot = await getDocs(ratingsQuery);
                
                // Convert to array of rating objects
                const ratings = [];
                snapshot.forEach((doc) => {
                    ratings.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });
                
                return ratings;
            }
        } catch (error) {
            console.error('Error getting service ratings:', error);
            throw error; // Rethrow so the component can handle it
        }
    }
    
    async deleteRating(ratingId, currentUser = null) {
        if (!ratingId) {
            throw new Error('Rating ID is required');
        }
        
        try {
            const { db } = await initializeFirebase();
            this.db = db;
            
            // Get current user if not provided
            const user = currentUser || authService.getCurrentUser();
            if (!user) {
                throw new Error('User must be logged in to delete a rating');
            }
            
            // Get the rating document
            const ratingRef = doc(this.db, 'ratings', ratingId);
            const ratingDoc = await getDoc(ratingRef);
            
            if (!ratingDoc.exists()) {
                throw new Error('Rating not found');
            }
            
            const ratingData = ratingDoc.data();
            
            // Check permission: only the author or an admin can delete
            if (ratingData.userId !== user.uid && user.role !== 'admin') {
                throw new Error('Permission denied');
            }
            
            // Get service ID for updating stats later
            const serviceId = ratingData.serviceId;
            
            // Delete the rating
            await deleteDoc(ratingRef);
            
            // Update service stats
            await this.updateServiceStats(serviceId);
            
            return true;
        } catch (error) {
            console.error('Error deleting rating:', error);
            throw error;
        }
    }
    
    async updateServiceStats(serviceId) {
        if (!serviceId) {
            throw new Error('Service ID is required');
        }
        
        try {
            const { db } = await initializeFirebase();
            this.db = db;
            
            // Use a transaction to ensure we have atomic updates
            await runTransaction(this.db, async (transaction) => {
                // Get all approved ratings for this service
                const ratingsQuery = query(
                    collection(this.db, 'ratings'),
                    where('serviceId', '==', serviceId),
                    where('moderation.status', '==', 'approved')
                );
                
                const snapshot = await getDocs(ratingsQuery);
                
                // Calculate statistics
                let totalRating = 0;
                let count = 0;
                
                snapshot.forEach((doc) => {
                    const data = doc.data();
                    totalRating += data.overall;
                    count++;
                });
                
                const avgRating = count > 0 ? (totalRating / count) : 0;
                
                // Update the service document with correct field paths
                const serviceRef = doc(this.db, 'services', serviceId);
                transaction.update(serviceRef, {
                    'stats.averageRating': avgRating,
                    'stats.ratings': count,
                    // Also update the existing path for backward compatibility
                    'ratings.average': avgRating,
                    'ratings.count': count,
                    // Update timestamps for version checking
                    updatedAt: serverTimestamp(),
                    'metadata.updated': new Date().toISOString()
                });
            });
            
            return true;
        } catch (error) {
            console.error('Error updating service stats:', error);
            // Don't throw this error, as it's a background operation
            return false;
        }
    }
}

// Export singleton instance
export const ratingService = new RatingService(); 