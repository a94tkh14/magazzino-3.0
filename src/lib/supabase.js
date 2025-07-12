import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qaahhexewxybklonzxzho.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhaGhleGV3eHlia2xvbnp4emhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNTI3MTEsImV4cCI6MjA2NzkyODcxMX0.9OUryDbeDUSDR8MhcKbxST941SrQNHC696YdhIVtGg0';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Funzioni per il magazzino
export const saveMagazzinoData = async (data) => {
  try {
    console.log('🔄 Salvando dati in Supabase:', data);
    
    // Prima elimina tutti i dati esistenti
    const { error: deleteError } = await supabase
      .from('magazzino')
      .delete()
      .neq('id', 0); // Elimina tutti i record

    if (deleteError) {
      console.error('❌ Errore nell\'eliminare i dati:', deleteError);
      return { success: false, error: deleteError.message };
    }

    console.log('✅ Dati eliminati con successo');

    // Poi inserisce i nuovi dati
    const { data: insertedData, error: insertError } = await supabase
      .from('magazzino')
      .insert(data)
      .select();

    if (insertError) {
      console.error('❌ Errore nell\'inserire i dati:', insertError);
      return { success: false, error: insertError.message };
    }

    console.log('✅ Dati salvati con successo in Supabase:', insertedData);
    return { success: true, data: insertedData };
  } catch (error) {
    console.error('❌ Errore nel salvare i dati:', error);
    return { success: false, error: error.message };
  }
};

export const loadMagazzinoData = async () => {
  try {
    console.log('🔄 Caricando dati da Supabase...');
    
    const { data, error } = await supabase
      .from('magazzino')
      .select('*')
      .order('nome');

    if (error) {
      console.error('❌ Errore nel caricare i dati:', error);
      return [];
    }

    console.log('✅ Dati caricati da Supabase:', data);
    return data || [];
  } catch (error) {
    console.error('❌ Errore nel caricare i dati:', error);
    return [];
  }
};

// Funzioni per lo stock
export const saveStockData = async (data) => {
  try {
    // Prima elimina tutti i dati esistenti
    const { error: deleteError } = await supabase
      .from('stock')
      .delete()
      .neq('id', 0);

    if (deleteError) {
      console.error('Errore nell\'eliminare i dati stock:', deleteError);
      return { success: false, error: deleteError.message };
    }

    // Poi inserisce i nuovi dati
    const { data: insertedData, error: insertError } = await supabase
      .from('stock')
      .insert(data)
      .select();

    if (insertError) {
      console.error('Errore nell\'inserire i dati stock:', insertError);
      return { success: false, error: insertError.message };
    }

    return { success: true, data: insertedData };
  } catch (error) {
    console.error('Errore nel salvare i dati stock:', error);
    return { success: false, error: error.message };
  }
};

export const loadStockData = async () => {
  try {
    const { data, error } = await supabase
      .from('stock')
      .select('*')
      .order('data_aggiornamento', { ascending: false });

    if (error) {
      console.error('Errore nel caricare i dati stock:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Errore nel caricare i dati stock:', error);
    return [];
  }
};

// Funzioni per gli ordini
export const saveOrdersData = async (data) => {
  try {
    // Prima elimina tutti i dati esistenti
    const { error: deleteError } = await supabase
      .from('ordini')
      .delete()
      .neq('id', 0);

    if (deleteError) {
      console.error('Errore nell\'eliminare i dati ordini:', deleteError);
      return { success: false, error: deleteError.message };
    }

    // Poi inserisce i nuovi dati
    const { data: insertedData, error: insertError } = await supabase
      .from('ordini')
      .insert(data)
      .select();

    if (insertError) {
      console.error('Errore nell\'inserire i dati ordini:', insertError);
      return { success: false, error: insertError.message };
    }

    return { success: true, data: insertedData };
  } catch (error) {
    console.error('Errore nel salvare i dati ordini:', error);
    return { success: false, error: error.message };
  }
};

export const loadOrdersData = async () => {
  try {
    const { data, error } = await supabase
      .from('ordini')
      .select('*')
      .order('data_ordine', { ascending: false });

    if (error) {
      console.error('Errore nel caricare i dati ordini:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Errore nel caricare i dati ordini:', error);
    return [];
  }
};

// Funzione per salvare lo storico
export const saveStorico = async (sku, storicoData) => {
  try {
    const { data, error } = await supabase
      .from('storico')
      .insert({
        sku: sku,
        quantita: storicoData.quantita,
        prezzo: storicoData.prezzo,
        tipo: storicoData.tipo,
        data: storicoData.data
      })
      .select();

    if (error) {
      console.error('Errore nel salvare lo storico:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Errore nel salvare lo storico:', error);
    return { success: false, error: error.message };
  }
}; 