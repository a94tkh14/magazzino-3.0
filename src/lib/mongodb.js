// Re-export delle funzioni Supabase
export { 
  saveMagazzinoData, 
  loadMagazzinoData, 
  saveStockData, 
  loadStockData, 
  saveOrdersData, 
  loadOrdersData,
  saveStorico
} from './supabase.js';

// Funzione per inizializzare Supabase
export const initDatabase = async () => {
  console.log('Supabase configurato e pronto per l\'uso');
}; 