import { db } from '../config/firebase.js';
import { 
    collection,
    doc,
    getDoc,
    getDocs,
    updateDoc,
    query,
    where,
    orderBy,
    limit,
    startAfter,
    serverTimestamp
} from 'firebase/firestore';
import { adminAuth } from './AdminAuth.js';

export class RatingsAdmin {
    constructor() {
        this.RATINGS_PER_PAGE = 20;
    }

    async getRatings({ 
        status = 'all',
        page = 1,
        lastDoc = null,
        searchTerm = '',
        dateFrom = null,
        dateTo = null
    } = {}) {
        try {
            // Check permissions
            if (!await adminAuth.checkPermission('ratings:read')) {
                throw new Error('אין הרשאת צפייה בדירוגים');
            }

            // Build query
            let q = collection(db, 'ratings');
            
            // Add filters
            if (status !== 'all') {
                q = query(q, where('moderation.status', '==', status));
            }
            
            if (dateFrom) {
                q = query(q, where('timestamp', '>=', dateFrom));
            }
            
            if (dateTo) {
                q = query(q, where('timestamp', '<=', dateTo));
            }
            
            // Add ordering
            q = query(q, orderBy('timestamp', 'desc'));
            
            // Add pagination
            if (lastDoc) {
                q = query(q, startAfter(lastDoc));
            }
            q = query(q, limit(this.RATINGS_PER_PAGE));

            // Get documents
            const snapshot = await getDocs(q);
            
            // Transform data
            const ratings = [];
            snapshot.forEach(doc => {
                ratings.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            // If search term provided, filter in memory
            // Note: In a real app, you might want to use Algolia or similar for better search
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                return ratings.filter(rating => 
                    rating.text?.toLowerCase().includes(term) ||
                    rating.serviceId?.toLowerCase().includes(term)
                );
            }

            return {
                ratings,
                lastDoc: snapshot.docs[snapshot.docs.length - 1],
                hasMore: ratings.length === this.RATINGS_PER_PAGE
            };

        } catch (error) {
            console.error('Failed to fetch ratings:', error);
            throw new Error('שגיאה בטעינת דירוגים');
        }
    }

    async removeRating(ratingId, reason) {
        try {
            // Check permissions
            if (!await adminAuth.checkPermission('ratings:remove')) {
                throw new Error('אין הרשאת מחיקת דירוגים');
            }

            const ratingRef = doc(db, 'ratings', ratingId);
            const ratingDoc = await getDoc(ratingRef);
            
            if (!ratingDoc.exists()) {
                throw new Error('דירוג לא נמצא');
            }

            // Update rating
            await updateDoc(ratingRef, {
                'moderation.status': 'rejected',
                'moderation.moderatedBy': adminAuth.currentAdmin.uid,
                'moderation.moderationDate': serverTimestamp(),
                'moderation.moderationReason': reason,
                'moderation.hidden': true
            });

            // Log action
            await adminAuth.logActivity(adminAuth.currentAdmin.uid, 'remove_rating', {
                ratingId,
                reason,
                timestamp: serverTimestamp()
            });

            // Update service stats
            await this.updateServiceStats(ratingDoc.data().serviceId);

        } catch (error) {
            console.error('Failed to remove rating:', error);
            throw new Error('שגיאה במחיקת דירוג');
        }
    }

    async approveRating(ratingId) {
        try {
            // Check permissions
            if (!await adminAuth.checkPermission('ratings:approve')) {
                throw new Error('אין הרשאת אישור דירוגים');
            }

            const ratingRef = doc(db, 'ratings', ratingId);
            const ratingDoc = await getDoc(ratingRef);
            
            if (!ratingDoc.exists()) {
                throw new Error('דירוג לא נמצא');
            }

            // Update rating
            await updateDoc(ratingRef, {
                'moderation.status': 'approved',
                'moderation.moderatedBy': adminAuth.currentAdmin.uid,
                'moderation.moderationDate': serverTimestamp(),
                'moderation.hidden': false
            });

            // Log action
            await adminAuth.logActivity(adminAuth.currentAdmin.uid, 'approve_rating', {
                ratingId,
                timestamp: serverTimestamp()
            });

            // Update service stats
            await this.updateServiceStats(ratingDoc.data().serviceId);

        } catch (error) {
            console.error('Failed to approve rating:', error);
            throw new Error('שגיאה באישור דירוג');
        }
    }

    async updateServiceStats(serviceId) {
        try {
            const ratingsQuery = query(
                collection(db, 'ratings'),
                where('serviceId', '==', serviceId),
                where('moderation.status', '==', 'approved')
            );

            const snapshot = await getDocs(ratingsQuery);
            
            let totalRating = 0;
            let count = 0;
            const categoryTotals = {};
            
            snapshot.forEach(doc => {
                const rating = doc.data();
                totalRating += rating.overall;
                count++;
                
                // Calculate category averages
                Object.entries(rating.categories || {}).forEach(([category, value]) => {
                    categoryTotals[category] = categoryTotals[category] || { total: 0, count: 0 };
                    categoryTotals[category].total += value;
                    categoryTotals[category].count++;
                });
            });

            const averageRating = count > 0 ? totalRating / count : 0;
            const categoryAverages = {};
            
            Object.entries(categoryTotals).forEach(([category, { total, count }]) => {
                categoryAverages[category] = count > 0 ? total / count : 0;
            });

            // Update service document
            const serviceRef = doc(db, 'services', serviceId);
            await updateDoc(serviceRef, {
                'ratings.average': averageRating,
                'ratings.count': count,
                'ratings.categoryAverages': categoryAverages,
                'ratings.lastUpdated': serverTimestamp()
            });

        } catch (error) {
            console.error('Failed to update service stats:', error);
            throw new Error('שגיאה בעדכון סטטיסטיקות השירות');
        }
    }
}

// Export singleton instance
export const ratingsAdmin = new RatingsAdmin(); 