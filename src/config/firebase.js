import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';

// Configurazione Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBN8-q0Oc0Pqh3-MAPYSEk7NpvF7SwJLLo",
  authDomain: "mvl-17245.firebaseapp.com",
  projectId: "mvl-17245",
  storageBucket: "mvl-17245.firebasestorage.app",
  messagingSenderId: "662162882736",
  appId: "1:662162882736:web:4248d324a9edee03a37b75",
  measurementId: "G-WFLXW48GPB"
};

// Inizializza Firebase
const app = initializeApp(firebaseConfig);

// Esporta i servizi
export const db = getFirestore(app);
export const auth = getAuth(app);
export const analytics = getAnalytics(app);

export default app; 