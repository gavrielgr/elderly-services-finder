const admin = require('firebase-admin');
const serviceAccount = require('../js/config/firebase-admin-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function migrateCollections() {
  try {
    // Create users collection with initial admin user
    await db.collection('users').doc('initial-admin').set({
      email: 'gavrielgr@gmail.com',
      name: 'Gavriel Admin',
      role: 'admin',
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastLogin: null,
      metadata: {
        phoneNumber: '',
        address: '',
        dateOfBirth: null,
        preferences: {}
      }
    });
    console.log('Users collection created with initial admin');

    // Create categories collection
    await db.collection('categories').doc('initial-category').set({
      name: 'כללי',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('Categories collection created');

    // Create interest-areas collection
    await db.collection('interest-areas').doc('initial-area').set({
      name: 'תחום עניין ראשוני',
      description: 'תיאור בסיסי',
      servicesCount: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('Interest areas collection created');

    // Create ratings collection
    await db.collection('ratings').doc('initial-rating').set({
      serviceId: 'initial-service',
      userId: 'initial-user',
      rating: 5,
      comment: 'דירוג ראשוני',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('Ratings collection created');

    // Create services collection
    await db.collection('services').doc('initial-service').set({
      name: 'שירות ראשוני',
      description: 'תיאור השירות',
      categoryId: 'initial-category',
      contact: {
        phone: '',
        email: '',
        website: '',
        address: ''
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('Services collection created');

    // Create service-interest-areas collection
    await db.collection('service-interest-areas').doc('initial-link').set({
      serviceId: 'initial-service',
      interestAreaId: 'initial-area',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('Service-interest-areas collection created');

    console.log('All collections migrated successfully');
  } catch (error) {
    console.error('Error migrating collections:', error);
  }
}

migrateCollections(); 