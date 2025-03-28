import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';

// Load environment variables
dotenv.config();

// Load service account
const serviceAccount = JSON.parse(readFileSync('./serviceAccountKey.json'));

// Initialize Firebase Admin
const app = initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore(app);

async function createCollections() {
    try {
        // Create admins collection with initial admin
        const adminRef = db.doc('admins/gavrielgr@gmail.com');
        await adminRef.set({
            email: 'gavrielgr@gmail.com',
            name: 'Gavriel Greenfeld',
            role: 'admin',
            createdAt: new Date(),
            lastLogin: new Date()
        });

        // Create users collection (empty for now)
        const usersRef = db.collection('users');
        await usersRef.doc('initial').set({
            email: 'initial@example.com',
            name: 'Initial User',
            createdAt: new Date(),
            lastLogin: new Date()
        });
        console.log('Created users collection');

        // Create ratings collection (empty for now)
        const ratingsRef = db.collection('ratings');
        await ratingsRef.doc('initial').set({
            userId: 'initial',
            serviceId: 'initial',
            rating: 5,
            comment: 'Initial rating',
            status: 'pending',
            createdAt: new Date()
        });
        console.log('Created ratings collection');

        // Create categories collection with initial categories
        const categoriesRef = db.collection('categories');
        const categories = [
            { id: 'government', name: 'שירותים ממשלתיים', description: 'שירותים הניתנים על ידי הממשלה והרשויות המקומיות' },
            { id: 'elderly-care', name: 'שירותי טיפול בקשישים', description: 'שירותים המיועדים לטיפול בקשישים' },
            { id: 'health', name: 'שירותי בריאות', description: 'שירותים רפואיים וטיפוליים' },
            { id: 'social', name: 'שירותים חברתיים', description: 'שירותים חברתיים ותמיכה' },
            { id: 'legal', name: 'שירותים משפטיים', description: 'שירותים משפטיים וייעוץ' },
            { id: 'financial', name: 'שירותים פיננסיים', description: 'שירותים פיננסיים ועזרה כלכלית' },
            { id: 'education', name: 'שירותי חינוך', description: 'שירותי חינוך והכשרה' },
            { id: 'recreation', name: 'שירותי פנאי', description: 'שירותי פנאי ופעילויות' },
            { id: 'transportation', name: 'שירותי תחבורה', description: 'שירותי תחבורה והסעות' },
            { id: 'housing', name: 'שירותי דיור', description: 'שירותי דיור ודיור מוגן' },
            { id: 'food', name: 'שירותי מזון', description: 'שירותי מזון והסעדה' },
            { id: 'technology', name: 'שירותי טכנולוגיה', description: 'שירותי טכנולוגיה וסיוע דיגיטלי' },
            { id: 'religious', name: 'שירותים דתיים', description: 'שירותים דתיים ורוחניים' },
            { id: 'other', name: 'שירותים אחרים', description: 'שירותים נוספים שלא הוזכרו' }
        ];

        for (const category of categories) {
            await categoriesRef.doc(category.id).set({
                ...category,
                createdAt: new Date(),
                updatedAt: new Date()
            });
        }
        console.log('Created categories collection');

        // Create interest-areas collection with initial areas
        const interestAreasRef = db.collection('interest-areas');
        const interestAreas = [
            { id: 'health', name: 'בריאות', description: 'שירותים רפואיים וטיפוליים' },
            { id: 'social', name: 'חברתי', description: 'שירותים חברתיים ותמיכה' },
            { id: 'legal', name: 'משפטי', description: 'שירותים משפטיים וייעוץ' },
            { id: 'financial', name: 'פיננסי', description: 'שירותים פיננסיים ועזרה כלכלית' },
            { id: 'education', name: 'חינוך', description: 'שירותי חינוך והכשרה' },
            { id: 'recreation', name: 'פנאי', description: 'שירותי פנאי ופעילויות' },
            { id: 'transportation', name: 'תחבורה', description: 'שירותי תחבורה והסעות' },
            { id: 'housing', name: 'דיור', description: 'שירותי דיור ודיור מוגן' },
            { id: 'food', name: 'מזון', description: 'שירותי מזון והסעדה' },
            { id: 'technology', name: 'טכנולוגיה', description: 'שירותי טכנולוגיה וסיוע דיגיטלי' },
            { id: 'religious', name: 'דתי', description: 'שירותים דתיים ורוחניים' }
        ];

        for (const area of interestAreas) {
            await interestAreasRef.doc(area.id).set({
                ...area,
                createdAt: new Date(),
                updatedAt: new Date(),
                serviceCount: 0
            });
        }
        console.log('Created interest-areas collection');

        console.log('All collections created successfully');
    } catch (error) {
        console.error('Error creating collections:', error);
    }
}

createCollections(); 