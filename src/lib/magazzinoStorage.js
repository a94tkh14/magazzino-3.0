import { 
  saveMagazzino, 
  loadMagazzino, 
  saveStock,
  loadStock,
  saveStorico,
  loadStorico,
  saveSettings,
  loadSettings
} from './supabase';

// Funzioni per il magazzino
export const saveMagazzinoData = async (data) => {
  try {
    console.log('🔄 Salvando dati magazzino in Supabase...');
    const result = await saveMagazzino(data);
    console.log('✅ Dati magazzino salvati con successo');
    return { success: true, data: result };
  } catch (error) {
    console.error('❌ Errore nel salvare dati magazzino:', error);
    return { success: false, error: error.message };
  }
};

export const loadMagazzinoData = async () => {
  try {
    console.log('🔄 Caricando dati magazzino da Supabase...');
    const data = await loadMagazzino();
    console.log('✅ Dati magazzino caricati:', data);
    return data;
  } catch (error) {
    console.error('❌ Errore nel caricare dati magazzino:', error);
    return [];
  }
};

// Funzioni per lo stock
export const saveStockData = async (data) => {
  try {
    console.log('🔄 Salvando stock in Supabase...');
    const result = await saveStock(data);
    console.log('✅ Stock salvato con successo');
    return { success: true, data: result };
  } catch (error) {
    console.error('❌ Errore nel salvare stock:', error);
    return { success: false, error: error.message };
  }
};

export const loadStockData = async () => {
  try {
    console.log('🔄 Caricando stock da Supabase...');
    const data = await loadStock();
    console.log('✅ Stock caricato:', data);
    return data;
  } catch (error) {
    console.error('❌ Errore nel caricare stock:', error);
    return [];
  }
};

// Funzioni per lo storico
export const saveStoricoData = async (data) => {
  try {
    console.log('🔄 Salvando storico in Supabase...');
    const result = await saveStorico(data);
    console.log('✅ Storico salvato con successo');
    return { success: true, data: result };
  } catch (error) {
    console.error('❌ Errore nel salvare storico:', error);
    return { success: false, error: error.message };
  }
};

export const loadStoricoData = async () => {
  try {
    console.log('🔄 Caricando storico da Supabase...');
    const data = await loadStorico();
    console.log('✅ Storico caricato:', data);
    return data;
  } catch (error) {
    console.error('❌ Errore nel caricare storico:', error);
    return [];
  }
};

// Funzioni per le impostazioni
export const saveSettingsData = async (data) => {
  try {
    console.log('🔄 Salvando impostazioni in Supabase...');
    const result = await saveSettings(data);
    console.log('✅ Impostazioni salvate con successo');
    return { success: true, data: result };
  } catch (error) {
    console.error('❌ Errore nel salvare impostazioni:', error);
    return { success: false, error: error.message };
  }
};

export const loadSettingsData = async () => {
  try {
    console.log('🔄 Caricando impostazioni da Supabase...');
    const data = await loadSettings();
    console.log('✅ Impostazioni caricate:', data);
    return data;
  } catch (error) {
    console.error('❌ Errore nel caricare impostazioni:', error);
    return {};
  }
};

// Funzioni legacy per compatibilità (usano localStorage come fallback)
export const saveToLocalStorage = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    console.log(`✅ Dati salvati in localStorage: ${key}`);
  } catch (error) {
    console.error(`❌ Errore nel salvare in localStorage: ${key}`, error);
  }
};

export const loadFromLocalStorage = (key, defaultValue = null) => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch (error) {
    console.error(`❌ Errore nel caricare da localStorage: ${key}`, error);
    return defaultValue;
  }
}; 