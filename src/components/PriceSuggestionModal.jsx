import React from 'react';
import Button from './ui/button';
import { safeToFixed, formatPrice } from '../lib/utils';

export default function PriceSuggestionModal({ open, sku, oldPrice, newPrice, onDecision, nome }) {
  if (!open) return null;

  const diff = newPrice - oldPrice;
  const percent = safeToFixed((diff / oldPrice) * 100, 1, '0.0');

  let suggestion = '';
  if (diff > 0) {
    suggestion = `Il nuovo prezzo è superiore di ${percent}% rispetto al precedente.`;
  } else if (diff < 0) {
    suggestion = `Il nuovo prezzo è inferiore di ${Math.abs(percent)}% rispetto al precedente.`;
  } else {
    suggestion = 'Il prezzo è invariato.';
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-bold mb-3 text-center">Suggerimento AI - Prezzo diverso</h2>
        <div className="mb-2 text-center">
          <div className="mb-1">SKU: <b>{sku}</b></div>
          {nome && <div className="mb-1">Prodotto: <b>{nome}</b></div>}
          <div>Prezzo attuale: <b>{formatPrice(oldPrice)}</b></div>
          <div>Nuovo prezzo: <b>{formatPrice(newPrice)}</b></div>
        </div>
        <p className="mb-4 text-center text-sm text-muted-foreground">{suggestion}</p>
        <div className="border-t pt-4 mt-4 flex flex-col sm:flex-row gap-2 w-full justify-center items-center">
          <Button variant="outline" className="px-4 py-2" onClick={() => onDecision('mantieni')}>
            Mantieni
          </Button>
          <Button variant="outline" className="px-4 py-2" onClick={() => onDecision('aggiorna')}>
            Aggiorna
          </Button>
          <Button variant="destructive" className="px-4 py-2" onClick={() => onDecision('ignora')}>
            Ignora
          </Button>
        </div>
      </div>
    </div>
  );
} 