import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { loadMagazzinoData, loadFromLocalStorage } from '../lib/magazzinoStorage';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

function formatDateTime(isoString) {
  const d = new Date(isoString);
  const date = d.toLocaleDateString('it-IT');
  const time = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  return { date, time };
}

export default function MagazzinoDetailPage() {
  const { sku } = useParams();
  const navigate = useNavigate();
  const [prodotto, setProdotto] = useState(null);
  const [foto, setFoto] = useState(null);
  const [storico, setStorico] = useState([]);
  const [marca, setMarca] = useState('');
  const [isEditingMarca, setIsEditingMarca] = useState(false);
  const [tipologia, setTipologia] = useState('');
  const [isEditingTipologia, setIsEditingTipologia] = useState(false);

  useEffect(() => {
    const loadProductData = async () => {
      try {
        const magazzino = await loadMagazzinoData();
        setProdotto(magazzino.find(p => p.sku === sku));
        // Carica la foto da localStorage se presente
        const saved = localStorage.getItem(`foto_${sku}`);
        if (saved) setFoto(saved);
        // Carica marca da localStorage se presente
        const savedMarca = localStorage.getItem(`marca_${sku}`);
        if (savedMarca) setMarca(savedMarca);
        // Carica tipologia da localStorage se presente
        const savedTipologia = localStorage.getItem(`tipologia_${sku}`);
        if (savedTipologia) setTipologia(savedTipologia);
        // Carica storico da localStorage
        const allStorico = loadFromLocalStorage('magazzino_storico', {});
        setStorico(allStorico[sku] || []);
      } catch (error) {
        console.error('Errore nel caricare dati prodotto:', error);
      }
    };
    loadProductData();
  }, [sku]);

  const handleFotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setFoto(ev.target.result);
      localStorage.setItem(`foto_${sku}`, ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleMarcaSave = () => {
    localStorage.setItem(`marca_${sku}`, marca);
    setIsEditingMarca(false);
  };

  const handleTipologiaSave = () => {
    localStorage.setItem(`tipologia_${sku}`, tipologia);
    setIsEditingTipologia(false);
  };

  const priceChartData = (Array.isArray(storico) ? storico : []).map(entry => ({
    date: formatDateTime(entry.data).date + ' ' + formatDateTime(entry.data).time,
    prezzo: entry.prezzo
  }));

  if (!prodotto) return <div>Prodotto non trovato</div>;

  return (
    <div className="max-w-2xl mx-auto py-8">
      <button onClick={() => navigate('/magazzino')} className="mb-4 text-blue-600 underline">
        Torna al magazzino
      </button>
      <div className="flex flex-col sm:flex-row items-start gap-6 mb-6">
        <div className="flex flex-col items-center">
          {foto ? (
            <img src={foto} alt="Foto prodotto" className="w-40 h-40 object-contain rounded shadow mb-2" />
          ) : (
            <div className="w-40 h-40 flex items-center justify-center bg-muted rounded shadow mb-2 text-muted-foreground">
              Nessuna foto
            </div>
          )}
          <label className="block">
            <span className="sr-only">Carica foto</span>
            <input type="file" accept="image/*" onChange={handleFotoChange} className="block w-full text-sm" />
          </label>
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold mb-2">{prodotto.nome}</h1>
          <div className="mb-2">SKU: <b>{prodotto.sku}</b></div>
          <div className="mb-2">Quantità: <b>{prodotto.quantita}</b></div>
          <div className="mb-2">Prezzo: <b>€{prodotto.prezzo.toFixed(2)}</b></div>
          <div className="mb-2">
            Marca: 
            {isEditingMarca ? (
              <div className="inline-flex items-center gap-2 ml-2">
                <input
                  type="text"
                  value={marca}
                  onChange={(e) => setMarca(e.target.value)}
                  className="px-2 py-1 border rounded text-sm"
                  placeholder="Inserisci marca"
                />
                <button onClick={handleMarcaSave} className="bg-primary text-primary-foreground px-2 py-1 rounded text-sm">✓</button>
                <button onClick={() => setIsEditingMarca(false)} className="bg-secondary text-secondary-foreground px-2 py-1 rounded text-sm">✗</button>
              </div>
            ) : (
              <span className="ml-2">
                <b>{marca || 'Non specificata'}</b>
                <button onClick={() => setIsEditingMarca(true)} className="ml-2 text-blue-600 underline text-sm">Modifica</button>
              </span>
            )}
          </div>
          <div className="mb-2">
            Tipologia: 
            {isEditingTipologia ? (
              <div className="inline-flex items-center gap-2 ml-2">
                <input
                  type="text"
                  value={tipologia}
                  onChange={(e) => setTipologia(e.target.value)}
                  className="px-2 py-1 border rounded text-sm"
                  placeholder="Inserisci tipologia"
                />
                <button onClick={handleTipologiaSave} className="bg-primary text-primary-foreground px-2 py-1 rounded text-sm">✓</button>
                <button onClick={() => setIsEditingTipologia(false)} className="bg-secondary text-secondary-foreground px-2 py-1 rounded text-sm">✗</button>
              </div>
            ) : (
              <span className="ml-2">
                <b>{tipologia || 'Non specificata'}</b>
                <button onClick={() => setIsEditingTipologia(true)} className="ml-2 text-blue-600 underline text-sm">Modifica</button>
              </span>
            )}
          </div>
          <div className="mb-4">Valore magazzino: <b>€{(prodotto.quantita * prodotto.prezzo).toFixed(2)}</b></div>
        </div>
      </div>
      <div className="mt-8">
        <h2 className="text-lg font-bold mb-2">Storico Caricamenti</h2>
        <table className="w-full border-collapse border border-border">
          <thead>
            <tr className="bg-muted/50">
              <th className="border border-border px-4 py-2 text-left font-medium">Data</th>
              <th className="border border-border px-4 py-2 text-left font-medium">Ora</th>
              <th className="border border-border px-4 py-2 text-left font-medium">Quantità</th>
              <th className="border border-border px-4 py-2 text-left font-medium">Prezzo</th>
            </tr>
          </thead>
          <tbody>
            {(Array.isArray(storico) ? storico : []).length === 0 ? (
              <tr>
                <td colSpan={4} className="border border-border px-4 py-4 text-center text-muted-foreground">
                  Nessun caricamento registrato
                </td>
              </tr>
            ) : (
              (Array.isArray(storico) ? storico : []).map((entry, idx) => {
                const { date, time } = formatDateTime(entry.data);
                return (
                  <tr key={idx}>
                    <td className="border border-border px-4 py-2">{date}</td>
                    <td className="border border-border px-4 py-2">{time}</td>
                    <td className="border border-border px-4 py-2">{entry.quantita}</td>
                    <td className="border border-border px-4 py-2">€{entry.prezzo.toFixed(2)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-8">
        <h2 className="text-lg font-bold mb-2">Andamento Prezzo</h2>
        {priceChartData.length > 1 ? (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={priceChartData}>
              <XAxis dataKey="date" fontSize={12} />
              <YAxis domain={['auto', 'auto']} fontSize={12} />
              <Tooltip />
              <Line type="monotone" dataKey="prezzo" stroke="#2563eb" strokeWidth={2} dot />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-muted-foreground text-center py-8">Non ci sono abbastanza dati per il grafico</div>
        )}
      </div>
    </div>
  );
} 