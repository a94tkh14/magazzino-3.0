import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

/**
 * Gestisce in modo sicuro i valori numerici per evitare errori toFixed
 * @param {number|string|undefined|null} value - Il valore da formattare
 * @param {number} decimals - Numero di decimali (default: 2)
 * @param {string} fallback - Valore di fallback se il valore non è valido (default: '0.00')
 * @returns {string} Il valore formattato o il fallback
 */
export const safeToFixed = (value, decimals = 2, fallback = '0.00') => {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  
  const num = parseFloat(value);
  if (isNaN(num)) {
    return fallback;
  }
  
  return num.toFixed(decimals);
};

/**
 * Formatta un prezzo in modo sicuro
 * @param {number|string|undefined|null} price - Il prezzo da formattare
 * @param {string} currency - La valuta (default: '€')
 * @returns {string} Il prezzo formattato
 */
export const formatPrice = (price, currency = '€') => {
  const formatted = safeToFixed(price, 2, '0.00');
  return `${currency}${formatted}`;
};

/**
 * Formatta una percentuale in modo sicuro
 * @param {number|string|undefined|null} value - Il valore da formattare
 * @param {number} decimals - Numero di decimali (default: 1)
 * @returns {string} La percentuale formattata
 */
export const formatPercentage = (value, decimals = 1) => {
  const formatted = safeToFixed(value, decimals, '0.0');
  return `${formatted}%`;
};

/**
 * Verifica se un valore è un numero valido
 * @param {any} value - Il valore da verificare
 * @returns {boolean} True se è un numero valido
 */
export const isValidNumber = (value) => {
  if (value === null || value === undefined || value === '') {
    return false;
  }
  
  const num = parseFloat(value);
  return !isNaN(num) && isFinite(num);
};

/**
 * Converte un valore in numero in modo sicuro
 * @param {any} value - Il valore da convertire
 * @param {number} fallback - Valore di fallback se la conversione fallisce (default: 0)
 * @returns {number} Il numero convertito o il fallback
 */
export const safeParseFloat = (value, fallback = 0) => {
  if (!isValidNumber(value)) {
    return fallback;
  }
  
  return parseFloat(value);
};

/**
 * Converte un valore in intero in modo sicuro
 * @param {any} value - Il valore da convertire
 * @param {number} fallback - Valore di fallback se la conversione fallisce (default: 0)
 * @returns {number} L'intero convertito o il fallback
 */
export const safeParseInt = (value, fallback = 0) => {
  if (!isValidNumber(value)) {
    return fallback;
  }
  
  return parseInt(value);
};

/**
 * Gestisce in modo sicuro le stringhe per evitare errori toLowerCase
 * @param {string|undefined|null} value - Il valore da gestire
 * @param {string} fallback - Valore di fallback se il valore non è valido (default: '')
 * @returns {string} Il valore sicuro o il fallback
 */
export const safeString = (value, fallback = '') => {
  if (value === null || value === undefined || typeof value !== 'string') {
    return fallback;
  }
  
  return value;
};

/**
 * Converte una stringa in minuscolo in modo sicuro
 * @param {string|undefined|null} value - Il valore da convertire
 * @param {string} fallback - Valore di fallback se il valore non è valido (default: '')
 * @returns {string} La stringa in minuscolo o il fallback
 */
export const safeToLowerCase = (value, fallback = '') => {
  const safeValue = safeString(value, fallback);
  return safeValue.toLowerCase();
};

/**
 * Verifica se una stringa contiene un termine di ricerca in modo sicuro
 * @param {string|undefined|null} value - Il valore da verificare
 * @param {string} searchTerm - Il termine di ricerca
 * @param {boolean} caseSensitive - Se la ricerca deve essere case-sensitive (default: false)
 * @returns {boolean} True se la stringa contiene il termine di ricerca
 */
export const safeIncludes = (value, searchTerm, caseSensitive = false) => {
  if (!searchTerm) return true;
  
  const safeValue = safeString(value, '');
  const safeSearchTerm = safeString(searchTerm, '');
  
  if (caseSensitive) {
    return safeValue.includes(safeSearchTerm);
  } else {
    return safeValue.toLowerCase().includes(safeSearchTerm.toLowerCase());
  }
};

/**
 * Normalizza una stringa per la ricerca (rimuove accenti e converte in minuscolo)
 * @param {string|undefined|null} value - Il valore da normalizzare
 * @param {string} fallback - Valore di fallback se il valore non è valido (default: '')
 * @returns {string} La stringa normalizzata o il fallback
 */
export const normalizeString = (value, fallback = '') => {
  const safeValue = safeString(value, fallback);
  if (!safeValue) return fallback;
  
  return safeValue
    .toLowerCase()
    .replace(/[àáâãäå]/g, 'a')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[ñ]/g, 'n')
    .replace(/[ç]/g, 'c');
}; 