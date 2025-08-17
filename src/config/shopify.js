// Configurazione Shopify
export const SHOPIFY_CONFIG = {
  // Limite massimo di ordini per sincronizzazione
  MAX_ORDERS_LIMIT: 1000,
  
  // Limite predefinito per sincronizzazioni normali
  DEFAULT_ORDERS_LIMIT: 500,
  
  // Limite per sincronizzazioni incrementali (ultimi giorni)
  INCREMENTAL_ORDERS_LIMIT: 200,
  
  // Limite per visualizzazioni in dropdown e liste
  DISPLAY_ORDERS_LIMIT: 200,
  
  // Timeout per le chiamate API (in millisecondi)
  API_TIMEOUT: 30000,
  
  // Pausa tra le chiamate per evitare rate limit (in millisecondi)
  RATE_LIMIT_PAUSE: 500,
  
  // Versione API Shopify
  API_VERSION: '2024-01'
};

// Funzione helper per ottenere il limite appropriato
export const getOrdersLimit = (type = 'default') => {
  switch (type) {
    case 'max':
      return SHOPIFY_CONFIG.MAX_ORDERS_LIMIT;
    case 'incremental':
      return SHOPIFY_CONFIG.INCREMENTAL_ORDERS_LIMIT;
    case 'display':
      return SHOPIFY_CONFIG.DISPLAY_ORDERS_LIMIT;
    default:
      return SHOPIFY_CONFIG.DEFAULT_ORDERS_LIMIT;
  }
}; 