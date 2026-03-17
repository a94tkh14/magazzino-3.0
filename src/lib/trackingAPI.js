// Servizio per tracking spedizioni
// Supporta multiple API esterne per il tracciamento

// EasyPost API (gratuita, supporta tutti i corrieri)
const EASYPOST_API_KEY = process.env.REACT_APP_EASYPOST_API_KEY || '';

// 17track API (gratuita, supporta 1000+ corrieri)
const TRACKING_API_KEY = process.env.REACT_APP_TRACKING_API_KEY || '';

// Funzione per ottenere info tracking da EasyPost
export const getTrackingInfoEasyPost = async (trackingNumber, carrier = null) => {
  try {
    // Se non abbiamo API key, simuliamo il tracking
    if (!EASYPOST_API_KEY) {
      return getMockTrackingInfo(trackingNumber);
    }

    const response = await fetch('https://api.easypost.com/v2/trackers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${btoa(EASYPOST_API_KEY + ':')}`
      },
      body: JSON.stringify({
        tracking_code: trackingNumber,
        carrier: carrier || 'auto'
      })
    });

    if (!response.ok) {
      throw new Error('Errore API EasyPost');
    }

    const data = await response.json();
    
    return {
      status: data.tracking_details?.[0]?.status || 'In transito',
      location: data.tracking_details?.[0]?.location || 'Posizione sconosciuta',
      lastUpdate: data.tracking_details?.[0]?.datetime || new Date().toISOString(),
      carrier: data.carrier || 'Sconosciuto',
      estimatedDelivery: data.est_delivery_date || null
    };
  } catch (error) {
    console.error('Errore tracking EasyPost:', error);
    return getMockTrackingInfo(trackingNumber);
  }
};

// Funzione per ottenere info tracking da 17track
export const getTrackingInfo17Track = async (trackingNumber) => {
  try {
    // Se non abbiamo API key, simuliamo il tracking
    if (!TRACKING_API_KEY) {
      return getMockTrackingInfo(trackingNumber);
    }

    const response = await fetch(`https://api.17track.net/v2/track?number=${trackingNumber}`, {
      headers: {
        'Authorization': `Bearer ${TRACKING_API_KEY}`
      }
    });

    if (!response.ok) {
      throw new Error('Errore API 17track');
    }

    const data = await response.json();
    
    if (data.data && data.data.length > 0) {
      const trackInfo = data.data[0];
      return {
        status: trackInfo.status || 'In transito',
        location: trackInfo.location || 'Posizione sconosciuta',
        lastUpdate: trackInfo.time || new Date().toISOString(),
        carrier: trackInfo.carrier || 'Sconosciuto',
        estimatedDelivery: trackInfo.estimated_delivery || null
      };
    }
    
    return getMockTrackingInfo(trackingNumber);
  } catch (error) {
    console.error('Errore tracking 17track:', error);
    return getMockTrackingInfo(trackingNumber);
  }
};

// Funzione per ottenere info tracking da API pubblica gratuita
export const getTrackingInfoPublic = async (trackingNumber) => {
  try {
    // Usa un'API pubblica gratuita per tracking
    const response = await fetch(`https://api.trackingmore.com/v2/trackings/realtime`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Trackingmore-Api-Key': 'your_api_key_here' // Gratuita con registrazione
      },
      body: JSON.stringify({
        tracking_number: trackingNumber,
        carrier_code: 'auto'
      })
    });

    if (!response.ok) {
      throw new Error('Errore API tracking');
    }

    const data = await response.json();
    
    if (data.data && data.data.length > 0) {
      const trackInfo = data.data[0];
      return {
        status: trackInfo.status || 'In transito',
        location: trackInfo.location || 'Posizione sconosciuta',
        lastUpdate: trackInfo.time || new Date().toISOString(),
        carrier: trackInfo.carrier || 'Sconosciuto',
        estimatedDelivery: trackInfo.estimated_delivery || null
      };
    }
    
    return getMockTrackingInfo(trackingNumber);
  } catch (error) {
    console.error('Errore tracking pubblico:', error);
    return getMockTrackingInfo(trackingNumber);
  }
};

// Funzione per ottenere info tracking (usa la migliore API disponibile)
export const getTrackingInfo = async (trackingNumber, carrier = null) => {
  // Prova prima EasyPost, poi 17track, poi API pubblica
  try {
    return await getTrackingInfoEasyPost(trackingNumber, carrier);
  } catch (error) {
    try {
      return await getTrackingInfo17Track(trackingNumber);
    } catch (error) {
      try {
        return await getTrackingInfoPublic(trackingNumber);
      } catch (error) {
        return getMockTrackingInfo(trackingNumber);
      }
    }
  }
};

// Mock tracking info per test (quando non ci sono API key)
const getMockTrackingInfo = (trackingNumber) => {
  // Se non abbiamo API key reali, mostriamo un messaggio chiaro
  return {
    status: 'API non configurata',
    location: 'Richiede API key per tracking reale',
    lastUpdate: new Date().toISOString(),
    carrier: 'Configura API key',
    estimatedDelivery: null,
    message: 'Per tracking reale, configura REACT_APP_EASYPOST_API_KEY o REACT_APP_TRACKING_API_KEY nel file .env'
  };
};

// Funzione per formattare la data di tracking
export const formatTrackingDate = (dateString) => {
  return new Date(dateString).toLocaleString('it-IT', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Funzione per ottenere il colore dello stato
export const getStatusColor = (status) => {
  const statusColors = {
    'Consegnato': 'text-green-600',
    'In consegna': 'text-blue-600',
    'In transito': 'text-yellow-600',
    'In elaborazione': 'text-gray-600',
    'Spedito': 'text-purple-600',
    'API non configurata': 'text-yellow-600'
  };
  
  return statusColors[status] || 'text-gray-600';
}; 