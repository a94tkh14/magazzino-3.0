import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY

// Verifica che le variabili d'ambiente siano impostate
if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'https://your-project.supabase.co' || supabaseAnonKey === 'your-anon-key') {
  console.warn('⚠️ Variabili d\'ambiente Supabase non configurate correttamente!')
  console.warn('Configura REACT_APP_SUPABASE_URL e REACT_APP_SUPABASE_ANON_KEY nel file .env')
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder-key'
)

// Funzioni per il magazzino
export const saveMagazzino = async (data) => {
  try {
    // Fallback a localStorage se Supabase non è configurato
    if (!supabaseUrl || supabaseUrl === 'https://your-project.supabase.co') {
      console.log('Usando localStorage come fallback per magazzino')
      localStorage.setItem('magazzino', JSON.stringify(data))
      return data
    }

    const { data: result, error } = await supabase
      .from('magazzino')
      .upsert(data, { onConflict: 'sku' })
    
    if (error) throw error
    console.log('Magazzino salvato:', result)
    return result
  } catch (error) {
    console.error('Errore nel salvare magazzino:', error)
    // Fallback a localStorage
    localStorage.setItem('magazzino', JSON.stringify(data))
    return data
  }
}

export const loadMagazzino = async () => {
  try {
    // Fallback a localStorage se Supabase non è configurato
    if (!supabaseUrl || supabaseUrl === 'https://your-project.supabase.co') {
      console.log('Usando localStorage come fallback per magazzino')
      const data = localStorage.getItem('magazzino')
      return data ? JSON.parse(data) : []
    }

    const { data, error } = await supabase
      .from('magazzino')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    console.log('Magazzino caricato:', data)
    return data || []
  } catch (error) {
    console.error('Errore nel caricare magazzino:', error)
    // Fallback a localStorage
    const data = localStorage.getItem('magazzino')
    return data ? JSON.parse(data) : []
  }
}

// Funzioni per lo stock
export const saveStock = async (data) => {
  try {
    // Fallback a localStorage se Supabase non è configurato
    if (!supabaseUrl || supabaseUrl === 'https://your-project.supabase.co') {
      console.log('Usando localStorage come fallback per stock')
      localStorage.setItem('stock', JSON.stringify(data))
      return data
    }

    const { data: result, error } = await supabase
      .from('stock')
      .upsert(data, { onConflict: 'sku' })
    
    if (error) throw error
    console.log('Stock salvato:', result)
    return result
  } catch (error) {
    console.error('Errore nel salvare stock:', error)
    // Fallback a localStorage
    localStorage.setItem('stock', JSON.stringify(data))
    return data
  }
}

export const loadStock = async () => {
  try {
    // Fallback a localStorage se Supabase non è configurato
    if (!supabaseUrl || supabaseUrl === 'https://your-project.supabase.co') {
      console.log('Usando localStorage come fallback per stock')
      const data = localStorage.getItem('stock')
      return data ? JSON.parse(data) : []
    }

    const { data, error } = await supabase
      .from('stock')
      .select('*')
      .order('data_aggiornamento', { ascending: false })
    
    if (error) throw error
    console.log('Stock caricato:', data)
    return data || []
  } catch (error) {
    console.error('Errore nel caricare stock:', error)
    // Fallback a localStorage
    const data = localStorage.getItem('stock')
    return data ? JSON.parse(data) : []
  }
}

// Funzioni per gli ordini
export const saveOrdine = async (data) => {
  try {
    // Fallback a localStorage se Supabase non è configurato
    if (!supabaseUrl || supabaseUrl === 'https://your-project.supabase.co') {
      console.log('Usando localStorage come fallback per ordini')
      const ordini = JSON.parse(localStorage.getItem('ordini') || '[]')
      const index = ordini.findIndex(o => o.numero_ordine === data.numero_ordine)
      if (index >= 0) {
        ordini[index] = data
      } else {
        ordini.push(data)
      }
      localStorage.setItem('ordini', JSON.stringify(ordini))
      return data
    }

    const { data: result, error } = await supabase
      .from('ordini')
      .upsert(data, { onConflict: 'numero_ordine' })
    
    if (error) throw error
    console.log('Ordine salvato:', result)
    return result
  } catch (error) {
    console.error('Errore nel salvare ordine:', error)
    // Fallback a localStorage
    const ordini = JSON.parse(localStorage.getItem('ordini') || '[]')
    const index = ordini.findIndex(o => o.numero_ordine === data.numero_ordine)
    if (index >= 0) {
      ordini[index] = data
    } else {
      ordini.push(data)
    }
    localStorage.setItem('ordini', JSON.stringify(ordini))
    return data
  }
}

export const loadOrdini = async () => {
  try {
    // Fallback a localStorage se Supabase non è configurato
    if (!supabaseUrl || supabaseUrl === 'https://your-project.supabase.co') {
      console.log('Usando localStorage come fallback per ordini')
      const data = localStorage.getItem('ordini')
      return data ? JSON.parse(data) : []
    }

    const { data, error } = await supabase
      .from('ordini')
      .select('*')
      .order('data_ordine', { ascending: false })
    
    if (error) throw error
    console.log('Ordini caricati:', data)
    return data || []
  } catch (error) {
    console.error('Errore nel caricare ordini:', error)
    // Fallback a localStorage
    const data = localStorage.getItem('ordini')
    return data ? JSON.parse(data) : []
  }
}

