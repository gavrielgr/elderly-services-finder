import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration
export const firebaseConfig = {
    apiKey: "AIzaSyCWZoPfS7MUse-SEhMNQZ16-05AXXIb3nE",
    authDomain: "elderly-service-finder.firebaseapp.com",
    projectId: "elderly-service-finder",
    storageBucket: "elderly-service-finder.firebasestorage.app",
    messagingSenderId: "254351747104",
    appId: "1:254351747104:web:e3d796425cd2eaf20af445"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app); 