import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  loadMagazzinoData, 
  loadShopifyOrdersData, 
  loadSupplierOrdersData, 
  saveSingleProduct,
  loadFotoProdottoData,
  saveFotoProdottoData,
  loadMagazzinoStoricoData,
  loadStoricoPrezziData
} from '../lib/magazzinoStorage';
import { getSupplierOrders } from '../lib/supplierOrders';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid, Legend } from 'recharts';
import { 
  ArrowLeft, Package, DollarSign, TrendingUp, TrendingDown, 
  Calendar, Truck, ShoppingCart, Edit, Save, X, Camera,
  BarChart3, History, AlertCircle, CheckCircle, Clock,
  Hash, Tag, Building, Layers, Calculator, RefreshCw,
  ChevronDown, ChevronUp, ExternalLink, Loader2
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

function formatDateTime(isoString) {
  if (!isoString) return { date: '-', time: '-' };
  const d = new Date(isoString);
  const date = d.toLocaleDateString('it-IT');
  const time = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  return { date, time };
}

function formatCurrency(value) {
  return parseFloat(value || 0).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
}

export default function MagazzinoDetailPage() {
  const { sku } = useParams();
  const navigate = useNavigate();
  
  // Stati prodotto
  const [prodotto, setProdotto] = useState(null);
  const [foto, setFoto] = useState(null);
  const [storico, setStorico] = useState([]);
  
  // Campi editabili principali
  const [editNome, setEditNome] = useState('');
  const [editSku, setEditSku] = useState('');
  const [editQuantita, setEditQuantita] = useState(0);
  const [editPrezzo, setEditPrezzo] = useState(0);
  const [marca, setMarca] = useState('');
  const [tipologia, setTipologia] = useState('');
  const [fornitore, setFornitore] = useState('');
  const [note, setNote] = useState('');
  const [codiceBarcode, setCodiceBarcode] = useState('');
  const [ubicazione, setUbicazione] = useState('');
  
  // Stati editing
  const [isEditingNome, setIsEditingNome] = useState(false);
  const [isEditingSku, setIsEditingSku] = useState(false);
  const [isEditingQuantita, setIsEditingQuantita] = useState(false);
  const [isEditingPrezzo, setIsEditingPrezzo] = useState(false);
  const [isEditingMarca, setIsEditingMarca] = useState(false);
  const [isEditingTipologia, setIsEditingTipologia] = useState(false);
  const [isEditingFornitore, setIsEditingFornitore] = useState(false);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [isEditingBarcode, setIsEditingBarcode] = useState(false);
  const [isEditingUbicazione, setIsEditingUbicazione] = useState(false);
  
  // Stati salvataggio e modalità modifica
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Dati correlati
  const [ordiniFornitore, setOrdiniFornitore] = useState([]);
  const [ordiniShopify, setOrdiniShopify] = useState([]);
  
  // UI
  const [expandedSections, setExpandedSections] = useState({
    info: true,
    storico: true,
    ordini: true,
    vendite: true,
    grafico: true
  });
  const [loading, setLoading] = useState(true);

  // Carica tutti i dati
  useEffect(() => {
    const loadAllData = async () => {
      setLoading(true);
      try {
        // Prodotto dal magazzino
        const magazzino = await loadMagazzinoData();
        const prod = magazzino.find(p => p.sku === sku);
        setProdotto(prod);
        
        // Inizializza campi editabili principali
        if (prod) {
          setEditNome(prod.nome || '');
          setEditSku(prod.sku || '');
          setEditQuantita(prod.quantita || 0);
          setEditPrezzo(prod.prezzo || 0);
        }
        
        // Foto - prima da Firebase, poi localStorage, poi dal prodotto
        let loadedFoto = await loadFotoProdottoData(sku);
        if (!loadedFoto && prod?.immagine) {
          loadedFoto = prod.immagine;
        }
        if (loadedFoto) {
          setFoto(loadedFoto);
        }
        
        // Campi aggiuntivi - priorità: prodotto > Firebase
        setMarca(prod?.marca || prod?.vendor || '');
        setTipologia(prod?.tipologia || prod?.type || '');
        setFornitore(prod?.fornitore || '');
        setNote(prod?.note || '');
        setCodiceBarcode(prod?.barcode || '');
        setUbicazione(prod?.ubicazione || '');
        
        // Storico caricamenti (da Firebase)
        const allStorico = await loadMagazzinoStoricoData();
        setStorico(allStorico[sku] || []);
        
        // Storico prezzi fornitore (da Firebase)
        const storicoPrezzi = await loadStoricoPrezziData(sku);
        if (storicoPrezzi.length > 0) {
          console.log(`📊 Storico prezzi caricato per ${sku}: ${storicoPrezzi.length} entries`);
        }
        
        // Ordini fornitori che contengono questo prodotto (da Firebase)
        const supplierOrders = await loadSupplierOrdersData() || [];
        const ordiniConProdotto = supplierOrders.filter(order => 
          order.products?.some(p => p.sku === sku)
        );
        setOrdiniFornitore(ordiniConProdotto);
        
        // Ordini Shopify (da Firebase)
        const shopifyOrders = await loadShopifyOrdersData() || [];
        console.log(`📦 Caricati ${shopifyOrders.length} ordini Shopify da Firebase per SKU: ${sku}`);
        const ordiniConVendita = shopifyOrders.filter(order => {
          const items = order.line_items || order.products || order.items || [];
          return items.some(item => 
            item.sku === sku || 
            item.variant_id?.toString() === sku ||
            item.product_id?.toString() === sku
          );
        });
        console.log(`🎯 Trovati ${ordiniConVendita.length} ordini con questo SKU`);
        setOrdiniShopify(ordiniConVendita);
        
      } catch (error) {
        console.error('Errore caricamento dati:', error);
      }
      setLoading(false);
    };
    
    loadAllData();
  }, [sku]);

  // Salva prodotto completo su Firebase
  const handleSaveProduct = async () => {
    setIsSaving(true);
    setSaveMessage('');
    try {
      const updatedProduct = {
        ...prodotto,
        nome: editNome,
        sku: editSku,
        quantita: editQuantita,
        prezzo: editPrezzo,
        marca: marca,
        tipologia: tipologia,
        fornitore: fornitore,
        note: note,
        barcode: codiceBarcode,
        ubicazione: ubicazione,
        lastUpdated: new Date().toISOString()
      };
      
      await saveSingleProduct(updatedProduct);
      setProdotto(updatedProduct);
      
      // Reset editing states
      setIsEditingNome(false);
      setIsEditingSku(false);
      setIsEditingQuantita(false);
      setIsEditingPrezzo(false);
      setIsEditingMarca(false);
      setIsEditingTipologia(false);
      setIsEditingFornitore(false);
      setIsEditingNote(false);
      setIsEditingBarcode(false);
      setIsEditingUbicazione(false);
      
      setSaveMessage('✓ Salvato');
      setTimeout(() => setSaveMessage(''), 2000);
      console.log('✅ Prodotto salvato su Firebase:', updatedProduct);
    } catch (error) {
      console.error('❌ Errore salvataggio:', error);
      setSaveMessage('Errore!');
    }
    setIsSaving(false);
  };

  // Handlers per salvare i campi
  const handleSaveField = (field, value, setter, setEditing) => {
    setter(value);
    setEditing(false);
  };

  // Salva foto su Firebase
  const handleFotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const fotoBase64 = ev.target.result;
      setFoto(fotoBase64);
      // Salva su Firebase
      await saveFotoProdottoData(sku, fotoBase64);
      console.log('✅ Foto salvata su Firebase');
    };
    reader.readAsDataURL(file);
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Calcoli statistiche
  const stats = useMemo(() => {
    if (!storico || storico.length === 0) {
      return {
        totaleCaricato: prodotto?.quantita || 0,
        prezzoMedio: prodotto?.prezzo || 0,
        prezzoMin: prodotto?.prezzo || 0,
        prezzoMax: prodotto?.prezzo || 0,
        differenzaPrezzo: 0,
        percentualeDiff: 0,
        ultimoCarico: null,
        primoCarico: null,
        numeroCarichi: 0
      };
    }

    const prezzi = storico.map(s => s.prezzo);
    const quantita = storico.map(s => s.quantita);
    const prezzoMin = Math.min(...prezzi);
    const prezzoMax = Math.max(...prezzi);
    const prezzoMedio = prezzi.reduce((a, b) => a + b, 0) / prezzi.length;
    const totaleCaricato = quantita.reduce((a, b) => a + b, 0);
    
    const ultimoPrezzo = storico[storico.length - 1]?.prezzo || 0;
    const primoPrezzo = storico[0]?.prezzo || 0;
    const differenzaPrezzo = ultimoPrezzo - primoPrezzo;
    const percentualeDiff = primoPrezzo > 0 ? ((differenzaPrezzo / primoPrezzo) * 100) : 0;

    return {
      totaleCaricato,
      prezzoMedio,
      prezzoMin,
      prezzoMax,
      differenzaPrezzo,
      percentualeDiff,
      ultimoCarico: storico[storico.length - 1],
      primoCarico: storico[0],
      numeroCarichi: storico.length
    };
  }, [storico, prodotto]);

  // Vendite dal Shopify + dati salvati nel prodotto
  const venditeStats = useMemo(() => {
    let totaleVenduto = 0;
    let ricavoTotale = 0;
    let ultimoPrezzoVendita = 0;
    let ultimaVenditaData = null;
    let numeroOrdini = 0;
    
    // Prima prova a calcolare dagli ordini Shopify
    if (ordiniShopify.length > 0) {
      const ordiniOrdinati = [...ordiniShopify].sort((a, b) => {
        const dataA = new Date(a.created_at || a.createdAt);
        const dataB = new Date(b.created_at || b.createdAt);
        return dataB - dataA;
      });
      
      ordiniOrdinati.forEach((order, idx) => {
        const items = order.line_items || order.products || order.items || [];
        items.forEach(item => {
          if (item.sku === sku || item.variant_id?.toString() === sku) {
            const qty = item.quantity || 1;
            const price = parseFloat(item.price) || 0;
            totaleVenduto += qty;
            ricavoTotale += price * qty;
            
            if (idx === 0 && ultimoPrezzoVendita === 0) {
              ultimoPrezzoVendita = price;
              ultimaVenditaData = order.created_at || order.createdAt;
            }
          }
        });
      });
      numeroOrdini = ordiniShopify.length;
    } 
    
    // Se non ci sono ordini, usa i dati salvati nel prodotto (dal Match SKU)
    if (totaleVenduto === 0 && prodotto) {
      totaleVenduto = prodotto.quantitaVenduta || 0;
      ricavoTotale = prodotto.ricavoTotale || 0;
      ultimoPrezzoVendita = prodotto.prezzoVendita || 0;
      ultimaVenditaData = prodotto.ultimoOrdine || null;
      numeroOrdini = prodotto.ordiniTotali || 0;
      
      if (totaleVenduto > 0) {
        console.log('📊 Usando dati vendite salvati nel prodotto:', { totaleVenduto, ricavoTotale, ultimoPrezzoVendita });
      }
    }
    
    // Calcola margine usando il prezzo di acquisto corrente
    const costoAcquisto = prodotto?.prezzo || stats.prezzoMedio || 0;
    const prezzoVendita = ultimoPrezzoVendita || (totaleVenduto > 0 ? ricavoTotale / totaleVenduto : 0);
    const margineUnitario = prezzoVendita - costoAcquisto;
    const marginePercentuale = prezzoVendita > 0 ? (margineUnitario / prezzoVendita) * 100 : 0;
    const margineTotale = margineUnitario * totaleVenduto;
    
    return {
      totaleVenduto,
      ricavoTotale,
      numeroOrdini,
      prezzoMedioVendita: totaleVenduto > 0 ? ricavoTotale / totaleVenduto : 0,
      ultimoPrezzoVendita,
      ultimaVenditaData,
      costoAcquisto,
      margineUnitario,
      marginePercentuale,
      margineTotale
    };
  }, [ordiniShopify, sku, prodotto, stats.prezzoMedio]);

  // Dati per grafico prezzi acquisto
  const priceChartData = useMemo(() => {
    return (storico || []).map((entry, idx) => ({
      name: formatDateTime(entry.data).date,
      prezzo: entry.prezzo,
      quantita: entry.quantita
    }));
  }, [storico]);

  // Dati per grafico trend vendite e prezzi
  const venditeChartData = useMemo(() => {
    const monthlyData = {};
    
    ordiniShopify.forEach(order => {
      const date = new Date(order.created_at || order.createdAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('it-IT', { month: 'short', year: '2-digit' });
      
      const items = order.line_items || order.products || order.items || [];
      const item = items.find(i => i.sku === sku || i.variant_id?.toString() === sku);
      
      if (item) {
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { name: monthLabel, vendite: 0, ricavo: 0, prezzoMedio: 0, count: 0 };
        }
        const qty = item.quantity || 1;
        const price = parseFloat(item.price) || 0;
        monthlyData[monthKey].vendite += qty;
        monthlyData[monthKey].ricavo += qty * price;
        monthlyData[monthKey].count += 1;
        monthlyData[monthKey].prezzoMedio = monthlyData[monthKey].ricavo / monthlyData[monthKey].vendite;
      }
    });
    
    return Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, data]) => data);
  }, [ordiniShopify, sku]);

  // Campo editabile
  const EditableField = ({ label, value, setValue, isEditing, setEditing, field, icon: Icon }) => (
    <div className="flex items-center justify-between py-2 border-b border-gray-100">
      <div className="flex items-center gap-2 text-gray-600">
        {Icon && <Icon className="w-4 h-4" />}
        <span>{label}:</span>
      </div>
      {isEditing ? (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="px-2 py-1 border rounded text-sm w-40"
            autoFocus
          />
          <button 
            onClick={() => handleSaveField(field, value, setValue, setEditing)} 
            className="p-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
          >
            <Save className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setEditing(false)} 
            className="p-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="font-medium">{value || 'Non specificato'}</span>
          <button 
            onClick={() => setEditing(true)} 
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
          >
            <Edit className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );

  // Sezione espandibile
  const SectionHeader = ({ title, section, icon: Icon, badge }) => (
    <button 
      onClick={() => toggleSection(section)}
      className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
    >
      <div className="flex items-center gap-3">
        {Icon && <Icon className="w-5 h-5 text-[#c68776]" />}
        <span className="font-semibold text-lg">{title}</span>
        {badge && (
          <span className="px-2 py-0.5 bg-[#c68776]/10 text-[#c68776] text-xs rounded-full font-medium">
            {badge}
          </span>
        )}
      </div>
      {expandedSections[section] ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
    </button>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-[#c68776]" />
      </div>
    );
  }

  if (!prodotto) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <p className="text-xl font-medium text-gray-600">Prodotto non trovato</p>
        <button 
          onClick={() => navigate('/magazzino')} 
          className="mt-4 px-4 py-2 bg-[#c68776] text-white rounded-lg hover:bg-[#b07567]"
        >
          Torna al Magazzino
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button 
          onClick={() => navigate('/magazzino')} 
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Torna al Magazzino</span>
        </button>
        
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              setLoading(true);
              const { invalidateCache, loadShopifyOrdersData } = await import('../lib/magazzinoStorage');
              invalidateCache();
              const orders = await loadShopifyOrdersData(true);
              const ordiniConVendita = orders.filter(order => {
                const items = order.line_items || order.products || order.items || [];
                return items.some(item => 
                  item.sku === sku || 
                  item.variant_id?.toString() === sku ||
                  item.product_id?.toString() === sku
                );
              });
              setOrdiniShopify(ordiniConVendita);
              setLoading(false);
            }}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Ricarica
          </button>
          
          {!isEditMode ? (
            <button
              onClick={() => setIsEditMode(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#c68776] text-white rounded-lg hover:bg-[#b07567] transition-colors"
            >
              <Edit className="w-4 h-4" />
              Modifica
            </button>
          ) : (
            <button
              onClick={() => setIsEditMode(false)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <X className="w-4 h-4" />
              Annulla
            </button>
          )}
        </div>
      </div>

      {/* Hero Card - Prodotto EDITABILE */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-[#c68776] to-[#d4a097] p-6 text-white">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Foto */}
            <div className="flex-shrink-0">
              <div className="relative group">
                {foto ? (
                  <img 
                    src={foto} 
                    alt={prodotto.nome} 
                    className="w-48 h-48 object-contain bg-white rounded-lg shadow-lg"
                  />
                ) : (
                  <div className="w-48 h-48 bg-white/20 rounded-lg flex items-center justify-center">
                    <Package className="w-20 h-20 text-white/50" />
                  </div>
                )}
                <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-lg">
                  <Camera className="w-8 h-8 text-white" />
                  <input type="file" accept="image/*" onChange={handleFotoChange} className="hidden" />
                </label>
              </div>
            </div>

            {/* Info principali */}
            <div className="flex-1">
              {/* Nome */}
              <div className="mb-2">
                {isEditMode ? (
                  <input
                    type="text"
                    value={editNome}
                    onChange={(e) => setEditNome(e.target.value)}
                    className="text-3xl font-bold bg-white/20 rounded px-2 py-1 w-full text-white placeholder-white/50 border border-white/30"
                    placeholder="Nome prodotto"
                  />
                ) : (
                  <h1 className="text-3xl font-bold">
                    {editNome || prodotto.nome}
                  </h1>
                )}
              </div>
              
              {/* SKU, Barcode, Marca */}
              <div className="flex flex-wrap gap-4 text-white/90 mb-2">
                {/* SKU */}
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4" />
                  <span>SKU: </span>
                  {isEditMode ? (
                    <input
                      type="text"
                      value={editSku}
                      onChange={(e) => setEditSku(e.target.value)}
                      className="font-bold bg-white/20 rounded px-2 py-0.5 w-40 text-white border border-white/30"
                    />
                  ) : (
                    <strong>{editSku || prodotto.sku}</strong>
                  )}
                </div>
                
                {/* Barcode */}
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  <span>Barcode: </span>
                  {isEditMode ? (
                    <input
                      type="text"
                      value={codiceBarcode}
                      onChange={(e) => setCodiceBarcode(e.target.value)}
                      className="font-bold bg-white/20 rounded px-2 py-0.5 w-40 text-white border border-white/30"
                    />
                  ) : (
                    <strong>{codiceBarcode || 'N/D'}</strong>
                  )}
                </div>
                
                {/* Marca */}
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4" />
                  <span>Marca: </span>
                  {isEditMode ? (
                    <input
                      type="text"
                      value={marca}
                      onChange={(e) => setMarca(e.target.value)}
                      className="font-bold bg-white/20 rounded px-2 py-0.5 w-32 text-white border border-white/30"
                    />
                  ) : (
                    <strong>{marca || 'N/D'}</strong>
                  )}
                </div>
              </div>
              
              {/* KPI inline - Riga 1: Stock e Quantità */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                {/* Quantità */}
                <div className="bg-white/20 rounded-lg p-3">
                  <p className="text-white/70 text-xs uppercase">Quantità in Stock</p>
                  {isEditMode ? (
                    <input
                      type="number"
                      min="0"
                      value={editQuantita}
                      onChange={(e) => setEditQuantita(parseInt(e.target.value) || 0)}
                      className="text-3xl font-bold bg-white/30 rounded px-2 w-full text-white text-center border border-white/30"
                    />
                  ) : (
                    <p className="text-3xl font-bold">{editQuantita}</p>
                  )}
                </div>
                
                {/* Prezzo */}
                <div className="bg-white/20 rounded-lg p-3">
                  <p className="text-white/70 text-xs uppercase">Costo Acquisto</p>
                  {isEditMode ? (
                    <div className="flex items-center">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editPrezzo}
                        onChange={(e) => setEditPrezzo(parseFloat(e.target.value) || 0)}
                        className="text-2xl font-bold bg-white/30 rounded px-2 w-full text-white text-right border border-white/30"
                      />
                      <span className="ml-1">€</span>
                    </div>
                  ) : (
                    <p className="text-3xl font-bold">{formatCurrency(editPrezzo)}</p>
                  )}
                </div>
                
                <div className="bg-white/20 rounded-lg p-3">
                  <p className="text-white/70 text-xs uppercase">Prezzo Vendita</p>
                  <p className="text-3xl font-bold">
                    {venditeStats.ultimoPrezzoVendita > 0 
                      ? formatCurrency(venditeStats.ultimoPrezzoVendita) 
                      : <span className="text-white/50 text-lg">N/D</span>
                    }
                  </p>
                </div>
                <div className={`rounded-lg p-3 ${venditeStats.marginePercentuale >= 0 ? 'bg-green-500/40' : 'bg-red-500/40'}`}>
                  <p className="text-white/70 text-xs uppercase">Margine</p>
                  <p className="text-3xl font-bold">
                    {venditeStats.ultimoPrezzoVendita > 0 
                      ? `${venditeStats.marginePercentuale.toFixed(1)}%` 
                      : <span className="text-white/50 text-lg">N/D</span>
                    }
                  </p>
                  {venditeStats.ultimoPrezzoVendita > 0 && (
                    <p className="text-white/80 text-xs">{formatCurrency(venditeStats.margineUnitario)}/pz</p>
                  )}
                </div>
              </div>

              {/* KPI inline - Riga 2: Vendite e Valore */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                <div className="bg-white/20 rounded-lg p-3">
                  <p className="text-white/70 text-xs uppercase">Valore Stock</p>
                  <p className="text-2xl font-bold">{formatCurrency(editQuantita * editPrezzo)}</p>
                </div>
                <div className="bg-white/20 rounded-lg p-3">
                  <p className="text-white/70 text-xs uppercase">Venduti Totale</p>
                  <p className="text-2xl font-bold">{venditeStats.totaleVenduto} pz</p>
                  <p className="text-white/70 text-xs">{venditeStats.numeroOrdini} ordini</p>
                </div>
                <div className="bg-white/20 rounded-lg p-3">
                  <p className="text-white/70 text-xs uppercase">Ricavo Vendite</p>
                  <p className="text-2xl font-bold">{formatCurrency(venditeStats.ricavoTotale)}</p>
                </div>
                <div className={`rounded-lg p-3 ${venditeStats.margineTotale >= 0 ? 'bg-green-500/40' : 'bg-red-500/40'}`}>
                  <p className="text-white/70 text-xs uppercase">Profitto Totale</p>
                  <p className="text-2xl font-bold">{formatCurrency(venditeStats.margineTotale)}</p>
                </div>
              </div>
              
              {/* Pulsante Salva - solo in modalità modifica */}
              {isEditMode && (
                <div className="mt-4 flex items-center gap-3">
                  <button
                    onClick={async () => {
                      await handleSaveProduct();
                      setIsEditMode(false);
                    }}
                    disabled={isSaving}
                    className="flex items-center gap-2 bg-white text-[#c68776] px-6 py-2 rounded-lg font-semibold hover:bg-white/90 disabled:opacity-50 transition-all shadow-lg"
                  >
                    {isSaving ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Save className="w-5 h-5" />
                    )}
                    Salva Modifiche
                  </button>
                  <button
                    onClick={() => setIsEditMode(false)}
                    className="flex items-center gap-2 bg-white/20 text-white px-4 py-2 rounded-lg font-medium hover:bg-white/30 transition-all"
                  >
                    <X className="w-4 h-4" />
                    Annulla
                  </button>
                  {saveMessage && (
                    <span className={`font-medium ${saveMessage.includes('Errore') ? 'text-red-300' : 'text-green-300'}`}>
                      {saveMessage}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* KPI Cards Dettagliate - Confronto Acquisto vs Vendita */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Confronto Prezzi */}
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Costo Acquisto (Storico)</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.prezzoMedio)}</p>
                <div className="text-xs text-gray-400 mt-1 space-y-0.5">
                  <p>Min: {formatCurrency(stats.prezzoMin)}</p>
                  <p>Max: {formatCurrency(stats.prezzoMax)}</p>
                </div>
              </div>
              <Calculator className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Prezzo Vendita Medio</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {venditeStats.prezzoMedioVendita > 0 
                    ? formatCurrency(venditeStats.prezzoMedioVendita)
                    : 'N/D'
                  }
                </p>
                {venditeStats.ultimoPrezzoVendita > 0 && (
                  <p className="text-xs text-gray-400 mt-1">
                    Ultimo: {formatCurrency(venditeStats.ultimoPrezzoVendita)}
                  </p>
                )}
              </div>
              <DollarSign className="w-8 h-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>

        <Card className={`border-l-4 ${venditeStats.marginePercentuale >= 20 ? 'border-l-green-500' : venditeStats.marginePercentuale >= 0 ? 'border-l-yellow-500' : 'border-l-red-500'}`}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Margine Unitario</p>
                <p className={`text-2xl font-bold ${venditeStats.margineUnitario >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {venditeStats.ultimoPrezzoVendita > 0 
                    ? formatCurrency(venditeStats.margineUnitario)
                    : 'N/D'
                  }
                </p>
                {venditeStats.ultimoPrezzoVendita > 0 && (
                  <p className={`text-xs mt-1 font-medium ${venditeStats.marginePercentuale >= 20 ? 'text-green-500' : venditeStats.marginePercentuale >= 0 ? 'text-yellow-600' : 'text-red-500'}`}>
                    {venditeStats.marginePercentuale.toFixed(1)}% del prezzo
                  </p>
                )}
              </div>
              {venditeStats.margineUnitario >= 0 ? (
                <TrendingUp className="w-8 h-8 text-green-500" />
              ) : (
                <TrendingDown className="w-8 h-8 text-red-500" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Variazione Costo</p>
                <p className={`text-2xl font-bold ${stats.differenzaPrezzo > 0 ? 'text-red-600' : stats.differenzaPrezzo < 0 ? 'text-green-600' : 'text-gray-600'}`}>
                  {stats.numeroCarichi > 1 
                    ? `${stats.differenzaPrezzo >= 0 ? '+' : ''}${formatCurrency(stats.differenzaPrezzo)}`
                    : 'N/D'
                  }
                </p>
                {stats.numeroCarichi > 1 && (
                  <p className={`text-xs mt-1 ${stats.percentualeDiff > 0 ? 'text-red-500' : stats.percentualeDiff < 0 ? 'text-green-500' : 'text-gray-500'}`}>
                    {stats.percentualeDiff >= 0 ? '+' : ''}{stats.percentualeDiff.toFixed(1)}% ({stats.numeroCarichi} carichi)
                  </p>
                )}
              </div>
              <BarChart3 className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Riepilogo Performance */}
      {venditeStats.totaleVenduto > 0 && (
        <Card className="bg-gradient-to-r from-gray-50 to-gray-100">
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6 text-center">
              <div>
                <p className="text-xs text-gray-500 uppercase font-medium">Pezzi Venduti</p>
                <p className="text-2xl font-bold text-gray-800">{venditeStats.totaleVenduto}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-medium">Ordini</p>
                <p className="text-2xl font-bold text-gray-800">{venditeStats.numeroOrdini}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-medium">Ricavo Totale</p>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(venditeStats.ricavoTotale)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-medium">Costo Totale</p>
                <p className="text-2xl font-bold text-gray-600">{formatCurrency(venditeStats.costoAcquisto * venditeStats.totaleVenduto)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-medium">Profitto Netto</p>
                <p className={`text-2xl font-bold ${venditeStats.margineTotale >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(venditeStats.margineTotale)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Informazioni Prodotto */}
      <Card>
        <SectionHeader title="Informazioni Prodotto" section="info" icon={Package} />
        {expandedSections.info && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              <EditableField 
                label="Marca" 
                value={marca} 
                setValue={setMarca} 
                isEditing={isEditingMarca} 
                setEditing={setIsEditingMarca}
                field="marca"
                icon={Tag}
              />
              <EditableField 
                label="Tipologia" 
                value={tipologia} 
                setValue={setTipologia} 
                isEditing={isEditingTipologia} 
                setEditing={setIsEditingTipologia}
                field="tipologia"
                icon={Layers}
              />
              <EditableField 
                label="Fornitore" 
                value={fornitore} 
                setValue={setFornitore} 
                isEditing={isEditingFornitore} 
                setEditing={setIsEditingFornitore}
                field="fornitore"
                icon={Building}
              />
              <EditableField 
                label="Ubicazione" 
                value={ubicazione} 
                setValue={setUbicazione} 
                isEditing={isEditingUbicazione} 
                setEditing={setIsEditingUbicazione}
                field="ubicazione"
                icon={Package}
              />
              <EditableField 
                label="Codice Barcode" 
                value={codiceBarcode} 
                setValue={setCodiceBarcode} 
                isEditing={isEditingBarcode} 
                setEditing={setIsEditingBarcode}
                field="barcode"
                icon={Hash}
              />
              <div className="md:col-span-2">
                <EditableField 
                  label="Note" 
                  value={note} 
                  setValue={setNote} 
                  isEditing={isEditingNote} 
                  setEditing={setIsEditingNote}
                  field="note"
                  icon={Edit}
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Grafico Trend Vendite */}
      {venditeChartData.length > 0 && (
        <Card>
          <SectionHeader title="Trend Vendite" section="trendVendite" icon={TrendingUp} badge={`${venditeChartData.length} mesi`} />
          {expandedSections.trendVendite !== false && (
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Grafico Quantità Vendute */}
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-3">Quantità Vendute per Mese</h4>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={venditeChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="name" fontSize={11} stroke="#888" />
                        <YAxis fontSize={11} stroke="#888" />
                        <Tooltip 
                          formatter={(value, name) => [
                            `${value} pz`,
                            'Venduti'
                          ]}
                        />
                        <Bar dataKey="vendite" fill="#c68776" radius={[4, 4, 0, 0]} name="Venduti" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Grafico Prezzo Medio di Vendita */}
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-3">Trend Prezzo di Vendita</h4>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={venditeChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="name" fontSize={11} stroke="#888" />
                        <YAxis fontSize={11} stroke="#888" tickFormatter={(v) => `€${v.toFixed(0)}`} />
                        <Tooltip 
                          formatter={(value) => [formatCurrency(value), 'Prezzo Medio']}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="prezzoMedio" 
                          stroke="#10b981" 
                          strokeWidth={2} 
                          dot={{ fill: '#10b981' }}
                          name="Prezzo Medio"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Grafico Prezzi Acquisto */}
      <Card>
        <SectionHeader title="Andamento Prezzi Acquisto" section="grafico" icon={BarChart3} badge={`${priceChartData.length} carichi`} />
        {expandedSections.grafico && (
          <CardContent>
            {priceChartData.length > 1 ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={priceChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" fontSize={12} stroke="#888" />
                    <YAxis fontSize={12} stroke="#888" tickFormatter={(v) => `€${v}`} />
                    <Tooltip 
                      formatter={(value, name) => [
                        name === 'prezzo' ? formatCurrency(value) : `${value} pz`,
                        name === 'prezzo' ? 'Prezzo' : 'Quantità'
                      ]}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="prezzo" 
                      stroke="#c68776" 
                      strokeWidth={2} 
                      dot={{ fill: '#c68776' }}
                      name="Prezzo Acquisto"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <BarChart3 className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <p>Non ci sono abbastanza dati per il grafico</p>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Storico Caricamenti */}
      <Card>
        <SectionHeader title="Storico Entrate a Magazzino" section="storico" icon={History} badge={`${storico.length} carichi`} />
        {expandedSections.storico && (
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-3 font-semibold">Data</th>
                    <th className="text-left p-3 font-semibold">Ora</th>
                    <th className="text-right p-3 font-semibold">Quantità</th>
                    <th className="text-right p-3 font-semibold">Prezzo Unit.</th>
                    <th className="text-right p-3 font-semibold">Valore Totale</th>
                    <th className="text-right p-3 font-semibold">Δ Prezzo</th>
                  </tr>
                </thead>
                <tbody>
                  {storico.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-gray-500">
                        <History className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                        Nessun caricamento registrato
                      </td>
                    </tr>
                  ) : (
                    storico.map((entry, idx) => {
                      const { date, time } = formatDateTime(entry.data);
                      const prevPrezzo = idx > 0 ? storico[idx - 1].prezzo : entry.prezzo;
                      const diffPrezzo = entry.prezzo - prevPrezzo;
                      const diffPercent = prevPrezzo > 0 ? ((diffPrezzo / prevPrezzo) * 100) : 0;
                      
                      return (
                        <tr key={idx} className="border-b hover:bg-gray-50">
                          <td className="p-3">{date}</td>
                          <td className="p-3 text-gray-500">{time}</td>
                          <td className="p-3 text-right font-medium">{entry.quantita} pz</td>
                          <td className="p-3 text-right">{formatCurrency(entry.prezzo)}</td>
                          <td className="p-3 text-right font-medium">{formatCurrency(entry.quantita * entry.prezzo)}</td>
                          <td className="p-3 text-right">
                            {idx > 0 ? (
                              <span className={`inline-flex items-center gap-1 ${diffPrezzo > 0 ? 'text-red-600' : diffPrezzo < 0 ? 'text-green-600' : 'text-gray-400'}`}>
                                {diffPrezzo > 0 ? <TrendingUp className="w-3 h-3" /> : diffPrezzo < 0 ? <TrendingDown className="w-3 h-3" /> : null}
                                {diffPrezzo !== 0 ? `${diffPrezzo > 0 ? '+' : ''}${diffPercent.toFixed(1)}%` : '-'}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    }).reverse()
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Ordini Fornitore */}
      <Card>
        <SectionHeader title="Ordini Fornitore" section="ordini" icon={Truck} badge={`${ordiniFornitore.length} ordini`} />
        {expandedSections.ordini && (
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-3 font-semibold">N. Ordine</th>
                    <th className="text-left p-3 font-semibold">Fornitore</th>
                    <th className="text-left p-3 font-semibold">Data</th>
                    <th className="text-center p-3 font-semibold">Stato</th>
                    <th className="text-right p-3 font-semibold">Qtà Ordinata</th>
                    <th className="text-right p-3 font-semibold">Prezzo</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {ordiniFornitore.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-gray-500">
                        <Truck className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                        Nessun ordine fornitore per questo prodotto
                      </td>
                    </tr>
                  ) : (
                    ordiniFornitore.map(order => {
                      const prodInOrdine = order.products?.find(p => p.sku === sku);
                      const statusColors = {
                        bozza: 'bg-gray-100 text-gray-700',
                        confermato: 'bg-blue-100 text-blue-700',
                        in_transito: 'bg-yellow-100 text-yellow-700',
                        ricevuto: 'bg-green-100 text-green-700',
                        parziale: 'bg-orange-100 text-orange-700',
                        pagato: 'bg-purple-100 text-purple-700'
                      };
                      
                      return (
                        <tr key={order.id} className="border-b hover:bg-gray-50">
                          <td className="p-3 font-medium">{order.orderNumber || order.id}</td>
                          <td className="p-3">{order.supplier || '-'}</td>
                          <td className="p-3 text-gray-500">{formatDateTime(order.createdAt).date}</td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[order.status] || 'bg-gray-100'}`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="p-3 text-right">{prodInOrdine?.quantity || prodInOrdine?.quantita || '-'} pz</td>
                          <td className="p-3 text-right">{formatCurrency(prodInOrdine?.price || prodInOrdine?.prezzo)}</td>
                          <td className="p-3">
                            <button 
                              onClick={() => navigate(`/ordini-fornitori/${order.id}`)}
                              className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Vendite Shopify */}
      <Card>
        <SectionHeader title="Vendite (Shopify)" section="vendite" icon={ShoppingCart} badge={`${ordiniShopify.length} ordini`} />
        {expandedSections.vendite && (
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-3 font-semibold">Ordine</th>
                    <th className="text-left p-3 font-semibold">Data</th>
                    <th className="text-left p-3 font-semibold">Cliente</th>
                    <th className="text-center p-3 font-semibold">Stato</th>
                    <th className="text-right p-3 font-semibold">Qtà</th>
                    <th className="text-right p-3 font-semibold">Prezzo Unit.</th>
                    <th className="text-right p-3 font-semibold">Totale</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {ordiniShopify.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-gray-500">
                        <ShoppingCart className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                        Nessuna vendita per questo prodotto
                      </td>
                    </tr>
                  ) : (
                    ordiniShopify.slice(0, 20).map(order => {
                      const items = order.line_items || order.products || order.items || [];
                      const item = items.find(i => i.sku === sku || i.variant_id?.toString() === sku);
                      const qty = item?.quantity || 1;
                      const price = parseFloat(item?.price) || 0;
                      
                      const statusColors = {
                        paid: 'bg-green-100 text-green-700',
                        pending: 'bg-yellow-100 text-yellow-700',
                        refunded: 'bg-red-100 text-red-700'
                      };
                      const status = order.financial_status || order.financialStatus || 'pending';
                      
                      return (
                        <tr key={order.id} className="border-b hover:bg-gray-50">
                          <td className="p-3 font-medium">#{order.order_number || order.orderNumber || order.name}</td>
                          <td className="p-3 text-gray-500">{formatDateTime(order.created_at || order.createdAt).date}</td>
                          <td className="p-3">{order.customerName || order.customer?.first_name || '-'}</td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status] || 'bg-gray-100'}`}>
                              {status === 'paid' ? 'Pagato' : status === 'pending' ? 'In attesa' : status}
                            </span>
                          </td>
                          <td className="p-3 text-right">{qty} pz</td>
                          <td className="p-3 text-right">{formatCurrency(price)}</td>
                          <td className="p-3 text-right font-medium text-emerald-600">{formatCurrency(qty * price)}</td>
                          <td className="p-3">
                            <button 
                              onClick={() => navigate(`/ordini/${order.id}`)}
                              className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
              {ordiniShopify.length > 20 && (
                <div className="text-center py-4 text-gray-500 text-sm">
                  Mostrati i primi 20 ordini di {ordiniShopify.length} totali
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
