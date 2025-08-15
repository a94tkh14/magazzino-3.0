import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc, 
  query, 
  where, 
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase';

// Funzioni per il magazzino
export const saveMagazzino = async (magazzinoData) => {
  try {
    console.log('🔄 Salvando dati magazzino in Firebase...');
    
    // Se esiste già un documento, lo aggiorna
    if (magazzinoData.id) {
      const docRef = doc(db, 'magazzino', magazzinoData.id);
      await updateDoc(docRef, {
        ...magazzinoData,
        updatedAt: serverTimestamp()
      });
      return { success: true, id: magazzinoData.id };
    } else {
      // Crea un nuovo documento
      const docRef = await addDoc(collection(db, 'magazzino'), {
        ...magazzinoData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { success: true, id: docRef.id };
    }
  } catch (error) {
    console.error('❌ Errore nel salvataggio magazzino:', error);
    return { success: false, error: error.message };
  }
};

export const loadMagazzino = async () => {
  try {
    console.log('🔄 Caricando dati magazzino da Firebase...');
    
    const querySnapshot = await getDocs(collection(db, 'magazzino'));
    const magazzinoData = [];
    
    querySnapshot.forEach((doc) => {
      magazzinoData.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return { success: true, data: magazzinoData };
  } catch (error) {
    console.error('❌ Errore nel caricamento magazzino:', error);
    return { success: false, error: error.message };
  }
};

// Funzioni per lo stock
export const saveStock = async (stockData) => {
  try {
    console.log('🔄 Salvando stock in Firebase...');
    
    if (stockData.id) {
      const docRef = doc(db, 'stock', stockData.id);
      await updateDoc(docRef, {
        ...stockData,
        updatedAt: serverTimestamp()
      });
      return { success: true, id: stockData.id };
    } else {
      const docRef = await addDoc(collection(db, 'stock'), {
        ...stockData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { success: true, id: docRef.id };
    }
  } catch (error) {
    console.error('❌ Errore nel salvataggio stock:', error);
    return { success: false, error: error.message };
  }
};

export const loadStock = async () => {
  try {
    console.log('🔄 Caricando stock da Firebase...');
    
    const querySnapshot = await getDocs(collection(db, 'stock'));
    const stockData = [];
    
    querySnapshot.forEach((doc) => {
      stockData.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return { success: true, data: stockData };
  } catch (error) {
    console.error('❌ Errore nel caricamento stock:', error);
    return { success: false, error: error.message };
  }
};

// Funzioni per gli ordini
export const saveOrder = async (orderData) => {
  try {
    console.log('🔄 Salvando ordine in Firebase...');
    
    if (orderData.id) {
      const docRef = doc(db, 'orders', orderData.id);
      await updateDoc(docRef, {
        ...orderData,
        updatedAt: serverTimestamp()
      });
      return { success: true, id: orderData.id };
    } else {
      const docRef = await addDoc(collection(db, 'orders'), {
        ...orderData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { success: true, id: docRef.id };
    }
  } catch (error) {
    console.error('❌ Errore nel salvataggio ordine:', error);
    return { success: false, error: error.message };
  }
};

export const loadOrders = async () => {
  try {
    console.log('🔄 Caricando ordini da Firebase...');
    
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    const ordersData = [];
    
    querySnapshot.forEach((doc) => {
      ordersData.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return { success: true, data: ordersData };
  } catch (error) {
    console.error('❌ Errore nel caricamento ordini:', error);
    return { success: false, error: error.message };
  }
};

// Funzioni per i costi
export const saveCost = async (costData) => {
  try {
    console.log('🔄 Salvando costo in Firebase...');
    
    if (costData.id) {
      const docRef = doc(db, 'costs', costData.id);
      await updateDoc(docRef, {
        ...costData,
        updatedAt: serverTimestamp()
      });
      return { success: true, id: costData.id };
    } else {
      const docRef = await addDoc(collection(db, 'costs'), {
        ...costData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { success: true, id: docRef.id };
    }
  } catch (error) {
    console.error('❌ Errore nel salvataggio costo:', error);
    return { success: false, error: error.message };
  }
};

export const loadCosts = async () => {
  try {
    console.log('🔄 Caricando costi da Firebase...');
    
    const q = query(collection(db, 'costs'), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    const costsData = [];
    
    querySnapshot.forEach((doc) => {
      costsData.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return { success: true, data: costsData };
  } catch (error) {
    console.error('❌ Errore nel caricamento costi:', error);
    return { success: false, error: error.message };
  }
};

// Funzioni per le impostazioni
export const saveSettings = async (settingsData) => {
  try {
    console.log('🔄 Salvando impostazioni in Firebase...');
    
    // Le impostazioni sono un documento singolo
    const docRef = doc(db, 'settings', 'app-settings');
    await updateDoc(docRef, {
      ...settingsData,
      updatedAt: serverTimestamp()
    });
    
    return { success: true };
  } catch (error) {
    // Se il documento non esiste, lo crea
    try {
      await addDoc(collection(db, 'settings'), {
        id: 'app-settings',
        ...settingsData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (createError) {
      console.error('❌ Errore nella creazione impostazioni:', createError);
      return { success: false, error: createError.message };
    }
  }
};

export const loadSettings = async () => {
  try {
    console.log('🔄 Caricando impostazioni da Firebase...');
    
    const docRef = doc(db, 'settings', 'app-settings');
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { success: true, data: docSnap.data() };
    } else {
      return { success: true, data: {} };
    }
  } catch (error) {
    console.error('❌ Errore nel caricamento impostazioni:', error);
    return { success: true, data: {} };
  }
};

// Funzione per salvare ordini fornitori
export const saveSupplierOrder = async (orderData) => {
  try {
    console.log('🔄 Salvando ordine fornitore in Firebase...');
    
    if (orderData.id) {
      const docRef = doc(db, 'supplier-orders', orderData.id);
      await updateDoc(docRef, {
        ...orderData,
        updatedAt: serverTimestamp()
      });
      return { success: true, id: orderData.id };
    } else {
      const docRef = await addDoc(collection(db, 'supplier-orders'), {
        ...orderData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { success: true, id: docRef.id };
    }
  } catch (error) {
    console.error('❌ Errore nel salvataggio ordine fornitore:', error);
    return { success: false, error: error.message };
  }
};

// Funzione per caricare ordini
export const loadOrdini = async () => {
  try {
    console.log('🔄 Caricando ordini da Firebase...');
    
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    const ordersData = [];
    
    querySnapshot.forEach((doc) => {
      ordersData.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return { success: true, data: ordersData };
  } catch (error) {
    console.error('❌ Errore nel caricamento ordini:', error);
    return { success: true, data: [] };
  }
};

// Funzione per caricare storico
export const loadStorico = async () => {
  try {
    console.log('🔄 Caricando storico da Firebase...');
    
    const querySnapshot = await getDocs(collection(db, 'storico'));
    const storicoData = [];
    
    querySnapshot.forEach((doc) => {
      storicoData.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return { success: true, data: storicoData };
  } catch (error) {
    console.error('❌ Errore nel caricamento storico:', error);
    return { success: true, data: [] };
  }
};

// Funzione per caricare ordini fornitori
export const loadSupplierOrders = async () => {
  try {
    console.log('🔄 Caricando ordini fornitori da Firebase...');
    
    const q = query(collection(db, 'supplier-orders'), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    const supplierOrdersData = [];
    
    querySnapshot.forEach((doc) => {
      supplierOrdersData.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return { success: true, data: supplierOrdersData };
  } catch (error) {
    console.error('❌ Errore nel caricamento ordini fornitori:', error);
    return { success: true, data: [] };
  }
};

// Funzione per salvare storico
export const saveStorico = async (storicoData) => {
  try {
    console.log('🔄 Salvando storico in Firebase...');
    
    if (storicoData.id) {
      const docRef = doc(db, 'storico', storicoData.id);
      await updateDoc(docRef, {
        ...storicoData,
        updatedAt: serverTimestamp()
      });
      return { success: true, id: storicoData.id };
    } else {
      const docRef = await addDoc(collection(db, 'storico'), {
        ...storicoData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { success: true, id: docRef.id };
    }
  } catch (error) {
    console.error('❌ Errore nel salvataggio storico:', error);
    return { success: false, error: error.message };
  }
}; 