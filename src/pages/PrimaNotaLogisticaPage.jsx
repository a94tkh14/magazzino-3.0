import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Plus, Trash2, X, Upload, Calendar, Search, Download, FileText,
  Loader2, CheckCircle, TrendingUp, TrendingDown,
  ChevronDown, Package, Truck, MapPin, Clock, Box, 
  FileSpreadsheet, AlertCircle, Eye, RefreshCw, Building2,
  ShoppingCart, Users, ArrowUpRight, ArrowDownRight,
  BarChart3, Home, BookOpen, Warehouse, Send, RotateCcw
} from 'lucide-react';
import { format, subMonths, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { it } from 'date-fns/locale';
import { 
  PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, BarChart, Bar, Area, AreaChart
} from 'recharts';

const PrimaNotaLogisticaPage = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Data states
  const [movimenti, setMovimenti] = useState([]);
  const [magazzini, setMagazzini] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Dashboard periodo filter
  const [dashboardPeriodo, setDashboardPeriodo] = useState('30');
  
  // Filters
  const [filterMagazzino, setFilterMagazzino] = useState('all');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [filterTipo, setFilterTipo] = useState('all');
  const [filterSearch, setFilterSearch] = useState('');
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());
  const [filterStato, setFilterStato] = useState('all');
  const [filterStore, setFilterStore] = useState('all');
  const [filterPagato, setFilterPagato] = useState('all');
  
  // Selection
  const [selectedRows, setSelectedRows] = useState(new Set());
  
  // Modals
  const [showNuovoMovimento, setShowNuovoMovimento] = useState(false);
  const [showNuovoMagazzino, setShowNuovoMagazzino] = useState(false);
  const [showNuovoStore, setShowNuovoStore] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showImportSpedizioni, setShowImportSpedizioni] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(null);
  const [showNuovaCategoria, setShowNuovaCategoria] = useState(false);
  const [showNuovaSpedizione, setShowNuovaSpedizione] = useState(false);
  const [showAssegnaStore, setShowAssegnaStore] = useState(null);
  const [showAssegnaMassivo, setShowAssegnaMassivo] = useState(false);
  const [showDettaglioMese, setShowDettaglioMese] = useState(null);
  const [showArchivio, setShowArchivio] = useState(false);
  const [showArchivioDettaglio, setShowArchivioDettaglio] = useState(null);
  const [showPagamentoModal, setShowPagamentoModal] = useState(null);
  const [showCostiModal, setShowCostiModal] = useState(false);
  const [filterMeseRif, setFilterMeseRif] = useState('all');
  const [filterCentroCosti, setFilterCentroCosti] = useState('all');
  const [costoPerSpedizione, setCostoPerSpedizione] = useState(1.5);
  
  // Import state
  const [importStep, setImportStep] = useState(1);
  const [importedData, setImportedData] = useState([]);
  const [importMapping, setImportMapping] = useState({});
  const [importHeaders, setImportHeaders] = useState([]);
  const [importMagazzinoId, setImportMagazzinoId] = useState('');
  
  // Import spedizioni state
  const [importSpedStep, setImportSpedStep] = useState(1);
  const [importSpedData, setImportSpedData] = useState([]);
  const [importSpedMapping, setImportSpedMapping] = useState({});
  const [importSpedHeaders, setImportSpedHeaders] = useState([]);
  const [importMeseRiferimento, setImportMeseRiferimento] = useState('');
  
  // Forms
  const [movimentoForm, setMovimentoForm] = useState({
    data: format(new Date(), 'yyyy-MM-dd'),
    descrizione: '', 
    quantita: '', 
    tipo: 'uscita',
    categoria: '', 
    destinatario: '', 
    magazzino: '', 
    sku: '',
    corriere: '',
    tracking: '',
    stato: 'in_lavorazione'
  });
  const [magazzinoForm, setMagazzinoForm] = useState({ nome: '', indirizzo: '', tipo: 'principale' });
  const [storeForm, setStoreForm] = useState({ nome: '', tipo: 'marketplace', commissione: '' });
  const [nuovaCategoriaForm, setNuovaCategoriaForm] = useState({ nome: '', gruppo: '', nuovoGruppo: '', tipo: 'uscita' });
  const [spedizioneForm, setSpedizioneForm] = useState({
    data: format(new Date(), 'yyyy-MM-dd'),
    ordineId: '',
    store: '',
    destinatario: '',
    indirizzo: '',
    prodotti: '',
    quantita: 1,
    corriere: '',
    tracking: '',
    costo: '',
    stato: 'in_lavorazione',
    pagato: false,
    note: ''
  });

  // ===================== CATEGORIE LOGISTICA =====================
  const defaultCategorieUscita = [
    { id: 'spedizione_cliente', nome: 'Spedizione Cliente', gruppo: 'Spedizioni' },
    { id: 'spedizione_b2b', nome: 'Spedizione B2B', gruppo: 'Spedizioni' },
    { id: 'spedizione_marketplace', nome: 'Spedizione Marketplace', gruppo: 'Spedizioni' },
    { id: 'trasferimento_negozio', nome: 'Trasferimento Negozio', gruppo: 'Trasferimenti' },
    { id: 'trasferimento_magazzino', nome: 'Trasferimento Magazzino', gruppo: 'Trasferimenti' },
    { id: 'reso_fornitore', nome: 'Reso a Fornitore', gruppo: 'Resi' },
    { id: 'scarto', nome: 'Scarto/Danneggiato', gruppo: 'Scarti' },
    { id: 'campionatura', nome: 'Campionatura', gruppo: 'Altro' },
  ];

  const defaultCategorieEntrata = [
    { id: 'carico_fornitore', nome: 'Carico da Fornitore', gruppo: 'Carichi' },
    { id: 'carico_produzione', nome: 'Carico da Produzione', gruppo: 'Carichi' },
    { id: 'reso_cliente', nome: 'Reso da Cliente', gruppo: 'Resi' },
    { id: 'reso_marketplace', nome: 'Reso Marketplace', gruppo: 'Resi' },
    { id: 'trasferimento_in', nome: 'Trasferimento in Entrata', gruppo: 'Trasferimenti' },
    { id: 'inventario_positivo', nome: 'Rettifica Inventario +', gruppo: 'Inventario' },
  ];

  const [categorieUscita, setCategorieUscita] = useState(defaultCategorieUscita);
  const [categorieEntrata, setCategorieEntrata] = useState(defaultCategorieEntrata);

  const tutteCategorie = useMemo(() => [
    ...categorieEntrata.map(c => ({ ...c, tipo: 'entrata' })),
    ...categorieUscita.map(c => ({ ...c, tipo: 'uscita' }))
  ], [categorieEntrata, categorieUscita]);

  // Carica categorie personalizzate da localStorage
  useEffect(() => {
    const savedUscita = localStorage.getItem('categorie_logistica_uscita');
    const savedEntrata = localStorage.getItem('categorie_logistica_entrata');
    if (savedUscita) setCategorieUscita(JSON.parse(savedUscita));
    if (savedEntrata) setCategorieEntrata(JSON.parse(savedEntrata));
  }, []);

  // ===================== LOAD DATA =====================
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const savedMovimenti = localStorage.getItem('movimenti_logistica');
        const savedMagazzini = localStorage.getItem('magazzini_logistica');
        const savedStores = localStorage.getItem('stores_logistica');
        setMovimenti(savedMovimenti ? JSON.parse(savedMovimenti) : []);
        setMagazzini(savedMagazzini ? JSON.parse(savedMagazzini) : []);
        setStores(savedStores ? JSON.parse(savedStores) : []);
      } catch (error) {
        console.error('Errore:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // ===================== SAVE FUNCTIONS =====================
  const saveMovimenti = useCallback(async (newMovimenti) => {
    setSaving(true);
    try {
      localStorage.setItem('movimenti_logistica', JSON.stringify(newMovimenti));
      setMovimenti(newMovimenti);
    } catch (error) {
      console.error('Errore:', error);
    } finally {
      setSaving(false);
    }
  }, []);

  const saveMagazzini = useCallback(async (newMagazzini) => {
    localStorage.setItem('magazzini_logistica', JSON.stringify(newMagazzini));
    setMagazzini(newMagazzini);
  }, []);

  const saveStores = useCallback(async (newStores) => {
    localStorage.setItem('stores_logistica', JSON.stringify(newStores));
    setStores(newStores);
  }, []);

  // ===================== FILTERED DATA =====================
  const movimentiFiltrati = useMemo(() => {
    return movimenti.filter(m => {
      const year = parseInt((m.data || '').substring(0, 4));
      if (year !== parseInt(filterYear)) return false;
      if (filterMagazzino !== 'all' && m.magazzino !== filterMagazzino) return false;
      if (filterTipo !== 'all' && m.tipo !== filterTipo) return false;
      if (filterStato !== 'all' && m.stato !== filterStato) return false;
      if (filterFrom && m.data < filterFrom) return false;
      if (filterTo && m.data > filterTo) return false;
      if (filterSearch) {
        const search = filterSearch.toLowerCase();
        if (!((m.descrizione || '').toLowerCase().includes(search) ||
              (m.sku || '').toLowerCase().includes(search) ||
              (m.destinatario || '').toLowerCase().includes(search) ||
              (m.tracking || '').toLowerCase().includes(search))) return false;
      }
      return true;
    }).sort((a, b) => new Date(b.data) - new Date(a.data));
  }, [movimenti, filterYear, filterMagazzino, filterTipo, filterStato, filterFrom, filterTo, filterSearch]);

  // Spedizioni filtrate (solo movimenti tipo spedizione, NON assegnate, non archiviate)
  // Le spedizioni assegnate vanno in "Per Store"
  const spedizioniFiltrate = useMemo(() => {
    return movimenti.filter(m => {
      if (!m.categoria?.includes('spedizione')) return false;
      if (m.archiviato) return false; // Escludi archiviate
      if (m.store) return false; // Escludi già assegnate (vanno in Per Store)
      if (filterMeseRif !== 'all' && m.meseRiferimento !== filterMeseRif) return false;
      if (filterCentroCosti !== 'all' && m.centroCosti !== filterCentroCosti) return false;
      if (filterSearch) {
        const search = filterSearch.toLowerCase();
        if (!((m.ordineId || '').toLowerCase().includes(search) ||
              (m.centroCosti || '').toLowerCase().includes(search) ||
              (m.destinatario || '').toLowerCase().includes(search) ||
              (m.tracking || '').toLowerCase().includes(search))) return false;
      }
      return true;
    }).sort((a, b) => new Date(b.data) - new Date(a.data));
  }, [movimenti, filterMeseRif, filterCentroCosti, filterSearch]);

  // Spedizioni archiviate
  const spedizioniArchiviate = useMemo(() => {
    return movimenti.filter(m => m.categoria?.includes('spedizione') && m.archiviato)
      .sort((a, b) => new Date(b.dataPagamento || b.data) - new Date(a.dataPagamento || a.data));
  }, [movimenti]);

  // Archivio raggruppato per store/mese
  const archivioPerStoreMese = useMemo(() => {
    const result = {};
    spedizioniArchiviate.forEach(m => {
      const key = `${m.store}_${m.meseRiferimento || 'senza_mese'}`;
      if (!result[key]) {
        result[key] = { 
          storeId: m.store,
          meseRiferimento: m.meseRiferimento || 'N/D',
          spedizioni: [], 
          totale: 0, 
          importoTotale: 0,
          costoLogistica: 0,
          totaleDaPagare: 0,
          totalePagato: 0,
          dataPagamento: m.dataPagamento
        };
      }
      result[key].spedizioni.push(m);
      result[key].totale++;
      const importo = parseFloat(m.importo) || 0;
      const costo = parseFloat(m.costoFisso) || 0;
      const pagato = parseFloat(m.importoPagato) || (importo + costo);
      result[key].importoTotale += importo;
      result[key].costoLogistica += costo;
      result[key].totaleDaPagare += importo + costo;
      result[key].totalePagato += pagato;
      if (m.dataPagamento && (!result[key].dataPagamento || m.dataPagamento > result[key].dataPagamento)) {
        result[key].dataPagamento = m.dataPagamento;
      }
    });
    return result;
  }, [spedizioniArchiviate]);

  // Lista centri costi unici
  const centriCostiUnici = useMemo(() => {
    const set = new Set();
    movimenti.filter(m => m.categoria?.includes('spedizione') && m.centroCosti).forEach(m => set.add(m.centroCosti));
    return Array.from(set).sort();
  }, [movimenti]);

  // Lista mesi riferimento unici
  const mesiRiferimentoUnici = useMemo(() => {
    const set = new Set();
    movimenti.filter(m => m.categoria?.includes('spedizione') && m.meseRiferimento && !m.archiviato).forEach(m => set.add(m.meseRiferimento));
    return Array.from(set).sort().reverse();
  }, [movimenti]);

  // Conteggio spedizioni non assegnate
  const spedizioniNonAssegnate = useMemo(() => {
    return movimenti.filter(m => m.categoria?.includes('spedizione') && !m.store && !m.archiviato).length;
  }, [movimenti]);

  // Spedizioni raggruppate per store e mese (solo non archiviate)
  const spedizioniPerStoreMese = useMemo(() => {
    const result = {};
    movimenti.filter(m => m.categoria?.includes('spedizione') && m.store && !m.archiviato).forEach(m => {
      const key = `${m.store}_${m.meseRiferimento || 'senza_mese'}`;
      if (!result[key]) {
        result[key] = { 
          storeId: m.store,
          meseRiferimento: m.meseRiferimento || 'N/D',
          spedizioni: [], 
          totale: 0, 
          importoTotale: 0,
          costoLogistica: 0,
          totaleDaPagare: 0,
          totalePagato: 0
        };
      }
      result[key].spedizioni.push(m);
      result[key].totale++;
      const importo = parseFloat(m.importo) || 0;
      const costo = parseFloat(m.costoFisso) || 0;
      const pagato = parseFloat(m.importoPagato) || 0;
      result[key].costoLogistica += costo;
      result[key].totaleDaPagare += importo + costo;
      result[key].totalePagato += pagato;
      result[key].importoTotale += parseFloat(m.importo) || 0;
    });
    return result;
  }, [movimenti]);

  // ===================== DASHBOARD SUMMARY =====================
  const dashboardSummary = useMemo(() => {
    const oggi = new Date();
    const inizioMese = new Date(oggi.getFullYear(), oggi.getMonth(), 1);
    
    const movimentiMese = movimenti.filter(m => new Date(m.data) >= inizioMese);
    
    let totaleUscite = 0, totaleEntrate = 0;
    let spedizioniMese = 0, resiMese = 0, trasferimentiMese = 0;
    
    movimentiMese.forEach(m => {
      const qty = parseInt(m.quantita) || 0;
      if (m.tipo === 'uscita') {
        totaleUscite += qty;
        if (m.categoria?.includes('spedizione')) spedizioniMese++;
        if (m.categoria?.includes('trasferimento')) trasferimentiMese++;
      } else {
        totaleEntrate += qty;
        if (m.categoria?.includes('reso')) resiMese++;
      }
    });

    const inLavorazione = movimenti.filter(m => m.stato === 'in_lavorazione').length;
    const spediti = movimenti.filter(m => m.stato === 'spedito').length;
    const consegnati = movimenti.filter(m => m.stato === 'consegnato').length;

    const magazziniStock = magazzini.map(mag => {
      let stock = 0;
      movimenti.filter(m => m.magazzino === mag.id).forEach(m => {
        const qty = parseInt(m.quantita) || 0;
        if (m.tipo === 'entrata') stock += qty;
        else stock -= qty;
      });
      return { ...mag, stock };
    });

    return { 
      totaleUscite, totaleEntrate, spedizioniMese, resiMese, trasferimentiMese,
      inLavorazione, spediti, consegnati, magazziniStock
    };
  }, [movimenti, magazzini]);

  // ===================== HANDLERS =====================
  const handleSaveMovimento = async () => {
    if (!movimentoForm.descrizione || !movimentoForm.quantita) return alert('Compila descrizione e quantità');
    const mov = { 
      id: `log_${Date.now()}`, 
      ...movimentoForm, 
      quantita: Math.abs(parseInt(movimentoForm.quantita)),
      createdAt: new Date().toISOString() 
    };
    await saveMovimenti([...movimenti, mov]);
    setShowNuovoMovimento(false);
    setMovimentoForm({ data: format(new Date(), 'yyyy-MM-dd'), descrizione: '', quantita: '', tipo: 'uscita', categoria: '', destinatario: '', magazzino: '', sku: '', corriere: '', tracking: '', stato: 'in_lavorazione' });
  };

  const handleDeleteMovimento = async (id) => {
    if (!window.confirm('Eliminare questo movimento?')) return;
    await saveMovimenti(movimenti.filter(m => m.id !== id));
  };

  const handleUpdateStato = async (id, nuovoStato) => {
    await saveMovimenti(movimenti.map(m => m.id === id ? { ...m, stato: nuovoStato } : m));
  };

  const handleSaveMagazzino = async () => {
    if (!magazzinoForm.nome) return;
    const newMag = { id: `mag_${Date.now()}`, ...magazzinoForm };
    await saveMagazzini([...magazzini, newMag]);
    setShowNuovoMagazzino(false);
    setMagazzinoForm({ nome: '', indirizzo: '', tipo: 'principale' });
  };

  const handleSaveStore = async () => {
    if (!storeForm.nome) return alert('Inserisci il nome dello store');
    const newStore = { id: `store_${Date.now()}`, ...storeForm };
    await saveStores([...stores, newStore]);
    setShowNuovoStore(false);
    setStoreForm({ nome: '', tipo: 'marketplace', commissione: '' });
  };

  const handleDeleteStore = async (id) => {
    if (!window.confirm('Eliminare questo store?')) return;
    await saveStores(stores.filter(s => s.id !== id));
  };

  const handleSaveSpedizione = async () => {
    if (!spedizioneForm.destinatario) return alert('Inserisci il destinatario');
    const spedizione = { 
      id: `sped_${Date.now()}`, 
      ...spedizioneForm, 
      tipo: 'uscita',
      categoria: 'spedizione_cliente',
      quantita: parseInt(spedizioneForm.quantita) || 1,
      costo: parseFloat(spedizioneForm.costo) || 0,
      createdAt: new Date().toISOString() 
    };
    await saveMovimenti([...movimenti, spedizione]);
    setShowNuovaSpedizione(false);
    setSpedizioneForm({ data: format(new Date(), 'yyyy-MM-dd'), ordineId: '', store: '', destinatario: '', indirizzo: '', prodotti: '', quantita: 1, corriere: '', tracking: '', costo: '', stato: 'in_lavorazione', pagato: false, note: '' });
  };

  const handleTogglePagato = async (id) => {
    await saveMovimenti(movimenti.map(m => m.id === id ? { ...m, pagato: !m.pagato } : m));
  };

  const handleAssegnaStore = async (spedizioneId, storeId) => {
    await saveMovimenti(movimenti.map(m => m.id === spedizioneId ? { ...m, store: storeId } : m));
    setShowAssegnaStore(null);
  };

  const handleAssegnaMassivo = async (storeId) => {
    if (selectedRows.size === 0) return;
    const idsToUpdate = Array.from(selectedRows);
    const updated = movimenti.map(m => {
      if (idsToUpdate.includes(m.id)) {
        return { ...m, store: storeId };
      }
      return m;
    });
    await saveMovimenti(updated);
    setSelectedRows(new Set());
    setShowAssegnaMassivo(false);
    const store = stores.find(s => s.id === storeId);
    alert(`${idsToUpdate.length} spedizioni assegnate a ${store?.nome || 'store'}\n\nLe trovi nella sezione "Per Store"`);
  };

  const handleSelectAllFiltered = () => {
    if (selectedRows.size === spedizioniFiltrate.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(spedizioniFiltrate.map(s => s.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedRows.size === 0) return;
    if (!window.confirm(`Eliminare ${selectedRows.size} spedizioni selezionate?`)) return;
    const idsToDelete = Array.from(selectedRows);
    await saveMovimenti(movimenti.filter(m => !idsToDelete.includes(m.id)));
    setSelectedRows(new Set());
  };

  // Archivia singola spedizione pagata
  const handleArchiviaSingolo = async (id) => {
    await saveMovimenti(movimenti.map(m => m.id === id ? { ...m, archiviato: true, dataArchiviazione: new Date().toISOString() } : m));
  };

  // Gestione pagamento
  const handlePagamento = async (spedizioneId, importoPagato, dataPagamento, note) => {
    const spedizione = movimenti.find(m => m.id === spedizioneId);
    if (!spedizione) return;
    
    const importoBase = parseFloat(spedizione.importo) || 0;
    const costoFisso = parseFloat(spedizione.costoFisso) || 0;
    const totale = importoBase + costoFisso;
    const nuovoImportoPagato = (parseFloat(spedizione.importoPagato) || 0) + parseFloat(importoPagato);
    const pagamentoCompleto = nuovoImportoPagato >= totale;
    
    await saveMovimenti(movimenti.map(m => {
      if (m.id === spedizioneId) {
        return {
          ...m,
          importoPagato: nuovoImportoPagato,
          dataPagamento: dataPagamento || new Date().toISOString().split('T')[0],
          notePagamento: note || m.notePagamento,
          pagato: pagamentoCompleto
        };
      }
      return m;
    }));
    setShowPagamentoModal(null);
  };

  // Aggiungi costi fissi massivi
  const handleAggiungiCostiFissi = async () => {
    const spedizioniDaAggiornare = movimenti.filter(m => 
      m.categoria?.includes('spedizione') && 
      m.store && 
      !m.archiviato && 
      (!m.costoFisso || m.costoFisso === 0)
    );
    
    if (spedizioniDaAggiornare.length === 0) {
      alert('Tutte le spedizioni hanno già un costo fisso assegnato');
      return;
    }
    
    if (!window.confirm(`Aggiungere €${costoPerSpedizione.toFixed(2)} a ${spedizioniDaAggiornare.length} spedizioni?`)) return;
    
    const idsToUpdate = spedizioniDaAggiornare.map(s => s.id);
    await saveMovimenti(movimenti.map(m => {
      if (idsToUpdate.includes(m.id)) {
        return { ...m, costoFisso: costoPerSpedizione };
      }
      return m;
    }));
    
    alert(`Costo €${costoPerSpedizione.toFixed(2)} aggiunto a ${spedizioniDaAggiornare.length} spedizioni`);
    setShowCostiModal(false);
  };

  // Archivia tutte le pagate
  const handleArchiviaTuttePagate = async () => {
    const daArchiviare = movimenti.filter(m => 
      m.categoria?.includes('spedizione') && m.store && !m.archiviato && m.pagato
    );
    
    if (daArchiviare.length === 0) {
      alert('Nessuna spedizione pagata da archiviare');
      return;
    }
    
    if (!window.confirm(`Archiviare ${daArchiviare.length} spedizioni pagate?`)) return;
    
    const idsToArchive = daArchiviare.map(s => s.id);
    await saveMovimenti(movimenti.map(m => {
      if (idsToArchive.includes(m.id)) {
        return { ...m, archiviato: true, dataArchiviazione: new Date().toISOString() };
      }
      return m;
    }));
  };

  // ===================== IMPORT SPEDIZIONI CSV CORRIERE =====================
  const handleSpedizioniFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const lines = event.target.result.split('\n').filter(l => l.trim());
      const separator = lines[0].includes(';') ? ';' : lines[0].includes('\t') ? '\t' : ',';
      const headers = lines[0].split(separator).map(h => h.trim().replace(/"/g, ''));
      setImportSpedHeaders(headers);
      
      const data = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(separator).map(v => v.trim().replace(/"/g, ''));
        if (values.length >= headers.length) {
          const row = {};
          headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
          data.push(row);
        }
      }
      setImportSpedData(data);
      
      // Auto-mapping intelligente per CSV corriere
      const autoMapping = {};
      headers.forEach(h => {
        const hl = h.toLowerCase().replace(/[_\s]/g, '');
        // Centro Costi = E-commerce
        if (hl.includes('centrocost') || hl.includes('ecommerce') || hl.includes('canale') || hl.includes('cliente') || hl.includes('merchant')) autoMapping.centroCosti = h;
        // Numero Ordine
        else if (hl.includes('ordine') || hl.includes('order') || hl.includes('riferimento') || hl.includes('numord')) autoMapping.ordineId = h;
        // Importo Totale
        else if (hl.includes('importototale') || hl.includes('totale') || hl.includes('importo') || hl.includes('costo') || hl.includes('amount')) autoMapping.importo = h;
        // Data
        else if (hl.includes('data') || hl.includes('date')) autoMapping.data = h;
        // Tracking
        else if (hl.includes('tracking') || hl.includes('traccia') || hl.includes('lettera') || hl.includes('spedizione')) autoMapping.tracking = h;
        // Destinatario
        else if (hl.includes('destinatario') || hl.includes('dest') || hl.includes('nome')) autoMapping.destinatario = h;
      });
      setImportSpedMapping(autoMapping);
      setImportSpedStep(2);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleImportSpedizioni = async () => {
    if (!importSpedData.length) return;
    if (!importMeseRiferimento) return alert('Seleziona il mese di riferimento');
    
    const newSpedizioni = importSpedData.map((row, idx) => {
      let dataValue = row[importSpedMapping.data] || '';
      if (dataValue) {
        if (dataValue.includes('/')) {
          const parts = dataValue.split('/');
          if (parts.length === 3) {
            dataValue = parts[2].length === 4 
              ? `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
              : `20${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
          }
        }
      } else {
        dataValue = format(new Date(), 'yyyy-MM-dd');
      }
      
      let importo = row[importSpedMapping.importo] || '0';
      importo = parseFloat(importo.replace(',', '.').replace(/[^\d.-]/g, '')) || 0;
      
      const centroCosti = row[importSpedMapping.centroCosti] || '';
      
      return {
        id: `sped_imp_${Date.now()}_${idx}`,
        data: dataValue,
        meseRiferimento: importMeseRiferimento,
        ordineId: row[importSpedMapping.ordineId] || '',
        centroCosti: centroCosti,
        destinatario: row[importSpedMapping.destinatario] || '',
        tracking: row[importSpedMapping.tracking] || '',
        importo: importo,
        tipo: 'uscita',
        categoria: 'spedizione_cliente',
        stato: 'attivo',
        store: '',
        pagato: false,
        archiviato: false,
        createdAt: new Date().toISOString()
      };
    });
    
    await saveMovimenti([...movimenti, ...newSpedizioni]);
    setShowImportSpedizioni(false);
    setImportSpedStep(1);
    setImportSpedData([]);
    setImportSpedMapping({});
    setImportMeseRiferimento('');
    alert(`Importate ${newSpedizioni.length} spedizioni per ${importMeseRiferimento}.\nOra assegna le spedizioni agli e-commerce dalla tabella.`);
  };

  // Segna come pagato e archivia
  const handlePagaEArchivia = async (storeId, meseRif) => {
    if (!window.confirm(`Confermi il pagamento per questo mese? Le spedizioni verranno archiviate.`)) return;
    const updated = movimenti.map(m => {
      if (m.store === storeId && m.meseRiferimento === meseRif && !m.archiviato) {
        return { ...m, pagato: true, archiviato: true, dataPagamento: new Date().toISOString() };
      }
      return m;
    });
    await saveMovimenti(updated);
    setShowDettaglioMese(null);
  };

  const exportSpedizioni = () => {
    const rows = [['Data', 'Mese Rif.', 'Ordine', 'Centro Costi', 'Store', 'Destinatario', 'Tracking', 'Importo', 'Pagato', 'Archiviato']];
    spedizioniFiltrate.forEach(s => {
      const store = stores.find(st => st.id === s.store);
      rows.push([
        s.data || '',
        s.meseRiferimento || '',
        s.ordineId || '',
        s.centroCosti || '',
        store?.nome || 'Non assegnato',
        s.destinatario || '',
        s.tracking || '',
        (parseFloat(s.importo) || 0).toFixed(2).replace('.', ','),
        s.pagato ? 'Sì' : 'No',
        s.archiviato ? 'Sì' : 'No'
      ]);
    });
    
    const csv = '\uFEFF' + rows.map(r => r.map(c => `"${c}"`).join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `spedizioni_${filterYear}.csv`;
    link.click();
  };

  const handleSaveNuovaCategoria = () => {
    if (!nuovaCategoriaForm.nome) return alert('Inserisci il nome della categoria');
    const gruppo = nuovaCategoriaForm.nuovoGruppo || nuovaCategoriaForm.gruppo;
    if (!gruppo) return alert('Seleziona o crea un gruppo');
    
    const newCat = { id: `catlog_${Date.now()}`, nome: nuovaCategoriaForm.nome, gruppo };

    if (nuovaCategoriaForm.tipo === 'entrata') {
      const updated = [...categorieEntrata, newCat];
      setCategorieEntrata(updated);
      localStorage.setItem('categorie_logistica_entrata', JSON.stringify(updated));
    } else {
      const updated = [...categorieUscita, newCat];
      setCategorieUscita(updated);
      localStorage.setItem('categorie_logistica_uscita', JSON.stringify(updated));
    }

    setShowNuovaCategoria(false);
    setNuovaCategoriaForm({ nome: '', gruppo: '', nuovoGruppo: '', tipo: 'uscita' });
  };

  const handleDeleteCategoria = (catId, tipo) => {
    if (!window.confirm('Eliminare questa categoria?')) return;
    if (tipo === 'entrata') {
      const updated = categorieEntrata.filter(c => c.id !== catId);
      setCategorieEntrata(updated);
      localStorage.setItem('categorie_logistica_entrata', JSON.stringify(updated));
    } else {
      const updated = categorieUscita.filter(c => c.id !== catId);
      setCategorieUscita(updated);
      localStorage.setItem('categorie_logistica_uscita', JSON.stringify(updated));
    }
  };

  // ===================== IMPORT CSV =====================
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const lines = event.target.result.split('\n').filter(l => l.trim());
      const separator = lines[0].includes(';') ? ';' : lines[0].includes('\t') ? '\t' : ',';
      const headers = lines[0].split(separator).map(h => h.trim().replace(/"/g, ''));
      const data = lines.slice(1).map(line => {
        const values = line.split(separator).map(v => v.trim().replace(/"/g, ''));
        const row = {};
        headers.forEach((h, i) => { row[h] = values[i] || ''; });
        return row;
      }).filter(r => Object.values(r).some(v => v));

      setImportHeaders(headers);
      setImportedData(data);
      
      const autoMapping = {
        data: headers.find(h => /data|date/i.test(h)) || '',
        descrizione: headers.find(h => /descr|prodotto|articolo/i.test(h)) || '',
        quantita: headers.find(h => /quantit|qty|pezzi/i.test(h)) || '',
        sku: headers.find(h => /sku|codice|cod/i.test(h)) || '',
        tracking: headers.find(h => /track|spedizione/i.test(h)) || '',
      };
      setImportMapping(autoMapping);
      setImportStep(2);
    };
    reader.readAsText(file);
  };

  const processImport = async () => {
    const processed = importedData.map(row => {
      let dataFormatted = format(new Date(), 'yyyy-MM-dd');
      const dataStr = row[importMapping.data] || '';
      const fmts = [/(\d{2})\/(\d{2})\/(\d{4})/, /(\d{4})-(\d{2})-(\d{2})/];
      for (const fmt of fmts) {
        const match = dataStr.match(fmt);
        if (match) {
          if (fmt === fmts[0]) dataFormatted = `${match[3]}-${match[2]}-${match[1]}`;
          else dataFormatted = `${match[1]}-${match[2]}-${match[3]}`;
          break;
        }
      }

      return { 
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, 
        data: dataFormatted,
        descrizione: row[importMapping.descrizione] || 'Importato', 
        quantita: parseInt(row[importMapping.quantita]) || 1, 
        tipo: 'uscita', 
        categoria: 'spedizione_cliente',
        sku: row[importMapping.sku] || '',
        tracking: row[importMapping.tracking] || '',
        magazzino: importMagazzinoId,
        stato: 'in_lavorazione'
      };
    });
    
    await saveMovimenti([...movimenti, ...processed]);
    setShowImportModal(false);
    setImportStep(1);
    setImportedData([]);
  };

  // ===================== EXPORT =====================
  const exportExcel = () => {
    const headers = ['Data', 'SKU', 'Descrizione', 'Tipo', 'Quantità', 'Magazzino', 'Categoria', 'Destinatario', 'Corriere', 'Tracking', 'Stato'];
    const rows = movimentiFiltrati.map(t => {
      const mag = magazzini.find(m => m.id === t.magazzino);
      const cat = tutteCategorie.find(c => c.id === t.categoria);
      return [
        t.data ? format(new Date(t.data), 'dd/MM/yyyy') : '',
        t.sku || '',
        (t.descrizione || '').replace(/;/g, ','),
        t.tipo === 'entrata' ? 'ENTRATA' : 'USCITA',
        t.quantita || 0,
        mag?.nome || '',
        cat?.nome || '',
        (t.destinatario || '').replace(/;/g, ','),
        t.corriere || '',
        t.tracking || '',
        t.stato || ''
      ];
    });
    
    const BOM = '\uFEFF';
    const csv = BOM + [headers, ...rows].map(r => r.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logistica_${filterYear}_${format(new Date(), 'yyyyMMdd')}.csv`;
    a.click();
  };

  const exportReport = () => {
    const annoSelezionato = parseInt(filterYear);
    const movimentiAnno = movimenti.filter(m => {
      const year = parseInt((m.data || '').substring(0, 4));
      return year === annoSelezionato;
    }).sort((a, b) => new Date(a.data) - new Date(b.data));

    if (movimentiAnno.length === 0) {
      alert('Nessun movimento da esportare per l\'anno ' + annoSelezionato);
      return;
    }

    let totaleEntrate = 0, totaleUscite = 0;
    movimentiAnno.forEach(m => {
      const qty = parseInt(m.quantita) || 0;
      if (m.tipo === 'entrata') totaleEntrate += qty;
      else totaleUscite += qty;
    });

    const rows = [];
    rows.push([`REPORT LOGISTICA ${annoSelezionato}`]);
    rows.push([`Generato il ${format(new Date(), 'dd/MM/yyyy HH:mm')}`]);
    rows.push([]);
    rows.push(['Data', 'SKU', 'Descrizione', 'Tipo', 'Quantità', 'Magazzino', 'Categoria', 'Destinatario', 'Corriere', 'Tracking', 'Stato']);

    movimentiAnno.forEach(t => {
      const mag = magazzini.find(m => m.id === t.magazzino);
      const cat = tutteCategorie.find(c => c.id === t.categoria);
      rows.push([
        t.data ? format(new Date(t.data), 'dd/MM/yyyy') : '',
        t.sku || '',
        (t.descrizione || '').replace(/;/g, ','),
        t.tipo === 'entrata' ? 'ENTRATA' : 'USCITA',
        t.quantita || 0,
        mag?.nome || '',
        cat?.nome || '',
        (t.destinatario || '').replace(/;/g, ','),
        t.corriere || '',
        t.tracking || '',
        t.stato || ''
      ]);
    });

    rows.push([]);
    rows.push(['', '', '', 'TOTALE ENTRATE:', totaleEntrate]);
    rows.push(['', '', '', 'TOTALE USCITE:', totaleUscite]);
    rows.push(['', '', '', 'SALDO:', totaleEntrate - totaleUscite]);

    // Riepilogo per categoria
    rows.push([]);
    rows.push(['--- RIEPILOGO PER CATEGORIA ---']);
    
    const perCategoria = {};
    movimentiAnno.forEach(m => {
      const cat = tutteCategorie.find(c => c.id === m.categoria);
      const key = cat?.nome || 'Altro';
      if (!perCategoria[key]) perCategoria[key] = { entrate: 0, uscite: 0 };
      const qty = parseInt(m.quantita) || 0;
      if (m.tipo === 'entrata') perCategoria[key].entrate += qty;
      else perCategoria[key].uscite += qty;
    });

    rows.push(['Categoria', 'Entrate', 'Uscite', 'Saldo']);
    Object.entries(perCategoria).forEach(([cat, data]) => {
      rows.push([cat, data.entrate, data.uscite, data.entrate - data.uscite]);
    });

    const BOM = '\uFEFF';
    const csv = BOM + rows.map(r => r.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report_logistica_${annoSelezionato}_${format(new Date(), 'yyyyMMdd')}.csv`;
    a.click();
  };

  // ===================== DEMO DATA =====================
  const creaDatiDemo = async () => {
    const demoMagazzini = [
      { id: 'mag_centrale', nome: 'Magazzino Centrale', indirizzo: 'Via Roma 123, Milano', tipo: 'principale' },
      { id: 'mag_eur', nome: 'Negozio EUR', indirizzo: 'Viale Europa 45, Roma', tipo: 'negozio' },
      { id: 'mag_libia', nome: 'Negozio Libia', indirizzo: 'Via Libia 78, Roma', tipo: 'negozio' }
    ];

    const demoStores = [
      { id: 'store_amazon', nome: 'Amazon', tipo: 'marketplace', commissione: '15' },
      { id: 'store_ebay', nome: 'eBay', tipo: 'marketplace', commissione: '12' },
      { id: 'store_shopify', nome: 'Shopify', tipo: 'ecommerce', commissione: '2.9' },
      { id: 'store_subito', nome: 'Subito.it', tipo: 'marketplace', commissione: '5' },
      { id: 'store_negozio', nome: 'Vendita Negozio', tipo: 'fisico', commissione: '0' },
    ];
    
    const oggi = new Date();
    const demoMovimenti = [
      { id: 'log_1', data: format(subMonths(oggi, 1), 'yyyy-MM-dd'), descrizione: 'iPhone 15 Pro Max 256GB', tipo: 'entrata', quantita: 50, categoria: 'carico_fornitore', magazzino: 'mag_centrale', sku: 'IPH15PM256', destinatario: 'Apple Italia', stato: 'consegnato' },
      { id: 'log_2', data: format(subMonths(oggi, 1), 'yyyy-MM-dd'), descrizione: 'Samsung S24 Ultra 512GB', tipo: 'entrata', quantita: 30, categoria: 'carico_fornitore', magazzino: 'mag_centrale', sku: 'SAMS24U512', destinatario: 'Samsung Electronics', stato: 'consegnato' },
      // Spedizioni con store e pagamento
      { id: 'sped_1', data: format(subMonths(oggi, 0), 'yyyy-MM-dd'), ordineId: 'AMZ-001234', descrizione: 'iPhone 15 Pro Max', tipo: 'uscita', quantita: 1, categoria: 'spedizione_cliente', magazzino: 'mag_centrale', sku: 'IPH15PM256', destinatario: 'Mario Rossi', indirizzo: 'Via Verdi 10, Roma', corriere: 'BRT', tracking: 'BRT123456789', costo: 8.50, store: 'store_amazon', stato: 'consegnato', pagato: true },
      { id: 'sped_2', data: format(subMonths(oggi, 0), 'yyyy-MM-dd'), ordineId: 'AMZ-001235', descrizione: 'Samsung S24 Ultra', tipo: 'uscita', quantita: 1, categoria: 'spedizione_cliente', magazzino: 'mag_centrale', sku: 'SAMS24U512', destinatario: 'Luigi Verdi', indirizzo: 'Via Roma 25, Milano', corriere: 'GLS', tracking: 'GLS987654321', costo: 7.90, store: 'store_amazon', stato: 'spedito', pagato: false },
      { id: 'sped_3', data: format(subMonths(oggi, 0), 'yyyy-MM-dd'), ordineId: 'EBAY-5678', descrizione: 'iPhone 14 128GB', tipo: 'uscita', quantita: 1, categoria: 'spedizione_cliente', magazzino: 'mag_centrale', sku: 'IPH14128', destinatario: 'Anna Bianchi', indirizzo: 'Corso Italia 5, Napoli', corriere: 'Poste', tracking: 'PO123456', costo: 6.50, store: 'store_ebay', stato: 'consegnato', pagato: true },
      { id: 'sped_4', data: format(oggi, 'yyyy-MM-dd'), ordineId: 'SHOP-9012', descrizione: 'AirPods Pro 2', tipo: 'uscita', quantita: 2, categoria: 'spedizione_cliente', magazzino: 'mag_centrale', sku: 'APP2', destinatario: 'Paolo Neri', indirizzo: 'Via Dante 100, Firenze', corriere: 'DHL', tracking: 'DHL999888', costo: 12.00, store: 'store_shopify', stato: 'in_lavorazione', pagato: false },
      { id: 'sped_5', data: format(oggi, 'yyyy-MM-dd'), ordineId: 'SUB-3456', descrizione: 'MacBook Air M2', tipo: 'uscita', quantita: 1, categoria: 'spedizione_cliente', magazzino: 'mag_centrale', sku: 'MBAM2', destinatario: 'Giulia Rossi', indirizzo: 'Via Mazzini 50, Bologna', corriere: 'BRT', tracking: 'BRT555666', costo: 15.00, store: 'store_subito', stato: 'spedito', pagato: false },
      { id: 'sped_6', data: format(subMonths(oggi, 1), 'yyyy-MM-dd'), ordineId: 'AMZ-000999', descrizione: 'iPad Pro 11"', tipo: 'uscita', quantita: 1, categoria: 'spedizione_cliente', magazzino: 'mag_centrale', sku: 'IPADP11', destinatario: 'Marco Blu', indirizzo: 'Via Garibaldi 20, Torino', corriere: 'GLS', tracking: 'GLS111222', costo: 9.00, store: 'store_amazon', stato: 'consegnato', pagato: true },
      { id: 'sped_7', data: format(oggi, 'yyyy-MM-dd'), ordineId: 'EBAY-7890', descrizione: 'Apple Watch Series 9', tipo: 'uscita', quantita: 1, categoria: 'spedizione_cliente', magazzino: 'mag_centrale', sku: 'AWS9', destinatario: 'Sara Verde', indirizzo: 'Via XX Settembre 15, Genova', corriere: 'Poste', tracking: 'PO789012', costo: 5.50, store: 'store_ebay', stato: 'in_lavorazione', pagato: false },
      { id: 'sped_8', data: format(subMonths(oggi, 0), 'yyyy-MM-dd'), ordineId: 'NEG-001', descrizione: 'iPhone 15 Pro (vendita negozio)', tipo: 'uscita', quantita: 1, categoria: 'spedizione_cliente', magazzino: 'mag_eur', sku: 'IPH15P', destinatario: 'Cliente Negozio', indirizzo: 'Ritiro in negozio', corriere: '', tracking: '', costo: 0, store: 'store_negozio', stato: 'consegnato', pagato: true },
      // Altri movimenti
      { id: 'log_5', data: format(subMonths(oggi, 0), 'yyyy-MM-dd'), descrizione: 'Trasferimento a negozio EUR', tipo: 'uscita', quantita: 10, categoria: 'trasferimento_negozio', magazzino: 'mag_centrale', destinatario: 'Negozio EUR', stato: 'consegnato' },
      { id: 'log_6', data: format(subMonths(oggi, 0), 'yyyy-MM-dd'), descrizione: 'Trasferimento da centrale', tipo: 'entrata', quantita: 10, categoria: 'trasferimento_in', magazzino: 'mag_eur', destinatario: '', stato: 'consegnato' },
      { id: 'log_7', data: format(oggi, 'yyyy-MM-dd'), descrizione: 'Reso cliente - difettoso', tipo: 'entrata', quantita: 1, categoria: 'reso_cliente', magazzino: 'mag_centrale', sku: 'IPH15PM256', destinatario: 'Paolo Bianchi', stato: 'consegnato' },
      { id: 'log_8', data: format(oggi, 'yyyy-MM-dd'), descrizione: 'Spedizione B2B Azienda XYZ', tipo: 'uscita', quantita: 15, categoria: 'spedizione_b2b', magazzino: 'mag_centrale', destinatario: 'Azienda XYZ Srl', corriere: 'DHL', tracking: 'DHL111222333', stato: 'spedito', costo: 25.00, pagato: true },
    ];

    await saveMagazzini(demoMagazzini);
    await saveStores(demoStores);
    await saveMovimenti(demoMovimenti);
  };

  // ===================== FORMATTERS =====================
  const formatNumber = (val) => (val || 0).toLocaleString('it-IT');

  const getStatoBadge = (stato) => {
    const config = {
      'in_lavorazione': { bg: '#fef3c7', color: '#92400e', label: 'In Lavorazione' },
      'spedito': { bg: '#dbeafe', color: '#1e40af', label: 'Spedito' },
      'consegnato': { bg: '#dcfce7', color: '#166534', label: 'Consegnato' },
      'annullato': { bg: '#fee2e2', color: '#991b1b', label: 'Annullato' },
    };
    const c = config[stato] || config['in_lavorazione'];
    return <span style={{ background: c.bg, color: c.color, padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>{c.label}</span>;
  };

  // ===================== RENDER =====================
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#3b82f6' }} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Header con tabs */}
      <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '0 1.5rem', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: '1800px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 0' }}>
            <div style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Truck className="w-5 h-5" style={{ color: 'white' }} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>Prima Nota Logistica</h1>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>Gestione movimenti magazzino</p>
            </div>
          </div>
          
          <nav style={{ display: 'flex', gap: '0.25rem', marginLeft: 'auto' }}>
            {[
              { id: 'dashboard', label: 'Dashboard', icon: Home },
              { id: 'spedizioni', label: 'Spedizioni', icon: Send },
              { id: 'per-store', label: 'Per Store', icon: ShoppingCart },
              { id: 'movimenti', label: 'Movimenti', icon: Package },
              { id: 'report', label: 'Report', icon: BarChart3 },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.75rem 1.25rem',
                  border: 'none',
                  background: activeTab === tab.id ? '#f1f5f9' : 'transparent',
                  color: activeTab === tab.id ? '#0f172a' : '#64748b',
                  fontWeight: activeTab === tab.id ? 600 : 500,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  borderRadius: '8px',
                  transition: 'all 0.15s'
                }}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>

          {saving && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#3b82f6', fontSize: '0.85rem' }}>
              <Loader2 className="w-4 h-4 animate-spin" /> Salvataggio...
            </div>
          )}
        </div>
      </div>

      <div style={{ maxWidth: '1800px', margin: '0 auto', padding: '1.5rem' }}>

        {/* ==================== DASHBOARD ==================== */}
        {activeTab === 'dashboard' && (
          <div>
            {/* Header con filtri periodo */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2 style={{ margin: '0 0 0.25rem 0', color: '#1e293b', fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Truck className="w-6 h-6" /> Dashboard Spedizioni
                </h2>
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>Panoramica spedizioni e fatturazione store</p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {[
                  { value: '7', label: '7 giorni' },
                  { value: '30', label: '30 giorni' },
                  { value: '90', label: '90 giorni' },
                  { value: 'mese', label: 'Mese' },
                  { value: 'anno', label: 'Anno' },
                  { value: 'tutto', label: 'Tutto' }
                ].map(p => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setDashboardPeriodo(p.value)}
                    style={{
                      padding: '0.5rem 1rem',
                      border: dashboardPeriodo === p.value ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                      borderRadius: '8px',
                      background: dashboardPeriodo === p.value ? '#eff6ff' : 'white',
                      color: dashboardPeriodo === p.value ? '#3b82f6' : '#64748b',
                      fontWeight: dashboardPeriodo === p.value ? 600 : 500,
                      fontSize: '0.85rem',
                      cursor: 'pointer'
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* KPI Principali */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              {/* Totale Spedizioni */}
              <div style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', borderRadius: '14px', padding: '1.25rem', color: 'white' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Send className="w-8 h-8" style={{ opacity: 0.9 }} />
                  <div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>Totale Spedizioni</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{movimenti.filter(m => m.categoria?.includes('spedizione')).length}</div>
                  </div>
                </div>
              </div>

              {/* Da Assegnare */}
              <div style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', borderRadius: '14px', padding: '1.25rem', color: 'white' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Clock className="w-8 h-8" style={{ opacity: 0.9 }} />
                  <div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>Da Assegnare</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{spedizioniFiltrate.length}</div>
                  </div>
                </div>
              </div>

              {/* Totale Da Pagare */}
              <div style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', borderRadius: '14px', padding: '1.25rem', color: 'white' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <TrendingDown className="w-8 h-8" style={{ opacity: 0.9 }} />
                  <div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>Da Incassare</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>€ {Object.values(spedizioniPerStoreMese).reduce((sum, d) => sum + d.totaleDaPagare - d.totalePagato, 0).toFixed(0)}</div>
                  </div>
                </div>
              </div>

              {/* Totale Pagato */}
              <div style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', borderRadius: '14px', padding: '1.25rem', color: 'white' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <TrendingUp className="w-8 h-8" style={{ opacity: 0.9 }} />
                  <div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>Incassato</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>€ {(Object.values(spedizioniPerStoreMese).reduce((sum, d) => sum + d.totalePagato, 0) + Object.values(archivioPerStoreMese).reduce((sum, d) => sum + d.totalePagato, 0)).toFixed(0)}</div>
                  </div>
                </div>
              </div>

              {/* Archiviate */}
              <div style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', borderRadius: '14px', padding: '1.25rem', color: 'white' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <BookOpen className="w-8 h-8" style={{ opacity: 0.9 }} />
                  <div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>Archiviate</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{spedizioniArchiviate.length}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Store che devono pagare */}
            <div style={{ background: 'white', borderRadius: '14px', padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle className="w-5 h-5" style={{ color: '#dc2626' }} /> Store con Pagamenti in Sospeso
              </h3>
              {(() => {
                const storeConDebito = stores.map(store => {
                  const spedStore = Object.values(spedizioniPerStoreMese).filter(s => s.storeId === store.id);
                  const daPagare = spedStore.reduce((sum, s) => sum + s.totaleDaPagare - s.totalePagato, 0);
                  const spedizioni = spedStore.reduce((sum, s) => sum + s.totale, 0);
                  return { ...store, daPagare, spedizioni };
                }).filter(s => s.daPagare > 0).sort((a, b) => b.daPagare - a.daPagare);

                if (storeConDebito.length === 0) {
                  return <div style={{ padding: '1.5rem', textAlign: 'center', color: '#10b981', background: '#f0fdf4', borderRadius: '8px' }}>Nessun pagamento in sospeso</div>;
                }

                return (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
                    {storeConDebito.map(store => {
                      const storeIcons = { marketplace: '🏪', ecommerce: '🛒', fisico: '🏬' };
                      return (
                        <div key={store.id} style={{ background: '#fef2f2', borderRadius: '10px', padding: '1rem', border: '1px solid #fecaca', cursor: 'pointer' }} onClick={() => setActiveTab('per-store')}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ fontSize: '1.25rem' }}>{storeIcons[store.tipo] || '🏪'}</span>
                              <div>
                                <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9rem' }}>{store.nome}</div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{store.spedizioni} spedizioni</div>
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#dc2626' }}>€ {store.daPagare.toFixed(0)}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Grafici Recharts */}
            {(() => {
              const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
              const MESI_IT = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
              
              const formatMeseIT = (mese) => {
                if (!mese) return '';
                const [anno, mm] = mese.split('-');
                const meseIdx = parseInt(mm) - 1;
                return `${MESI_IT[meseIdx]} ${anno}`;
              };

              // Calcolo date per filtro periodo
              const oggi = new Date();
              let dataInizio, dataFine = oggi;
              let dataInizioPrecedente, dataFinePrecedente;
              
              if (dashboardPeriodo === '7') {
                dataInizio = subMonths(oggi, 0); dataInizio = new Date(oggi.getTime() - 7 * 24 * 60 * 60 * 1000);
                dataInizioPrecedente = new Date(oggi.getTime() - 14 * 24 * 60 * 60 * 1000);
                dataFinePrecedente = new Date(oggi.getTime() - 7 * 24 * 60 * 60 * 1000);
              } else if (dashboardPeriodo === '30') {
                dataInizio = new Date(oggi.getTime() - 30 * 24 * 60 * 60 * 1000);
                dataInizioPrecedente = new Date(oggi.getTime() - 60 * 24 * 60 * 60 * 1000);
                dataFinePrecedente = new Date(oggi.getTime() - 30 * 24 * 60 * 60 * 1000);
              } else if (dashboardPeriodo === '90') {
                dataInizio = new Date(oggi.getTime() - 90 * 24 * 60 * 60 * 1000);
                dataInizioPrecedente = new Date(oggi.getTime() - 180 * 24 * 60 * 60 * 1000);
                dataFinePrecedente = new Date(oggi.getTime() - 90 * 24 * 60 * 60 * 1000);
              } else if (dashboardPeriodo === 'mese') {
                dataInizio = startOfMonth(oggi);
                dataFine = endOfMonth(oggi);
                dataInizioPrecedente = startOfMonth(subMonths(oggi, 1));
                dataFinePrecedente = endOfMonth(subMonths(oggi, 1));
              } else if (dashboardPeriodo === 'anno') {
                dataInizio = new Date(oggi.getFullYear(), 0, 1);
                dataFine = new Date(oggi.getFullYear(), 11, 31);
                dataInizioPrecedente = new Date(oggi.getFullYear() - 1, 0, 1);
                dataFinePrecedente = new Date(oggi.getFullYear() - 1, 11, 31);
              } else {
                dataInizio = new Date(2000, 0, 1);
                dataInizioPrecedente = null;
              }

              const isInPeriodo = (dataStr) => {
                if (!dataStr) return true;
                const d = parseISO(dataStr);
                return d >= dataInizio && d <= dataFine;
              };

              const isInPeriodoPrecedente = (dataStr) => {
                if (!dataStr || !dataInizioPrecedente) return false;
                const d = parseISO(dataStr);
                return d >= dataInizioPrecedente && d <= dataFinePrecedente;
              };

              // Filtra spedizioni per periodo
              const spedPeriodo = Object.values(spedizioniPerStoreMese).filter(s => {
                if (dashboardPeriodo === 'tutto') return true;
                const meseRef = s.meseRiferimento;
                if (!meseRef) return false;
                const meseDate = parseISO(meseRef + '-01');
                return meseDate >= dataInizio && meseDate <= dataFine;
              });

              const archPeriodo = Object.values(archivioPerStoreMese).filter(s => {
                if (dashboardPeriodo === 'tutto') return true;
                const meseRef = s.meseRiferimento;
                if (!meseRef) return false;
                const meseDate = parseISO(meseRef + '-01');
                return meseDate >= dataInizio && meseDate <= dataFine;
              });

              const totSpedPeriodo = spedPeriodo.reduce((sum, s) => sum + s.totale, 0) + archPeriodo.reduce((sum, s) => sum + s.totale, 0);
              const totImportoPeriodo = spedPeriodo.reduce((sum, s) => sum + s.importoTotale, 0) + archPeriodo.reduce((sum, s) => sum + s.importoTotale, 0);
              const totPagatoPeriodo = spedPeriodo.reduce((sum, s) => sum + s.totalePagato, 0) + archPeriodo.reduce((sum, s) => sum + s.totalePagato, 0);
              const totDaPagarePeriodo = spedPeriodo.reduce((sum, s) => sum + s.totaleDaPagare - s.totalePagato, 0);

              // Periodo precedente
              const spedPeriodoPrec = dataInizioPrecedente ? Object.values(spedizioniPerStoreMese).filter(s => {
                const meseRef = s.meseRiferimento;
                if (!meseRef) return false;
                const meseDate = parseISO(meseRef + '-01');
                return meseDate >= dataInizioPrecedente && meseDate <= dataFinePrecedente;
              }) : [];

              const archPeriodoPrec = dataInizioPrecedente ? Object.values(archivioPerStoreMese).filter(s => {
                const meseRef = s.meseRiferimento;
                if (!meseRef) return false;
                const meseDate = parseISO(meseRef + '-01');
                return meseDate >= dataInizioPrecedente && meseDate <= dataFinePrecedente;
              }) : [];

              const totSpedPeriodoPrec = spedPeriodoPrec.reduce((sum, s) => sum + s.totale, 0) + archPeriodoPrec.reduce((sum, s) => sum + s.totale, 0);
              const totImportoPeriodoPrec = spedPeriodoPrec.reduce((sum, s) => sum + s.importoTotale, 0) + archPeriodoPrec.reduce((sum, s) => sum + s.importoTotale, 0);
              const totPagatoPeriodoPrec = spedPeriodoPrec.reduce((sum, s) => sum + s.totalePagato, 0) + archPeriodoPrec.reduce((sum, s) => sum + s.totalePagato, 0);

              const calcVariazione = (attuale, precedente) => {
                if (precedente === 0) return attuale > 0 ? 100 : 0;
                return ((attuale - precedente) / precedente) * 100;
              };

              const variazioneSpedizioni = calcVariazione(totSpedPeriodo, totSpedPeriodoPrec);
              const variazioneImporto = calcVariazione(totImportoPeriodo, totImportoPeriodoPrec);
              const variazionePagato = calcVariazione(totPagatoPeriodo, totPagatoPeriodoPrec);
              
              const pieDataSpedizioni = stores.map((store, idx) => {
                const spedStore = Object.values(spedizioniPerStoreMese).filter(s => s.storeId === store.id);
                const archStore = Object.values(archivioPerStoreMese).filter(s => s.storeId === store.id);
                const totale = spedStore.reduce((sum, s) => sum + s.totale, 0) + archStore.reduce((sum, s) => sum + s.totale, 0);
                return { name: store.nome, value: totale, color: COLORS[idx % COLORS.length] };
              }).filter(d => d.value > 0);
              
              const pieDataImporti = stores.map((store, idx) => {
                const spedStore = Object.values(spedizioniPerStoreMese).filter(s => s.storeId === store.id);
                const archStore = Object.values(archivioPerStoreMese).filter(s => s.storeId === store.id);
                const totale = spedStore.reduce((sum, s) => sum + s.importoTotale + s.costoLogistica, 0) + archStore.reduce((sum, s) => sum + s.importoTotale + s.costoLogistica, 0);
                return { name: store.nome, value: totale, color: COLORS[idx % COLORS.length] };
              }).filter(d => d.value > 0);

              const allMesi = [...new Set([
                ...Object.values(spedizioniPerStoreMese).map(s => s.meseRiferimento),
                ...Object.values(archivioPerStoreMese).map(s => s.meseRiferimento)
              ])].filter(Boolean).sort();

              const lineDataAndamento = allMesi.map(mese => {
                const dataPoint = { mese: mese, meseLabel: formatMeseIT(mese) };
                let totaleSpedizioni = 0;
                let totaleImporto = 0;
                let totalePagato = 0;
                
                stores.forEach(store => {
                  const spedMeseStore = Object.values(spedizioniPerStoreMese).filter(s => s.storeId === store.id && s.meseRiferimento === mese);
                  const archMeseStore = Object.values(archivioPerStoreMese).filter(s => s.storeId === store.id && s.meseRiferimento === mese);
                  const storeSpedizioni = spedMeseStore.reduce((sum, s) => sum + s.totale, 0) + archMeseStore.reduce((sum, s) => sum + s.totale, 0);
                  const storeImporto = spedMeseStore.reduce((sum, s) => sum + s.totaleDaPagare, 0) + archMeseStore.reduce((sum, s) => sum + s.totaleDaPagare, 0);
                  const storePagato = spedMeseStore.reduce((sum, s) => sum + s.totalePagato, 0) + archMeseStore.reduce((sum, s) => sum + s.totalePagato, 0);
                  
                  dataPoint[store.nome] = storeSpedizioni;
                  totaleSpedizioni += storeSpedizioni;
                  totaleImporto += storeImporto;
                  totalePagato += storePagato;
                });
                
                dataPoint.totaleSpedizioni = totaleSpedizioni;
                dataPoint.totaleImporto = totaleImporto;
                dataPoint.totalePagato = totalePagato;
                return dataPoint;
              });

              const barDataStore = stores.map((store, idx) => {
                const spedStore = Object.values(spedizioniPerStoreMese).filter(s => s.storeId === store.id);
                const archStore = Object.values(archivioPerStoreMese).filter(s => s.storeId === store.id);
                return {
                  name: store.nome,
                  attive: spedStore.reduce((sum, s) => sum + s.totale, 0),
                  archiviate: archStore.reduce((sum, s) => sum + s.totale, 0),
                  daPagare: spedStore.reduce((sum, s) => sum + s.totaleDaPagare - s.totalePagato, 0),
                  pagato: spedStore.reduce((sum, s) => sum + s.totalePagato, 0) + archStore.reduce((sum, s) => sum + s.totalePagato, 0),
                  color: COLORS[idx % COLORS.length]
                };
              });

              const CustomTooltip = ({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div style={{ background: 'white', padding: '0.75rem', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', border: '1px solid #e2e8f0' }}>
                      <p style={{ margin: '0 0 0.5rem 0', fontWeight: 600, color: '#1e293b' }}>{label}</p>
                      {payload.map((entry, index) => (
                        <p key={index} style={{ margin: '0.25rem 0', fontSize: '0.85rem', color: entry.color }}>
                          {entry.name}: {typeof entry.value === 'number' && entry.name.includes('€') ? `€ ${entry.value.toFixed(2)}` : entry.value}
                        </p>
                      ))}
                    </div>
                  );
                }
                return null;
              };

              return (
                <>
                  {/* Confronto Periodi */}
                  {dashboardPeriodo !== 'tutto' && (
                    <div style={{ background: 'white', borderRadius: '14px', padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
                      <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        📊 Confronto con Periodo Precedente
                        <span style={{ fontSize: '0.8rem', fontWeight: 400, color: '#64748b' }}>
                          ({dashboardPeriodo === '7' ? 'vs 7 gg prima' : dashboardPeriodo === '30' ? 'vs 30 gg prima' : dashboardPeriodo === '90' ? 'vs 90 gg prima' : dashboardPeriodo === 'mese' ? 'vs mese scorso' : 'vs anno scorso'})
                        </span>
                      </h3>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                        {/* Spedizioni */}
                        <div style={{ padding: '1rem', background: '#eff6ff', borderRadius: '10px', border: '1px solid #bfdbfe' }}>
                          <div style={{ fontSize: '0.8rem', color: '#1e40af', marginBottom: '0.5rem' }}>Spedizioni</div>
                          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#3b82f6' }}>{totSpedPeriodo}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                            {variazioneSpedizioni >= 0 ? (
                              <TrendingUp className="w-4 h-4" style={{ color: '#10b981' }} />
                            ) : (
                              <TrendingDown className="w-4 h-4" style={{ color: '#ef4444' }} />
                            )}
                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: variazioneSpedizioni >= 0 ? '#10b981' : '#ef4444' }}>
                              {variazioneSpedizioni >= 0 ? '+' : ''}{variazioneSpedizioni.toFixed(1)}%
                            </span>
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              (erano {totSpedPeriodoPrec})
                            </span>
                          </div>
                        </div>

                        {/* Fatturato */}
                        <div style={{ padding: '1rem', background: '#f0fdf4', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
                          <div style={{ fontSize: '0.8rem', color: '#166534', marginBottom: '0.5rem' }}>Fatturato</div>
                          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981' }}>€ {totImportoPeriodo.toFixed(0)}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                            {variazioneImporto >= 0 ? (
                              <TrendingUp className="w-4 h-4" style={{ color: '#10b981' }} />
                            ) : (
                              <TrendingDown className="w-4 h-4" style={{ color: '#ef4444' }} />
                            )}
                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: variazioneImporto >= 0 ? '#10b981' : '#ef4444' }}>
                              {variazioneImporto >= 0 ? '+' : ''}{variazioneImporto.toFixed(1)}%
                            </span>
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              (era € {totImportoPeriodoPrec.toFixed(0)})
                            </span>
                          </div>
                        </div>

                        {/* Incassato */}
                        <div style={{ padding: '1rem', background: '#dcfce7', borderRadius: '10px', border: '1px solid #86efac' }}>
                          <div style={{ fontSize: '0.8rem', color: '#166534', marginBottom: '0.5rem' }}>Incassato</div>
                          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#16a34a' }}>€ {totPagatoPeriodo.toFixed(0)}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                            {variazionePagato >= 0 ? (
                              <TrendingUp className="w-4 h-4" style={{ color: '#10b981' }} />
                            ) : (
                              <TrendingDown className="w-4 h-4" style={{ color: '#ef4444' }} />
                            )}
                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: variazionePagato >= 0 ? '#10b981' : '#ef4444' }}>
                              {variazionePagato >= 0 ? '+' : ''}{variazionePagato.toFixed(1)}%
                            </span>
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              (era € {totPagatoPeriodoPrec.toFixed(0)})
                            </span>
                          </div>
                        </div>

                        {/* Da Incassare */}
                        <div style={{ padding: '1rem', background: '#fef2f2', borderRadius: '10px', border: '1px solid #fecaca' }}>
                          <div style={{ fontSize: '0.8rem', color: '#991b1b', marginBottom: '0.5rem' }}>Da Incassare</div>
                          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ef4444' }}>€ {totDaPagarePeriodo.toFixed(0)}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem' }}>
                            Periodo corrente
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Prima riga: Torte */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                    {/* Pie Chart - Spedizioni per Store */}
                    <div style={{ background: 'white', borderRadius: '14px', padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
                      <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        📊 Spedizioni per Store
                      </h3>
                      {pieDataSpedizioni.length > 0 ? (
                        <ResponsiveContainer width="100%" height={280}>
                          <PieChart>
                            <Pie
                              data={pieDataSpedizioni}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={100}
                              paddingAngle={3}
                              dataKey="value"
                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                              labelLine={{ stroke: '#94a3b8', strokeWidth: 1 }}
                            >
                              {pieDataSpedizioni.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} stroke="white" strokeWidth={2} />
                              ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>Nessun dato</div>
                      )}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center', marginTop: '0.5rem' }}>
                        {pieDataSpedizioni.map((entry, index) => (
                          <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem' }}>
                            <span style={{ width: '10px', height: '10px', background: entry.color, borderRadius: '2px' }}></span>
                            <span style={{ color: '#64748b' }}>{entry.name}: {entry.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Pie Chart - Importi per Store */}
                    <div style={{ background: 'white', borderRadius: '14px', padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
                      <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        💰 Fatturato per Store
                      </h3>
                      {pieDataImporti.length > 0 ? (
                        <ResponsiveContainer width="100%" height={280}>
                          <PieChart>
                            <Pie
                              data={pieDataImporti}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={100}
                              paddingAngle={3}
                              dataKey="value"
                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                              labelLine={{ stroke: '#94a3b8', strokeWidth: 1 }}
                            >
                              {pieDataImporti.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} stroke="white" strokeWidth={2} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => `€ ${value.toFixed(2)}`} />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>Nessun dato</div>
                      )}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center', marginTop: '0.5rem' }}>
                        {pieDataImporti.map((entry, index) => (
                          <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem' }}>
                            <span style={{ width: '10px', height: '10px', background: entry.color, borderRadius: '2px' }}></span>
                            <span style={{ color: '#64748b' }}>{entry.name}: €{entry.value.toFixed(0)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Seconda riga: Grafico a linea andamento mensile */}
                  <div style={{ background: 'white', borderRadius: '14px', padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
                    <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      📈 Andamento Spedizioni per Mese
                    </h3>
                    {lineDataAndamento.length > 0 ? (
                      <ResponsiveContainer width="100%" height={320}>
                        <LineChart data={lineDataAndamento} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="meseLabel" tick={{ fontSize: 11, fill: '#64748b' }} />
                          <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend wrapperStyle={{ fontSize: '0.85rem' }} />
                          {stores.map((store, idx) => (
                            <Line 
                              key={store.id}
                              type="monotone" 
                              dataKey={store.nome} 
                              stroke={COLORS[idx % COLORS.length]} 
                              strokeWidth={2.5}
                              dot={{ fill: COLORS[idx % COLORS.length], strokeWidth: 2, r: 4 }}
                              activeDot={{ r: 6 }}
                            />
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div style={{ height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>Nessun dato mensile disponibile</div>
                    )}
                  </div>

                  {/* Terza riga: Bar Chart + Riepilogo */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                    {/* Bar Chart - Spedizioni Attive vs Archiviate */}
                    <div style={{ background: 'white', borderRadius: '14px', padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
                      <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        📦 Spedizioni Attive vs Archiviate
                      </h3>
                      {barDataStore.length > 0 ? (
                        <ResponsiveContainer width="100%" height={280}>
                          <BarChart data={barDataStore} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                            <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ fontSize: '0.85rem' }} />
                            <Bar dataKey="attive" name="Attive" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="archiviate" name="Archiviate" fill="#10b981" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>Nessun dato</div>
                      )}
                    </div>

                    {/* Area Chart - Pagato vs Da Pagare */}
                    <div style={{ background: 'white', borderRadius: '14px', padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
                      <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        💳 Incassato vs Da Incassare per Mese
                      </h3>
                      {lineDataAndamento.length > 0 ? (
                        <ResponsiveContainer width="100%" height={280}>
                          <AreaChart data={lineDataAndamento} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
                            <defs>
                              <linearGradient id="colorPagato" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                              </linearGradient>
                              <linearGradient id="colorImporto" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="meseLabel" tick={{ fontSize: 11, fill: '#64748b' }} />
                            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v) => `€${v}`} />
                            <Tooltip formatter={(value) => `€ ${value.toFixed(2)}`} />
                            <Legend wrapperStyle={{ fontSize: '0.85rem' }} />
                            <Area type="monotone" dataKey="totaleImporto" name="Da Incassare" stroke="#ef4444" fillOpacity={1} fill="url(#colorImporto)" />
                            <Area type="monotone" dataKey="totalePagato" name="Incassato" stroke="#10b981" fillOpacity={1} fill="url(#colorPagato)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : (
                        <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>Nessun dato mensile disponibile</div>
                      )}
                    </div>
                  </div>

                  {/* Riepilogo Finanziario */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                    <div style={{ background: 'white', borderRadius: '14px', padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
                      <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <TrendingUp className="w-5 h-5" style={{ color: '#10b981' }} /> Riepilogo Finanziario
                      </h3>
                      {(() => {
                        const totSpedizioni = Object.values(spedizioniPerStoreMese).reduce((sum, d) => sum + d.importoTotale, 0) + Object.values(archivioPerStoreMese).reduce((sum, d) => sum + d.importoTotale, 0);
                        const totLogistica = Object.values(spedizioniPerStoreMese).reduce((sum, d) => sum + d.costoLogistica, 0) + Object.values(archivioPerStoreMese).reduce((sum, d) => sum + d.costoLogistica, 0);
                        const totDaPagare = Object.values(spedizioniPerStoreMese).reduce((sum, d) => sum + d.totaleDaPagare, 0);
                        const totPagato = Object.values(spedizioniPerStoreMese).reduce((sum, d) => sum + d.totalePagato, 0) + Object.values(archivioPerStoreMese).reduce((sum, d) => sum + d.totalePagato, 0);
                        const totArchiviato = Object.values(archivioPerStoreMese).reduce((sum, d) => sum + d.totaleDaPagare, 0);

                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: '#f8fafc', borderRadius: '8px' }}>
                              <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Totale Spedizioni</span>
                              <span style={{ fontWeight: 700, color: '#1e293b' }}>€ {totSpedizioni.toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: '#fef3c7', borderRadius: '8px' }}>
                              <span style={{ color: '#92400e', fontSize: '0.9rem' }}>Costo Logistica</span>
                              <span style={{ fontWeight: 700, color: '#f59e0b' }}>€ {totLogistica.toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: '#fef2f2', borderRadius: '8px' }}>
                              <span style={{ color: '#991b1b', fontSize: '0.9rem' }}>Da Incassare</span>
                              <span style={{ fontWeight: 700, color: '#dc2626' }}>€ {(totDaPagare - Object.values(spedizioniPerStoreMese).reduce((sum, d) => sum + d.totalePagato, 0)).toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: '#dcfce7', borderRadius: '8px' }}>
                              <span style={{ color: '#166534', fontSize: '0.9rem' }}>Totale Incassato</span>
                              <span style={{ fontWeight: 700, color: '#10b981' }}>€ {totPagato.toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #86efac' }}>
                              <span style={{ color: '#166534', fontSize: '0.9rem', fontWeight: 600 }}>Archiviato</span>
                              <span style={{ fontWeight: 700, color: '#10b981' }}>€ {totArchiviato.toFixed(2)}</span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Riepilogo per Store */}
                    <div style={{ background: 'white', borderRadius: '14px', padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
                      <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        🏪 Dettaglio per Store
                      </h3>
                      <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                        {barDataStore.map((store, idx) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', borderBottom: '1px solid #f1f5f9' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ width: '10px', height: '10px', background: store.color, borderRadius: '2px' }}></span>
                              <span style={{ fontWeight: 500, color: '#1e293b' }}>{store.name}</span>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem' }}>
                              <span style={{ color: '#3b82f6' }}>{store.attive + store.archiviate} sped.</span>
                              <span style={{ color: store.daPagare > 0 ? '#ef4444' : '#10b981', fontWeight: 600 }}>
                                {store.daPagare > 0 ? `-€${store.daPagare.toFixed(0)}` : `✓ €${store.pagato.toFixed(0)}`}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}

            {/* Lista Store */}
            <div style={{ background: 'white', borderRadius: '14px', padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ShoppingCart className="w-5 h-5" style={{ color: '#3b82f6' }} /> Store Configurati
                </h3>
                <button type="button" onClick={() => setShowNuovoStore(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.75rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500, fontSize: '0.85rem' }}>
                  <Plus className="w-4 h-4" /> Nuovo
                </button>
              </div>
              
              {stores.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: '8px' }}>
                  <ShoppingCart className="w-10 h-10 mx-auto" style={{ marginBottom: '0.75rem', opacity: 0.5 }} />
                  <p style={{ marginBottom: '0.75rem', fontSize: '0.9rem' }}>Nessuno store configurato</p>
                  <button type="button" onClick={creaDatiDemo} style={{ padding: '0.5rem 1rem', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer' }}>Carica Dati Demo</button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
                  {stores.map(store => {
                    const spedStore = Object.values(spedizioniPerStoreMese).filter(s => s.storeId === store.id);
                    const totale = spedStore.reduce((sum, s) => sum + s.totale, 0);
                    const daPagare = spedStore.reduce((sum, s) => sum + s.totaleDaPagare - s.totalePagato, 0);
                    const storeIcons = { marketplace: '🏪', ecommerce: '🛒', fisico: '🏬' };
                    return (
                      <div key={store.id} style={{ background: '#f8fafc', borderRadius: '10px', padding: '0.75rem', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <span style={{ fontSize: '1.1rem' }}>{storeIcons[store.tipo] || '🏪'}</span>
                          <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9rem' }}>{store.nome}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <div style={{ flex: 1, textAlign: 'center', padding: '0.4rem', background: 'white', borderRadius: '6px' }}>
                            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#3b82f6' }}>{totale}</div>
                            <div style={{ fontSize: '0.65rem', color: '#64748b' }}>sped.</div>
                          </div>
                          <div style={{ flex: 1, textAlign: 'center', padding: '0.4rem', background: daPagare > 0 ? '#fef2f2' : '#dcfce7', borderRadius: '6px' }}>
                            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: daPagare > 0 ? '#dc2626' : '#10b981' }}>€{daPagare.toFixed(0)}</div>
                            <div style={{ fontSize: '0.65rem', color: '#64748b' }}>da inc.</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Gestione Categorie */}
            <div style={{ background: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <BookOpen className="w-5 h-5" /> Categorie Logistica
                </h3>
                <button type="button" onClick={() => setShowNuovaCategoria(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 500, fontSize: '0.9rem' }}>
                  <Plus className="w-4 h-4" /> Nuova Categoria
                </button>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                {/* Categorie Entrata */}
                <div>
                  <h4 style={{ margin: '0 0 0.75rem 0', color: '#16a34a', fontSize: '0.95rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ArrowDownRight className="w-4 h-4" /> Entrate ({categorieEntrata.length})
                  </h4>
                  <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                    {[...new Set(categorieEntrata.map(c => c.gruppo))].map(gruppo => (
                      <div key={gruppo}>
                        <div style={{ padding: '0.5rem 0.75rem', background: '#ecfdf5', fontWeight: 600, fontSize: '0.8rem', color: '#166534', borderBottom: '1px solid #d1fae5' }}>{gruppo}</div>
                        {categorieEntrata.filter(c => c.gruppo === gruppo).map(cat => (
                          <div key={cat.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', borderBottom: '1px solid #f1f5f9', fontSize: '0.85rem' }}>
                            <span style={{ color: '#374151' }}>{cat.nome}</span>
                            {cat.id.startsWith('catlog_') && (
                              <button type="button" onClick={() => handleDeleteCategoria(cat.id, 'entrata')} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.25rem' }} title="Elimina">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Categorie Uscita */}
                <div>
                  <h4 style={{ margin: '0 0 0.75rem 0', color: '#dc2626', fontSize: '0.95rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ArrowUpRight className="w-4 h-4" /> Uscite ({categorieUscita.length})
                  </h4>
                  <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                    {[...new Set(categorieUscita.map(c => c.gruppo))].map(gruppo => (
                      <div key={gruppo}>
                        <div style={{ padding: '0.5rem 0.75rem', background: '#fef2f2', fontWeight: 600, fontSize: '0.8rem', color: '#991b1b', borderBottom: '1px solid #fecaca' }}>{gruppo}</div>
                        {categorieUscita.filter(c => c.gruppo === gruppo).map(cat => (
                          <div key={cat.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', borderBottom: '1px solid #f1f5f9', fontSize: '0.85rem' }}>
                            <span style={{ color: '#374151' }}>{cat.nome}</span>
                            {cat.id.startsWith('catlog_') && (
                              <button type="button" onClick={() => handleDeleteCategoria(cat.id, 'uscita')} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.25rem' }} title="Elimina">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== SPEDIZIONI ==================== */}
        {activeTab === 'spedizioni' && (
          <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Send className="w-6 h-6" style={{ color: '#f59e0b' }} /> Spedizioni Corriere
                </h2>
                <span style={{ color: '#64748b', fontSize: '0.9rem', background: '#f1f5f9', padding: '0.25rem 0.75rem', borderRadius: '20px' }}>{spedizioniFiltrate.length} attive</span>
                {selectedRows.size > 0 && (
                  <span style={{ color: '#3b82f6', fontSize: '0.9rem', background: '#dbeafe', padding: '0.25rem 0.75rem', borderRadius: '20px', fontWeight: 600 }}>
                    {selectedRows.size} selezionate
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {selectedRows.size > 0 && (
                  <>
                    <button type="button" onClick={() => setShowAssegnaMassivo(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white', border: 'none', padding: '0.6rem 1rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                      <ShoppingCart className="w-4 h-4" /> Assegna ({selectedRows.size})
                    </button>
                    <button type="button" onClick={handleDeleteSelected} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: 'white', border: 'none', padding: '0.6rem 1rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                      <Trash2 className="w-4 h-4" /> Elimina
                    </button>
                  </>
                )}
                <button type="button" onClick={() => setShowArchivio(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'white', color: '#475569', border: '1.5px solid #e2e8f0', padding: '0.6rem 1rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                  <BookOpen className="w-4 h-4" /> Archivio ({spedizioniArchiviate.length})
                </button>
                <button type="button" onClick={exportSpedizioni} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'white', color: '#475569', border: '1.5px solid #e2e8f0', padding: '0.6rem 1rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                  <Download className="w-4 h-4" /> Esporta
                </button>
                <button type="button" onClick={() => setShowImportSpedizioni(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white', border: 'none', padding: '0.6rem 1.25rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                  <Upload className="w-4 h-4" /> Importa CSV
                </button>
              </div>
            </div>

            {/* Filtri */}
            <div style={{ background: 'white', borderRadius: '12px', padding: '1rem 1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', alignItems: 'end' }}>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>
                    📅 Mese Riferimento
                  </label>
                  <select value={filterMeseRif} onChange={e => setFilterMeseRif(e.target.value)} style={{ width: '100%', padding: '0.6rem', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem' }}>
                    <option value="all">Tutti i mesi</option>
                    {mesiRiferimentoUnici.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>
                    🏷️ Centro Costi
                  </label>
                  <select value={filterCentroCosti} onChange={e => setFilterCentroCosti(e.target.value)} style={{ width: '100%', padding: '0.6rem', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem' }}>
                    <option value="all">Tutti</option>
                    {centriCostiUnici.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>
                    <Search className="w-4 h-4" /> Cerca
                  </label>
                  <input type="text" value={filterSearch} onChange={e => setFilterSearch(e.target.value)} placeholder="Ordine, tracking..." style={{ width: '100%', padding: '0.6rem', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem' }} />
                </div>
              </div>
            </div>

            {/* KPI Spedizioni */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ background: '#fef3c7', borderRadius: '12px', padding: '1.25rem', border: '2px solid #f59e0b' }}>
                <div style={{ fontSize: '0.85rem', color: '#92400e', marginBottom: '0.5rem' }}>📦 Da Assegnare</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#92400e' }}>{spedizioniFiltrate.length}</div>
              </div>
              <div style={{ background: 'white', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem' }}>Importo Totale</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#dc2626' }}>€ {spedizioniFiltrate.reduce((sum, s) => sum + (parseFloat(s.importo) || 0), 0).toFixed(2)}</div>
              </div>
              <div style={{ background: '#dbeafe', borderRadius: '12px', padding: '1.25rem' }}>
                <div style={{ fontSize: '0.85rem', color: '#1e40af', marginBottom: '0.5rem' }}>Già Assegnate (in Per Store)</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e40af' }}>{movimenti.filter(m => m.categoria?.includes('spedizione') && m.store && !m.archiviato).length}</div>
              </div>
            </div>

            {/* Tabella Spedizioni */}
            <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              {/* Header tabella con checkbox seleziona tutti */}
              <div style={{ display: 'flex', alignItems: 'center', padding: '0.75rem 1.5rem', borderBottom: '2px solid #e2e8f0', background: '#f8fafc', gap: '1rem' }}>
                <div style={{ minWidth: '30px' }}>
                  <input type="checkbox" checked={selectedRows.size === spedizioniFiltrate.length && spedizioniFiltrate.length > 0} onChange={handleSelectAllFiltered} style={{ width: '18px', height: '18px', cursor: 'pointer' }} title="Seleziona tutti filtrati" />
                </div>
                <div style={{ minWidth: '90px', fontWeight: 600, fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase' }}>Mese Rif.</div>
                <div style={{ minWidth: '120px', fontWeight: 600, fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase' }}>Ordine</div>
                <div style={{ minWidth: '140px', fontWeight: 600, fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase' }}>Centro Costi</div>
                <div style={{ flex: 1, fontWeight: 600, fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase' }}>Destinatario</div>
                <div style={{ minWidth: '130px', fontWeight: 600, fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase' }}>Tracking</div>
                <div style={{ minWidth: '100px', textAlign: 'right', fontWeight: 600, fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase' }}>Importo</div>
                <div style={{ minWidth: '40px' }}></div>
              </div>

              {spedizioniFiltrate.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                  <Send className="w-12 h-12 mx-auto" style={{ marginBottom: '1rem', opacity: 0.5 }} />
                  <p style={{ marginBottom: '1rem' }}>Nessuna spedizione trovata</p>
                  <button type="button" onClick={() => setShowImportSpedizioni(true)} style={{ padding: '0.75rem 1.5rem', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                    Importa CSV Corriere
                  </button>
                </div>
              ) : (
                <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                  {spedizioniFiltrate.map(s => {
                    const isSelected = selectedRows.has(s.id);
                    return (
                      <div key={s.id} style={{ display: 'flex', alignItems: 'center', padding: '0.6rem 1.5rem', borderBottom: '1px solid #f1f5f9', gap: '1rem', background: isSelected ? '#eff6ff' : 'white' }}
                        onMouseOver={e => { if (!isSelected) e.currentTarget.style.background = '#f8fafc'; }}
                        onMouseOut={e => { if (!isSelected) e.currentTarget.style.background = 'white'; }}>
                        <div style={{ minWidth: '30px' }}>
                          <input type="checkbox" checked={isSelected} onChange={e => { const newSet = new Set(selectedRows); if (e.target.checked) newSet.add(s.id); else newSet.delete(s.id); setSelectedRows(newSet); }} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                        </div>
                        <div style={{ minWidth: '90px', color: '#1e293b', fontSize: '0.85rem', fontWeight: 600 }}>{s.meseRiferimento || '-'}</div>
                        <div style={{ minWidth: '120px', color: '#64748b', fontSize: '0.8rem', fontFamily: 'monospace' }}>{s.ordineId || '-'}</div>
                        <div style={{ minWidth: '140px', color: '#475569', fontSize: '0.85rem', fontWeight: 500 }}>{s.centroCosti || '-'}</div>
                        <div style={{ flex: 1, color: '#1e293b', fontSize: '0.85rem' }}>{s.destinatario || '-'}</div>
                        <div style={{ minWidth: '130px', color: '#3b82f6', fontSize: '0.8rem', fontFamily: 'monospace' }}>{s.tracking || '-'}</div>
                        <div style={{ minWidth: '100px', textAlign: 'right', fontWeight: 700, color: '#dc2626', fontSize: '0.9rem' }}>€ {(parseFloat(s.importo) || 0).toFixed(2)}</div>
                        <div style={{ minWidth: '40px', textAlign: 'center' }}>
                          <button type="button" onClick={() => handleDeleteMovimento(s.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.25rem' }} title="Elimina">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== PER STORE ==================== */}
        {activeTab === 'per-store' && (
          <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ShoppingCart className="w-6 h-6" style={{ color: '#3b82f6' }} /> Fatturazione E-commerce
                </h2>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button type="button" onClick={() => setShowArchivio(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'white', color: '#475569', border: '1.5px solid #e2e8f0', padding: '0.6rem 1rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                  <BookOpen className="w-4 h-4" /> Archivio ({spedizioniArchiviate.length})
                </button>
                <button type="button" onClick={() => setShowNuovoStore(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#3b82f6', color: 'white', border: 'none', padding: '0.6rem 1rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                  <Plus className="w-4 h-4" /> Nuovo Store
                </button>
              </div>
            </div>

            {/* Filtri */}
            <div style={{ background: 'white', borderRadius: '12px', padding: '1rem 1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', alignItems: 'end' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>Store</label>
                  <select value={filterStore} onChange={e => setFilterStore(e.target.value)} style={{ width: '100%', padding: '0.6rem', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem' }}>
                    <option value="all">Tutti gli store</option>
                    {stores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>Stato</label>
                  <select value={filterPagato} onChange={e => setFilterPagato(e.target.value)} style={{ width: '100%', padding: '0.6rem', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem' }}>
                    <option value="all">Tutti</option>
                    <option value="non_pagato">Da Pagare</option>
                    <option value="parziale">Parziale</option>
                    <option value="pagato">Pagato</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>Mese</label>
                  <select value={filterMeseRif} onChange={e => setFilterMeseRif(e.target.value)} style={{ width: '100%', padding: '0.6rem', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem' }}>
                    <option value="all">Tutti</option>
                    {mesiRiferimentoUnici.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Tabella Store/Mese */}
            <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              {/* Header Tabella */}
              <div style={{ display: 'flex', alignItems: 'center', padding: '0.85rem 1.5rem', borderBottom: '2px solid #e2e8f0', background: '#f8fafc', gap: '1rem' }}>
                <div style={{ minWidth: '140px', fontWeight: 600, fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase' }}>Store</div>
                <div style={{ minWidth: '100px', fontWeight: 600, fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase' }}>Mese</div>
                <div style={{ minWidth: '80px', textAlign: 'center', fontWeight: 600, fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase' }}>Spedizioni</div>
                <div style={{ minWidth: '100px', textAlign: 'right', fontWeight: 600, fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase' }}>Importo</div>
                <div style={{ minWidth: '100px', textAlign: 'right', fontWeight: 600, fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase' }}>Costo Log.</div>
                <div style={{ minWidth: '110px', textAlign: 'right', fontWeight: 600, fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase' }}>Totale</div>
                <div style={{ minWidth: '100px', textAlign: 'center', fontWeight: 600, fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase' }}>Data</div>
                <div style={{ minWidth: '120px', textAlign: 'center', fontWeight: 600, fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase' }}>Stato</div>
                <div style={{ minWidth: '100px', textAlign: 'center', fontWeight: 600, fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase' }}>Data Pag.</div>
                <div style={{ minWidth: '100px', textAlign: 'center', fontWeight: 600, fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase' }}>Azioni</div>
              </div>

              {(() => {
                // Filtra i gruppi store/mese
                const gruppi = Object.entries(spedizioniPerStoreMese).filter(([key, data]) => {
                  if (filterStore !== 'all' && data.storeId !== filterStore) return false;
                  if (filterMeseRif !== 'all' && data.meseRiferimento !== filterMeseRif) return false;
                  
                  // Calcola stato del gruppo
                  const restante = data.totaleDaPagare - data.totalePagato;
                  const tuttoPagato = restante <= 0;
                  const parziale = data.totalePagato > 0 && !tuttoPagato;
                  
                  if (filterPagato === 'non_pagato' && (tuttoPagato || parziale)) return false;
                  if (filterPagato === 'parziale' && !parziale) return false;
                  if (filterPagato === 'pagato' && !tuttoPagato) return false;
                  
                  return true;
                }).sort(([, a], [, b]) => {
                  const storeA = stores.find(s => s.id === a.storeId)?.nome || '';
                  const storeB = stores.find(s => s.id === b.storeId)?.nome || '';
                  if (storeA !== storeB) return storeA.localeCompare(storeB);
                  return (b.meseRiferimento || '').localeCompare(a.meseRiferimento || '');
                });

                if (gruppi.length === 0) {
                  return (
                    <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                      <ShoppingCart className="w-12 h-12 mx-auto" style={{ marginBottom: '1rem', opacity: 0.5 }} />
                      <p>Nessuna spedizione da fatturare</p>
                      <p style={{ fontSize: '0.85rem' }}>Assegna le spedizioni dalla sezione "Spedizioni"</p>
                    </div>
                  );
                }

                return (
                  <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                    {gruppi.map(([key, data]) => {
                      const store = stores.find(s => s.id === data.storeId);
                      const storeIcons = { marketplace: '🏪', ecommerce: '🛒', fisico: '🏬' };
                      const restante = data.totaleDaPagare - data.totalePagato;
                      const tuttoPagato = restante <= 0;
                      const parziale = data.totalePagato > 0 && !tuttoPagato;
                      
                      // Trova data pagamento (ultima spedizione pagata)
                      const ultimaPagata = data.spedizioni.find(s => s.dataPagamento);
                      
                      let statoLabel, statoColor, statoBg;
                      if (tuttoPagato) {
                        statoLabel = 'Pagato';
                        statoColor = '#166534';
                        statoBg = '#dcfce7';
                      } else if (parziale) {
                        statoLabel = 'Parziale';
                        statoColor = '#92400e';
                        statoBg = '#fef3c7';
                      } else {
                        statoLabel = 'Da Pagare';
                        statoColor = '#991b1b';
                        statoBg = '#fef2f2';
                      }

                      return (
                        <div key={key} style={{ display: 'flex', alignItems: 'center', padding: '0.75rem 1.5rem', borderBottom: '1px solid #f1f5f9', gap: '1rem', background: tuttoPagato ? '#f0fdf4' : 'white', cursor: 'pointer' }}
                          onClick={() => setShowDettaglioMese({ ...data, storeName: store?.nome })}
                          onMouseOver={e => { if (!tuttoPagato) e.currentTarget.style.background = '#f8fafc'; }}
                          onMouseOut={e => { if (!tuttoPagato) e.currentTarget.style.background = 'white'; else e.currentTarget.style.background = '#f0fdf4'; }}>
                          <div style={{ minWidth: '140px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '1.1rem' }}>{storeIcons[store?.tipo] || '🏪'}</span>
                            <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9rem' }}>{store?.nome || '-'}</span>
                          </div>
                          <div style={{ minWidth: '100px', fontWeight: 600, color: '#3b82f6', fontSize: '0.9rem' }}>{data.meseRiferimento}</div>
                          <div style={{ minWidth: '80px', textAlign: 'center', fontWeight: 700, color: '#1e293b', fontSize: '1rem' }}>{data.totale}</div>
                          <div style={{ minWidth: '100px', textAlign: 'right', color: '#475569', fontSize: '0.9rem' }}>€ {data.importoTotale.toFixed(2)}</div>
                          <div style={{ minWidth: '100px', textAlign: 'right', color: '#f59e0b', fontSize: '0.9rem', fontWeight: 600 }}>€ {data.costoLogistica.toFixed(2)}</div>
                          <div style={{ minWidth: '110px', textAlign: 'right', fontWeight: 700, color: '#1e293b', fontSize: '1rem' }}>€ {data.totaleDaPagare.toFixed(2)}</div>
                          <div style={{ minWidth: '100px', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>{data.spedizioni[0]?.data || '-'}</div>
                          <div style={{ minWidth: '120px', textAlign: 'center' }}>
                            <span style={{ padding: '0.3rem 0.75rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600, background: statoBg, color: statoColor }}>{statoLabel}</span>
                          </div>
                          <div style={{ minWidth: '100px', textAlign: 'center', color: ultimaPagata ? '#10b981' : '#94a3b8', fontSize: '0.85rem', fontWeight: ultimaPagata ? 600 : 400 }}>
                            {ultimaPagata?.dataPagamento || '-'}
                          </div>
                          <div style={{ minWidth: '100px', display: 'flex', gap: '0.25rem', justifyContent: 'center' }} onClick={e => e.stopPropagation()}>
                            {tuttoPagato ? (
                              <button type="button" onClick={() => {
                                if (window.confirm(`Archiviare tutte le ${data.totale} spedizioni di ${store?.nome} - ${data.meseRiferimento}?`)) {
                                  const ids = data.spedizioni.map(s => s.id);
                                  saveMovimenti(movimenti.map(m => ids.includes(m.id) ? { ...m, archiviato: true, dataArchiviazione: new Date().toISOString() } : m));
                                }
                              }} style={{ padding: '0.4rem 0.75rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
                                Archivia
                              </button>
                            ) : (
                              <button type="button" onClick={() => setShowDettaglioMese({ ...data, storeName: store?.nome })} style={{ padding: '0.4rem 0.75rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
                                Gestisci
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Footer con totali */}
              {Object.keys(spedizioniPerStoreMese).length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', padding: '0.85rem 1.5rem', borderTop: '2px solid #e2e8f0', background: '#f1f5f9', gap: '1rem', fontWeight: 700 }}>
                  <div style={{ minWidth: '140px', color: '#1e293b' }}>TOTALE</div>
                  <div style={{ minWidth: '100px' }}></div>
                  <div style={{ minWidth: '80px', textAlign: 'center', color: '#1e293b' }}>
                    {Object.values(spedizioniPerStoreMese).reduce((sum, d) => sum + d.totale, 0)}
                  </div>
                  <div style={{ minWidth: '100px', textAlign: 'right', color: '#475569' }}>
                    € {Object.values(spedizioniPerStoreMese).reduce((sum, d) => sum + d.importoTotale, 0).toFixed(2)}
                  </div>
                  <div style={{ minWidth: '100px', textAlign: 'right', color: '#f59e0b' }}>
                    € {Object.values(spedizioniPerStoreMese).reduce((sum, d) => sum + d.costoLogistica, 0).toFixed(2)}
                  </div>
                  <div style={{ minWidth: '110px', textAlign: 'right', color: '#dc2626' }}>
                    € {Object.values(spedizioniPerStoreMese).reduce((sum, d) => sum + d.totaleDaPagare, 0).toFixed(2)}
                  </div>
                  <div style={{ minWidth: '100px' }}></div>
                  <div style={{ minWidth: '120px' }}></div>
                  <div style={{ minWidth: '100px' }}></div>
                  <div style={{ minWidth: '100px' }}></div>
                </div>
              )}
            </div>

            {/* Sezione Stores */}
            <div style={{ marginTop: '2rem' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 600, color: '#64748b' }}>E-commerce Configurati</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                {stores.map(store => {
                  const storeIcons = { marketplace: '🏪', ecommerce: '🛒', fisico: '🏬' };
                  return (
                    <div key={store.id} style={{ background: 'white', borderRadius: '8px', padding: '0.75rem 1rem', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>{storeIcons[store.tipo] || '🏪'}</span>
                      <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9rem' }}>{store.nome}</span>
                      <button type="button" onClick={() => handleDeleteStore(store.id)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.125rem', marginLeft: '0.25rem' }}>
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ==================== MOVIMENTI ==================== */}
        {activeTab === 'movimenti' && (
          <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <select value={filterYear} onChange={e => setFilterYear(e.target.value)} style={{ padding: '0.6rem 1rem', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontWeight: 600, fontSize: '0.95rem' }}>
                  {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <span style={{ color: '#64748b', fontSize: '0.9rem' }}>{movimentiFiltrati.length} movimenti</span>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button type="button" onClick={() => setShowNuovoMovimento(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f59e0b', color: 'white', border: 'none', padding: '0.6rem 1rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                  <Plus className="w-4 h-4" /> Nuovo Movimento
                </button>
                <button type="button" onClick={() => setShowImportModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#3b82f6', color: 'white', border: 'none', padding: '0.6rem 1rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                  <Upload className="w-4 h-4" /> Importa CSV
                </button>
                <button type="button" onClick={exportExcel} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                  <Download className="w-4 h-4" /> Excel
                </button>
              </div>
            </div>

            {/* Filtri */}
            <div style={{ background: 'white', borderRadius: '12px', padding: '1rem 1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', alignItems: 'end' }}>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>
                    <Warehouse className="w-4 h-4" /> Magazzino
                  </label>
                  <select value={filterMagazzino} onChange={e => setFilterMagazzino(e.target.value)} style={{ width: '100%', padding: '0.6rem', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem' }}>
                    <option value="all">Tutti</option>
                    {magazzini.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>
                    <Package className="w-4 h-4" /> Tipo
                  </label>
                  <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)} style={{ width: '100%', padding: '0.6rem', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem' }}>
                    <option value="all">Tutti</option>
                    <option value="entrata">Entrate</option>
                    <option value="uscita">Uscite</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>
                    <Clock className="w-4 h-4" /> Stato
                  </label>
                  <select value={filterStato} onChange={e => setFilterStato(e.target.value)} style={{ width: '100%', padding: '0.6rem', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem' }}>
                    <option value="all">Tutti</option>
                    <option value="in_lavorazione">In Lavorazione</option>
                    <option value="spedito">Spedito</option>
                    <option value="consegnato">Consegnato</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>
                    <Calendar className="w-4 h-4" /> Da
                  </label>
                  <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} style={{ width: '100%', padding: '0.6rem', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem' }} />
                </div>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>
                    <Calendar className="w-4 h-4" /> A
                  </label>
                  <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} style={{ width: '100%', padding: '0.6rem', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem' }} />
                </div>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>
                    <Search className="w-4 h-4" /> Cerca
                  </label>
                  <input type="text" value={filterSearch} onChange={e => setFilterSearch(e.target.value)} placeholder="SKU, descrizione, tracking..." style={{ width: '100%', padding: '0.6rem', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem' }} />
                </div>
              </div>
            </div>

            {/* Tabella */}
            <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              {/* Header tabella */}
              <div style={{ display: 'flex', alignItems: 'center', padding: '1rem 1.5rem', borderBottom: '2px solid #e2e8f0', background: '#f8fafc', fontWeight: 600, fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', gap: '1rem' }}>
                <div style={{ minWidth: '30px' }}></div>
                <div style={{ minWidth: '80px' }}>Data</div>
                <div style={{ minWidth: '100px' }}>SKU</div>
                <div style={{ flex: 1 }}>Descrizione</div>
                <div style={{ minWidth: '100px' }}>Magazzino</div>
                <div style={{ minWidth: '80px', textAlign: 'center' }}>Tipo</div>
                <div style={{ minWidth: '80px', textAlign: 'right' }}>Qty</div>
                <div style={{ minWidth: '120px' }}>Categoria</div>
                <div style={{ minWidth: '100px' }}>Stato</div>
                <div style={{ minWidth: '40px' }}></div>
              </div>

              {/* Rows */}
              {movimentiFiltrati.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                  <Package className="w-12 h-12 mx-auto" style={{ marginBottom: '1rem', opacity: 0.5 }} />
                  <p>Nessun movimento trovato</p>
                  {movimenti.length === 0 && (
                    <button type="button" onClick={creaDatiDemo} style={{ marginTop: '1rem', padding: '0.75rem 1.5rem', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                      Carica Dati Demo
                    </button>
                  )}
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  {movimentiFiltrati.map(m => {
                    const mag = magazzini.find(x => x.id === m.magazzino);
                    const cat = tutteCategorie.find(c => c.id === m.categoria);
                    
                    return (
                      <div key={m.id} style={{ display: 'flex', alignItems: 'center', padding: '0.75rem 1.5rem', borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s', gap: '1rem', cursor: 'pointer' }}
                        onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
                        onMouseOut={e => e.currentTarget.style.background = 'white'}
                        onClick={() => setShowDetailModal(m)}>
                        <div style={{ minWidth: '30px' }} onClick={e => e.stopPropagation()}>
                          <input type="checkbox" checked={selectedRows.has(m.id)} onChange={e => { const newSet = new Set(selectedRows); if (e.target.checked) newSet.add(m.id); else newSet.delete(m.id); setSelectedRows(newSet); }} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                        </div>
                        <div style={{ minWidth: '80px', color: '#64748b', fontSize: '0.85rem' }}>{m.data ? new Date(m.data).toLocaleDateString('it-IT') : '-'}</div>
                        <div style={{ minWidth: '100px', color: '#1e293b', fontSize: '0.85rem', fontWeight: 500, fontFamily: 'monospace' }}>{m.sku || '-'}</div>
                        <div style={{ flex: 1, color: '#1e293b', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={m.descrizione}>{m.descrizione || '-'}</div>
                        <div style={{ minWidth: '100px', color: '#64748b', fontSize: '0.85rem' }}>{mag?.nome || '-'}</div>
                        <div style={{ minWidth: '80px', textAlign: 'center' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, background: m.tipo === 'entrata' ? '#dcfce7' : '#fee2e2', color: m.tipo === 'entrata' ? '#166534' : '#991b1b' }}>
                            {m.tipo === 'entrata' ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                            {m.tipo === 'entrata' ? 'IN' : 'OUT'}
                          </span>
                        </div>
                        <div style={{ minWidth: '80px', textAlign: 'right', fontWeight: 600, fontSize: '0.9rem', color: m.tipo === 'entrata' ? '#16a34a' : '#dc2626' }}>
                          {m.tipo === 'entrata' ? '+' : '-'}{m.quantita}
                        </div>
                        <div style={{ minWidth: '120px', color: '#64748b', fontSize: '0.8rem' }}>{cat?.nome || '-'}</div>
                        <div style={{ minWidth: '100px' }} onClick={e => e.stopPropagation()}>
                          <select 
                            value={m.stato || 'in_lavorazione'} 
                            onChange={e => handleUpdateStato(m.id, e.target.value)}
                            style={{ padding: '0.3rem 0.5rem', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '0.8rem', background: 'white' }}
                          >
                            <option value="in_lavorazione">In Lavorazione</option>
                            <option value="spedito">Spedito</option>
                            <option value="consegnato">Consegnato</option>
                            <option value="annullato">Annullato</option>
                          </select>
                        </div>
                        <div style={{ minWidth: '40px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                          <button type="button" onClick={() => handleDeleteMovimento(m.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.25rem' }} title="Elimina">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== REPORT ==================== */}
        {activeTab === 'report' && (
          <div>
            <div style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)', borderRadius: '20px', padding: '1.5rem 2rem', color: 'white' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '48px', height: '48px', background: 'rgba(255,255,255,0.15)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <BarChart3 className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>Report Logistica</h2>
                    <p style={{ margin: '0.25rem 0 0 0', opacity: 0.8, fontSize: '0.9rem' }}>Analisi movimenti per periodo</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <select value={filterYear} onChange={e => setFilterYear(e.target.value)} style={{ padding: '0.6rem 1rem', border: 'none', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 600, background: 'rgba(255,255,255,0.15)', color: 'white', cursor: 'pointer' }}>
                    {[2024, 2025, 2026].map(y => <option key={y} value={y} style={{ color: '#0f172a' }}>{y}</option>)}
                  </select>
                  <button type="button" onClick={exportReport} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.25rem', background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '10px', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}>
                    <Download className="w-4 h-4" /> Esporta Report
                  </button>
                </div>
              </div>
            </div>

            {/* KPIs Report */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              {(() => {
                const annoMovimenti = movimenti.filter(m => parseInt((m.data || '').substring(0, 4)) === parseInt(filterYear));
                let totE = 0, totU = 0;
                annoMovimenti.forEach(m => {
                  const q = parseInt(m.quantita) || 0;
                  if (m.tipo === 'entrata') totE += q;
                  else totU += q;
                });
                return (
                  <>
                    <div style={{ background: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}>
                      <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem' }}>Totale Entrate {filterYear}</div>
                      <div style={{ fontSize: '2rem', fontWeight: 800, color: '#16a34a' }}>+{formatNumber(totE)} pz</div>
                    </div>
                    <div style={{ background: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}>
                      <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem' }}>Totale Uscite {filterYear}</div>
                      <div style={{ fontSize: '2rem', fontWeight: 800, color: '#dc2626' }}>-{formatNumber(totU)} pz</div>
                    </div>
                    <div style={{ background: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}>
                      <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem' }}>Saldo {filterYear}</div>
                      <div style={{ fontSize: '2rem', fontWeight: 800, color: totE - totU >= 0 ? '#16a34a' : '#dc2626' }}>{totE - totU >= 0 ? '+' : ''}{formatNumber(totE - totU)} pz</div>
                    </div>
                    <div style={{ background: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}>
                      <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem' }}>Movimenti {filterYear}</div>
                      <div style={{ fontSize: '2rem', fontWeight: 800, color: '#3b82f6' }}>{annoMovimenti.length}</div>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Tabella riepilogo per categoria */}
            <div style={{ background: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}>
              <h3 style={{ margin: '0 0 1rem 0', color: '#1e293b', fontSize: '1.1rem', fontWeight: 700 }}>Riepilogo per Categoria</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #e2e8f0', fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>Categoria</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '2px solid #e2e8f0', fontSize: '0.85rem', fontWeight: 600, color: '#16a34a' }}>Entrate</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '2px solid #e2e8f0', fontSize: '0.85rem', fontWeight: 600, color: '#dc2626' }}>Uscite</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '2px solid #e2e8f0', fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const annoMovimenti = movimenti.filter(m => parseInt((m.data || '').substring(0, 4)) === parseInt(filterYear));
                      const perCat = {};
                      annoMovimenti.forEach(m => {
                        const cat = tutteCategorie.find(c => c.id === m.categoria);
                        const key = cat?.nome || 'Altro';
                        if (!perCat[key]) perCat[key] = { entrate: 0, uscite: 0 };
                        const q = parseInt(m.quantita) || 0;
                        if (m.tipo === 'entrata') perCat[key].entrate += q;
                        else perCat[key].uscite += q;
                      });
                      return Object.entries(perCat).sort((a, b) => (b[1].entrate + b[1].uscite) - (a[1].entrate + a[1].uscite)).map(([cat, data]) => (
                        <tr key={cat}>
                          <td style={{ padding: '0.75rem', borderBottom: '1px solid #f1f5f9', fontWeight: 500 }}>{cat}</td>
                          <td style={{ padding: '0.75rem', borderBottom: '1px solid #f1f5f9', textAlign: 'right', color: '#16a34a', fontWeight: 600 }}>+{formatNumber(data.entrate)}</td>
                          <td style={{ padding: '0.75rem', borderBottom: '1px solid #f1f5f9', textAlign: 'right', color: '#dc2626', fontWeight: 600 }}>-{formatNumber(data.uscite)}</td>
                          <td style={{ padding: '0.75rem', borderBottom: '1px solid #f1f5f9', textAlign: 'right', fontWeight: 700, color: data.entrate - data.uscite >= 0 ? '#16a34a' : '#dc2626' }}>{data.entrate - data.uscite >= 0 ? '+' : ''}{formatNumber(data.entrate - data.uscite)}</td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ==================== MODALS ==================== */}
        
        {/* Modal Nuovo Movimento */}
        {showNuovoMovimento && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }} onClick={() => setShowNuovoMovimento(false)}>
            <div style={{ background: 'white', borderRadius: '12px', maxWidth: '600px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
              <div style={{ padding: '1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Nuovo Movimento Logistica</h3>
                <button type="button" onClick={() => setShowNuovoMovimento(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem' }}><X className="w-5 h-5" style={{ color: '#64748b' }} /></button>
              </div>
              <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="button" onClick={() => setMovimentoForm(p => ({ ...p, tipo: 'entrata' }))} style={{ flex: 1, padding: '0.75rem', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', background: movimentoForm.tipo === 'entrata' ? '#22c55e' : '#f1f5f9', color: movimentoForm.tipo === 'entrata' ? 'white' : '#64748b' }}>📥 Entrata</button>
                  <button type="button" onClick={() => setMovimentoForm(p => ({ ...p, tipo: 'uscita' }))} style={{ flex: 1, padding: '0.75rem', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', background: movimentoForm.tipo === 'uscita' ? '#ef4444' : '#f1f5f9', color: movimentoForm.tipo === 'uscita' ? 'white' : '#64748b' }}>📤 Uscita</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div><label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.375rem' }}>Data</label><input type="date" value={movimentoForm.data} onChange={e => setMovimentoForm(p => ({ ...p, data: e.target.value }))} style={{ width: '100%', padding: '0.625rem', border: '1px solid #e2e8f0', borderRadius: '6px' }} /></div>
                  <div><label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.375rem' }}>Quantità *</label><input type="number" value={movimentoForm.quantita} onChange={e => setMovimentoForm(p => ({ ...p, quantita: e.target.value }))} placeholder="0" style={{ width: '100%', padding: '0.625rem', border: '1px solid #e2e8f0', borderRadius: '6px' }} /></div>
                </div>
                <div><label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.375rem' }}>SKU</label><input type="text" value={movimentoForm.sku} onChange={e => setMovimentoForm(p => ({ ...p, sku: e.target.value }))} placeholder="Codice articolo" style={{ width: '100%', padding: '0.625rem', border: '1px solid #e2e8f0', borderRadius: '6px' }} /></div>
                <div><label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.375rem' }}>Descrizione *</label><input type="text" value={movimentoForm.descrizione} onChange={e => setMovimentoForm(p => ({ ...p, descrizione: e.target.value }))} placeholder="Es: Spedizione ordine #1234" style={{ width: '100%', padding: '0.625rem', border: '1px solid #e2e8f0', borderRadius: '6px' }} /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div><label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.375rem' }}>Magazzino</label><select value={movimentoForm.magazzino} onChange={e => setMovimentoForm(p => ({ ...p, magazzino: e.target.value }))} style={{ width: '100%', padding: '0.625rem', border: '1px solid #e2e8f0', borderRadius: '6px' }}><option value="">Seleziona</option>{magazzini.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}</select></div>
                  <div><label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.375rem' }}>Categoria</label><select value={movimentoForm.categoria} onChange={e => setMovimentoForm(p => ({ ...p, categoria: e.target.value }))} style={{ width: '100%', padding: '0.625rem', border: '1px solid #e2e8f0', borderRadius: '6px' }}><option value="">Seleziona</option>{(movimentoForm.tipo === 'entrata' ? categorieEntrata : categorieUscita).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></div>
                </div>
                <div><label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.375rem' }}>Destinatario</label><input type="text" value={movimentoForm.destinatario} onChange={e => setMovimentoForm(p => ({ ...p, destinatario: e.target.value }))} placeholder="Nome cliente/fornitore" style={{ width: '100%', padding: '0.625rem', border: '1px solid #e2e8f0', borderRadius: '6px' }} /></div>
                {movimentoForm.tipo === 'uscita' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div><label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.375rem' }}>Corriere</label><input type="text" value={movimentoForm.corriere} onChange={e => setMovimentoForm(p => ({ ...p, corriere: e.target.value }))} placeholder="BRT, GLS, DHL..." style={{ width: '100%', padding: '0.625rem', border: '1px solid #e2e8f0', borderRadius: '6px' }} /></div>
                    <div><label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.375rem' }}>Tracking</label><input type="text" value={movimentoForm.tracking} onChange={e => setMovimentoForm(p => ({ ...p, tracking: e.target.value }))} placeholder="Numero spedizione" style={{ width: '100%', padding: '0.625rem', border: '1px solid #e2e8f0', borderRadius: '6px' }} /></div>
                  </div>
                )}
              </div>
              <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" onClick={() => setShowNuovoMovimento(false)} style={{ padding: '0.625rem 1rem', border: '1px solid #e2e8f0', borderRadius: '6px', fontWeight: 500, cursor: 'pointer' }}>Annulla</button>
                <button type="button" onClick={handleSaveMovimento} style={{ padding: '0.625rem 1rem', border: 'none', borderRadius: '6px', background: '#f59e0b', color: 'white', fontWeight: 600, cursor: 'pointer' }}>Salva</button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Nuovo Magazzino */}
        {showNuovoMagazzino && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }} onClick={() => setShowNuovoMagazzino(false)}>
            <div style={{ background: 'white', borderRadius: '12px', maxWidth: '400px', width: '90%' }} onClick={e => e.stopPropagation()}>
              <div style={{ padding: '1.25rem', borderBottom: '1px solid #e2e8f0' }}><h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Nuovo Magazzino</h3></div>
              <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div><label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.375rem' }}>Nome *</label><input type="text" value={magazzinoForm.nome} onChange={e => setMagazzinoForm(p => ({ ...p, nome: e.target.value }))} placeholder="Es: Magazzino Centrale" style={{ width: '100%', padding: '0.625rem', border: '1px solid #e2e8f0', borderRadius: '6px' }} /></div>
                <div><label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.375rem' }}>Indirizzo</label><input type="text" value={magazzinoForm.indirizzo} onChange={e => setMagazzinoForm(p => ({ ...p, indirizzo: e.target.value }))} placeholder="Via..." style={{ width: '100%', padding: '0.625rem', border: '1px solid #e2e8f0', borderRadius: '6px' }} /></div>
                <div><label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.375rem' }}>Tipo</label><select value={magazzinoForm.tipo} onChange={e => setMagazzinoForm(p => ({ ...p, tipo: e.target.value }))} style={{ width: '100%', padding: '0.625rem', border: '1px solid #e2e8f0', borderRadius: '6px' }}><option value="principale">Principale</option><option value="negozio">Negozio</option><option value="secondario">Secondario</option></select></div>
              </div>
              <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" onClick={() => setShowNuovoMagazzino(false)} style={{ padding: '0.625rem 1rem', border: '1px solid #e2e8f0', borderRadius: '6px', fontWeight: 500, cursor: 'pointer' }}>Annulla</button>
                <button type="button" onClick={handleSaveMagazzino} style={{ padding: '0.625rem 1rem', border: 'none', borderRadius: '6px', background: '#3b82f6', color: 'white', fontWeight: 600, cursor: 'pointer' }}>Salva</button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Nuovo Store */}
        {showNuovoStore && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }} onClick={() => setShowNuovoStore(false)}>
            <div style={{ background: 'white', borderRadius: '12px', maxWidth: '400px', width: '90%' }} onClick={e => e.stopPropagation()}>
              <div style={{ padding: '1.25rem', borderBottom: '1px solid #e2e8f0' }}><h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Nuovo Store</h3></div>
              <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div><label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.375rem' }}>Nome Store *</label><input type="text" value={storeForm.nome} onChange={e => setStoreForm(p => ({ ...p, nome: e.target.value }))} placeholder="Es: Amazon, eBay, Shopify..." style={{ width: '100%', padding: '0.625rem', border: '1px solid #e2e8f0', borderRadius: '6px' }} /></div>
                <div><label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.375rem' }}>Tipo</label><select value={storeForm.tipo} onChange={e => setStoreForm(p => ({ ...p, tipo: e.target.value }))} style={{ width: '100%', padding: '0.625rem', border: '1px solid #e2e8f0', borderRadius: '6px' }}><option value="marketplace">Marketplace</option><option value="ecommerce">E-commerce</option><option value="fisico">Negozio Fisico</option></select></div>
                <div><label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.375rem' }}>Commissione %</label><input type="number" value={storeForm.commissione} onChange={e => setStoreForm(p => ({ ...p, commissione: e.target.value }))} placeholder="Es: 15" style={{ width: '100%', padding: '0.625rem', border: '1px solid #e2e8f0', borderRadius: '6px' }} /></div>
              </div>
              <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" onClick={() => setShowNuovoStore(false)} style={{ padding: '0.625rem 1rem', border: '1px solid #e2e8f0', borderRadius: '6px', fontWeight: 500, cursor: 'pointer' }}>Annulla</button>
                <button type="button" onClick={handleSaveStore} style={{ padding: '0.625rem 1rem', border: 'none', borderRadius: '6px', background: '#3b82f6', color: 'white', fontWeight: 600, cursor: 'pointer' }}>Salva</button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Nuova Spedizione */}
        {showNuovaSpedizione && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }} onClick={() => setShowNuovaSpedizione(false)}>
            <div style={{ background: 'white', borderRadius: '12px', maxWidth: '600px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
              <div style={{ padding: '1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Nuova Spedizione</h3>
                <button type="button" onClick={() => setShowNuovaSpedizione(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem' }}><X className="w-5 h-5" style={{ color: '#64748b' }} /></button>
              </div>
              <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div><label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.375rem' }}>Data</label><input type="date" value={spedizioneForm.data} onChange={e => setSpedizioneForm(p => ({ ...p, data: e.target.value }))} style={{ width: '100%', padding: '0.625rem', border: '1px solid #e2e8f0', borderRadius: '6px' }} /></div>
                  <div><label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.375rem' }}>ID Ordine</label><input type="text" value={spedizioneForm.ordineId} onChange={e => setSpedizioneForm(p => ({ ...p, ordineId: e.target.value }))} placeholder="AMZ-123456" style={{ width: '100%', padding: '0.625rem', border: '1px solid #e2e8f0', borderRadius: '6px' }} /></div>
                </div>
                <div><label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.375rem' }}>Store *</label><select value={spedizioneForm.store} onChange={e => setSpedizioneForm(p => ({ ...p, store: e.target.value }))} style={{ width: '100%', padding: '0.625rem', border: '1px solid #e2e8f0', borderRadius: '6px' }}><option value="">Seleziona store...</option>{stores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}</select></div>
                <div><label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.375rem' }}>Destinatario *</label><input type="text" value={spedizioneForm.destinatario} onChange={e => setSpedizioneForm(p => ({ ...p, destinatario: e.target.value }))} placeholder="Nome cliente" style={{ width: '100%', padding: '0.625rem', border: '1px solid #e2e8f0', borderRadius: '6px' }} /></div>
                <div><label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.375rem' }}>Indirizzo</label><input type="text" value={spedizioneForm.indirizzo} onChange={e => setSpedizioneForm(p => ({ ...p, indirizzo: e.target.value }))} placeholder="Via, città..." style={{ width: '100%', padding: '0.625rem', border: '1px solid #e2e8f0', borderRadius: '6px' }} /></div>
                <div><label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.375rem' }}>Prodotti</label><input type="text" value={spedizioneForm.prodotti} onChange={e => setSpedizioneForm(p => ({ ...p, prodotti: e.target.value }))} placeholder="iPhone 15 Pro, AirPods..." style={{ width: '100%', padding: '0.625rem', border: '1px solid #e2e8f0', borderRadius: '6px' }} /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                  <div><label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.375rem' }}>Quantità</label><input type="number" value={spedizioneForm.quantita} onChange={e => setSpedizioneForm(p => ({ ...p, quantita: e.target.value }))} placeholder="1" style={{ width: '100%', padding: '0.625rem', border: '1px solid #e2e8f0', borderRadius: '6px' }} /></div>
                  <div><label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.375rem' }}>Corriere</label><input type="text" value={spedizioneForm.corriere} onChange={e => setSpedizioneForm(p => ({ ...p, corriere: e.target.value }))} placeholder="BRT, GLS, DHL..." style={{ width: '100%', padding: '0.625rem', border: '1px solid #e2e8f0', borderRadius: '6px' }} /></div>
                  <div><label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.375rem' }}>Costo €</label><input type="number" step="0.01" value={spedizioneForm.costo} onChange={e => setSpedizioneForm(p => ({ ...p, costo: e.target.value }))} placeholder="8.50" style={{ width: '100%', padding: '0.625rem', border: '1px solid #e2e8f0', borderRadius: '6px' }} /></div>
                </div>
                <div><label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.375rem' }}>Tracking</label><input type="text" value={spedizioneForm.tracking} onChange={e => setSpedizioneForm(p => ({ ...p, tracking: e.target.value }))} placeholder="Numero spedizione" style={{ width: '100%', padding: '0.625rem', border: '1px solid #e2e8f0', borderRadius: '6px' }} /></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={spedizioneForm.pagato} onChange={e => setSpedizioneForm(p => ({ ...p, pagato: e.target.checked }))} style={{ width: '18px', height: '18px' }} />
                    <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Già pagato</span>
                  </label>
                </div>
                <div><label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.375rem' }}>Note</label><textarea value={spedizioneForm.note} onChange={e => setSpedizioneForm(p => ({ ...p, note: e.target.value }))} placeholder="Note aggiuntive..." rows={2} style={{ width: '100%', padding: '0.625rem', border: '1px solid #e2e8f0', borderRadius: '6px', resize: 'vertical' }} /></div>
              </div>
              <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" onClick={() => setShowNuovaSpedizione(false)} style={{ padding: '0.625rem 1rem', border: '1px solid #e2e8f0', borderRadius: '6px', fontWeight: 500, cursor: 'pointer' }}>Annulla</button>
                <button type="button" onClick={handleSaveSpedizione} style={{ padding: '0.625rem 1rem', border: 'none', borderRadius: '6px', background: '#f59e0b', color: 'white', fontWeight: 600, cursor: 'pointer' }}>Salva Spedizione</button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Import Spedizioni CSV */}
        {showImportSpedizioni && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }} onClick={() => { setShowImportSpedizioni(false); setImportSpedStep(1); setImportSpedData([]); setImportMeseRiferimento(''); }}>
            <div style={{ background: 'white', borderRadius: '16px', maxWidth: '750px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
              <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', borderRadius: '16px 16px 0 0' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Upload className="w-6 h-6" /> Importa CSV Corriere
                </h3>
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: 'rgba(255,255,255,0.9)' }}>
                  Carica il file CSV del corriere, mappa le colonne e assegna il mese di riferimento
                </p>
              </div>
              <div style={{ padding: '1.5rem' }}>
                {importSpedStep === 1 ? (
                  <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <div style={{ width: '80px', height: '80px', background: '#fef3c7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                      <FileSpreadsheet className="w-10 h-10" style={{ color: '#f59e0b' }} />
                    </div>
                    <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', fontWeight: 600, color: '#1e293b' }}>Seleziona il file CSV del Corriere</h4>
                    <p style={{ margin: '0 0 1.5rem 0', color: '#64748b', fontSize: '0.9rem' }}>
                      Formati supportati: CSV, TXT (separatore: virgola, punto e virgola, tab)
                    </p>
                    <input type="file" accept=".csv,.txt,.xlsx" onChange={handleSpedizioniFileUpload} style={{ display: 'none' }} id="csv-sped-upload" />
                    <label htmlFor="csv-sped-upload" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.875rem 2rem', background: '#f59e0b', color: 'white', borderRadius: '10px', fontWeight: 600, cursor: 'pointer', fontSize: '1rem' }}>
                      <Upload className="w-5 h-5" /> Seleziona File
                    </label>
                    <div style={{ marginTop: '2rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px', textAlign: 'left' }}>
                      <p style={{ margin: '0 0 0.5rem 0', fontWeight: 600, fontSize: '0.85rem', color: '#475569' }}>Colonne riconosciute automaticamente:</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {['Centro Costi', 'Numero Ordine', 'Importo Totale', 'Tracking', 'Destinatario', 'Data'].map(col => (
                          <span key={col} style={{ padding: '0.25rem 0.5rem', background: '#e2e8f0', borderRadius: '4px', fontSize: '0.75rem', color: '#475569' }}>{col}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', padding: '1rem', background: '#dcfce7', borderRadius: '8px' }}>
                      <CheckCircle className="w-5 h-5" style={{ color: '#16a34a' }} />
                      <span style={{ color: '#166534', fontWeight: 500 }}>File caricato: <strong>{importSpedData.length}</strong> spedizioni trovate</span>
                    </div>

                    {/* Mese di Riferimento */}
                    <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#eff6ff', borderRadius: '8px', border: '2px solid #3b82f6' }}>
                      <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem', color: '#1e40af' }}>
                        📅 Mese di Riferimento <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input 
                        type="month" 
                        value={importMeseRiferimento} 
                        onChange={e => setImportMeseRiferimento(e.target.value)} 
                        style={{ width: '100%', padding: '0.75rem', border: '1.5px solid #3b82f6', borderRadius: '8px', fontSize: '1rem', fontWeight: 600 }}
                      />
                      <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>Indica il mese a cui si riferiscono queste spedizioni (es: 2025-03 per Marzo 2025)</p>
                    </div>
                    
                    <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 600, color: '#1e293b' }}>Mappa le colonne del CSV</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                      {[
                        { key: 'centroCosti', label: 'Centro Costi (E-commerce)', required: true },
                        { key: 'ordineId', label: 'Numero Ordine', required: false },
                        { key: 'importo', label: 'Importo Totale', required: true },
                        { key: 'tracking', label: 'Tracking', required: false },
                        { key: 'destinatario', label: 'Destinatario', required: false },
                        { key: 'data', label: 'Data', required: false },
                      ].map(field => (
                        <div key={field.key}>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.375rem', color: '#475569' }}>
                            {field.label} {field.required && <span style={{ color: '#ef4444' }}>*</span>}
                          </label>
                          <select 
                            value={importSpedMapping[field.key] || ''} 
                            onChange={e => setImportSpedMapping(p => ({ ...p, [field.key]: e.target.value }))} 
                            style={{ width: '100%', padding: '0.5rem', border: '1.5px solid #e2e8f0', borderRadius: '6px', fontSize: '0.85rem', background: importSpedMapping[field.key] ? '#f0fdf4' : 'white' }}
                          >
                            <option value="">-- Non mappare --</option>
                            {importSpedHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                          </select>
                        </div>
                      ))}
                    </div>

                    {/* Preview */}
                    <div style={{ marginBottom: '1rem' }}>
                      <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', fontWeight: 600, color: '#475569' }}>Anteprima (prime 3 righe)</h4>
                      <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                          <thead>
                            <tr style={{ background: '#f8fafc' }}>
                              <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Centro Costi</th>
                              <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Ordine</th>
                              <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Tracking</th>
                              <th style={{ padding: '0.5rem', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>Importo</th>
                            </tr>
                          </thead>
                          <tbody>
                            {importSpedData.slice(0, 3).map((row, idx) => (
                              <tr key={idx}>
                                <td style={{ padding: '0.5rem', borderBottom: '1px solid #f1f5f9', fontWeight: 500 }}>{row[importSpedMapping.centroCosti] || '-'}</td>
                                <td style={{ padding: '0.5rem', borderBottom: '1px solid #f1f5f9', fontFamily: 'monospace', fontSize: '0.75rem' }}>{row[importSpedMapping.ordineId] || '-'}</td>
                                <td style={{ padding: '0.5rem', borderBottom: '1px solid #f1f5f9', fontFamily: 'monospace', fontSize: '0.75rem' }}>{row[importSpedMapping.tracking] || '-'}</td>
                                <td style={{ padding: '0.5rem', borderBottom: '1px solid #f1f5f9', textAlign: 'right', fontWeight: 600 }}>€ {row[importSpedMapping.importo] || '0'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div style={{ padding: '1rem', background: '#fffbeb', borderRadius: '8px', border: '1px solid #fde68a' }}>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#92400e', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <AlertCircle className="w-4 h-4" />
                        Le spedizioni verranno importate con il Centro Costi indicato. Dovrai poi assegnarle agli e-commerce dalla tabella Spedizioni.
                      </p>
                    </div>
                  </div>
                )}
              </div>
              <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button type="button" onClick={() => { setShowImportSpedizioni(false); setImportSpedStep(1); setImportSpedData([]); setImportMeseRiferimento(''); }} style={{ padding: '0.625rem 1.25rem', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontWeight: 500, cursor: 'pointer', background: 'white' }}>Annulla</button>
                {importSpedStep === 2 && (
                  <button type="button" onClick={handleImportSpedizioni} disabled={!importMeseRiferimento} style={{ padding: '0.625rem 1.5rem', border: 'none', borderRadius: '8px', background: importMeseRiferimento ? '#f59e0b' : '#d1d5db', color: 'white', fontWeight: 600, cursor: importMeseRiferimento ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckCircle className="w-4 h-4" /> Importa {importSpedData.length} Spedizioni
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal Assegna Store */}
        {showAssegnaStore && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }} onClick={() => setShowAssegnaStore(null)}>
            <div style={{ background: 'white', borderRadius: '12px', maxWidth: '400px', width: '90%' }} onClick={e => e.stopPropagation()}>
              <div style={{ padding: '1.25rem', borderBottom: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Assegna Store</h3>
              </div>
              <div style={{ padding: '1.25rem' }}>
                <p style={{ margin: '0 0 1rem 0', color: '#64748b', fontSize: '0.9rem' }}>
                  Seleziona lo store per questa spedizione:
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {stores.map(store => (
                    <button 
                      key={store.id} 
                      type="button"
                      onClick={() => handleAssegnaStore(showAssegnaStore, store.id)}
                      style={{ 
                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                        padding: '0.875rem 1rem', 
                        border: '1.5px solid #e2e8f0', 
                        borderRadius: '8px', 
                        background: 'white',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s'
                      }}
                      onMouseOver={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#3b82f6'; }}
                      onMouseOut={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                    >
                      <span style={{ fontSize: '1.5rem' }}>{store.tipo === 'marketplace' ? '🏪' : store.tipo === 'ecommerce' ? '🛒' : '🏬'}</span>
                      <div>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>{store.nome}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{store.tipo}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid #e2e8f0' }}>
                <button type="button" onClick={() => setShowAssegnaStore(null)} style={{ width: '100%', padding: '0.625rem 1rem', border: '1px solid #e2e8f0', borderRadius: '6px', fontWeight: 500, cursor: 'pointer' }}>Annulla</button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Assegnazione Massiva */}
        {showAssegnaMassivo && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }} onClick={() => setShowAssegnaMassivo(false)}>
            <div style={{ background: 'white', borderRadius: '16px', maxWidth: '500px', width: '90%', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
              <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', borderRadius: '16px 16px 0 0' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ShoppingCart className="w-5 h-5" /> Assegnazione Massiva
                </h3>
                <p style={{ margin: '0.5rem 0 0 0', color: 'rgba(255,255,255,0.85)', fontSize: '0.9rem' }}>
                  {selectedRows.size} spedizioni selezionate
                </p>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '1rem', marginBottom: '1rem', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '0.5rem', fontWeight: 600 }}>Riepilogo Selezione:</div>
                  <div style={{ fontSize: '0.9rem', color: '#1e293b' }}>
                    {(() => {
                      const selected = Array.from(selectedRows);
                      const spedSel = movimenti.filter(m => selected.includes(m.id));
                      const centriUnique = [...new Set(spedSel.map(s => s.centroCosti).filter(Boolean))];
                      const totImporto = spedSel.reduce((sum, s) => sum + (parseFloat(s.importo) || 0), 0);
                      return (
                        <>
                          <p style={{ margin: '0.25rem 0' }}><strong>Importo totale:</strong> € {totImporto.toFixed(2)}</p>
                          {centriUnique.length > 0 && <p style={{ margin: '0.25rem 0' }}><strong>Centri Costi:</strong> {centriUnique.join(', ')}</p>}
                        </>
                      );
                    })()}
                  </div>
                </div>
                <p style={{ margin: '0 0 1rem 0', color: '#475569', fontSize: '0.9rem', fontWeight: 500 }}>
                  Seleziona lo store di destinazione:
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '250px', overflowY: 'auto' }}>
                  {stores.map(store => (
                    <button 
                      key={store.id} 
                      type="button"
                      onClick={() => handleAssegnaMassivo(store.id)}
                      style={{ 
                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                        padding: '1rem', 
                        border: '2px solid #e2e8f0', 
                        borderRadius: '10px', 
                        background: 'white',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s'
                      }}
                      onMouseOver={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.borderColor = '#3b82f6'; }}
                      onMouseOut={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                    >
                      <span style={{ fontSize: '2rem' }}>{store.tipo === 'marketplace' ? '🏪' : store.tipo === 'ecommerce' ? '🛒' : '🏬'}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '1rem' }}>{store.nome}</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{store.tipo}</div>
                      </div>
                      <div style={{ color: '#3b82f6', fontWeight: 600, fontSize: '0.85rem' }}>
                        Assegna →
                      </div>
                    </button>
                  ))}
                </div>
                {stores.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                    <ShoppingCart className="w-12 h-12" style={{ margin: '0 auto 0.5rem', opacity: 0.3 }} />
                    <p>Nessuno store configurato</p>
                    <button type="button" onClick={() => { setShowAssegnaMassivo(false); setShowNuovoStore(true); }} style={{ marginTop: '0.5rem', padding: '0.5rem 1rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>
                      + Aggiungi Store
                    </button>
                  </div>
                )}
              </div>
              <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '0.75rem' }}>
                <button type="button" onClick={() => setShowAssegnaMassivo(false)} style={{ flex: 1, padding: '0.75rem 1rem', border: '1px solid #e2e8f0', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', background: 'white' }}>Annulla</button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Dettaglio Mese */}
        {showDettaglioMese && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }} onClick={() => setShowDettaglioMese(null)}>
            <div style={{ background: 'white', borderRadius: '16px', maxWidth: '1100px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', borderRadius: '16px 16px 0 0', color: 'white' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>{showDettaglioMese.storeName} - {showDettaglioMese.meseRiferimento}</h3>
                    <p style={{ margin: '0.25rem 0 0 0', opacity: 0.9 }}>{showDettaglioMese.spedizioni?.length || 0} spedizioni</p>
                  </div>
                  <button type="button" onClick={() => { setShowDettaglioMese(null); setSelectedRows(new Set()); }} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '8px', padding: '0.5rem', cursor: 'pointer', color: 'white' }}>
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div style={{ padding: '1.25rem 1.5rem' }}>
                {/* Tabella Spedizioni con Checkbox */}
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden', marginBottom: '1.25rem' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        <th style={{ padding: '0.6rem', textAlign: 'center', borderBottom: '1px solid #e2e8f0', width: '40px' }}>
                          <input type="checkbox" checked={selectedRows.size === (showDettaglioMese.spedizioni?.length || 0) && showDettaglioMese.spedizioni?.length > 0} onChange={e => {
                            if (e.target.checked) setSelectedRows(new Set(showDettaglioMese.spedizioni?.map(s => s.id) || []));
                            else setSelectedRows(new Set());
                          }} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                        </th>
                        <th style={{ padding: '0.6rem', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Ordine</th>
                        <th style={{ padding: '0.6rem', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Destinatario</th>
                        <th style={{ padding: '0.6rem', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>Costo Sped.</th>
                        <th style={{ padding: '0.6rem', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>Costo Log.</th>
                        <th style={{ padding: '0.6rem', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>Totale</th>
                      </tr>
                    </thead>
                    <tbody>
                      {showDettaglioMese.spedizioni?.map(s => {
                        const importo = parseFloat(s.importo) || 0;
                        const costo = parseFloat(s.costoFisso) || 0;
                        const tot = importo + costo;
                        const isSelected = selectedRows.has(s.id);
                        return (
                          <tr key={s.id} style={{ background: isSelected ? '#eff6ff' : 'white' }}>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #f1f5f9', textAlign: 'center' }}>
                              <input type="checkbox" checked={isSelected} onChange={e => {
                                const newSet = new Set(selectedRows);
                                if (e.target.checked) newSet.add(s.id);
                                else newSet.delete(s.id);
                                setSelectedRows(newSet);
                              }} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                            </td>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #f1f5f9', fontFamily: 'monospace', fontSize: '0.8rem' }}>{s.ordineId || '-'}</td>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #f1f5f9' }}>{s.destinatario || '-'}</td>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #f1f5f9', textAlign: 'right' }}>€ {importo.toFixed(2)}</td>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #f1f5f9', textAlign: 'right', color: costo > 0 ? '#f59e0b' : '#94a3b8', fontWeight: 600 }}>€ {costo.toFixed(2)}</td>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #f1f5f9', textAlign: 'right', fontWeight: 700 }}>€ {tot.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Sezione Aggiungi Costo Logistica */}
                <div style={{ background: '#fef3c7', borderRadius: '10px', padding: '1rem', marginBottom: '1.25rem', border: '1px solid #fcd34d' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#92400e' }}>Costo Logistica:</span>
                      <span style={{ fontSize: '0.9rem', color: '#92400e' }}>€</span>
                      <input type="number" step="0.01" min="0" value={costoPerSpedizione} onChange={e => setCostoPerSpedizione(parseFloat(e.target.value) || 0)} style={{ width: '70px', padding: '0.4rem', border: '1.5px solid #fcd34d', borderRadius: '6px', fontSize: '0.9rem', fontWeight: 600, textAlign: 'center' }} />
                      <span style={{ fontSize: '0.85rem', color: '#92400e' }}>/ spedizione</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button type="button" onClick={() => {
                        const ids = Array.from(selectedRows);
                        if (ids.length === 0) { alert('Seleziona almeno una spedizione'); return; }
                        saveMovimenti(movimenti.map(m => ids.includes(m.id) ? { ...m, costoFisso: costoPerSpedizione } : m));
                        setShowDettaglioMese(prev => ({
                          ...prev,
                          spedizioni: prev.spedizioni.map(s => ids.includes(s.id) ? { ...s, costoFisso: costoPerSpedizione } : s),
                          costoLogistica: prev.spedizioni.reduce((sum, s) => sum + (ids.includes(s.id) ? costoPerSpedizione : (parseFloat(s.costoFisso) || 0)), 0),
                          totaleDaPagare: prev.spedizioni.reduce((sum, s) => sum + (parseFloat(s.importo) || 0) + (ids.includes(s.id) ? costoPerSpedizione : (parseFloat(s.costoFisso) || 0)), 0)
                        }));
                        setSelectedRows(new Set());
                      }} style={{ padding: '0.4rem 0.75rem', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
                        Applica a {selectedRows.size} selezionate
                      </button>
                      <button type="button" onClick={() => {
                        const senzaCosto = showDettaglioMese.spedizioni?.filter(s => !s.costoFisso || s.costoFisso === 0) || [];
                        if (senzaCosto.length === 0) { alert('Tutte hanno già un costo'); return; }
                        const ids = senzaCosto.map(s => s.id);
                        saveMovimenti(movimenti.map(m => ids.includes(m.id) ? { ...m, costoFisso: costoPerSpedizione } : m));
                        setShowDettaglioMese(prev => ({
                          ...prev,
                          spedizioni: prev.spedizioni.map(s => ids.includes(s.id) ? { ...s, costoFisso: costoPerSpedizione } : s),
                          costoLogistica: prev.costoLogistica + (costoPerSpedizione * senzaCosto.length),
                          totaleDaPagare: prev.totaleDaPagare + (costoPerSpedizione * senzaCosto.length)
                        }));
                      }} style={{ padding: '0.4rem 0.75rem', background: '#d97706', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
                        Applica a tutte senza costo ({showDettaglioMese.spedizioni?.filter(s => !s.costoFisso || s.costoFisso === 0).length || 0})
                      </button>
                    </div>
                  </div>
                </div>

                {/* Riepilogo Totali */}
                <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '1rem', marginBottom: '1.25rem', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', textAlign: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.25rem' }}>Totale Spedizioni</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>€ {(showDettaglioMese.importoTotale || 0).toFixed(2)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.8rem', color: '#92400e', marginBottom: '0.25rem' }}>Totale Logistica</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f59e0b' }}>€ {(showDettaglioMese.costoLogistica || 0).toFixed(2)}</div>
                    </div>
                    <div style={{ background: '#fef2f2', borderRadius: '8px', padding: '0.5rem' }}>
                      <div style={{ fontSize: '0.8rem', color: '#991b1b', marginBottom: '0.25rem' }}>TOTALE DA PAGARE</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#dc2626' }}>€ {(showDettaglioMese.totaleDaPagare || 0).toFixed(2)}</div>
                    </div>
                  </div>
                </div>

                {/* Sezione Pagamento */}
                <div style={{ background: '#f0fdf4', borderRadius: '10px', padding: '1rem', border: '1px solid #86efac' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#166534' }}>Registra Pagamento</h4>
                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                      Da pagare: <strong style={{ color: '#dc2626' }}>€ {((showDettaglioMese.totaleDaPagare || 0) - (showDettaglioMese.totalePagato || 0)).toFixed(2)}</strong>
                    </span>
                  </div>
                  
                  {/* Riga Pagamento Totale */}
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.75rem', padding: '0.75rem', background: '#dcfce7', borderRadius: '8px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#166534', minWidth: '100px' }}>Paga Tutto:</span>
                    <input type="date" id="modal-pagamento-data-totale" defaultValue={new Date().toISOString().split('T')[0]} style={{ padding: '0.4rem', border: '1.5px solid #86efac', borderRadius: '6px', fontSize: '0.85rem' }} />
                    <button type="button" onClick={() => {
                      const totale = (showDettaglioMese.totaleDaPagare || 0) - (showDettaglioMese.totalePagato || 0);
                      const data = document.getElementById('modal-pagamento-data-totale').value;
                      if (totale <= 0) { alert('Nessun importo da pagare'); return; }
                      
                      const spedizioni = showDettaglioMese.spedizioni || [];
                      const updates = spedizioni.map(s => {
                        const tot = (parseFloat(s.importo) || 0) + (parseFloat(s.costoFisso) || 0);
                        return { id: s.id, importoPagato: tot, pagato: true, dataPagamento: data };
                      });
                      
                      saveMovimenti(movimenti.map(m => {
                        const upd = updates.find(u => u.id === m.id);
                        return upd ? { ...m, ...upd } : m;
                      }));
                      
                      setShowDettaglioMese(null);
                      setSelectedRows(new Set());
                      alert(`Pagamento totale di €${totale.toFixed(2)} registrato`);
                    }} style={{ padding: '0.4rem 1rem', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                      Paga € {((showDettaglioMese.totaleDaPagare || 0) - (showDettaglioMese.totalePagato || 0)).toFixed(2)}
                    </button>
                  </div>

                  {/* Riga Pagamento Parziale */}
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', padding: '0.75rem', background: '#fef3c7', borderRadius: '8px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#92400e', minWidth: '100px' }}>Parziale:</span>
                    <span style={{ fontSize: '0.85rem', color: '#92400e' }}>€</span>
                    <input type="number" step="0.01" id="modal-pagamento-importo-parziale" placeholder="Importo" style={{ width: '100px', padding: '0.4rem', border: '1.5px solid #fcd34d', borderRadius: '6px', fontSize: '0.85rem', textAlign: 'center' }} />
                    <input type="date" id="modal-pagamento-data-parziale" defaultValue={new Date().toISOString().split('T')[0]} style={{ padding: '0.4rem', border: '1.5px solid #fcd34d', borderRadius: '6px', fontSize: '0.85rem' }} />
                    <button type="button" onClick={() => {
                      const importo = parseFloat(document.getElementById('modal-pagamento-importo-parziale').value) || 0;
                      const data = document.getElementById('modal-pagamento-data-parziale').value;
                      if (importo <= 0) { alert('Inserisci un importo valido'); return; }
                      
                      const spedizioni = showDettaglioMese.spedizioni || [];
                      let remaining = importo;
                      const updates = [];
                      
                      for (const s of spedizioni) {
                        if (remaining <= 0) break;
                        const tot = (parseFloat(s.importo) || 0) + (parseFloat(s.costoFisso) || 0);
                        const giaPag = parseFloat(s.importoPagato) || 0;
                        const daPag = tot - giaPag;
                        if (daPag <= 0) continue;
                        
                        const pagaOra = Math.min(remaining, daPag);
                        remaining -= pagaOra;
                        const nuovoPag = giaPag + pagaOra;
                        const completato = nuovoPag >= tot;
                        
                        updates.push({ id: s.id, importoPagato: nuovoPag, pagato: completato, dataPagamento: data });
                      }
                      
                      if (updates.length === 0) { alert('Nessuna spedizione da pagare'); return; }
                      
                      saveMovimenti(movimenti.map(m => {
                        const upd = updates.find(u => u.id === m.id);
                        return upd ? { ...m, ...upd } : m;
                      }));
                      
                      setShowDettaglioMese(null);
                      setSelectedRows(new Set());
                      alert(`Pagamento parziale di €${importo.toFixed(2)} registrato`);
                    }} style={{ padding: '0.4rem 1rem', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                      Registra Parziale
                    </button>
                  </div>
                </div>

                {/* Estratto Conto */}
                <div style={{ marginTop: '1.25rem', background: 'white', borderRadius: '10px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                  <div style={{ padding: '0.75rem 1rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: '#1e293b' }}>Estratto Conto</h4>
                  </div>
                  <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc' }}>
                          <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', borderBottom: '1px solid #e2e8f0', fontWeight: 600, color: '#64748b' }}>Descrizione</th>
                          <th style={{ padding: '0.5rem 0.75rem', textAlign: 'right', borderBottom: '1px solid #e2e8f0', fontWeight: 600, color: '#64748b' }}>Dare</th>
                          <th style={{ padding: '0.5rem 0.75rem', textAlign: 'right', borderBottom: '1px solid #e2e8f0', fontWeight: 600, color: '#64748b' }}>Avere</th>
                          <th style={{ padding: '0.5rem 0.75rem', textAlign: 'right', borderBottom: '1px solid #e2e8f0', fontWeight: 600, color: '#64748b' }}>Saldo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const righe = [];
                          let saldo = 0;
                          
                          // Riga totale spedizioni
                          const totSpedizioni = showDettaglioMese.importoTotale || 0;
                          saldo += totSpedizioni;
                          righe.push({ desc: `Spedizioni (${showDettaglioMese.spedizioni?.length || 0})`, dare: totSpedizioni, avere: 0, saldo });
                          
                          // Riga costo logistica
                          const totLogistica = showDettaglioMese.costoLogistica || 0;
                          if (totLogistica > 0) {
                            saldo += totLogistica;
                            righe.push({ desc: 'Costo Logistica', dare: totLogistica, avere: 0, saldo });
                          }
                          
                          // Righe pagamenti (per ogni spedizione con pagamento)
                          const pagamenti = {};
                          showDettaglioMese.spedizioni?.forEach(s => {
                            if (s.importoPagato > 0 && s.dataPagamento) {
                              const key = s.dataPagamento;
                              if (!pagamenti[key]) pagamenti[key] = 0;
                              pagamenti[key] += parseFloat(s.importoPagato) || 0;
                            }
                          });
                          
                          Object.entries(pagamenti).sort(([a], [b]) => a.localeCompare(b)).forEach(([data, importo]) => {
                            saldo -= importo;
                            righe.push({ desc: `Pagamento ${data}`, dare: 0, avere: importo, saldo, isPagamento: true });
                          });
                          
                          return righe.map((r, idx) => (
                            <tr key={idx} style={{ background: r.isPagamento ? '#f0fdf4' : 'white' }}>
                              <td style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #f1f5f9' }}>{r.desc}</td>
                              <td style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #f1f5f9', textAlign: 'right', color: r.dare > 0 ? '#dc2626' : '#94a3b8' }}>
                                {r.dare > 0 ? `€ ${r.dare.toFixed(2)}` : '-'}
                              </td>
                              <td style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #f1f5f9', textAlign: 'right', color: r.avere > 0 ? '#10b981' : '#94a3b8' }}>
                                {r.avere > 0 ? `€ ${r.avere.toFixed(2)}` : '-'}
                              </td>
                              <td style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #f1f5f9', textAlign: 'right', fontWeight: 600, color: r.saldo > 0 ? '#dc2626' : '#10b981' }}>
                                € {r.saldo.toFixed(2)}
                              </td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                      <tfoot>
                        <tr style={{ background: '#f8fafc' }}>
                          <td style={{ padding: '0.5rem 0.75rem', fontWeight: 700 }}>SALDO</td>
                          <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', fontWeight: 700, color: '#dc2626' }}>
                            € {((showDettaglioMese.importoTotale || 0) + (showDettaglioMese.costoLogistica || 0)).toFixed(2)}
                          </td>
                          <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', fontWeight: 700, color: '#10b981' }}>
                            € {(showDettaglioMese.totalePagato || 0).toFixed(2)}
                          </td>
                          <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', fontWeight: 700, color: ((showDettaglioMese.totaleDaPagare || 0) - (showDettaglioMese.totalePagato || 0)) > 0 ? '#dc2626' : '#10b981' }}>
                            € {((showDettaglioMese.totaleDaPagare || 0) - (showDettaglioMese.totalePagato || 0)).toFixed(2)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>
              <div style={{ padding: '0.75rem 1.5rem', borderTop: '1px solid #e2e8f0' }}>
                <button type="button" onClick={() => { setShowDettaglioMese(null); setSelectedRows(new Set()); }} style={{ width: '100%', padding: '0.6rem', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontWeight: 500, cursor: 'pointer', background: 'white' }}>Chiudi</button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Archivio - Lista per Store/Mese */}
        {showArchivio && !showArchivioDettaglio && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }} onClick={() => setShowArchivio(false)}>
            <div style={{ background: 'white', borderRadius: '16px', maxWidth: '1100px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
              <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, #10b981, #059669)', borderRadius: '16px 16px 0 0' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <BookOpen className="w-6 h-6" /> Archivio Spedizioni Pagate
                  </h3>
                  <p style={{ margin: '0.25rem 0 0 0', color: 'rgba(255,255,255,0.85)', fontSize: '0.9rem' }}>{spedizioniArchiviate.length} spedizioni in {Object.keys(archivioPerStoreMese).length} gruppi</p>
                </div>
                <button type="button" onClick={() => setShowArchivio(false)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '8px', padding: '0.5rem', cursor: 'pointer' }}>
                  <X className="w-5 h-5" style={{ color: 'white' }} />
                </button>
              </div>
              <div style={{ padding: '1.5rem' }}>
                {/* Filtri Archivio */}
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>Filtra per Store</label>
                    <select id="archivio-filter-store" onChange={e => {
                      const val = e.target.value;
                      document.querySelectorAll('[data-archivio-row]').forEach(row => {
                        const storeId = row.getAttribute('data-store-id');
                        row.style.display = (val === 'all' || storeId === val) ? 'flex' : 'none';
                      });
                    }} style={{ padding: '0.5rem', border: '1.5px solid #e2e8f0', borderRadius: '6px', fontSize: '0.85rem', minWidth: '150px' }}>
                      <option value="all">Tutti gli store</option>
                      {stores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>Filtra per Mese</label>
                    <select id="archivio-filter-mese" onChange={e => {
                      const val = e.target.value;
                      document.querySelectorAll('[data-archivio-row]').forEach(row => {
                        const mese = row.getAttribute('data-mese');
                        const storeFilter = document.getElementById('archivio-filter-store').value;
                        const storeId = row.getAttribute('data-store-id');
                        const storeMatch = storeFilter === 'all' || storeId === storeFilter;
                        const meseMatch = val === 'all' || mese === val;
                        row.style.display = (storeMatch && meseMatch) ? 'flex' : 'none';
                      });
                    }} style={{ padding: '0.5rem', border: '1.5px solid #e2e8f0', borderRadius: '6px', fontSize: '0.85rem', minWidth: '120px' }}>
                      <option value="all">Tutti i mesi</option>
                      {[...new Set(Object.values(archivioPerStoreMese).map(d => d.meseRiferimento))].sort().reverse().map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>

                {Object.keys(archivioPerStoreMese).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                    <BookOpen className="w-12 h-12 mx-auto" style={{ marginBottom: '1rem', opacity: 0.5 }} />
                    <p>Nessuna spedizione archiviata</p>
                  </div>
                ) : (
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                    {/* Header Tabella */}
                    <div style={{ display: 'flex', alignItems: 'center', padding: '0.75rem 1.25rem', borderBottom: '2px solid #e2e8f0', background: '#f8fafc', gap: '0.75rem' }}>
                      <div style={{ minWidth: '130px', fontWeight: 600, fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Store</div>
                      <div style={{ minWidth: '90px', fontWeight: 600, fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Mese</div>
                      <div style={{ minWidth: '70px', textAlign: 'center', fontWeight: 600, fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Sped.</div>
                      <div style={{ minWidth: '90px', textAlign: 'right', fontWeight: 600, fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Importo</div>
                      <div style={{ minWidth: '90px', textAlign: 'right', fontWeight: 600, fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Logistica</div>
                      <div style={{ minWidth: '100px', textAlign: 'right', fontWeight: 600, fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Totale</div>
                      <div style={{ minWidth: '90px', textAlign: 'center', fontWeight: 600, fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Data Pag.</div>
                      <div style={{ minWidth: '80px', textAlign: 'center', fontWeight: 600, fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}></div>
                    </div>
                    
                    {/* Righe */}
                    <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                      {Object.entries(archivioPerStoreMese).sort(([, a], [, b]) => {
                        const storeA = stores.find(s => s.id === a.storeId)?.nome || '';
                        const storeB = stores.find(s => s.id === b.storeId)?.nome || '';
                        if (storeA !== storeB) return storeA.localeCompare(storeB);
                        return (b.meseRiferimento || '').localeCompare(a.meseRiferimento || '');
                      }).map(([key, data]) => {
                        const store = stores.find(s => s.id === data.storeId);
                        const storeIcons = { marketplace: '🏪', ecommerce: '🛒', fisico: '🏬' };
                        return (
                          <div key={key} data-archivio-row data-store-id={data.storeId} data-mese={data.meseRiferimento} style={{ display: 'flex', alignItems: 'center', padding: '0.6rem 1.25rem', borderBottom: '1px solid #f1f5f9', gap: '0.75rem', background: '#f0fdf4', cursor: 'pointer' }}
                            onClick={() => setShowArchivioDettaglio({ ...data, storeName: store?.nome })}
                            onMouseOver={e => e.currentTarget.style.background = '#dcfce7'}
                            onMouseOut={e => e.currentTarget.style.background = '#f0fdf4'}>
                            <div style={{ minWidth: '130px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span style={{ fontSize: '1rem' }}>{storeIcons[store?.tipo] || '🏪'}</span>
                              <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.85rem' }}>{store?.nome || '-'}</span>
                            </div>
                            <div style={{ minWidth: '90px', fontWeight: 600, color: '#10b981', fontSize: '0.85rem' }}>{data.meseRiferimento}</div>
                            <div style={{ minWidth: '70px', textAlign: 'center', fontWeight: 700, color: '#1e293b', fontSize: '0.95rem' }}>{data.totale}</div>
                            <div style={{ minWidth: '90px', textAlign: 'right', color: '#475569', fontSize: '0.85rem' }}>€ {data.importoTotale.toFixed(2)}</div>
                            <div style={{ minWidth: '90px', textAlign: 'right', color: '#f59e0b', fontSize: '0.85rem', fontWeight: 600 }}>€ {data.costoLogistica.toFixed(2)}</div>
                            <div style={{ minWidth: '100px', textAlign: 'right', fontWeight: 700, color: '#10b981', fontSize: '0.95rem' }}>€ {data.totaleDaPagare.toFixed(2)}</div>
                            <div style={{ minWidth: '90px', textAlign: 'center', color: '#166534', fontSize: '0.8rem', fontWeight: 600 }}>{data.dataPagamento || '-'}</div>
                            <div style={{ minWidth: '80px', textAlign: 'center' }}>
                              <button type="button" onClick={e => { e.stopPropagation(); setShowArchivioDettaglio({ ...data, storeName: store?.nome }); }} style={{ padding: '0.35rem 0.6rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
                                Dettagli
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Footer Totali */}
                    <div style={{ display: 'flex', alignItems: 'center', padding: '0.75rem 1.25rem', borderTop: '2px solid #e2e8f0', background: '#dcfce7', gap: '0.75rem', fontWeight: 700 }}>
                      <div style={{ minWidth: '130px', color: '#166534', fontSize: '0.85rem' }}>TOTALE</div>
                      <div style={{ minWidth: '90px' }}></div>
                      <div style={{ minWidth: '70px', textAlign: 'center', color: '#166534' }}>
                        {Object.values(archivioPerStoreMese).reduce((sum, d) => sum + d.totale, 0)}
                      </div>
                      <div style={{ minWidth: '90px', textAlign: 'right', color: '#475569', fontSize: '0.85rem' }}>
                        € {Object.values(archivioPerStoreMese).reduce((sum, d) => sum + d.importoTotale, 0).toFixed(2)}
                      </div>
                      <div style={{ minWidth: '90px', textAlign: 'right', color: '#f59e0b', fontSize: '0.85rem' }}>
                        € {Object.values(archivioPerStoreMese).reduce((sum, d) => sum + d.costoLogistica, 0).toFixed(2)}
                      </div>
                      <div style={{ minWidth: '100px', textAlign: 'right', color: '#166534', fontSize: '0.95rem' }}>
                        € {Object.values(archivioPerStoreMese).reduce((sum, d) => sum + d.totaleDaPagare, 0).toFixed(2)}
                      </div>
                      <div style={{ minWidth: '90px' }}></div>
                      <div style={{ minWidth: '80px' }}></div>
                    </div>
                  </div>
                )}
              </div>
              <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0' }}>
                <button type="button" onClick={() => setShowArchivio(false)} style={{ width: '100%', padding: '0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontWeight: 500, cursor: 'pointer', background: 'white' }}>Chiudi</button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Archivio Dettaglio - Lista spedizioni di un mese */}
        {showArchivioDettaglio && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10001 }} onClick={() => setShowArchivioDettaglio(null)}>
            <div style={{ background: 'white', borderRadius: '16px', maxWidth: '1000px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
              <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', borderRadius: '16px 16px 0 0', color: 'white' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>{showArchivioDettaglio.storeName} - {showArchivioDettaglio.meseRiferimento}</h3>
                    <p style={{ margin: '0.25rem 0 0 0', opacity: 0.9 }}>{showArchivioDettaglio.spedizioni?.length || 0} spedizioni archiviate</p>
                  </div>
                  <button type="button" onClick={() => setShowArchivioDettaglio(null)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '8px', padding: '0.5rem', cursor: 'pointer', color: 'white' }}>
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div style={{ padding: '1.5rem' }}>
                {/* Sezione Aggiungi Costo Logistica */}
                <div style={{ background: '#fef3c7', borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1.5rem', border: '1px solid #fcd34d' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#92400e' }}>Costo Logistica per spedizione:</span>
                      <input type="number" step="0.01" min="0" value={costoPerSpedizione} onChange={e => setCostoPerSpedizione(parseFloat(e.target.value) || 0)} style={{ width: '80px', padding: '0.5rem', border: '1.5px solid #fcd34d', borderRadius: '6px', fontSize: '0.95rem', fontWeight: 600, textAlign: 'center' }} />
                      <span style={{ fontSize: '0.85rem', color: '#92400e' }}>€</span>
                    </div>
                    <button type="button" onClick={() => {
                      const senzaCosto = showArchivioDettaglio.spedizioni?.filter(s => !s.costoFisso || s.costoFisso === 0) || [];
                      if (senzaCosto.length === 0) { alert('Tutte le spedizioni hanno già un costo'); return; }
                      const ids = senzaCosto.map(s => s.id);
                      saveMovimenti(movimenti.map(m => ids.includes(m.id) ? { ...m, costoFisso: costoPerSpedizione } : m));
                      setShowArchivioDettaglio(prev => ({
                        ...prev,
                        spedizioni: prev.spedizioni.map(s => ids.includes(s.id) ? { ...s, costoFisso: costoPerSpedizione } : s),
                        costoLogistica: prev.costoLogistica + (costoPerSpedizione * senzaCosto.length),
                        totaleDaPagare: prev.totaleDaPagare + (costoPerSpedizione * senzaCosto.length)
                      }));
                      alert(`Costo €${costoPerSpedizione.toFixed(2)} aggiunto a ${senzaCosto.length} spedizioni`);
                    }} style={{ padding: '0.5rem 1rem', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                      Applica a {showArchivioDettaglio.spedizioni?.filter(s => !s.costoFisso || s.costoFisso === 0).length || 0} senza costo
                    </button>
                  </div>
                </div>

                {/* Riepilogo Totali */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '1rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.25rem' }}>Importo</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>€ {(showArchivioDettaglio.importoTotale || 0).toFixed(2)}</div>
                  </div>
                  <div style={{ background: '#fef3c7', borderRadius: '10px', padding: '1rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.8rem', color: '#92400e', marginBottom: '0.25rem' }}>Costo Log.</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f59e0b' }}>€ {(showArchivioDettaglio.costoLogistica || 0).toFixed(2)}</div>
                  </div>
                  <div style={{ background: '#dcfce7', borderRadius: '10px', padding: '1rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.8rem', color: '#166534', marginBottom: '0.25rem' }}>Totale Pagato</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#10b981' }}>€ {(showArchivioDettaglio.totaleDaPagare || 0).toFixed(2)}</div>
                  </div>
                  <div style={{ background: '#f0fdf4', borderRadius: '10px', padding: '1rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.8rem', color: '#166534', marginBottom: '0.25rem' }}>Data Pag.</div>
                    <div style={{ fontSize: '1rem', fontWeight: 600, color: '#166534' }}>{showArchivioDettaglio.dataPagamento || '-'}</div>
                  </div>
                </div>

                {/* Lista spedizioni */}
                <div style={{ marginBottom: '1rem' }}>
                  <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', fontWeight: 600, color: '#1e293b' }}>Dettaglio Spedizioni</h4>
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', maxHeight: '300px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc' }}>
                          <th style={{ padding: '0.6rem', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Data</th>
                          <th style={{ padding: '0.6rem', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Ordine</th>
                          <th style={{ padding: '0.6rem', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Destinatario</th>
                          <th style={{ padding: '0.6rem', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Tracking</th>
                          <th style={{ padding: '0.6rem', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>Importo</th>
                          <th style={{ padding: '0.6rem', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>Costo</th>
                          <th style={{ padding: '0.6rem', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>Totale</th>
                        </tr>
                      </thead>
                      <tbody>
                        {showArchivioDettaglio.spedizioni?.map(s => {
                          const importo = parseFloat(s.importo) || 0;
                          const costo = parseFloat(s.costoFisso) || 0;
                          const tot = importo + costo;
                          return (
                            <tr key={s.id} style={{ background: '#f0fdf4' }}>
                              <td style={{ padding: '0.6rem', borderBottom: '1px solid #f1f5f9' }}>{s.data || '-'}</td>
                              <td style={{ padding: '0.6rem', borderBottom: '1px solid #f1f5f9', fontFamily: 'monospace', fontSize: '0.8rem' }}>{s.ordineId || '-'}</td>
                              <td style={{ padding: '0.6rem', borderBottom: '1px solid #f1f5f9' }}>{s.destinatario || '-'}</td>
                              <td style={{ padding: '0.6rem', borderBottom: '1px solid #f1f5f9', color: '#3b82f6', fontFamily: 'monospace', fontSize: '0.8rem' }}>{s.tracking || '-'}</td>
                              <td style={{ padding: '0.6rem', borderBottom: '1px solid #f1f5f9', textAlign: 'right' }}>€ {importo.toFixed(2)}</td>
                              <td style={{ padding: '0.6rem', borderBottom: '1px solid #f1f5f9', textAlign: 'right', color: '#f59e0b', fontWeight: 600 }}>€ {costo.toFixed(2)}</td>
                              <td style={{ padding: '0.6rem', borderBottom: '1px solid #f1f5f9', textAlign: 'right', fontWeight: 700, color: '#10b981' }}>€ {tot.toFixed(2)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0' }}>
                <button type="button" onClick={() => setShowArchivioDettaglio(null)} style={{ width: '100%', padding: '0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontWeight: 500, cursor: 'pointer', background: 'white' }}>Chiudi</button>
              </div>
            </div>
          </div>
        )}
        )}

        {/* Modal Pagamento */}
        {showPagamentoModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }} onClick={() => setShowPagamentoModal(null)}>
            <div style={{ background: 'white', borderRadius: '16px', maxWidth: '450px', width: '90%' }} onClick={e => e.stopPropagation()}>
              <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', background: 'linear-gradient(135deg, #10b981, #059669)', borderRadius: '16px 16px 0 0' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'white' }}>Registra Pagamento</h3>
                <p style={{ margin: '0.25rem 0 0 0', color: 'rgba(255,255,255,0.85)', fontSize: '0.85rem' }}>
                  Ordine: {showPagamentoModal.ordineId || '-'}
                </p>
              </div>
              <div style={{ padding: '1.5rem' }}>
                {(() => {
                  const importoBase = parseFloat(showPagamentoModal.importo) || 0;
                  const costoFisso = parseFloat(showPagamentoModal.costoFisso) || 0;
                  const totale = importoBase + costoFisso;
                  const giaPagato = parseFloat(showPagamentoModal.importoPagato) || 0;
                  const restante = Math.max(0, totale - giaPagato);
                  
                  return (
                    <>
                      <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '1rem', marginBottom: '1.25rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.9rem' }}>
                          <div><span style={{ color: '#64748b' }}>Importo base:</span> <strong>€ {importoBase.toFixed(2)}</strong></div>
                          <div><span style={{ color: '#64748b' }}>Costo fisso:</span> <strong style={{ color: '#f59e0b' }}>€ {costoFisso.toFixed(2)}</strong></div>
                          <div><span style={{ color: '#64748b' }}>Totale:</span> <strong>€ {totale.toFixed(2)}</strong></div>
                          <div><span style={{ color: '#64748b' }}>Già pagato:</span> <strong style={{ color: '#10b981' }}>€ {giaPagato.toFixed(2)}</strong></div>
                        </div>
                        <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0', fontSize: '1.1rem' }}>
                          <span style={{ color: '#dc2626' }}>Da pagare:</span> <strong style={{ color: '#dc2626' }}>€ {restante.toFixed(2)}</strong>
                        </div>
                      </div>
                      
                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>Importo da pagare *</label>
                        <input type="number" step="0.01" defaultValue={restante.toFixed(2)} id="pagamento-importo" style={{ width: '100%', padding: '0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '1rem' }} />
                      </div>
                      
                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>Data pagamento</label>
                        <input type="date" defaultValue={new Date().toISOString().split('T')[0]} id="pagamento-data" style={{ width: '100%', padding: '0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.95rem' }} />
                      </div>
                      
                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>Note (opzionale)</label>
                        <input type="text" placeholder="Bonifico, contanti, etc." id="pagamento-note" style={{ width: '100%', padding: '0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.95rem' }} />
                      </div>
                      
                      <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button type="button" onClick={() => setShowPagamentoModal(null)} style={{ flex: 1, padding: '0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', background: 'white' }}>Annulla</button>
                        <button type="button" onClick={() => {
                          const importo = document.getElementById('pagamento-importo').value;
                          const data = document.getElementById('pagamento-data').value;
                          const note = document.getElementById('pagamento-note').value;
                          handlePagamento(showPagamentoModal.id, importo, data, note);
                        }} style={{ flex: 1, padding: '0.75rem', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                          Conferma Pagamento
                        </button>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Modal Costi Fissi */}
        {showCostiModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }} onClick={() => setShowCostiModal(false)}>
            <div style={{ background: 'white', borderRadius: '16px', maxWidth: '450px', width: '90%' }} onClick={e => e.stopPropagation()}>
              <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', background: 'linear-gradient(135deg, #f59e0b, #d97706)', borderRadius: '16px 16px 0 0' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'white' }}>Gestione Costi Fissi</h3>
                <p style={{ margin: '0.25rem 0 0 0', color: 'rgba(255,255,255,0.85)', fontSize: '0.85rem' }}>
                  Aggiungi costi fissi per spedizione
                </p>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <div style={{ background: '#fef3c7', borderRadius: '10px', padding: '1rem', marginBottom: '1.25rem', border: '1px solid #fcd34d' }}>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#92400e' }}>
                    Questo aggiungerà il costo fisso a tutte le spedizioni assegnate che non hanno ancora un costo.
                  </p>
                </div>
                
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>Costo per spedizione (€)</label>
                  <input type="number" step="0.01" min="0" value={costoPerSpedizione} onChange={e => setCostoPerSpedizione(parseFloat(e.target.value) || 0)} style={{ width: '100%', padding: '0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '1.1rem', fontWeight: 600 }} />
                </div>
                
                <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '1rem', marginBottom: '1.25rem' }}>
                  <div style={{ fontSize: '0.9rem', color: '#475569' }}>
                    <p style={{ margin: '0 0 0.5rem 0' }}>
                      <strong>Spedizioni senza costo:</strong> {movimenti.filter(m => m.categoria?.includes('spedizione') && m.store && !m.archiviato && (!m.costoFisso || m.costoFisso === 0)).length}
                    </p>
                    <p style={{ margin: 0, color: '#dc2626', fontWeight: 600 }}>
                      Totale da aggiungere: € {(costoPerSpedizione * movimenti.filter(m => m.categoria?.includes('spedizione') && m.store && !m.archiviato && (!m.costoFisso || m.costoFisso === 0)).length).toFixed(2)}
                    </p>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button type="button" onClick={() => setShowCostiModal(false)} style={{ flex: 1, padding: '0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', background: 'white' }}>Annulla</button>
                  <button type="button" onClick={handleAggiungiCostiFissi} style={{ flex: 1, padding: '0.75rem', background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                    Applica Costi
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Import CSV */}
        {showImportModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }} onClick={() => { setShowImportModal(false); setImportStep(1); }}>
            <div style={{ background: 'white', borderRadius: '12px', maxWidth: '550px', width: '90%' }} onClick={e => e.stopPropagation()}>
              <div style={{ padding: '1.25rem', borderBottom: '1px solid #e2e8f0' }}><h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Importa CSV Logistica</h3></div>
              <div style={{ padding: '1.5rem' }}>
                {importStep === 1 ? (
                  <div style={{ textAlign: 'center' }}>
                    <Package className="w-12 h-12 mx-auto" style={{ color: '#94a3b8', marginBottom: '1rem' }} />
                    <p style={{ marginBottom: '0.75rem', color: '#64748b', fontSize: '0.875rem' }}>Seleziona magazzino di destinazione</p>
                    <select value={importMagazzinoId} onChange={e => setImportMagazzinoId(e.target.value)} style={{ padding: '0.625rem 1rem', border: '1px solid #e2e8f0', borderRadius: '6px', marginBottom: '1rem', minWidth: '180px' }}>
                      <option value="">Nessun magazzino</option>
                      {magazzini.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                    </select>
                    <div>
                      <input type="file" accept=".csv,.txt" onChange={handleFileUpload} style={{ display: 'none' }} id="csv-upload-log" />
                      <label htmlFor="csv-upload-log" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem', background: '#f59e0b', color: 'white', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                        <Upload className="w-4 h-4" /> Seleziona File
                      </label>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p style={{ marginBottom: '0.75rem', fontWeight: 500, fontSize: '0.875rem' }}>Mappa colonne ({importedData.length} righe)</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
                      {['data', 'descrizione', 'quantita', 'sku', 'tracking'].map(f => (
                        <div key={f}>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, marginBottom: '0.25rem', textTransform: 'capitalize' }}>{f}</label>
                          <select value={importMapping[f]} onChange={e => setImportMapping(p => ({ ...p, [f]: e.target.value }))} style={{ width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '0.8rem' }}>
                            <option value="">--</option>
                            {importHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                          </select>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                      <button type="button" onClick={() => setImportStep(1)} style={{ padding: '0.625rem 1rem', border: '1px solid #e2e8f0', borderRadius: '6px', fontWeight: 500, cursor: 'pointer' }}>Indietro</button>
                      <button type="button" onClick={processImport} style={{ padding: '0.625rem 1rem', border: 'none', borderRadius: '6px', background: '#22c55e', color: 'white', fontWeight: 600, cursor: 'pointer' }}>Importa</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal Dettaglio Movimento */}
        {showDetailModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }} onClick={() => setShowDetailModal(null)}>
            <div style={{ background: 'white', borderRadius: '12px', maxWidth: '500px', width: '95%' }} onClick={e => e.stopPropagation()}>
              <div style={{ padding: '1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Dettaglio Movimento</h3>
                <button type="button" onClick={() => setShowDetailModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X className="w-5 h-5" /></button>
              </div>
              <div style={{ padding: '1.25rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div><div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Data</div><div style={{ fontWeight: 500 }}>{showDetailModal.data ? format(new Date(showDetailModal.data), 'dd/MM/yyyy') : '-'}</div></div>
                  <div><div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Tipo</div><div>{showDetailModal.tipo === 'entrata' ? '📥 Entrata' : '📤 Uscita'}</div></div>
                  <div><div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Quantità</div><div style={{ fontWeight: 700, fontSize: '1.25rem', color: showDetailModal.tipo === 'entrata' ? '#16a34a' : '#dc2626' }}>{showDetailModal.tipo === 'entrata' ? '+' : '-'}{showDetailModal.quantita}</div></div>
                  <div><div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Stato</div><div>{getStatoBadge(showDetailModal.stato)}</div></div>
                </div>
                <div style={{ marginBottom: '1rem' }}><div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>SKU</div><div style={{ fontFamily: 'monospace', fontWeight: 500 }}>{showDetailModal.sku || '-'}</div></div>
                <div style={{ marginBottom: '1rem' }}><div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Descrizione</div><div>{showDetailModal.descrizione || '-'}</div></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div><div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Magazzino</div><div>{magazzini.find(m => m.id === showDetailModal.magazzino)?.nome || '-'}</div></div>
                  <div><div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Categoria</div><div>{tutteCategorie.find(c => c.id === showDetailModal.categoria)?.nome || '-'}</div></div>
                </div>
                <div style={{ marginBottom: '1rem' }}><div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Destinatario</div><div>{showDetailModal.destinatario || '-'}</div></div>
                {showDetailModal.corriere && <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div><div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Corriere</div><div>{showDetailModal.corriere}</div></div>
                  <div><div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Tracking</div><div style={{ fontFamily: 'monospace' }}>{showDetailModal.tracking || '-'}</div></div>
                </div>}
              </div>
            </div>
          </div>
        )}

        {/* Modal Nuova Categoria */}
        {showNuovaCategoria && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10002 }} onClick={() => setShowNuovaCategoria(false)}>
            <div style={{ background: 'white', borderRadius: '12px', maxWidth: '450px', width: '95%', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.1rem', fontWeight: 700 }}>Nuova Categoria Logistica</h3>
                <button type="button" onClick={() => setShowNuovaCategoria(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}>×</button>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>Tipo *</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button type="button" onClick={() => setNuovaCategoriaForm(p => ({ ...p, tipo: 'entrata', gruppo: '' }))} style={{ flex: 1, padding: '0.75rem', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', background: nuovaCategoriaForm.tipo === 'entrata' ? '#10b981' : '#f1f5f9', color: nuovaCategoriaForm.tipo === 'entrata' ? 'white' : '#64748b' }}>📥 Entrata</button>
                    <button type="button" onClick={() => setNuovaCategoriaForm(p => ({ ...p, tipo: 'uscita', gruppo: '' }))} style={{ flex: 1, padding: '0.75rem', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', background: nuovaCategoriaForm.tipo === 'uscita' ? '#ef4444' : '#f1f5f9', color: nuovaCategoriaForm.tipo === 'uscita' ? 'white' : '#64748b' }}>📤 Uscita</button>
                  </div>
                </div>
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>Gruppo *</label>
                  <select value={nuovaCategoriaForm.gruppo} onChange={e => setNuovaCategoriaForm(p => ({ ...p, gruppo: e.target.value, nuovoGruppo: '' }))} style={{ width: '100%', padding: '0.6rem', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                    <option value="">Seleziona gruppo esistente...</option>
                    {[...new Set((nuovaCategoriaForm.tipo === 'entrata' ? categorieEntrata : categorieUscita).map(c => c.gruppo))].map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>oppure</span>
                    <input type="text" value={nuovaCategoriaForm.nuovoGruppo} onChange={e => setNuovaCategoriaForm(p => ({ ...p, nuovoGruppo: e.target.value, gruppo: '' }))} placeholder="Crea nuovo gruppo..." style={{ flex: 1, padding: '0.5rem', border: '1.5px solid #e2e8f0', borderRadius: '6px', fontSize: '0.85rem' }} />
                  </div>
                </div>
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>Nome Categoria *</label>
                  <input type="text" value={nuovaCategoriaForm.nome} onChange={e => setNuovaCategoriaForm(p => ({ ...p, nome: e.target.value }))} placeholder="Es: Spedizione Express..." style={{ width: '100%', padding: '0.6rem', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={() => setShowNuovaCategoria(false)} style={{ padding: '0.65rem 1.25rem', background: '#64748b', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 500 }}>Annulla</button>
                <button type="button" onClick={handleSaveNuovaCategoria} style={{ padding: '0.65rem 1.25rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Crea Categoria</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default PrimaNotaLogisticaPage;
