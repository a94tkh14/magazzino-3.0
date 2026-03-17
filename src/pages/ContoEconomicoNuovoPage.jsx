import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Trash2, Edit, Save, X, Download, Upload, Filter, 
  Calendar, DollarSign, TrendingUp, TrendingDown, FileText,
  ChevronDown, ChevronUp, Search, RefreshCw, ArrowUpRight,
  ArrowDownRight, Wallet, CreditCard, Receipt, PiggyBank,
  BarChart3, PieChart, AlertCircle, CheckCircle, Clock,
  Building, Users, Megaphone, Package, Truck, Calculator,
  Link2, Link2Off, Landmark, ArrowRightLeft, Eye, EyeOff,
  Target, Banknote, CircleDollarSign
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { 
  loadContiBancariData, 
  saveContoBancarioData,
  loadMovimentiBancaData,
  saveMovimentiBancaData,
  loadPrimaNotaData,
  savePrimaNotaData
} from '../lib/magazzinoStorage';

// Piano dei Conti strutturato
const PIANO_DEI_CONTI = {
  ricavi: {
    id: 'ricavi',
    nome: 'RICAVI',
    tipo: 'avere',
    icona: TrendingUp,
    colore: 'emerald',
    conti: [
      { codice: 'R001', nome: 'Vendite Prodotti', descrizione: 'Ricavi da vendita merce' },
      { codice: 'R002', nome: 'Vendite Servizi', descrizione: 'Ricavi da prestazioni servizi' },
      { codice: 'R003', nome: 'Provvigioni Attive', descrizione: 'Provvigioni su vendite' },
      { codice: 'R004', nome: 'Rimborsi Ricevuti', descrizione: 'Rimborsi da fornitori/altro' },
      { codice: 'R005', nome: 'Altri Ricavi', descrizione: 'Ricavi vari e straordinari' },
      { codice: 'R006', nome: 'Interessi Attivi', descrizione: 'Interessi su depositi' }
    ]
  },
  costi_diretti: {
    id: 'costi_diretti',
    nome: 'COSTI DIRETTI (COGS)',
    tipo: 'dare',
    icona: Package,
    colore: 'red',
    conti: [
      { codice: 'CD01', nome: 'Acquisto Merce', descrizione: 'Costo acquisto prodotti' },
      { codice: 'CD02', nome: 'Spedizioni Vendite', descrizione: 'Costi spedizione ai clienti' },
      { codice: 'CD03', nome: 'Packaging', descrizione: 'Materiali imballaggio' },
      { codice: 'CD04', nome: 'Commissioni Marketplace', descrizione: 'Fee piattaforme vendita' },
      { codice: 'CD05', nome: 'Gateway Pagamento', descrizione: 'Commissioni Stripe/PayPal' },
      { codice: 'CD06', nome: 'Resi e Rimborsi', descrizione: 'Costi per resi clienti' },
      { codice: 'CD07', nome: 'Dazi e Dogana', descrizione: 'Costi importazione' }
    ]
  },
  marketing: {
    id: 'marketing',
    nome: 'COSTI MARKETING',
    tipo: 'dare',
    icona: Megaphone,
    colore: 'orange',
    conti: [
      { codice: 'MK01', nome: 'Google Ads', descrizione: 'Campagne Google/YouTube' },
      { codice: 'MK02', nome: 'Meta Ads', descrizione: 'Facebook e Instagram Ads' },
      { codice: 'MK03', nome: 'TikTok Ads', descrizione: 'Campagne TikTok' },
      { codice: 'MK04', nome: 'Influencer Marketing', descrizione: 'Collaborazioni influencer' },
      { codice: 'MK05', nome: 'Email Marketing', descrizione: 'Mailchimp, Klaviyo, etc.' },
      { codice: 'MK06', nome: 'SEO/Content', descrizione: 'Ottimizzazione e contenuti' },
      { codice: 'MK07', nome: 'Grafica e Creatività', descrizione: 'Design materiali promo' },
      { codice: 'MK08', nome: 'Altro Marketing', descrizione: 'Altre spese marketing' }
    ]
  },
  operativi: {
    id: 'operativi',
    nome: 'COSTI OPERATIVI',
    tipo: 'dare',
    icona: Building,
    colore: 'purple',
    conti: [
      { codice: 'OP01', nome: 'Affitto Locale', descrizione: 'Canone locazione' },
      { codice: 'OP02', nome: 'Utenze', descrizione: 'Luce, gas, acqua' },
      { codice: 'OP03', nome: 'Telefono e Internet', descrizione: 'Connettività e telefonia' },
      { codice: 'OP04', nome: 'Software e SaaS', descrizione: 'Abbonamenti software' },
      { codice: 'OP05', nome: 'Hosting e Domini', descrizione: 'Servizi web' },
      { codice: 'OP06', nome: 'Assicurazioni', descrizione: 'Polizze assicurative' },
      { codice: 'OP07', nome: 'Manutenzioni', descrizione: 'Riparazioni e manutenzione' },
      { codice: 'OP08', nome: 'Materiali Ufficio', descrizione: 'Cancelleria e consumabili' },
      { codice: 'OP09', nome: 'Spese Bancarie', descrizione: 'Commissioni e spese c/c' }
    ]
  },
  personale: {
    id: 'personale',
    nome: 'COSTI PERSONALE',
    tipo: 'dare',
    icona: Users,
    colore: 'blue',
    conti: [
      { codice: 'PE01', nome: 'Stipendi Dipendenti', descrizione: 'Retribuzioni lorde' },
      { codice: 'PE02', nome: 'Contributi INPS', descrizione: 'Contributi previdenziali' },
      { codice: 'PE03', nome: 'TFR', descrizione: 'Trattamento fine rapporto' },
      { codice: 'PE04', nome: 'Collaboratori', descrizione: 'Compensi collaboratori' },
      { codice: 'PE05', nome: 'Freelance', descrizione: 'Consulenti esterni' },
      { codice: 'PE06', nome: 'Formazione', descrizione: 'Corsi e aggiornamento' }
    ]
  },
  professionali: {
    id: 'professionali',
    nome: 'CONSULENZE E PROFESSIONISTI',
    tipo: 'dare',
    icona: Calculator,
    colore: 'slate',
    conti: [
      { codice: 'PR01', nome: 'Commercialista', descrizione: 'Consulenza fiscale' },
      { codice: 'PR02', nome: 'Avvocato', descrizione: 'Consulenza legale' },
      { codice: 'PR03', nome: 'Consulente Lavoro', descrizione: 'Gestione paghe' },
      { codice: 'PR04', nome: 'Notaio', descrizione: 'Atti notarili' },
      { codice: 'PR05', nome: 'Altri Professionisti', descrizione: 'Altre consulenze' }
    ]
  },
  imposte: {
    id: 'imposte',
    nome: 'IMPOSTE E TASSE',
    tipo: 'dare',
    icona: Receipt,
    colore: 'gray',
    conti: [
      { codice: 'TX01', nome: 'IVA a Debito', descrizione: 'IVA da versare' },
      { codice: 'TX02', nome: 'IRPEF/IRES', descrizione: 'Imposte sul reddito' },
      { codice: 'TX03', nome: 'IRAP', descrizione: 'Imposta regionale' },
      { codice: 'TX04', nome: 'IMU/TASI', descrizione: 'Imposte immobiliari' },
      { codice: 'TX05', nome: 'Contributi INPS Titolare', descrizione: 'Contributi fissi' },
      { codice: 'TX06', nome: 'Diritto Camerale', descrizione: 'Camera di Commercio' },
      { codice: 'TX07', nome: 'Altre Imposte', descrizione: 'Tasse varie' }
    ]
  }
};

