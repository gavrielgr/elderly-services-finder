import { collection, getDocs, doc, getDoc, updateDoc, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase.js';

export async function loadRatings(tableBody) {
    try {
        console.log('Loading ratings...');
        const q = query(collection(db, 'ratings'), where('status', '==', 'pending'));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            tableBody.innerHTML = '<tr><td colspan="6">אין דירוגים ממתינים</td></tr>';
            return;
        }

        const rows = [];
        for (const doc of snapshot.docs) {
            const rating = doc.data();
            
            // Try to find the service by ID first
            let serviceName = 'לא נמצא';
            if (rating.serviceId) {
                const serviceDoc = await getDoc(doc(db, 'services', rating.serviceId));
                if (serviceDoc.exists()) {
                    serviceName = serviceDoc.data().name;
                }
            } else if (rating.serviceName) {
                // If no ID, try to find by name
                const servicesSnapshot = await getDocs(
                    query(collection(db, 'services'), where('name', '==', rating.serviceName))
                );
                if (!servicesSnapshot.empty) {
                    serviceName = rating.serviceName;
                }
            }

            rows.push(`
                <tr>
                    <td>${serviceName}</td>
                    <td>${rating.rating}/5</td>
                    <td>${rating.comment || ''}</td>
                    <td>${rating.userName || 'אנונימי'}</td>
                    <td>${rating.timestamp ? new Date(rating.timestamp.seconds * 1000).toLocaleDateString('he-IL') : ''}</td>
                    <td>
                        <button class="edit-btn" onclick="approveRating('${doc.id}')">אשר</button>
                        <button class="delete-btn" onclick="showRejectModal('${doc.id}')">דחה</button>
                    </td>
                </tr>
            `);
        }

        tableBody.innerHTML = rows.join('');
    } catch (error) {
        console.error('Error loading ratings:', error);
        throw error;
    }
}

export async function approveRating(id) {
    try {
        const ratingRef = doc(db, 'ratings', id);
        await updateDoc(ratingRef, {
            status: 'approved',
            approvedAt: Timestamp.now()
        });
    } catch (error) {
        console.error('Error approving rating:', error);
        throw error;
    }
}

export async function rejectRating(id, reason) {
    try {
        const ratingRef = doc(db, 'ratings', id);
        await updateDoc(ratingRef, {
            status: 'rejected',
            rejectedAt: Timestamp.now(),
            rejectionReason: reason
        });
    } catch (error) {
        console.error('Error rejecting rating:', error);
        throw error;
    }
} 