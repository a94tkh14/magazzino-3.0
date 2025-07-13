import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://your-project-url.supabase.co'
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'your-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Funzioni per il magazzino
export const saveMagazzino = async (data) => {
  try {
    const { data: result, error } = await supabase
      .from('magazzino')
      .upsert(data, { onConflict: 'sku' })
    
    if (error) throw error
    console.log('Magazzino salvato:', result)
    return result
  } catch (error) {
    console.error('Errore nel salvare magazzino:', error)
    throw error
  }
}

export const loadMagazzino = async () => {
  try {
    const { data, error } = await supabase
      .from('magazzino')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    console.log('Magazzino caricato:', data)
    return data || []
  } catch (error) {
    console.error('Errore nel caricare magazzino:', error)
    return []
  }
}

// Funzioni per lo stock
export const saveStock = async (data) => {
  try {
    const { data: result, error } = await supabase
      .from('stock')
      .upsert(data, { onConflict: 'sku' })
    
    if (error) throw error
    console.log('Stock salvato:', result)
    return result
  } catch (error) {
    console.error('Errore nel salvare stock:', error)
    throw error
  }
}

export const loadStock = async () => {
  try {
    const { data, error } = await supabase
      .from('stock')
      .select('*')
      .order('data_aggiornamento', { ascending: false })
    
    if (error) throw error
    console.log('Stock caricato:', data)
    return data || []
  } catch (error) {
    console.error('Errore nel caricare stock:', error)
    return []
  }
}

// Funzioni per gli ordini
export const saveOrdine = async (data) => {
  try {
    const { data: result, error } = await supabase
      .from('ordini')
      .upsert(data, { onConflict: 'numero_ordine' })
    
    if (error) throw error
    console.log('Ordine salvato:', result)
    return result
  } catch (error) {
    console.error('Errore nel salvare ordine:', error)
    throw error
  }
}

export const loadOrdini = async () => {
  try {
    const { data, error } = await supabase
      .from('ordini')
      .select('*')
      .order('data_ordine', { ascending: false })
    
    if (error) throw error
    console.log('Ordini caricati:', data)
    return data || []
  } catch (error) {
    console.error('Errore nel caricare ordini:', error)
    return []
  }
}

// Funzioni per lo storico
export const saveStorico = async (data) => {
  try {
    const { data: result, error } = await supabase
      .from('storico')
      .insert(data)
    
    if (error) throw error
    console.log('Storico salvato:', result)
    return result
  } catch (error) {
    console.error('Errore nel salvare storico:', error)
    throw error
  }
}

export const loadStorico = async () => {
  try {
    const { data, error } = await supabase
      .from('storico')
      .select('*')
      .order('data', { ascending: false })
    
    if (error) throw error
    console.log('Storico caricato:', data)
    return data || []
  } catch (error) {
    console.error('Errore nel caricare storico:', error)
    return []
  }
}

// Funzioni per le impostazioni
export const saveSettings = async (data) => {
  try {
    const { data: result, error } = await supabase
      .from('settings')
      .upsert(data, { onConflict: 'id' })
    
    if (error) throw error
    console.log('Impostazioni salvate:', result)
    return result
  } catch (error) {
    console.error('Errore nel salvare impostazioni:', error)
    throw error
  }
}

export const loadSettings = async () => {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .single()
    
    if (error) throw error
    console.log('Impostazioni caricate:', data)
    return data || {}
  } catch (error) {
    console.error('Errore nel caricare impostazioni:', error)
    return {}
  }
}

// Funzioni per gli ordini fornitori
export const saveSupplierOrder = async (data) => {
  try {
    const { data: result, error } = await supabase
      .from('supplier_orders')
      .upsert(data, { onConflict: 'numero_ordine' })
    
    if (error) throw error
    console.log('Ordine fornitore salvato:', result)
    return result
  } catch (error) {
    console.error('Errore nel salvare ordine fornitore:', error)
    throw error
  }
}

export const loadSupplierOrders = async () => {
  try {
    const { data, error } = await supabase
      .from('supplier_orders')
      .select('*')
      .order('data_ordine', { ascending: false })
    
    if (error) throw error
    console.log('Ordini fornitori caricati:', data)
    return data || []
  } catch (error) {
    console.error('Errore nel caricare ordini fornitori:', error)
    return []
  }
}

// Funzioni di compatibilità per ordini normali
export const saveOrder = async (data) => {
  return saveOrdine(data);
}

export const loadOrders = async () => {
  return loadOrdini();
}

// Funzioni per gli ordini fornitori (compatibilità)
export const saveSupplierOrdersData = async (data) => {
  return saveSupplierOrder(data);
}

export const loadSupplierOrdersData = async () => {
  return loadSupplierOrders();
} 