const getColorClass = (colore, tipo) => {
  const colori = {
    emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-800' },
    red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', badge: 'bg-red-100 text-red-800' },
    orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-800' },
    purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', badge: 'bg-purple-100 text-purple-800' },
    blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-800' },
    slate: { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700', badge: 'bg-slate-100 text-slate-800' },
    gray: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', badge: 'bg-gray-100 text-gray-800' }
  };
  return colori[colore]?.[tipo] || colori.gray[tipo];
};

const ContoEconomicoNuovoPage = () => {
  // ==================== STATI ====================
  // Dati principali
  const [contiBancari, setContiBancari] = useState([]);
  const [movimentiBanca, setMovimentiBanca] = useState([]);
  const [movimentiPrimaNota, setMovimentiPrimaNota] = useState([]);
  
  // UI
  const [activeTab, setActiveTab] = useState('conti-banca');
  const [showFormConto, setShowFormConto] = useState(false);
  const [showFormMovBanca, setShowFormMovBanca] = useState(false);
  const [showFormPrimaNota, setShowFormPrimaNota] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedConto, setSelectedConto] = useState('');
  
  // Filtri
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPeriodo, setFilterPeriodo] = useState('this_month');
  const [filterCategoria, setFilterCategoria] = useState('');
  const [filterRiconciliato, setFilterRiconciliato] = useState('');
  const [customDateStart, setCustomDateStart] = useState('');
  const [customDateEnd, setCustomDateEnd] = useState('');
  
  // Espansioni
  const [expandedCategorie, setExpandedCategorie] = useState({});
  
  // Form Conto Bancario
  const [formConto, setFormConto] = useState({
    nome: '',
    banca: '',
    iban: '',
    saldoIniziale: '',
    colore: 'blue',
    attivo: true
  });
  
  // Form Movimento Banca
  const [formMovBanca, setFormMovBanca] = useState({
    data: new Date().toISOString().slice(0, 10),
    contoId: '',
    descrizione: '',
    importo: '',
    tipo: 'uscita', // entrata o uscita
    causale: '',
    riferimento: '',
    riconciliato: false,
    primaNotaId: ''
  });
  
  // Form Prima Nota
  const [formPrimaNota, setFormPrimaNota] = useState({
    data: new Date().toISOString().slice(0, 10),
    categoria: '',
    conto: '',
    descrizione: '',
    importo: '',
    tipo: 'dare',
    documento: '',
    fornitore: '',
    note: '',
    pagato: true,
    movimentoBancaId: ''
  });

  // ==================== CARICAMENTO DATI (Firebase) ====================
  useEffect(() => {
    const loadAllData = async () => {
      try {
        const [conti, movBanca, primaNota] = await Promise.all([
          loadContiBancariData(),
          loadMovimentiBancaData(),
          loadPrimaNotaData()
        ]);
        
        if (conti && conti.length > 0) setContiBancari(conti);
        if (movBanca && movBanca.length > 0) setMovimentiBanca(movBanca);
        if (primaNota && primaNota.length > 0) setMovimentiPrimaNota(primaNota);
        
        console.log('✅ Dati conto economico caricati da Firebase');
      } catch (error) {
        console.error('❌ Errore caricamento dati:', error);
        // Fallback localStorage
        const savedConti = localStorage.getItem('conti_bancari');
        const savedMovBanca = localStorage.getItem('movimenti_banca');
        const savedPrimaNota = localStorage.getItem('conto_economico_movimenti');
        
        if (savedConti) setContiBancari(JSON.parse(savedConti));
        if (savedMovBanca) setMovimentiBanca(JSON.parse(savedMovBanca));
        if (savedPrimaNota) setMovimentiPrimaNota(JSON.parse(savedPrimaNota));
      }
    };
    
    loadAllData();
  }, []);

  // ==================== SALVATAGGIO (Firebase) ====================
  const saveContiBancari = async (data) => {
    setContiBancari(data);
    localStorage.setItem('conti_bancari', JSON.stringify(data));
    for (const conto of data) {
      await saveContoBancarioData(conto);
    }
  };
  
  const saveMovimentiBanca = async (data) => {
    setMovimentiBanca(data);
    localStorage.setItem('movimenti_banca', JSON.stringify(data));
    await saveMovimentiBancaData(data);
  };
  
  const saveMovimentiPrimaNota = async (data) => {
    setMovimentiPrimaNota(data);
    localStorage.setItem('conto_economico_movimenti', JSON.stringify(data));
    await savePrimaNotaData(data);
  };

  // ==================== DATE RANGE ====================
  const getDateRange = () => {
    const now = new Date();
    let start, end = new Date(now);
    end.setHours(23, 59, 59, 999);
    
    switch (filterPeriodo) {
      case 'today':
        start = new Date(now); start.setHours(0, 0, 0, 0);
        break;
      case 'this_week':
        start = new Date(now);
        const day = start.getDay();
        start.setDate(start.getDate() - day + (day === 0 ? -6 : 1));
        start.setHours(0, 0, 0, 0);
        break;
      case 'this_month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'last_month':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        break;
      case 'this_quarter':
        const q = Math.floor(now.getMonth() / 3);
        start = new Date(now.getFullYear(), q * 3, 1);
        break;
      case 'this_year':
        start = new Date(now.getFullYear(), 0, 1);
        break;
      case 'custom':
        start = customDateStart ? new Date(customDateStart) : new Date(now.getFullYear(), 0, 1);
        end = customDateEnd ? new Date(customDateEnd) : new Date();
        end.setHours(23, 59, 59, 999);
        break;
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    return { start, end };
  };

  // ==================== FILTRI MOVIMENTI ====================
  const filteredMovBanca = useMemo(() => {
    const { start, end } = getDateRange();
    return movimentiBanca
      .filter(m => {
        const date = new Date(m.data);
        if (date < start || date > end) return false;
        if (selectedConto && m.contoId !== selectedConto) return false;
        if (filterRiconciliato === 'si' && !m.riconciliato) return false;
        if (filterRiconciliato === 'no' && m.riconciliato) return false;
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          return m.descrizione?.toLowerCase().includes(term) || 
                 m.causale?.toLowerCase().includes(term) ||
                 m.riferimento?.toLowerCase().includes(term);
        }
        return true;
      })
      .sort((a, b) => new Date(b.data) - new Date(a.data));
  }, [movimentiBanca, filterPeriodo, selectedConto, filterRiconciliato, searchTerm, customDateStart, customDateEnd]);

  const filteredPrimaNota = useMemo(() => {
    const { start, end } = getDateRange();
    return movimentiPrimaNota
      .filter(m => {
        const date = new Date(m.data);
        if (date < start || date > end) return false;
        if (filterCategoria && m.categoria !== filterCategoria) return false;
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          return m.descrizione?.toLowerCase().includes(term) ||
                 m.documento?.toLowerCase().includes(term) ||
                 m.fornitore?.toLowerCase().includes(term);
        }
        return true;
      })
      .sort((a, b) => new Date(b.data) - new Date(a.data));
  }, [movimentiPrimaNota, filterPeriodo, filterCategoria, searchTerm, customDateStart, customDateEnd]);

  // ==================== CALCOLI ====================
  // Saldi conti bancari
  const saldoConti = useMemo(() => {
    const saldi = {};
    contiBancari.forEach(c => {
      saldi[c.id] = parseFloat(c.saldoIniziale || 0);
    });
    movimentiBanca.forEach(m => {
      if (saldi[m.contoId] !== undefined) {
        if (m.tipo === 'entrata') {
          saldi[m.contoId] += parseFloat(m.importo || 0);
        } else {
          saldi[m.contoId] -= parseFloat(m.importo || 0);
        }
      }
    });
    return saldi;
  }, [contiBancari, movimentiBanca]);

  const saldoTotaleBanca = useMemo(() => {
    return Object.values(saldoConti).reduce((sum, s) => sum + s, 0);
  }, [saldoConti]);

  // Totali Prima Nota (filtrati)
  const totaliPrimaNota = useMemo(() => {
    const riconciliati = filteredPrimaNota.filter(m => m.movimentoBancaId);
    const nonRiconciliati = filteredPrimaNota.filter(m => !m.movimentoBancaId);
    
    const totDare = filteredPrimaNota.filter(m => m.tipo === 'dare').reduce((sum, m) => sum + parseFloat(m.importo || 0), 0);
    const totAvere = filteredPrimaNota.filter(m => m.tipo === 'avere').reduce((sum, m) => sum + parseFloat(m.importo || 0), 0);
    
    return {
      dare: totDare,
      avere: totAvere,
      utile: totAvere - totDare,
      margine: totAvere > 0 ? ((totAvere - totDare) / totAvere * 100) : 0,
      riconciliati: riconciliati.length,
      nonRiconciliati: nonRiconciliati.length
    };
  }, [filteredPrimaNota]);

  // Per categoria
  const perCategoria = useMemo(() => {
    const grouped = {};
    Object.keys(PIANO_DEI_CONTI).forEach(catId => {
      grouped[catId] = { ...PIANO_DEI_CONTI[catId], totale: 0, movimenti: [], perConto: {} };
    });
    filteredPrimaNota.forEach(m => {
      if (grouped[m.categoria]) {
        const importo = parseFloat(m.importo || 0);
        grouped[m.categoria].totale += importo;
        grouped[m.categoria].movimenti.push(m);
        if (!grouped[m.categoria].perConto[m.conto]) grouped[m.categoria].perConto[m.conto] = 0;
        grouped[m.categoria].perConto[m.conto] += importo;
      }
    });
    return grouped;
  }, [filteredPrimaNota]);

  // ==================== HANDLERS CONTI BANCARI ====================
  const handleSaveConto = () => {
    if (!formConto.nome || !formConto.banca) {
      alert('Inserisci nome e banca');
      return;
    }
    const conto = {
      id: editingId || `conto_${Date.now()}`,
      ...formConto,
      saldoIniziale: parseFloat(formConto.saldoIniziale || 0),
      createdAt: editingId ? contiBancari.find(c => c.id === editingId)?.createdAt : new Date().toISOString()
    };
    let newConti;
    if (editingId) {
      newConti = contiBancari.map(c => c.id === editingId ? conto : c);
    } else {
      newConti = [...contiBancari, conto];
    }
    saveContiBancari(newConti);
    resetFormConto();
  };

  const resetFormConto = () => {
    setFormConto({ nome: '', banca: '', iban: '', saldoIniziale: '', colore: 'blue', attivo: true });
    setShowFormConto(false);
    setEditingId(null);
  };

  const handleEditConto = (conto) => {
    setFormConto({ ...conto, saldoIniziale: conto.saldoIniziale.toString() });
    setEditingId(conto.id);
    setShowFormConto(true);
  };

  const handleDeleteConto = (id) => {
    if (movimentiBanca.some(m => m.contoId === id)) {
      alert('Non puoi eliminare un conto con movimenti. Elimina prima i movimenti.');
      return;
    }
    if (window.confirm('Eliminare questo conto?')) {
      saveContiBancari(contiBancari.filter(c => c.id !== id));
    }
  };

  // ==================== HANDLERS MOVIMENTI BANCA ====================
  const handleSaveMovBanca = () => {
    if (!formMovBanca.data || !formMovBanca.contoId || !formMovBanca.importo || !formMovBanca.descrizione) {
      alert('Compila i campi obbligatori');
      return;
    }
    const mov = {
      id: editingId || `movb_${Date.now()}`,
      ...formMovBanca,
      importo: parseFloat(formMovBanca.importo),
      createdAt: editingId ? movimentiBanca.find(m => m.id === editingId)?.createdAt : new Date().toISOString()
    };
    let newMov;
    if (editingId) {
      newMov = movimentiBanca.map(m => m.id === editingId ? mov : m);
    } else {
      newMov = [...movimentiBanca, mov];
    }
    saveMovimentiBanca(newMov);
    resetFormMovBanca();
  };

  const resetFormMovBanca = () => {
    setFormMovBanca({
      data: new Date().toISOString().slice(0, 10),
      contoId: selectedConto || '',
      descrizione: '',
      importo: '',
      tipo: 'uscita',
      causale: '',
      riferimento: '',
      riconciliato: false,
      primaNotaId: ''
    });
    setShowFormMovBanca(false);
    setEditingId(null);
  };

  const handleEditMovBanca = (mov) => {
    setFormMovBanca({ ...mov, importo: mov.importo.toString() });
    setEditingId(mov.id);
    setShowFormMovBanca(true);
  };

  const handleDeleteMovBanca = (id) => {
    if (window.confirm('Eliminare questo movimento?')) {
      // Rimuovi anche il collegamento dalla prima nota
      const newPrimaNota = movimentiPrimaNota.map(m => 
        m.movimentoBancaId === id ? { ...m, movimentoBancaId: '' } : m
      );
      saveMovimentiPrimaNota(newPrimaNota);
      saveMovimentiBanca(movimentiBanca.filter(m => m.id !== id));
    }
  };

  // ==================== HANDLERS PRIMA NOTA ====================
  const handleSavePrimaNota = () => {
    if (!formPrimaNota.data || !formPrimaNota.descrizione || !formPrimaNota.importo || !formPrimaNota.categoria || !formPrimaNota.conto) {
      alert('Compila tutti i campi obbligatori');
      return;
    }
    const mov = {
      id: editingId || `pn_${Date.now()}`,
      ...formPrimaNota,
      importo: parseFloat(formPrimaNota.importo),
      createdAt: editingId ? movimentiPrimaNota.find(m => m.id === editingId)?.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    let newMov;
    if (editingId) {
      newMov = movimentiPrimaNota.map(m => m.id === editingId ? mov : m);
    } else {
      newMov = [...movimentiPrimaNota, mov];
    }
    saveMovimentiPrimaNota(newMov);
    
    // Se collegato a movimento banca, aggiorna anche quello
    if (formPrimaNota.movimentoBancaId) {
      const newMovBanca = movimentiBanca.map(m => 
        m.id === formPrimaNota.movimentoBancaId ? { ...m, riconciliato: true, primaNotaId: mov.id } : m
      );
      saveMovimentiBanca(newMovBanca);
    }
    
    resetFormPrimaNota();
  };

  const resetFormPrimaNota = () => {
    setFormPrimaNota({
      data: new Date().toISOString().slice(0, 10),
      categoria: '',
      conto: '',
      descrizione: '',
      importo: '',
      tipo: 'dare',
      documento: '',
      fornitore: '',
      note: '',
      pagato: true,
      movimentoBancaId: ''
    });
    setShowFormPrimaNota(false);
    setEditingId(null);
  };

  const handleEditPrimaNota = (mov) => {
    setFormPrimaNota({ ...mov, importo: mov.importo.toString() });
    setEditingId(mov.id);
    setShowFormPrimaNota(true);
  };

  const handleDeletePrimaNota = (id) => {
    if (window.confirm('Eliminare questo movimento?')) {
      const mov = movimentiPrimaNota.find(m => m.id === id);
      if (mov?.movimentoBancaId) {
        const newMovBanca = movimentiBanca.map(m => 
          m.id === mov.movimentoBancaId ? { ...m, riconciliato: false, primaNotaId: '' } : m
        );
        saveMovimentiBanca(newMovBanca);
      }
      saveMovimentiPrimaNota(movimentiPrimaNota.filter(m => m.id !== id));
    }
  };

  // ==================== RICONCILIAZIONE ====================
  const handleRiconcilia = (movBancaId, primaNotaId) => {
    // Collega movimento banca con prima nota
    const newMovBanca = movimentiBanca.map(m => 
      m.id === movBancaId ? { ...m, riconciliato: true, primaNotaId } : m
    );
    const newPrimaNota = movimentiPrimaNota.map(m => 
      m.id === primaNotaId ? { ...m, movimentoBancaId: movBancaId } : m
    );
    saveMovimentiBanca(newMovBanca);
    saveMovimentiPrimaNota(newPrimaNota);
  };

  const handleScollegaRiconciliazione = (movBancaId) => {
    const movBanca = movimentiBanca.find(m => m.id === movBancaId);
    if (!movBanca) return;
    
    const newMovBanca = movimentiBanca.map(m => 
      m.id === movBancaId ? { ...m, riconciliato: false, primaNotaId: '' } : m
    );
    const newPrimaNota = movimentiPrimaNota.map(m => 
      m.movimentoBancaId === movBancaId ? { ...m, movimentoBancaId: '' } : m
    );
    saveMovimentiBanca(newMovBanca);
    saveMovimentiPrimaNota(newPrimaNota);
  };

  // Crea prima nota da movimento banca
  const handleCreaFromBanca = (movBanca) => {
    setFormPrimaNota({
      data: movBanca.data,
      categoria: '',
      conto: '',
      descrizione: movBanca.descrizione,
      importo: movBanca.importo.toString(),
      tipo: movBanca.tipo === 'entrata' ? 'avere' : 'dare',
      documento: movBanca.riferimento || '',
      fornitore: '',
      note: movBanca.causale || '',
      pagato: true,
      movimentoBancaId: movBanca.id
    });
    setShowFormPrimaNota(true);
    setActiveTab('prima-nota');
  };

  // ==================== EXPORT ====================
  const exportCSV = () => {
    const headers = ['Data', 'Categoria', 'Conto', 'Descrizione', 'Fornitore', 'Documento', 'Dare', 'Avere', 'Riconciliato'];
    const rows = filteredPrimaNota.map(m => [
      m.data,
      PIANO_DEI_CONTI[m.categoria]?.nome || m.categoria,
      m.conto,
      m.descrizione,
      m.fornitore || '',
      m.documento || '',
      m.tipo === 'dare' ? m.importo : '',
      m.tipo === 'avere' ? m.importo : '',
      m.movimentoBancaId ? 'Sì' : 'No'
    ]);
    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `conto_economico_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  // ==================== UTILS ====================
  const formatCurrency = (val) => parseFloat(val || 0).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
  const formatDate = (d) => new Date(d).toLocaleDateString('it-IT');
  
  const toggleCategoria = (catId) => {
    setExpandedCategorie(prev => ({ ...prev, [catId]: !prev[catId] }));
  };

  const getPeriodoLabel = () => {
    const labels = { today: 'Oggi', this_week: 'Questa Settimana', this_month: 'Questo Mese', last_month: 'Mese Scorso', this_quarter: 'Questo Trimestre', this_year: 'Anno Corrente', custom: 'Personalizzato' };
    return labels[filterPeriodo] || 'Questo Mese';
  };

  const getContoColor = (colore) => {
    const colors = { blue: 'bg-blue-500', green: 'bg-green-500', purple: 'bg-purple-500', orange: 'bg-orange-500', red: 'bg-red-500', gray: 'bg-gray-500' };
    return colors[colore] || colors.blue;
  };

  // ==================== RENDER ====================
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Conto Economico</h1>
          <p className="text-gray-500 mt-1">Conti Bancari, Prima Nota e Riconciliazione • {getPeriodoLabel()}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg hover:bg-gray-50">
            <Download className="w-4 h-4" /> Esporta
          </button>
        </div>
      </div>

      {/* KPI Cards - Riepilogo Generale */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Saldo Banca Totale */}
        <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-indigo-700">Saldo Banca</p>
                <p className="text-2xl font-bold text-indigo-800 mt-1">{formatCurrency(saldoTotaleBanca)}</p>
                <p className="text-xs text-indigo-600 mt-1">{contiBancari.length} conti attivi</p>
              </div>
              <Landmark className="w-8 h-8 text-indigo-600" />
            </div>
          </CardContent>
        </Card>

        {/* Ricavi */}
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-700">Ricavi (Avere)</p>
                <p className="text-2xl font-bold text-emerald-800 mt-1">{formatCurrency(totaliPrimaNota.avere)}</p>
                <p className="text-xs text-emerald-600 mt-1">Entrate periodo</p>
              </div>
              <ArrowUpRight className="w-8 h-8 text-emerald-600" />
            </div>
          </CardContent>
        </Card>

        {/* Costi */}
        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-red-700">Costi (Dare)</p>
                <p className="text-2xl font-bold text-red-800 mt-1">{formatCurrency(totaliPrimaNota.dare)}</p>
                <p className="text-xs text-red-600 mt-1">Uscite periodo</p>
              </div>
              <ArrowDownRight className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        {/* EBITDA */}
        <Card className={`bg-gradient-to-br ${totaliPrimaNota.utile >= 0 ? 'from-blue-50 to-blue-100 border-blue-200' : 'from-orange-50 to-orange-100 border-orange-200'}`}>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className={`text-sm font-medium ${totaliPrimaNota.utile >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>EBITDA</p>
                <p className={`text-2xl font-bold mt-1 ${totaliPrimaNota.utile >= 0 ? 'text-blue-800' : 'text-orange-800'}`}>
                  {formatCurrency(totaliPrimaNota.utile)}
                </p>
                <p className={`text-xs mt-1 ${totaliPrimaNota.utile >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                  Margine: {totaliPrimaNota.margine.toFixed(1)}%
                </p>
              </div>
              <Target className={`w-8 h-8 ${totaliPrimaNota.utile >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
            </div>
          </CardContent>
        </Card>

        {/* Riconciliazione */}
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700">Riconciliati</p>
                <p className="text-2xl font-bold text-purple-800 mt-1">{totaliPrimaNota.riconciliati}</p>
                <p className="text-xs text-purple-600 mt-1">{totaliPrimaNota.nonRiconciliati} da riconciliare</p>
              </div>
              <Link2 className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtri */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <select value={filterPeriodo} onChange={e => setFilterPeriodo(e.target.value)} className="px-3 py-2 border rounded-lg bg-white">
                <option value="today">Oggi</option>
                <option value="this_week">Questa Settimana</option>
                <option value="this_month">Questo Mese</option>
                <option value="last_month">Mese Scorso</option>
                <option value="this_quarter">Questo Trimestre</option>
                <option value="this_year">Anno Corrente</option>
                <option value="custom">Personalizzato</option>
              </select>
            </div>

            {filterPeriodo === 'custom' && (
              <div className="flex items-center gap-2">
                <input type="date" value={customDateStart} onChange={e => setCustomDateStart(e.target.value)} className="px-3 py-2 border rounded-lg" />
                <span className="text-gray-400">→</span>
                <input type="date" value={customDateEnd} onChange={e => setCustomDateEnd(e.target.value)} className="px-3 py-2 border rounded-lg" />
              </div>
            )}

            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cerca..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex gap-1 border-b overflow-x-auto">
        {[
          { id: 'conti-banca', label: 'Conti Bancari', icon: Landmark },
          { id: 'movimenti-banca', label: 'Movimenti Banca', icon: ArrowRightLeft },
          { id: 'prima-nota', label: 'Prima Nota', icon: FileText },
          { id: 'riconciliazione', label: 'Riconciliazione', icon: Link2 },
          { id: 'conto-economico', label: 'Conto Economico', icon: BarChart3 }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ==================== TAB: CONTI BANCARI ==================== */}
      {activeTab === 'conti-banca' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">I tuoi Conti Bancari</h2>
            <button onClick={() => { resetFormConto(); setShowFormConto(true); }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus className="w-4 h-4" /> Aggiungi Conto
            </button>
          </div>

          {showFormConto && (
            <Card className="border-2 border-blue-300">
              <CardHeader className="bg-blue-50 border-b">
                <div className="flex items-center justify-between">
                  <CardTitle>{editingId ? 'Modifica Conto' : 'Nuovo Conto Bancario'}</CardTitle>
                  <button onClick={resetFormConto} className="p-2 hover:bg-blue-100 rounded-lg"><X className="w-5 h-5" /></button>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Nome Conto *</label>
                    <input type="text" value={formConto.nome} onChange={e => setFormConto(p => ({ ...p, nome: e.target.value }))} placeholder="Es: Conto Principale" className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Banca *</label>
                    <input type="text" value={formConto.banca} onChange={e => setFormConto(p => ({ ...p, banca: e.target.value }))} placeholder="Es: Intesa Sanpaolo" className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">IBAN</label>
                    <input type="text" value={formConto.iban} onChange={e => setFormConto(p => ({ ...p, iban: e.target.value }))} placeholder="IT..." className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Saldo Iniziale (€)</label>
                    <input type="number" step="0.01" value={formConto.saldoIniziale} onChange={e => setFormConto(p => ({ ...p, saldoIniziale: e.target.value }))} placeholder="0.00" className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Colore</label>
                    <select value={formConto.colore} onChange={e => setFormConto(p => ({ ...p, colore: e.target.value }))} className="w-full px-3 py-2 border rounded-lg">
                      <option value="blue">Blu</option>
                      <option value="green">Verde</option>
                      <option value="purple">Viola</option>
                      <option value="orange">Arancione</option>
                      <option value="red">Rosso</option>
                      <option value="gray">Grigio</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                  <button onClick={resetFormConto} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Annulla</button>
                  <button onClick={handleSaveConto} className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    <Save className="w-4 h-4" /> Salva
                  </button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {contiBancari.map(conto => (
              <Card key={conto.id} className="overflow-hidden">
                <div className={`h-2 ${getContoColor(conto.colore)}`} />
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">{conto.nome}</h3>
                      <p className="text-sm text-gray-500">{conto.banca}</p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => handleEditConto(conto)} className="p-1.5 hover:bg-gray-100 rounded"><Edit className="w-4 h-4 text-gray-500" /></button>
                      <button onClick={() => handleDeleteConto(conto.id)} className="p-1.5 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4 text-red-500" /></button>
                    </div>
                  </div>
                  {conto.iban && <p className="text-xs text-gray-400 font-mono mb-3">{conto.iban}</p>}
                  <div className="pt-3 border-t">
                    <p className="text-sm text-gray-500">Saldo attuale</p>
                    <p className={`text-2xl font-bold ${saldoConti[conto.id] >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {formatCurrency(saldoConti[conto.id] || 0)}
                    </p>
                  </div>
                  <button 
                    onClick={() => { setSelectedConto(conto.id); setActiveTab('movimenti-banca'); }} 
                    className="w-full mt-4 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Vedi Movimenti →
                  </button>
                </CardContent>
              </Card>
            ))}
            
            {contiBancari.length === 0 && (
              <Card className="col-span-full">
                <CardContent className="py-12 text-center">
                  <Landmark className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500 mb-4">Nessun conto bancario configurato</p>
                  <button onClick={() => setShowFormConto(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    <Plus className="w-4 h-4 inline mr-2" /> Aggiungi il primo conto
                  </button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ==================== TAB: MOVIMENTI BANCA ==================== */}
      {activeTab === 'movimenti-banca' && (
        <div className="space-y-4">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold">Movimenti Bancari</h2>
              <select value={selectedConto} onChange={e => setSelectedConto(e.target.value)} className="px-3 py-2 border rounded-lg bg-white">
                <option value="">Tutti i conti</option>
                {contiBancari.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
              <select value={filterRiconciliato} onChange={e => setFilterRiconciliato(e.target.value)} className="px-3 py-2 border rounded-lg bg-white">
                <option value="">Tutti</option>
                <option value="si">Riconciliati</option>
                <option value="no">Da riconciliare</option>
              </select>
            </div>
            <button onClick={() => { resetFormMovBanca(); setShowFormMovBanca(true); }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus className="w-4 h-4" /> Nuovo Movimento
            </button>
          </div>

          {showFormMovBanca && (
            <Card className="border-2 border-blue-300">
              <CardHeader className="bg-blue-50 border-b">
                <div className="flex items-center justify-between">
                  <CardTitle>{editingId ? 'Modifica Movimento' : 'Nuovo Movimento Bancario'}</CardTitle>
                  <button onClick={resetFormMovBanca} className="p-2 hover:bg-blue-100 rounded-lg"><X className="w-5 h-5" /></button>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Data *</label>
                    <input type="date" value={formMovBanca.data} onChange={e => setFormMovBanca(p => ({ ...p, data: e.target.value }))} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Conto *</label>
                    <select value={formMovBanca.contoId} onChange={e => setFormMovBanca(p => ({ ...p, contoId: e.target.value }))} className="w-full px-3 py-2 border rounded-lg">
                      <option value="">Seleziona...</option>
                      {contiBancari.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Tipo *</label>
                    <select value={formMovBanca.tipo} onChange={e => setFormMovBanca(p => ({ ...p, tipo: e.target.value }))} className="w-full px-3 py-2 border rounded-lg">
                      <option value="entrata">Entrata (+)</option>
                      <option value="uscita">Uscita (-)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Importo (€) *</label>
                    <input type="number" step="0.01" value={formMovBanca.importo} onChange={e => setFormMovBanca(p => ({ ...p, importo: e.target.value }))} placeholder="0.00" className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">Descrizione *</label>
                    <input type="text" value={formMovBanca.descrizione} onChange={e => setFormMovBanca(p => ({ ...p, descrizione: e.target.value }))} placeholder="Descrizione movimento" className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Causale</label>
                    <input type="text" value={formMovBanca.causale} onChange={e => setFormMovBanca(p => ({ ...p, causale: e.target.value }))} placeholder="Bonifico, POS, etc." className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Riferimento</label>
                    <input type="text" value={formMovBanca.riferimento} onChange={e => setFormMovBanca(p => ({ ...p, riferimento: e.target.value }))} placeholder="N. operazione" className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                  <button onClick={resetFormMovBanca} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Annulla</button>
                  <button onClick={handleSaveMovBanca} className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    <Save className="w-4 h-4" /> Salva
                  </button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left p-3 font-semibold">Data</th>
                      <th className="text-left p-3 font-semibold">Conto</th>
                      <th className="text-left p-3 font-semibold">Descrizione</th>
                      <th className="text-left p-3 font-semibold">Causale</th>
                      <th className="text-right p-3 font-semibold text-emerald-600">Entrata</th>
                      <th className="text-right p-3 font-semibold text-red-600">Uscita</th>
                      <th className="text-center p-3 font-semibold">Stato</th>
                      <th className="p-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMovBanca.map(m => {
                      const conto = contiBancari.find(c => c.id === m.contoId);
                      return (
                        <tr key={m.id} className="border-b hover:bg-gray-50">
                          <td className="p-3 text-sm">{formatDate(m.data)}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${getContoColor(conto?.colore)}`} />
                              <span className="text-sm">{conto?.nome || '-'}</span>
                            </div>
                          </td>
                          <td className="p-3 text-sm">{m.descrizione}</td>
                          <td className="p-3 text-sm text-gray-500">{m.causale || '-'}</td>
                          <td className="p-3 text-right text-emerald-600 font-medium">
                            {m.tipo === 'entrata' ? formatCurrency(m.importo) : ''}
                          </td>
                          <td className="p-3 text-right text-red-600 font-medium">
                            {m.tipo === 'uscita' ? formatCurrency(m.importo) : ''}
                          </td>
                          <td className="p-3 text-center">
                            {m.riconciliato ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                                <Link2 className="w-3 h-3" /> Riconciliato
                              </span>
                            ) : (
                              <button 
                                onClick={() => handleCreaFromBanca(m)}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full hover:bg-yellow-200"
                              >
                                <Link2Off className="w-3 h-3" /> Registra
                              </button>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="flex gap-1">
                              <button onClick={() => handleEditMovBanca(m)} className="p-1.5 hover:bg-gray-200 rounded"><Edit className="w-4 h-4 text-gray-500" /></button>
                              <button onClick={() => handleDeleteMovBanca(m.id)} className="p-1.5 hover:bg-red-100 rounded"><Trash2 className="w-4 h-4 text-red-500" /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {filteredMovBanca.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <ArrowRightLeft className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                    <p>Nessun movimento bancario trovato</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ==================== TAB: PRIMA NOTA ==================== */}
      {activeTab === 'prima-nota' && (
        <div className="space-y-4">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold">Prima Nota</h2>
              <select value={filterCategoria} onChange={e => setFilterCategoria(e.target.value)} className="px-3 py-2 border rounded-lg bg-white">
                <option value="">Tutte le categorie</option>
                {Object.entries(PIANO_DEI_CONTI).map(([id, cat]) => <option key={id} value={id}>{cat.nome}</option>)}
              </select>
            </div>
            <button onClick={() => { resetFormPrimaNota(); setShowFormPrimaNota(true); }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus className="w-4 h-4" /> Nuovo Movimento
            </button>
          </div>

          {showFormPrimaNota && (
            <Card className="border-2 border-blue-300">
              <CardHeader className="bg-blue-50 border-b">
                <div className="flex items-center justify-between">
                  <CardTitle>{editingId ? 'Modifica Movimento' : 'Nuovo Movimento Prima Nota'}</CardTitle>
                  <button onClick={resetFormPrimaNota} className="p-2 hover:bg-blue-100 rounded-lg"><X className="w-5 h-5" /></button>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Data *</label>
                    <input type="date" value={formPrimaNota.data} onChange={e => setFormPrimaNota(p => ({ ...p, data: e.target.value }))} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Categoria *</label>
                    <select 
                      value={formPrimaNota.categoria} 
                      onChange={e => setFormPrimaNota(p => ({ ...p, categoria: e.target.value, conto: '', tipo: PIANO_DEI_CONTI[e.target.value]?.tipo || 'dare' }))} 
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="">Seleziona...</option>
                      {Object.entries(PIANO_DEI_CONTI).map(([id, cat]) => <option key={id} value={id}>{cat.nome}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Conto *</label>
                    <select value={formPrimaNota.conto} onChange={e => setFormPrimaNota(p => ({ ...p, conto: e.target.value }))} disabled={!formPrimaNota.categoria} className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-100">
                      <option value="">Seleziona...</option>
                      {formPrimaNota.categoria && PIANO_DEI_CONTI[formPrimaNota.categoria]?.conti.map(c => <option key={c.codice} value={c.codice}>{c.codice} - {c.nome}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Importo (€) *</label>
                    <input type="number" step="0.01" value={formPrimaNota.importo} onChange={e => setFormPrimaNota(p => ({ ...p, importo: e.target.value }))} placeholder="0.00" className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">Descrizione *</label>
                    <input type="text" value={formPrimaNota.descrizione} onChange={e => setFormPrimaNota(p => ({ ...p, descrizione: e.target.value }))} placeholder="Descrizione" className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Fornitore/Cliente</label>
                    <input type="text" value={formPrimaNota.fornitore} onChange={e => setFormPrimaNota(p => ({ ...p, fornitore: e.target.value }))} placeholder="Nome" className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">N. Documento</label>
                    <input type="text" value={formPrimaNota.documento} onChange={e => setFormPrimaNota(p => ({ ...p, documento: e.target.value }))} placeholder="FT-2024/001" className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Tipo</label>
                    <div className="flex gap-4 mt-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" checked={formPrimaNota.tipo === 'dare'} onChange={() => setFormPrimaNota(p => ({ ...p, tipo: 'dare' }))} />
                        <span className="text-red-600 font-medium">Dare (Costo)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" checked={formPrimaNota.tipo === 'avere'} onChange={() => setFormPrimaNota(p => ({ ...p, tipo: 'avere' }))} />
                        <span className="text-green-600 font-medium">Avere (Ricavo)</span>
                      </label>
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">Note</label>
                    <input type="text" value={formPrimaNota.note} onChange={e => setFormPrimaNota(p => ({ ...p, note: e.target.value }))} placeholder="Note..." className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  {formPrimaNota.movimentoBancaId && (
                    <div className="md:col-span-4">
                      <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <Link2 className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-green-700">Collegato a movimento bancario</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                  <button onClick={resetFormPrimaNota} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Annulla</button>
                  <button onClick={handleSavePrimaNota} className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    <Save className="w-4 h-4" /> Salva
                  </button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left p-3 font-semibold">Data</th>
                      <th className="text-left p-3 font-semibold">Categoria / Conto</th>
                      <th className="text-left p-3 font-semibold">Descrizione</th>
                      <th className="text-left p-3 font-semibold">Documento</th>
                      <th className="text-right p-3 font-semibold text-red-600">Dare</th>
                      <th className="text-right p-3 font-semibold text-green-600">Avere</th>
                      <th className="text-center p-3 font-semibold">Banca</th>
                      <th className="p-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPrimaNota.map(m => {
                      const cat = PIANO_DEI_CONTI[m.categoria];
                      const conto = cat?.conti.find(c => c.codice === m.conto);
                      return (
                        <tr key={m.id} className="border-b hover:bg-gray-50">
                          <td className="p-3 text-sm">{formatDate(m.data)}</td>
                          <td className="p-3">
                            <div className="text-sm font-medium">{conto?.nome || m.conto}</div>
                            <div className="text-xs text-gray-500">{cat?.nome}</div>
                          </td>
                          <td className="p-3">
                            <div className="text-sm">{m.descrizione}</div>
                            {m.fornitore && <div className="text-xs text-gray-500">{m.fornitore}</div>}
                          </td>
                          <td className="p-3 text-sm text-gray-500">{m.documento || '-'}</td>
                          <td className="p-3 text-right text-red-600 font-medium">{m.tipo === 'dare' ? formatCurrency(m.importo) : ''}</td>
                          <td className="p-3 text-right text-green-600 font-medium">{m.tipo === 'avere' ? formatCurrency(m.importo) : ''}</td>
                          <td className="p-3 text-center">
                            {m.movimentoBancaId ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                                <Link2 className="w-3 h-3" />
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-full">
                                <Link2Off className="w-3 h-3" />
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="flex gap-1">
                              <button onClick={() => handleEditPrimaNota(m)} className="p-1.5 hover:bg-gray-200 rounded"><Edit className="w-4 h-4 text-gray-500" /></button>
                              <button onClick={() => handleDeletePrimaNota(m.id)} className="p-1.5 hover:bg-red-100 rounded"><Trash2 className="w-4 h-4 text-red-500" /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-100 font-bold">
                      <td colSpan={4} className="p-3">TOTALI</td>
                      <td className="p-3 text-right text-red-600">{formatCurrency(totaliPrimaNota.dare)}</td>
                      <td className="p-3 text-right text-green-600">{formatCurrency(totaliPrimaNota.avere)}</td>
                      <td colSpan={2} className={`p-3 text-center ${totaliPrimaNota.utile >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                        EBITDA: {formatCurrency(totaliPrimaNota.utile)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
                {filteredPrimaNota.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                    <p>Nessun movimento trovato</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ==================== TAB: RICONCILIAZIONE ==================== */}
      {activeTab === 'riconciliazione' && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Riconciliazione Bancaria</h2>
          <p className="text-gray-500">Collega i movimenti bancari con i movimenti della Prima Nota per avere un quadro completo.</p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Movimenti Banca non riconciliati */}
            <Card>
              <CardHeader className="bg-yellow-50 border-b">
                <CardTitle className="flex items-center gap-2">
                  <Link2Off className="w-5 h-5 text-yellow-600" />
                  Movimenti Banca da Riconciliare
                </CardTitle>
                <CardDescription>{movimentiBanca.filter(m => !m.riconciliato).length} movimenti</CardDescription>
              </CardHeader>
              <CardContent className="pt-4 max-h-[500px] overflow-y-auto">
                <div className="space-y-2">
                  {movimentiBanca.filter(m => !m.riconciliato).slice(0, 20).map(m => {
                    const conto = contiBancari.find(c => c.id === m.contoId);
                    return (
                      <div key={m.id} className="p-3 border rounded-lg hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium">{m.descrizione}</div>
                            <div className="text-xs text-gray-500">{formatDate(m.data)} • {conto?.nome}</div>
                          </div>
                          <div className="text-right">
                            <div className={`font-bold ${m.tipo === 'entrata' ? 'text-emerald-600' : 'text-red-600'}`}>
                              {m.tipo === 'entrata' ? '+' : '-'}{formatCurrency(m.importo)}
                            </div>
                            <button 
                              onClick={() => handleCreaFromBanca(m)}
                              className="text-xs text-blue-600 hover:underline"
                            >
                              Registra in Prima Nota →
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {movimentiBanca.filter(m => !m.riconciliato).length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <CheckCircle className="w-12 h-12 mx-auto text-green-300 mb-2" />
                      <p>Tutti i movimenti sono riconciliati!</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Movimenti Prima Nota non riconciliati */}
            <Card>
              <CardHeader className="bg-orange-50 border-b">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-orange-600" />
                  Prima Nota non Collegata a Banca
                </CardTitle>
                <CardDescription>{movimentiPrimaNota.filter(m => !m.movimentoBancaId).length} movimenti</CardDescription>
              </CardHeader>
              <CardContent className="pt-4 max-h-[500px] overflow-y-auto">
                <div className="space-y-2">
                  {movimentiPrimaNota.filter(m => !m.movimentoBancaId).slice(0, 20).map(m => {
                    const cat = PIANO_DEI_CONTI[m.categoria];
                    return (
                      <div key={m.id} className="p-3 border rounded-lg hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium">{m.descrizione}</div>
                            <div className="text-xs text-gray-500">{formatDate(m.data)} • {cat?.nome}</div>
                          </div>
                          <div className={`font-bold ${m.tipo === 'avere' ? 'text-emerald-600' : 'text-red-600'}`}>
                            {m.tipo === 'avere' ? '+' : '-'}{formatCurrency(m.importo)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {movimentiPrimaNota.filter(m => !m.movimentoBancaId).length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <CheckCircle className="w-12 h-12 mx-auto text-green-300 mb-2" />
                      <p>Tutti collegati!</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Movimenti Riconciliati */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="w-5 h-5 text-green-600" />
                Movimenti Riconciliati
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left p-2">Data</th>
                      <th className="text-left p-2">Mov. Banca</th>
                      <th className="text-left p-2">Prima Nota</th>
                      <th className="text-right p-2">Importo</th>
                      <th className="p-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {movimentiBanca.filter(m => m.riconciliato).map(mb => {
                      const pn = movimentiPrimaNota.find(p => p.id === mb.primaNotaId);
                      const conto = contiBancari.find(c => c.id === mb.contoId);
                      return (
                        <tr key={mb.id} className="border-b">
                          <td className="p-2">{formatDate(mb.data)}</td>
                          <td className="p-2">
                            <div>{mb.descrizione}</div>
                            <div className="text-xs text-gray-500">{conto?.nome}</div>
                          </td>
                          <td className="p-2">
                            <div>{pn?.descrizione || '-'}</div>
                            <div className="text-xs text-gray-500">{pn?.documento}</div>
                          </td>
                          <td className={`p-2 text-right font-medium ${mb.tipo === 'entrata' ? 'text-emerald-600' : 'text-red-600'}`}>
                            {formatCurrency(mb.importo)}
                          </td>
                          <td className="p-2">
                            <button onClick={() => handleScollegaRiconciliazione(mb.id)} className="p-1 hover:bg-red-50 rounded" title="Scollega">
                              <Link2Off className="w-4 h-4 text-red-500" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {movimentiBanca.filter(m => m.riconciliato).length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p>Nessun movimento riconciliato</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ==================== TAB: CONTO ECONOMICO ==================== */}
      {activeTab === 'conto-economico' && (
        <div className="space-y-6">
          {/* EBITDA Grande */}
          <Card className={`${totaliPrimaNota.utile >= 0 ? 'bg-gradient-to-r from-blue-600 to-blue-700' : 'bg-gradient-to-r from-orange-600 to-red-600'}`}>
            <CardContent className="py-8">
              <div className="text-center text-white">
                <p className="text-lg opacity-90">EBITDA - Risultato Operativo</p>
                <p className="text-5xl font-bold my-4">{formatCurrency(totaliPrimaNota.utile)}</p>
                <div className="flex justify-center gap-8 text-sm opacity-80">
                  <span>Ricavi: {formatCurrency(totaliPrimaNota.avere)}</span>
                  <span>-</span>
                  <span>Costi: {formatCurrency(totaliPrimaNota.dare)}</span>
                  <span>=</span>
                  <span>Margine: {totaliPrimaNota.margine.toFixed(1)}%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Conto Economico Scalare */}
            <Card>
              <CardHeader className="bg-gray-50 border-b">
                <CardTitle>Conto Economico Scalare</CardTitle>
                <CardDescription>Ricavi - Costi = Utile</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {/* RICAVI */}
                  <div className="pb-4 border-b border-emerald-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-emerald-700 text-lg">A) RICAVI</span>
                      <span className="font-bold text-emerald-700 text-xl">{formatCurrency(totaliPrimaNota.avere)}</span>
                    </div>
                    {perCategoria.ricavi?.movimenti.length > 0 && (
                      <div className="space-y-1 pl-4">
                        {Object.entries(perCategoria.ricavi.perConto).map(([cod, tot]) => (
                          <div key={cod} className="flex justify-between text-sm">
                            <span className="text-gray-600">{perCategoria.ricavi.conti.find(c => c.codice === cod)?.nome || cod}</span>
                            <span className="text-emerald-600">{formatCurrency(tot)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* COSTI */}
                  <div className="pb-4 border-b border-red-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-red-700 text-lg">B) COSTI TOTALI</span>
                      <span className="font-bold text-red-700 text-xl">{formatCurrency(totaliPrimaNota.dare)}</span>
                    </div>
                    <div className="space-y-3 pl-4">
                      {Object.entries(PIANO_DEI_CONTI).filter(([id]) => id !== 'ricavi').map(([id, cat]) => {
                        const catData = perCategoria[id];
                        if (!catData || catData.totale === 0) return null;
                        return (
                          <div key={id}>
                            <div className="flex justify-between text-sm font-medium">
                              <span className="text-gray-700">{cat.nome}</span>
                              <span className="text-red-600">{formatCurrency(catData.totale)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* RISULTATO */}
                  <div className={`p-4 rounded-lg ${totaliPrimaNota.utile >= 0 ? 'bg-blue-100 border-2 border-blue-300' : 'bg-orange-100 border-2 border-orange-300'}`}>
                    <div className="flex items-center justify-between">
                      <span className={`font-bold text-xl ${totaliPrimaNota.utile >= 0 ? 'text-blue-800' : 'text-orange-800'}`}>
                        A - B = {totaliPrimaNota.utile >= 0 ? 'UTILE' : 'PERDITA'}
                      </span>
                      <span className={`font-bold text-3xl ${totaliPrimaNota.utile >= 0 ? 'text-blue-800' : 'text-orange-800'}`}>
                        {formatCurrency(Math.abs(totaliPrimaNota.utile))}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dettaglio Costi per Categoria */}
            <Card>
              <CardHeader className="bg-gray-50 border-b">
                <CardTitle>Dettaglio Costi</CardTitle>
                <CardDescription>Composizione percentuale</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {Object.entries(PIANO_DEI_CONTI).filter(([id]) => id !== 'ricavi').map(([id, cat]) => {
                    const catData = perCategoria[id];
                    const percentuale = totaliPrimaNota.dare > 0 ? (catData?.totale || 0) / totaliPrimaNota.dare * 100 : 0;
                    const Icona = cat.icona;
                    
                    return (
                      <div key={id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Icona className={`w-5 h-5 ${getColorClass(cat.colore, 'text')}`} />
                            <span className="font-medium">{cat.nome}</span>
                          </div>
                          <span className="font-bold text-lg">{formatCurrency(catData?.totale || 0)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div 
                            className="h-3 rounded-full transition-all"
                            style={{ 
                              width: `${Math.min(percentuale, 100)}%`,
                              backgroundColor: cat.colore === 'red' ? '#ef4444' : cat.colore === 'orange' ? '#f97316' : cat.colore === 'purple' ? '#a855f7' : cat.colore === 'blue' ? '#3b82f6' : cat.colore === 'slate' ? '#64748b' : '#6b7280'
                            }}
                          />
                        </div>
                        <div className="flex justify-between mt-1 text-xs text-gray-500">
                          <span>{catData?.movimenti.length || 0} movimenti</span>
                          <span>{percentuale.toFixed(1)}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabella Riepilogativa */}
          <Card>
            <CardHeader>
              <CardTitle>Riepilogo Periodo: {getPeriodoLabel()}</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-3 font-semibold">Voce</th>
                    <th className="text-right p-3 font-semibold text-emerald-600">Avere (Ricavi)</th>
                    <th className="text-right p-3 font-semibold text-red-600">Dare (Costi)</th>
                    <th className="text-right p-3 font-semibold">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(PIANO_DEI_CONTI).map(([id, cat]) => {
                    const catData = perCategoria[id];
                    if (!catData || catData.totale === 0) return null;
                    const isRicavo = cat.tipo === 'avere';
                    return (
                      <tr key={id} className="border-b hover:bg-gray-50">
                        <td className="p-3 font-medium">{cat.nome}</td>
                        <td className="p-3 text-right text-emerald-600">{isRicavo ? formatCurrency(catData.totale) : '-'}</td>
                        <td className="p-3 text-right text-red-600">{!isRicavo ? formatCurrency(catData.totale) : '-'}</td>
                        <td className={`p-3 text-right font-medium ${isRicavo ? 'text-emerald-600' : 'text-red-600'}`}>
                          {isRicavo ? '+' : '-'}{formatCurrency(catData.totale)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-100 font-bold text-lg">
                    <td className="p-4">TOTALE</td>
                    <td className="p-4 text-right text-emerald-700">{formatCurrency(totaliPrimaNota.avere)}</td>
                    <td className="p-4 text-right text-red-700">{formatCurrency(totaliPrimaNota.dare)}</td>
                    <td className={`p-4 text-right ${totaliPrimaNota.utile >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                      {formatCurrency(totaliPrimaNota.utile)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ContoEconomicoNuovoPage;