// Funzioni per lo storico
export const saveStorico = async (data) => {
  try {
    // Fallback a localStorage se Supabase non è configurato
    if (!supabaseUrl || supabaseUrl === 'https://your-project.supabase.co') {
      console.log('Usando localStorage come fallback per storico')
      const storico = JSON.parse(localStorage.getItem('storico') || '[]')
      storico.push(data)
      localStorage.setItem('storico', JSON.stringify(storico))
      return data
    }

    const { data: result, error } = await supabase
      .from('storico')
      .insert(data)
    
    if (error) throw error
    console.log('Storico salvato:', result)
    return result
  } catch (error) {
    console.error('Errore nel salvare storico:', error)
    // Fallback a localStorage
    const storico = JSON.parse(localStorage.getItem('storico') || '[]')
    storico.push(data)
    localStorage.setItem('storico', JSON.stringify(storico))
    return data
  }
}

export const loadStorico = async () => {
  try {
    // Fallback a localStorage se Supabase non è configurato
    if (!supabaseUrl || supabaseUrl === 'https://your-project.supabase.co') {
      console.log('Usando localStorage come fallback per storico')
      const data = localStorage.getItem('storico')
      return data ? JSON.parse(data) : []
    }

    const { data, error } = await supabase
      .from('storico')
      .select('*')
      .order('data', { ascending: false })
    
    if (error) throw error
    console.log('Storico caricato:', data)
    return data || []
  } catch (error) {
    console.error('Errore nel caricare storico:', error)
    // Fallback a localStorage
    const data = localStorage.getItem('storico')
    return data ? JSON.parse(data) : []
  }
}

// Funzioni per le impostazioni
export const saveSettings = async (data) => {
  try {
    // Fallback a localStorage se Supabase non è configurato
    if (!supabaseUrl || supabaseUrl === 'https://your-project.supabase.co') {
      console.log('Usando localStorage come fallback per impostazioni')
      localStorage.setItem('settings', JSON.stringify(data))
      return data
    }

    const { data: result, error } = await supabase
      .from('settings')
      .upsert(data, { onConflict: 'id' })
    
    if (error) throw error
    console.log('Impostazioni salvate:', result)
    return result
  } catch (error) {
    console.error('Errore nel salvare impostazioni:', error)
    // Fallback a localStorage
    localStorage.setItem('settings', JSON.stringify(data))
    return data
  }
}

export const loadSettings = async () => {
  try {
    // Fallback a localStorage se Supabase non è configurato
    if (!supabaseUrl || supabaseUrl === 'https://your-project.supabase.co') {
      console.log('Usando localStorage come fallback per impostazioni')
      const data = localStorage.getItem('settings')
      return data ? JSON.parse(data) : {}
    }

    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .single()
    
    if (error) throw error
    console.log('Impostazioni caricate:', data)
    return data || {}
  } catch (error) {
    console.error('Errore nel caricare impostazioni:', error)
    // Fallback a localStorage
    const data = localStorage.getItem('settings')
    return data ? JSON.parse(data) : {}
  }
}

// Funzioni per gli ordini fornitori
export const saveSupplierOrder = async (data) => {
  try {
    // Fallback a localStorage se Supabase non è configurato
    if (!supabaseUrl || supabaseUrl === 'https://your-project.supabase.co') {
      console.log('Usando localStorage come fallback per ordini fornitori')
      const ordini = JSON.parse(localStorage.getItem('supplier_orders') || '[]')
      const index = ordini.findIndex(o => o.numero_ordine === data.numero_ordine)
      if (index >= 0) {
        ordini[index] = data
      } else {
        ordini.push(data)
      }
      localStorage.setItem('supplier_orders', JSON.stringify(ordini))
      return data
    }

    const { data: result, error } = await supabase
      .from('supplier_orders')
      .upsert(data, { onConflict: 'numero_ordine' })
    
    if (error) throw error
    console.log('Ordine fornitore salvato:', result)
    return result
  } catch (error) {
    console.error('Errore nel salvare ordine fornitore:', error)
    // Fallback a localStorage
    const ordini = JSON.parse(localStorage.getItem('supplier_orders') || '[]')
    const index = ordini.findIndex(o => o.numero_ordine === data.numero_ordine)
    if (index >= 0) {
      ordini[index] = data
    } else {
      ordini.push(data)
    }
    localStorage.setItem('supplier_orders', JSON.stringify(ordini))
    return data
  }
}

export const loadSupplierOrders = async () => {
  try {
    // Fallback a localStorage se Supabase non è configurato
    if (!supabaseUrl || supabaseUrl === 'https://your-project.supabase.co') {
      console.log('Usando localStorage come fallback per ordini fornitori')
      const data = localStorage.getItem('supplier_orders')
      return data ? JSON.parse(data) : []
    }

    const { data, error } = await supabase
      .from('supplier_orders')
      .select('*')
      .order('data_ordine', { ascending: false })
    
    if (error) throw error
    console.log('Ordini fornitori caricati:', data)
    return data || []
  } catch (error) {
    console.error('Errore nel caricare ordini fornitori:', error)
    // Fallback a localStorage
    const data = localStorage.getItem('supplier_orders')
    return data ? JSON.parse(data) : []
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