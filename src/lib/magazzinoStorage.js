const MAGAZZINO_KEY = 'magazzino_data';
const STORICO_KEY = 'magazzino_storico';

// Leggi il magazzino attuale
export function getMagazzino() {
  const data = localStorage.getItem(MAGAZZINO_KEY);
  return data ? JSON.parse(data) : [];
}

// Salva il magazzino
export function setMagazzino(magazzino) {
  localStorage.setItem(MAGAZZINO_KEY, JSON.stringify(magazzino));
}

// Leggi lo storico caricamenti
export function getStorico() {
  const data = localStorage.getItem(STORICO_KEY);
  return data ? JSON.parse(data) : {};
}

// Salva lo storico caricamenti
export function setStorico(storico) {
  localStorage.setItem(STORICO_KEY, JSON.stringify(storico));
}

// Aggiungi una voce allo storico per uno SKU
export function addStorico(sku, entry) {
  const storico = getStorico();
  if (!storico[sku]) storico[sku] = [];
  storico[sku].push(entry);
  setStorico(storico);
} 