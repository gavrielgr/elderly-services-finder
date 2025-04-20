// Test script for Firebase initialization and Firestore operations
// Run this with: node test-firebase.js

import { initializeFirebase } from './js/config/firebase.js';
import { collection, getDocs } from 'firebase/firestore';

async function testFirebase() {
  console.log('Starting Firebase initialization test...');
  
  try {
    // Test 1: Initialize Firebase
    console.log('Test 1: Initializing Firebase...');
    const { app, db, auth } = await initializeFirebase();
    
    if (!app) {
      throw new Error('Firebase app not initialized');
    }
    if (!db) {
      throw new Error('Firestore db not initialized');
    }
    
    console.log('✅ Test 1 Passed: Firebase initialized successfully');
    console.log('- Firebase app:', !!app);
    console.log('- Firestore db:', !!db);
    console.log('- Auth:', !!auth);
    
    // Test 2: Fetch data from Firestore
    console.log('\nTest 2: Fetching data from Firestore...');
    try {
      const categoriesRef = collection(db, 'categories');
      const querySnapshot = await getDocs(categoriesRef);
      
      console.log(`✅ Test 2 Passed: Successfully queried Firestore. Found ${querySnapshot.size} categories`);
      
      // Log a sample of the data
      if (querySnapshot.size > 0) {
        const firstDoc = querySnapshot.docs[0];
        console.log('Sample document data:', {
          id: firstDoc.id,
          ...firstDoc.data()
        });
      }
    } catch (error) {
      console.error('❌ Test 2 Failed: Error querying Firestore:', error);
      throw error;
    }
    
    console.log('\n✅ All tests passed! Firebase is working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testFirebase().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
}); 