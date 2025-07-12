import { getMagazzino, setMagazzino, addStorico } from './magazzinoStorage';

// Merge intelligente tra stock importato e magazzino persistente
export function mergeStockWithMagazzino(stockList) {
  const magazzino = getMagazzino();
  const now = new Date().toISOString();

  stockList.forEach(newItem => {
    const idx = magazzino.findIndex(item => item.sku === newItem.sku);

    if (idx !== -1) {
      // SKU già presente: aggiorna quantità, gestisci prezzo
      magazzino[idx].quantita += newItem.quantita;

      // Se il prezzo è diverso, qui scatterà il suggerimento AI (da implementare)
      // Per ora, manteniamo il prezzo attuale
      // In futuro: mostra popup/modale per scelta utente

      // Salva nello storico
      addStorico(newItem.sku, {
        data: now,
        quantita: newItem.quantita,
        prezzo: newItem.prezzo,
        tipo: 'import'
      });
    } else {
      // SKU nuovo: aggiungi al magazzino
      magazzino.push({ ...newItem });
      addStorico(newItem.sku, {
        data: now,
        quantita: newItem.quantita,
        prezzo: newItem.prezzo,
        tipo: 'import'
      });
    }
  });

  setMagazzino(magazzino);
} 