import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Plus, Trash2, X, Upload, Calendar, Search, Download, FileText,
  Loader2, Landmark, CheckCircle, TrendingUp, TrendingDown, Edit2,
  Home, ChevronDown, ChevronRight, Building2, CreditCard, Wallet,
  PiggyBank, Target, Zap, BarChart3, PieChart as PieChartIcon, 
  DollarSign, Percent, Activity, ArrowUpRight, ArrowDownRight,
  FileSpreadsheet, Check, AlertCircle, Eye, MoreVertical, RefreshCw,
  Package, ShoppingCart, Users, Truck, Settings, Globe, Briefcase,
  Clock, BookOpen
} from 'lucide-react';
import { 
  loadMovimentiBancaData,
  saveMovimentiBancaData,
  loadContiBancariData,
  saveContoBancarioData
} from '../lib/magazzinoStorage';
import { format, subMonths, startOfMonth, endOfMonth, parseISO, subDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { 
  PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, BarChart, Bar, Area, AreaChart
} from 'recharts';

const ContoEconomicoNuovoPage = () => {
  const [activeTab, setActiveTab] = useState('admin-dashboard');
  
  // Data states
  const [movimenti, setMovimenti] = useState([]);
  const [contiBancari, setContiBancari] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Dashboard periodo filter
  const [dashboardPeriodo, setDashboardPeriodo] = useState('30'); // 7, 30, 90, mese, anno, tutto
  
  // Filters Prima Nota
  const [ledgerFilterAccount, setLedgerFilterAccount] = useState('all');
  const [ledgerFilterFrom, setLedgerFilterFrom] = useState('');
  const [ledgerFilterTo, setLedgerFilterTo] = useState('');
  const [ledgerFilterStatus, setLedgerFilterStatus] = useState('all');
  const [ledgerFilterSearch, setLedgerFilterSearch] = useState('');
  const [ledgerFilterYear, setLedgerFilterYear] = useState(new Date().getFullYear().toString());
  
  // Conto Economico
  const [ceFilterType, setCeFilterType] = useState('month');
  const [ceFilterYear, setCeFilterYear] = useState(new Date().getFullYear());
  
  // Selection
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  
  // Modals
  const [showNuovoMovimento, setShowNuovoMovimento] = useState(false);
  const [showNuovoConto, setShowNuovoConto] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showReconciliationModal, setShowReconciliationModal] = useState(null);
  
  // Import state
  const [importStep, setImportStep] = useState(1);
  const [importedData, setImportedData] = useState([]);
  const [importMapping, setImportMapping] = useState({});
  const [importHeaders, setImportHeaders] = useState([]);
  const [importContoId, setImportContoId] = useState('');
  
  // Forms
  const [movimentoForm, setMovimentoForm] = useState({
    data: format(new Date(), 'yyyy-MM-dd'),
    descrizione: '', importo: '', tipo: 'uscita',
    categoria: '', controparte: '', conto: '', riconciliato: false
  });
  const [contoForm, setContoForm] = useState({ nome: '', iban: '', saldoIniziale: '' });

  // ===================== CATEGORIE (dinamiche) =====================
  const defaultCategorieRicavi = [
    { id: 'vendite_eur', nome: 'Eur', gruppo: 'Vendite Negozio' },
    { id: 'vendite_libia', nome: 'Libia', gruppo: 'Vendite Negozio' },
    { id: 'vendite_tuscolana', nome: 'Tuscolana', gruppo: 'Vendite Negozio' },
    { id: 'ecommerce', nome: 'E-commerce', gruppo: 'E-commerce' },
    { id: 'b2b', nome: 'B2B', gruppo: 'B2B' },
    { id: 'incasso_pos', nome: 'Incasso Pos', gruppo: 'Incasso Pos' },
    { id: 'altri_ricavi', nome: 'Altri Ricavi', gruppo: 'Altri Ricavi' },
  ];

  const defaultCategorieCosti = [
    { id: 'acquisto_merci', nome: 'Acquisto merci', gruppo: 'Acquisti' },
    { id: 'acquisto_merci_commerce', nome: 'Acquisto merci e-commerce', gruppo: 'Acquisti' },
    { id: 'bene_usato', nome: 'Bene usato', gruppo: 'Acquisti' },
    { id: 'affitto', nome: 'Affitto', gruppo: 'Costi Fissi' },
    { id: 'utenze', nome: 'Utenze', gruppo: 'Costi Fissi' },
    { id: 'allarme', nome: 'Allarme', gruppo: 'Costi Fissi' },
    { id: 'polizze', nome: 'Polizze assicurative', gruppo: 'Costi Fissi' },
    { id: 'personale', nome: 'Collaboratori esterni', gruppo: 'Personale' },
    { id: 'oneri_bancari', nome: 'Oneri Bancari', gruppo: 'Finanza' },
    { id: 'finanziamenti', nome: 'Finanziamenti', gruppo: 'Finanza' },
    { id: 'investimenti', nome: 'Investimenti', gruppo: 'Finanza' },
    { id: 'servizi', nome: 'Servizi', gruppo: 'Servizi' },
    { id: 'incasso_pos_costo', nome: 'Commissioni POS', gruppo: 'Servizi' },
    { id: 'tasse', nome: 'Tasse', gruppo: 'Tasse e Tributi' },
    { id: 'altri_costi', nome: 'Altri Costi', gruppo: 'Altro' },
  ];

  const [categorieRicavi, setCategorieRicavi] = useState(defaultCategorieRicavi);
  const [categorieCosti, setCategorieCosti] = useState(defaultCategorieCosti);
  const [showNuovaCategoria, setShowNuovaCategoria] = useState(false);
  const [nuovaCategoriaForm, setNuovaCategoriaForm] = useState({ nome: '', gruppo: '', nuovoGruppo: '', tipo: 'costo' });

  const tutteCategorie = useMemo(() => [
    ...categorieRicavi.map(c => ({ ...c, tipo: 'ricavo' })),
    ...categorieCosti.map(c => ({ ...c, tipo: 'costo' }))
  ], [categorieRicavi, categorieCosti]);

  // Carica categorie personalizzate da localStorage
  useEffect(() => {
    const savedRicavi = localStorage.getItem('categorie_ricavi');
    const savedCosti = localStorage.getItem('categorie_costi');
    if (savedRicavi) setCategorieRicavi(JSON.parse(savedRicavi));
    if (savedCosti) setCategorieCosti(JSON.parse(savedCosti));
  }, []);

  const handleSaveNuovaCategoria = () => {
    if (!nuovaCategoriaForm.nome) return alert('Inserisci il nome della categoria');
    const gruppo = nuovaCategoriaForm.nuovoGruppo || nuovaCategoriaForm.gruppo;
    if (!gruppo) return alert('Seleziona o crea un gruppo');
    
    const newCat = {
      id: `cat_${Date.now()}`,
      nome: nuovaCategoriaForm.nome,
      gruppo: gruppo
    };

    if (nuovaCategoriaForm.tipo === 'ricavo') {
      const updated = [...categorieRicavi, newCat];
      setCategorieRicavi(updated);
      localStorage.setItem('categorie_ricavi', JSON.stringify(updated));
    } else {
      const updated = [...categorieCosti, newCat];
      setCategorieCosti(updated);
      localStorage.setItem('categorie_costi', JSON.stringify(updated));
    }

    setShowNuovaCategoria(false);
    setNuovaCategoriaForm({ nome: '', gruppo: '', nuovoGruppo: '', tipo: 'costo' });
    
    // Auto-seleziona la nuova categoria nel form riconciliazione
    if (showReconciliationModal) {
      setReconcileForm(p => ({ ...p, categoriaMain: gruppo, categoriaSub: newCat.id }));
    }
  };

  const handleDeleteCategoria = (catId, tipo) => {
    if (!window.confirm('Eliminare questa categoria?')) return;
    if (tipo === 'ricavo') {
      const updated = categorieRicavi.filter(c => c.id !== catId);
      setCategorieRicavi(updated);
      localStorage.setItem('categorie_ricavi', JSON.stringify(updated));
    } else {
      const updated = categorieCosti.filter(c => c.id !== catId);
      setCategorieCosti(updated);
      localStorage.setItem('categorie_costi', JSON.stringify(updated));
    }
  };

  // ===================== LOAD DATA =====================
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [mov, conti] = await Promise.all([loadMovimentiBancaData(), loadContiBancariData()]);
        setMovimenti(mov || []);
        setContiBancari(conti || []);
      } catch (error) {
        console.error('Errore:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // ===================== LEDGER TRANSACTIONS FILTERED =====================
  const ledgerTransactions = useMemo(() => {
    let filtered = [...movimenti];
    
    // Year filter
    if (ledgerFilterYear && !ledgerFilterFrom && !ledgerFilterTo) {
      filtered = filtered.filter(m => {
        const year = (m.data || '').substring(0, 4);
        return year === ledgerFilterYear;
      });
    }
    
    // Date filters
    if (ledgerFilterFrom) {
      filtered = filtered.filter(m => (m.data || '') >= ledgerFilterFrom);
    }
    if (ledgerFilterTo) {
      filtered = filtered.filter(m => (m.data || '') <= ledgerFilterTo);
    }
    
    // Account filter
    if (ledgerFilterAccount !== 'all') {
      filtered = filtered.filter(m => m.conto === ledgerFilterAccount);
    }
    
    // Status filter
    if (ledgerFilterStatus === 'NEW') {
      filtered = filtered.filter(m => !m.riconciliato);
    } else if (ledgerFilterStatus === 'RECONCILED') {
      filtered = filtered.filter(m => m.riconciliato);
    }
    
    // Search filter
    if (ledgerFilterSearch) {
      const search = ledgerFilterSearch.toLowerCase();
      filtered = filtered.filter(m => 
        (m.descrizione || '').toLowerCase().includes(search) ||
        (m.controparte || '').toLowerCase().includes(search)
      );
    }
    
    return filtered.sort((a, b) => (b.data || '').localeCompare(a.data || ''));
  }, [movimenti, ledgerFilterYear, ledgerFilterFrom, ledgerFilterTo, ledgerFilterAccount, ledgerFilterStatus, ledgerFilterSearch]);

  // ===================== LEDGER TOTALS =====================
  const ledgerTotals = useMemo(() => {
    let totalDare = 0, totalAvere = 0, countNew = 0;
    ledgerTransactions.forEach(t => {
      const imp = Math.abs(parseFloat(t.importo) || 0);
      if (t.tipo === 'entrata') totalAvere += imp;
      else totalDare += imp;
      if (!t.riconciliato) countNew++;
    });
    return { totalDare, totalAvere, saldo: totalAvere - totalDare, countNew };
  }, [ledgerTransactions]);

  // ===================== DASHBOARD SUMMARY =====================
  const dashboardSummary = useMemo(() => {
    let totalLiquidity = 0;
    const accountBalances = contiBancari.map(conto => {
      const movConto = movimenti.filter(m => m.conto === conto.id);
      let balance = parseFloat(conto.saldoIniziale) || 0;
      movConto.forEach(m => {
        const imp = Math.abs(parseFloat(m.importo) || 0);
        if (m.tipo === 'entrata') balance += imp;
        else balance -= imp;
      });
      totalLiquidity += balance;
      return { ...conto, balance };
    });

    const transactionsToReconcile = movimenti.filter(m => !m.riconciliato).length;
    
    // Fatture (placeholder - in Hub vengono da altro sistema)
    const invoicesToPay = { total: 0, count: 0 };
    const invoicesToReceive = { total: 0, count: 0 };

    return { totalLiquidity, accountBalances, transactionsToReconcile, invoicesToPay, invoicesToReceive };
  }, [movimenti, contiBancari]);

  // ===================== CONTO ECONOMICO DATA =====================
  // IMPORTANTE: Solo i movimenti RICONCILIATI (con categoria assegnata) vengono mostrati nel Conto Economico
  const contoEconomicoData = useMemo(() => {
    // Filtra SOLO i movimenti riconciliati dell'anno selezionato
    const yearMovs = movimenti.filter(m => {
      const year = parseInt((m.data || '').substring(0, 4));
      return year === ceFilterYear && m.riconciliato && m.categoria;
    });

    // Group by date key based on filter type
    const getDateKey = (dateStr) => {
      if (!dateStr) return 'no-date';
      const d = new Date(dateStr);
      if (ceFilterType === 'day') return dateStr;
      if (ceFilterType === 'week') {
        const weekNum = Math.ceil((d.getDate() + new Date(d.getFullYear(), d.getMonth(), 1).getDay()) / 7);
        return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
      }
      if (ceFilterType === 'month') return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (ceFilterType === 'quarter') return `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`;
      return 'total';
    };

    const revenues = {};
    const costs = {};
    const allDates = new Set();

    // Determina se una categoria è ricavo o costo in base alle liste definite
    const isRicavo = (catId) => categorieRicavi.some(c => c.id === catId);
    const isCosto = (catId) => categorieCosti.some(c => c.id === catId);

    yearMovs.forEach(m => {
      const imp = Math.abs(parseFloat(m.importo) || 0);
      const dateKey = getDateKey(m.data);
      if (dateKey !== 'no-date') allDates.add(dateKey);
      const catId = m.categoria;
      
      // Trova il nome della categoria
      const catRicavo = categorieRicavi.find(c => c.id === catId);
      const catCosto = categorieCosti.find(c => c.id === catId);
      const catName = catRicavo?.nome || catCosto?.nome || catId;

      // Assegna a ricavi o costi in base alla categoria selezionata
      if (isRicavo(catId)) {
        if (!revenues[catId]) revenues[catId] = { nome: catName, netto: 0, by_date: {} };
        revenues[catId].netto += imp;
        revenues[catId].by_date[dateKey] = (revenues[catId].by_date[dateKey] || 0) + imp;
      } else if (isCosto(catId)) {
        if (!costs[catId]) costs[catId] = { nome: catName, total: 0, by_date: {} };
        costs[catId].total += imp;
        costs[catId].by_date[dateKey] = (costs[catId].by_date[dateKey] || 0) + imp;
      }
    });

    const sortedDates = Array.from(allDates).sort();
    
    let totalRicavi = 0, totalCosti = 0;
    const totalByDate = {}, totalCostsByDate = {};
    
    Object.values(revenues).forEach(r => {
      totalRicavi += r.netto;
      Object.entries(r.by_date).forEach(([k, v]) => {
        totalByDate[k] = (totalByDate[k] || 0) + v;
      });
    });
    Object.values(costs).forEach(c => {
      totalCosti += c.total;
      Object.entries(c.by_date).forEach(([k, v]) => {
        totalCostsByDate[k] = (totalCostsByDate[k] || 0) + v;
      });
    });

    return { revenues, costs, sortedDates, totalRicavi, totalCosti, totalByDate, totalCostsByDate };
  }, [movimenti, ceFilterYear, ceFilterType]);

  // ===================== FORMATTERS =====================
  const formatCurrency = (val) => `€ ${(val || 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatCurrencyShort = (val) => `€${(val || 0).toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  
  const formatDateLabel = (dateKey) => {
    if (ceFilterType === 'week') {
      const match = dateKey.match(/(\d{4})-W(\d+)/);
      if (match) return `S${match[2]}`;
    } else if (ceFilterType === 'month') {
      const match = dateKey.match(/(\d{4})-(\d{2})/);
      if (match) {
        const monthNames = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
        return monthNames[parseInt(match[2]) - 1];
      }
    } else if (ceFilterType === 'quarter') {
      const match = dateKey.match(/(\d{4})-Q(\d+)/);
      if (match) return `Q${match[2]}`;
    } else if (ceFilterType === 'day') {
      const match = dateKey.match(/(\d{4})-(\d{2})-(\d{2})/);
      if (match) return `${match[3]}/${match[2]}`;
    }
    return dateKey;
  };

  // ===================== HANDLERS =====================
  const saveMovimenti = useCallback(async (newMovimenti) => {
    setSaving(true);
    try {
      await saveMovimentiBancaData(newMovimenti);
      setMovimenti(newMovimenti);
    } catch (error) {
      console.error('Errore:', error);
    } finally {
      setSaving(false);
    }
  }, []);

  const handleSaveMovimento = async () => {
    if (!movimentoForm.descrizione || !movimentoForm.importo) return alert('Compila descrizione e importo');
    const mov = { 
      id: `mov_${Date.now()}`, 
      ...movimentoForm, 
      importo: Math.abs(parseFloat(movimentoForm.importo)),
      updatedAt: new Date().toISOString() 
    };
    await saveMovimenti([...movimenti, mov]);
    setShowNuovoMovimento(false);
    setMovimentoForm({ data: format(new Date(), 'yyyy-MM-dd'), descrizione: '', importo: '', tipo: 'uscita', categoria: '', controparte: '', conto: '', riconciliato: false });
  };

  const handleDeleteMovimento = async (id) => {
    if (!window.confirm('Eliminare questo movimento?')) return;
    await saveMovimenti(movimenti.filter(m => m.id !== id));
  };

  const handleDeleteSelected = async () => {
    if (selectedRows.size === 0) return;
    if (!window.confirm(`Eliminare ${selectedRows.size} movimenti selezionati?`)) return;
    const idsToDelete = Array.from(selectedRows);
    const newMovimenti = movimenti.filter(m => !idsToDelete.includes(m.id));
    await saveMovimenti(newMovimenti);
    setSelectedRows(new Set());
    setSelectAll(false);
  };

  const handleSelectAll = () => {
    if (selectedRows.size === ledgerTransactions.length) {
      setSelectedRows(new Set());
      setSelectAll(false);
    } else {
      setSelectedRows(new Set(ledgerTransactions.map(t => t.id)));
      setSelectAll(true);
    }
  };

  const handleAssignCategory = async (id, categoria) => {
    if (categoria === '__NEW__') return;
    await saveMovimenti(movimenti.map(m => m.id === id ? { ...m, categoria, riconciliato: !!categoria } : m));
  };

  // ===================== RICONCILIAZIONE POPUP =====================
  const [reconcileForm, setReconcileForm] = useState({
    descrizione: '',
    categoriaMain: '',
    categoriaSub: '',
    controparte: ''
  });

  const openReconcileModal = (movimento) => {
    setShowReconciliationModal(movimento);
    const catRicavo = categorieRicavi.find(c => c.id === movimento.categoria);
    const catCosto = categorieCosti.find(c => c.id === movimento.categoria);
    setReconcileForm({
      descrizione: movimento.descrizione || '',
      categoriaMain: catRicavo?.gruppo || catCosto?.gruppo || '',
      categoriaSub: movimento.categoria || '',
      controparte: movimento.controparte || ''
    });
  };

  const handleSaveReconciliation = async () => {
    if (!showReconciliationModal) return;
    const updated = movimenti.map(m => {
      if (m.id === showReconciliationModal.id) {
        return {
          ...m,
          descrizione: reconcileForm.descrizione,
          categoria: reconcileForm.categoriaSub,
          controparte: reconcileForm.controparte,
          riconciliato: !!reconcileForm.categoriaSub
        };
      }
      return m;
    });
    await saveMovimenti(updated);
    setShowReconciliationModal(null);
  };

  const getCategorieByMain = (mainCat) => {
    if (!mainCat) return [];
    if (showReconciliationModal?.tipo === 'entrata') {
      return categorieRicavi.filter(c => c.gruppo === mainCat);
    }
    return categorieCosti.filter(c => c.gruppo === mainCat);
  };

  const getMainCategories = () => {
    if (showReconciliationModal?.tipo === 'entrata') {
      const gruppi = [...new Set(categorieRicavi.map(c => c.gruppo))];
      return gruppi;
    }
    const gruppi = [...new Set(categorieCosti.map(c => c.gruppo))];
    return gruppi;
  };

  const handleSaveConto = async () => {
    if (!contoForm.nome) return;
    const newConto = { id: `conto_${Date.now()}`, nome: contoForm.nome, iban: contoForm.iban, saldoIniziale: parseFloat(contoForm.saldoIniziale) || 0 };
    const updated = [...contiBancari, newConto];
    setContiBancari(updated);
    await saveContoBancarioData(updated);
    setShowNuovoConto(false);
    setContoForm({ nome: '', iban: '', saldoIniziale: '' });
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
        data: headers.find(h => /data|date|valuta/i.test(h)) || '',
        descrizione: headers.find(h => /descr|causale|movimento/i.test(h)) || '',
        importo: headers.find(h => /importo|amount|euro/i.test(h)) || '',
        dare: headers.find(h => /dare|addebito|uscit/i.test(h)) || '',
        avere: headers.find(h => /avere|accredito|entrat/i.test(h)) || ''
      };
      setImportMapping(autoMapping);
      setImportStep(2);
    };
    reader.readAsText(file);
  };

  const processImport = async () => {
    const processed = importedData.map(row => {
      let imp = 0;
      if (importMapping.dare && importMapping.avere) {
        const dare = parseFloat((row[importMapping.dare] || '0').replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '')) || 0;
        const avere = parseFloat((row[importMapping.avere] || '0').replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '')) || 0;
        imp = avere > 0 ? avere : -Math.abs(dare);
      } else {
        imp = parseFloat((row[importMapping.importo] || '0').replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '')) || 0;
      }

      let dataStr = row[importMapping.data] || '';
      let dataFormatted = format(new Date(), 'yyyy-MM-dd');
      const fmts = [/(\d{2})\/(\d{2})\/(\d{4})/, /(\d{4})-(\d{2})-(\d{2})/, /(\d{2})-(\d{2})-(\d{4})/];
      for (const fmt of fmts) {
        const match = dataStr.match(fmt);
        if (match) {
          if (fmt === fmts[0] || fmt === fmts[2]) dataFormatted = `${match[3]}-${match[2]}-${match[1]}`;
          else dataFormatted = `${match[1]}-${match[2]}-${match[3]}`;
          break;
        }
      }

      return { 
        id: `imp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, 
        data: dataFormatted,
        descrizione: row[importMapping.descrizione] || 'Importato', 
        importo: Math.abs(imp), 
        tipo: imp >= 0 ? 'entrata' : 'uscita', 
        categoria: '', controparte: '', conto: importContoId, riconciliato: false 
      };
    });
    
    await saveMovimenti([...movimenti, ...processed]);
    setShowImportModal(false);
    setImportStep(1);
    setImportedData([]);
  };

  // ===================== EXPORT =====================
  const exportExcel = () => {
    const headers = ['Data', 'Descrizione', 'Dare', 'Avere', 'Categoria', 'Stato'];
    const rows = ledgerTransactions.map(t => {
      const imp = parseFloat(t.importo) || 0;
      return [
        t.data, t.descrizione, 
        t.tipo === 'uscita' ? imp.toFixed(2) : '', 
        t.tipo === 'entrata' ? imp.toFixed(2) : '',
        tutteCategorie.find(c => c.id === t.categoria)?.nome || '',
        t.riconciliato ? 'OK' : 'Nuovo'
      ];
    });
    const csv = [headers, ...rows].map(r => r.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prima_nota_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`;
    a.click();
  };

  // Export completo per commercialista (solo riconciliati)
  const exportPerCommercialista = () => {
    const annoSelezionato = parseInt(ledgerFilterYear);
    const movimentiRiconciliati = movimenti.filter(m => {
      const year = parseInt((m.data || '').substring(0, 4));
      return year === annoSelezionato && m.riconciliato && m.categoria;
    }).sort((a, b) => new Date(a.data) - new Date(b.data));

    if (movimentiRiconciliati.length === 0) {
      alert('Nessun movimento riconciliato da esportare per l\'anno ' + annoSelezionato);
      return;
    }

    // Calcola totali
    let totaleRicavi = 0, totaleCosti = 0;
    movimentiRiconciliati.forEach(m => {
      const cat = tutteCategorie.find(c => c.id === m.categoria);
      const imp = parseFloat(m.importo) || 0;
      if (cat?.tipo === 'ricavo' || m.tipo === 'entrata') totaleRicavi += imp;
      else totaleCosti += imp;
    });

    // Headers dettagliati
    const headers = [
      'Data',
      'Descrizione',
      'Controparte',
      'Conto Bancario',
      'Tipo',
      'Gruppo Categoria',
      'Categoria',
      'Ricavi (€)',
      'Costi (€)',
      'Note'
    ];

    const rows = movimentiRiconciliati.map(t => {
      const cat = tutteCategorie.find(c => c.id === t.categoria);
      const conto = contiBancari.find(c => c.id === t.conto);
      const imp = parseFloat(t.importo) || 0;
      const isRicavo = cat?.tipo === 'ricavo' || t.tipo === 'entrata';
      
      return [
        t.data ? format(new Date(t.data), 'dd/MM/yyyy') : '',
        (t.descrizione || '').replace(/;/g, ','),
        (t.controparte || '').replace(/;/g, ','),
        conto?.nome || '',
        isRicavo ? 'RICAVO' : 'COSTO',
        cat?.gruppo || '',
        cat?.nome || t.categoria || '',
        isRicavo ? imp.toFixed(2).replace('.', ',') : '',
        !isRicavo ? imp.toFixed(2).replace('.', ',') : '',
        (t.note || '').replace(/;/g, ',').replace(/\n/g, ' ')
      ];
    });

    // Aggiungi riga vuota e totali
    rows.push([]);
    rows.push(['', '', '', '', '', '', 'TOTALE RICAVI:', totaleRicavi.toFixed(2).replace('.', ','), '', '']);
    rows.push(['', '', '', '', '', '', 'TOTALE COSTI:', '', totaleCosti.toFixed(2).replace('.', ','), '']);
    rows.push(['', '', '', '', '', '', 'UTILE/PERDITA:', (totaleRicavi - totaleCosti).toFixed(2).replace('.', ','), '', '']);

    // Aggiungi riepilogo per categoria
    rows.push([]);
    rows.push(['--- RIEPILOGO PER CATEGORIA ---']);
    rows.push([]);
    
    // Ricavi per categoria
    rows.push(['RICAVI PER CATEGORIA']);
    const ricaviPerCat = {};
    movimentiRiconciliati.filter(m => {
      const cat = tutteCategorie.find(c => c.id === m.categoria);
      return cat?.tipo === 'ricavo' || m.tipo === 'entrata';
    }).forEach(m => {
      const cat = tutteCategorie.find(c => c.id === m.categoria);
      const key = cat?.nome || 'Altro';
      ricaviPerCat[key] = (ricaviPerCat[key] || 0) + (parseFloat(m.importo) || 0);
    });
    Object.entries(ricaviPerCat).sort((a, b) => b[1] - a[1]).forEach(([cat, tot]) => {
      rows.push(['', cat, '', '', '', '', '', tot.toFixed(2).replace('.', ','), '', '']);
    });

    rows.push([]);
    rows.push(['COSTI PER CATEGORIA']);
    const costiPerCat = {};
    movimentiRiconciliati.filter(m => {
      const cat = tutteCategorie.find(c => c.id === m.categoria);
      return cat?.tipo === 'costo' || m.tipo === 'uscita';
    }).forEach(m => {
      const cat = tutteCategorie.find(c => c.id === m.categoria);
      const key = cat?.nome || 'Altro';
      costiPerCat[key] = (costiPerCat[key] || 0) + (parseFloat(m.importo) || 0);
    });
    Object.entries(costiPerCat).sort((a, b) => b[1] - a[1]).forEach(([cat, tot]) => {
      rows.push(['', cat, '', '', '', '', '', '', tot.toFixed(2).replace('.', ','), '']);
    });

    // Crea CSV con BOM per Excel
    const BOM = '\uFEFF';
    const csv = BOM + [headers, ...rows].map(r => r.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contabilita_${annoSelezionato}_riconciliato_${format(new Date(), 'yyyyMMdd')}.csv`;
    a.click();
  };

  // Export Conto Economico per commercialista
  const exportContoEconomico = () => {
    const { revenues, costs, sortedDates, totalRicavi, totalCosti } = contoEconomicoData;
    
    if (totalRicavi === 0 && totalCosti === 0) {
      alert('Nessun dato nel Conto Economico. Riconcilia i movimenti prima di esportare.');
      return;
    }

    const rows = [];
    
    // Intestazione
    rows.push([`CONTO ECONOMICO ${ceFilterYear}`]);
    rows.push([`Generato il ${format(new Date(), 'dd/MM/yyyy HH:mm')}`]);
    rows.push([]);

    // Headers con date
    const dateHeaders = ['VOCE', ...sortedDates.map(d => formatDateLabel(d)), 'TOTALE'];
    rows.push(dateHeaders);
    rows.push([]);

    // RICAVI
    rows.push(['RICAVI']);
    Object.entries(revenues).forEach(([catId, data]) => {
      const row = [data.nome || catId];
      sortedDates.forEach(d => {
        row.push((data.by_date[d] || 0).toFixed(2).replace('.', ','));
      });
      row.push(data.netto.toFixed(2).replace('.', ','));
      rows.push(row);
    });
    
    // Totale Ricavi
    const totRicaviRow = ['TOTALE RICAVI'];
    sortedDates.forEach(d => {
      const tot = Object.values(revenues).reduce((sum, r) => sum + (r.by_date[d] || 0), 0);
      totRicaviRow.push(tot.toFixed(2).replace('.', ','));
    });
    totRicaviRow.push(totalRicavi.toFixed(2).replace('.', ','));
    rows.push(totRicaviRow);
    rows.push([]);

    // COSTI
    rows.push(['COSTI']);
    Object.entries(costs).forEach(([catId, data]) => {
      const pct = totalCosti > 0 ? ((data.total / totalCosti) * 100).toFixed(1) : '0';
      const row = [`${data.nome || catId} (${pct}%)`];
      sortedDates.forEach(d => {
        row.push((data.by_date[d] || 0).toFixed(2).replace('.', ','));
      });
      row.push(data.total.toFixed(2).replace('.', ','));
      rows.push(row);
    });

    // Totale Costi
    const totCostiRow = ['TOTALE COSTI'];
    sortedDates.forEach(d => {
      const tot = Object.values(costs).reduce((sum, c) => sum + (c.by_date[d] || 0), 0);
      totCostiRow.push(tot.toFixed(2).replace('.', ','));
    });
    totCostiRow.push(totalCosti.toFixed(2).replace('.', ','));
    rows.push(totCostiRow);
    rows.push([]);

    // UTILE/PERDITA
    const utileRow = ['UTILE / PERDITA'];
    sortedDates.forEach(d => {
      const ricavi = Object.values(revenues).reduce((sum, r) => sum + (r.by_date[d] || 0), 0);
      const costi = Object.values(costs).reduce((sum, c) => sum + (c.by_date[d] || 0), 0);
      utileRow.push((ricavi - costi).toFixed(2).replace('.', ','));
    });
    utileRow.push((totalRicavi - totalCosti).toFixed(2).replace('.', ','));
    rows.push(utileRow);

    // Margine %
    rows.push([]);
    const margine = totalRicavi > 0 ? ((totalRicavi - totalCosti) / totalRicavi * 100).toFixed(1) : '0';
    rows.push([`MARGINE: ${margine}%`]);

    // Crea CSV
    const BOM = '\uFEFF';
    const csv = BOM + rows.map(r => r.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conto_economico_${ceFilterYear}_${format(new Date(), 'yyyyMMdd')}.csv`;
    a.click();
  };

  // ===================== DEMO DATA =====================
  const creaDatiDemo = async () => {
    const demoConti = [
      { id: 'conto_bpm', nome: 'Banco BPM', iban: 'IT60X0542811101000000123456', saldoIniziale: 15000 },
      { id: 'conto_intesa', nome: 'Intesa Sanpaolo', iban: 'IT60X0306911101000000654321', saldoIniziale: 8500 }
    ];
    
    const oggi = new Date();
    const demoMovimenti = [
      { id: 'demo_1', data: format(subMonths(oggi, 2), 'yyyy-MM-dd'), descrizione: 'int. e comp. - competenze', tipo: 'uscita', importo: 160, categoria: 'oneri_bancari', conto: 'conto_bpm', riconciliato: false },
      { id: 'demo_2', data: format(subMonths(oggi, 2), 'yyyy-MM-dd'), descrizione: 'int. e comp. - competenze es 0251/700006646', tipo: 'uscita', importo: 325, categoria: 'oneri_bancari', conto: 'conto_bpm', riconciliato: false },
      { id: 'demo_3', data: format(subMonths(oggi, 2), 'yyyy-MM-dd'), descrizione: 'rimborso finanz. - mutuo n.0251 8135867 rata 31/12/2025', tipo: 'uscita', importo: 4958.05, categoria: 'finanziamenti', conto: 'conto_bpm', riconciliato: false },
      { id: 'demo_4', data: format(subMonths(oggi, 1), 'yyyy-MM-dd'), descrizione: 'int. e comp. - competenze cc 0251/000007126', tipo: 'uscita', importo: 80, categoria: 'oneri_bancari', conto: 'conto_bpm', riconciliato: false },
      { id: 'demo_5', data: format(oggi, 'yyyy-MM-dd'), descrizione: 'incas. tramite p.o.s - numia-pgbnt del 30/12/25 pdv 5607630/00', tipo: 'entrata', importo: 170, categoria: 'incasso_pos', conto: 'conto_bpm', riconciliato: false },
      { id: 'demo_6', data: format(oggi, 'yyyy-MM-dd'), descrizione: 'inc.pos carte credit - numia-inter del 30/12/25 pdv 5607630/00', tipo: 'entrata', importo: 20, categoria: 'incasso_pos', conto: 'conto_bpm', riconciliato: false },
      { id: 'demo_7', data: format(subMonths(oggi, 1), 'yyyy-MM-dd'), descrizione: 'Vendita negozio EUR', tipo: 'entrata', importo: 20125, categoria: 'vendite_negozio', conto: 'conto_bpm', riconciliato: true },
      { id: 'demo_8', data: format(oggi, 'yyyy-MM-dd'), descrizione: 'Vendita negozio Libia', tipo: 'entrata', importo: 15055, categoria: 'vendite_negozio', conto: 'conto_intesa', riconciliato: true },
      { id: 'demo_9', data: format(subMonths(oggi, 1), 'yyyy-MM-dd'), descrizione: 'Vendita negozio Tuscolana', tipo: 'entrata', importo: 12917, categoria: 'vendite_negozio', conto: 'conto_intesa', riconciliato: true },
      { id: 'demo_10', data: format(oggi, 'yyyy-MM-dd'), descrizione: 'E-commerce Shopify', tipo: 'entrata', importo: 58478, categoria: 'ecommerce', conto: 'conto_bpm', riconciliato: true },
      { id: 'demo_11', data: format(subMonths(oggi, 2), 'yyyy-MM-dd'), descrizione: 'B2B Cliente', tipo: 'entrata', importo: 12830, categoria: 'b2b', conto: 'conto_intesa', riconciliato: true },
      { id: 'demo_12', data: format(subMonths(oggi, 1), 'yyyy-MM-dd'), descrizione: 'Acquisto merce fornitore', tipo: 'uscita', importo: 50922, categoria: 'acquisto_merci', conto: 'conto_bpm', riconciliato: true },
      { id: 'demo_13', data: format(oggi, 'yyyy-MM-dd'), descrizione: 'Affitto negozio', tipo: 'uscita', importo: 8146, categoria: 'affitto', conto: 'conto_bpm', riconciliato: true },
      { id: 'demo_14', data: format(subMonths(oggi, 1), 'yyyy-MM-dd'), descrizione: 'Collaboratore esterno', tipo: 'uscita', importo: 3411, categoria: 'personale', conto: 'conto_intesa', riconciliato: true },
    ];

    for (const conto of demoConti) {
      await saveContoBancarioData(conto);
    }
    setContiBancari(demoConti);
    await saveMovimenti(demoMovimenti);
  };

  // ===================== RENDER =====================
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: '1rem' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#3b82f6' }} />
        <span style={{ color: '#64748b' }}>Caricamento...</span>
      </div>
    );
  }

  // ===================== ADMIN TABS =====================
  const adminTabs = [
    { id: 'admin-dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'prima-nota', label: 'Prima Nota', icon: BookOpen },
    { id: 'conto-economico', label: 'Conto Economico', icon: PieChartIcon },
  ];

  return (
    <div className="amministrazione-page" style={{ background: '#f8fafc', minHeight: '100vh' }}>
      {/* Sub-navigation tabs */}
      <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', marginBottom: '0' }}>
        <div style={{ maxWidth: '1800px', margin: '0 auto', padding: '0 1.5rem' }}>
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            {adminTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '1rem 1.25rem', border: 'none', background: 'transparent',
                  color: activeTab === tab.id ? '#1e293b' : '#64748b',
                  fontWeight: activeTab === tab.id ? 600 : 500,
                  borderBottom: activeTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent',
                  cursor: 'pointer', fontSize: '0.9rem', transition: 'all 0.15s'
                }}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1800px', margin: '0 auto', padding: '1.5rem' }}>

        {/* ==================== ADMIN DASHBOARD ==================== */}
        {activeTab === 'admin-dashboard' && (
          <div className="admin-dashboard-inner">
            {/* Header con filtri periodo */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2 style={{ margin: '0 0 0.25rem 0', color: '#1e293b', fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <BarChart3 className="w-6 h-6" />
                  Dashboard Amministrazione
                </h2>
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>Panoramica liquidità, fatture e movimenti</p>
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

            <div id="admin-dashboard-summary" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
              
              {/* KPI Liquidità */}
              <div style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', color: 'white' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <div style={{ width: '45px', height: '45px', borderRadius: '12px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Landmark className="w-6 h-6" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>Liquidità Conto Corrente</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{formatCurrency(dashboardSummary.totalLiquidity)}</div>
                  </div>
                </div>
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '1rem' }}>
                  {dashboardSummary.accountBalances.map(acc => (
                    <div key={acc.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', fontSize: '0.9rem', alignItems: 'center' }}>
                      <span style={{ opacity: 0.9, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Landmark className="w-4 h-4" /> {acc.nome}
                      </span>
                      <span style={{ fontWeight: 600 }}>{formatCurrency(acc.balance)}</span>
                    </div>
                  ))}
                  {dashboardSummary.accountBalances.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '0.5rem', opacity: 0.7 }}>Nessun conto configurato</div>
                  )}
                </div>
              </div>

              {/* Fatture da Pagare */}
              <div style={{ background: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{ width: '45px', height: '45px', borderRadius: '12px', background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <TrendingUp className="w-6 h-6" style={{ color: 'white' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Fatture da Pagare</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#dc2626' }}>{formatCurrency(dashboardSummary.invoicesToPay.total)}</div>
                  </div>
                </div>
                <div style={{ fontSize: '0.9rem', color: '#64748b' }}>{dashboardSummary.invoicesToPay.count} fatture in sospeso</div>
              </div>

              {/* Fatture da Incassare */}
              <div style={{ background: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{ width: '45px', height: '45px', borderRadius: '12px', background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <TrendingDown className="w-6 h-6" style={{ color: 'white' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Fatture da Incassare</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#16a34a' }}>{formatCurrency(dashboardSummary.invoicesToReceive.total)}</div>
                  </div>
                </div>
                <div style={{ fontSize: '0.9rem', color: '#64748b' }}>{dashboardSummary.invoicesToReceive.count} fatture in attesa</div>
              </div>

              {/* Da Riconciliare */}
              <div style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', color: 'white' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <div style={{ width: '45px', height: '45px', borderRadius: '12px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Clock className="w-6 h-6" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>Da Riconciliare</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{dashboardSummary.transactionsToReconcile}</div>
                  </div>
                </div>
                <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>movimenti bancari</div>
              </div>
            </div>

            {/* GRAFICI RECHARTS */}
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
                dataInizio = subDays(oggi, 7);
                dataInizioPrecedente = subDays(oggi, 14);
                dataFinePrecedente = subDays(oggi, 7);
              } else if (dashboardPeriodo === '30') {
                dataInizio = subDays(oggi, 30);
                dataInizioPrecedente = subDays(oggi, 60);
                dataFinePrecedente = subDays(oggi, 30);
              } else if (dashboardPeriodo === '90') {
                dataInizio = subDays(oggi, 90);
                dataInizioPrecedente = subDays(oggi, 180);
                dataFinePrecedente = subDays(oggi, 90);
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
                dataFinePrecedente = null;
              }

              const isInPeriodo = (dataStr) => {
                if (!dataStr) return false;
                const d = parseISO(dataStr);
                return d >= dataInizio && d <= dataFine;
              };

              const isInPeriodoPrecedente = (dataStr) => {
                if (!dataStr || !dataInizioPrecedente) return false;
                const d = parseISO(dataStr);
                return d >= dataInizioPrecedente && d <= dataFinePrecedente;
              };

              // Filtra movimenti per periodo
              const movPeriodo = movimenti.filter(m => isInPeriodo(m.data || m.dataOperazione));
              const movPeriodoPrecedente = movimenti.filter(m => isInPeriodoPrecedente(m.data || m.dataOperazione));
              
              const riconciliati = movPeriodo.filter(m => m.riconciliato);
              const riconciliatiPrec = movPeriodoPrecedente.filter(m => m.riconciliato);
              
              const entrateTot = riconciliati.filter(m => parseFloat(m.importo) > 0).reduce((s, m) => s + parseFloat(m.importo), 0);
              const usciteTot = riconciliati.filter(m => parseFloat(m.importo) < 0).reduce((s, m) => s + Math.abs(parseFloat(m.importo)), 0);
              
              const entrateTotPrec = riconciliatiPrec.filter(m => parseFloat(m.importo) > 0).reduce((s, m) => s + parseFloat(m.importo), 0);
              const usciteTotPrec = riconciliatiPrec.filter(m => parseFloat(m.importo) < 0).reduce((s, m) => s + Math.abs(parseFloat(m.importo)), 0);

              const calcVariazione = (attuale, precedente) => {
                if (precedente === 0) return attuale > 0 ? 100 : 0;
                return ((attuale - precedente) / precedente) * 100;
              };

              const variazioneEntrate = calcVariazione(entrateTot, entrateTotPrec);
              const variazioneUscite = calcVariazione(usciteTot, usciteTotPrec);
              const variazioneSaldo = calcVariazione(entrateTot - usciteTot, entrateTotPrec - usciteTotPrec);
              
              const pieDataEntrateUscite = [
                { name: 'Entrate', value: entrateTot, color: '#10b981' },
                { name: 'Uscite', value: usciteTot, color: '#ef4444' }
              ].filter(d => d.value > 0);

              const categorieEntrateMap = {};
              const categorieUsciteMap = {};
              riconciliati.forEach(m => {
                const cat = m.categoriaRiconciliazione || 'Non categorizzato';
                const imp = parseFloat(m.importo) || 0;
                if (imp > 0) {
                  categorieEntrateMap[cat] = (categorieEntrateMap[cat] || 0) + imp;
                } else {
                  categorieUsciteMap[cat] = (categorieUsciteMap[cat] || 0) + Math.abs(imp);
                }
              });

              const pieDataCategorieEntrate = Object.entries(categorieEntrateMap)
                .map(([name, value], idx) => ({ name, value, color: COLORS[idx % COLORS.length] }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 8);

              const pieDataCategorieUscite = Object.entries(categorieUsciteMap)
                .map(([name, value], idx) => ({ name, value, color: COLORS[idx % COLORS.length] }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 8);

              const mesiData = {};
              movPeriodo.forEach(m => {
                const data = m.data || m.dataOperazione;
                if (!data) return;
                const mese = data.substring(0, 7);
                if (!mesiData[mese]) mesiData[mese] = { mese, meseLabel: formatMeseIT(mese), entrate: 0, uscite: 0, saldo: 0 };
                const imp = parseFloat(m.importo) || 0;
                if (imp > 0) mesiData[mese].entrate += imp;
                else mesiData[mese].uscite += Math.abs(imp);
                mesiData[mese].saldo = mesiData[mese].entrate - mesiData[mese].uscite;
              });
              const lineDataMensile = Object.values(mesiData).sort((a, b) => a.mese.localeCompare(b.mese));

              const contiData = contiBancari.map((conto, idx) => {
                const movConto = movimenti.filter(m => m.contoId === conto.id);
                const entrate = movConto.filter(m => parseFloat(m.importo) > 0).reduce((s, m) => s + parseFloat(m.importo), 0);
                const uscite = movConto.filter(m => parseFloat(m.importo) < 0).reduce((s, m) => s + Math.abs(parseFloat(m.importo)), 0);
                return { name: conto.nome, entrate, uscite, saldo: entrate - uscite, color: COLORS[idx % COLORS.length] };
              });

              const CustomTooltip = ({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div style={{ background: 'white', padding: '0.75rem', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', border: '1px solid #e2e8f0' }}>
                      <p style={{ margin: '0 0 0.5rem 0', fontWeight: 600, color: '#1e293b' }}>{label}</p>
                      {payload.map((entry, index) => (
                        <p key={index} style={{ margin: '0.25rem 0', fontSize: '0.85rem', color: entry.color }}>
                          {entry.name}: € {entry.value?.toFixed(2)}
                        </p>
                      ))}
                    </div>
                  );
                }
                return null;
              };

              return (
                <div style={{ marginTop: '1.5rem' }}>
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
                        {/* Entrate */}
                        <div style={{ padding: '1rem', background: '#f0fdf4', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
                          <div style={{ fontSize: '0.8rem', color: '#166534', marginBottom: '0.5rem' }}>Entrate</div>
                          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981' }}>€ {entrateTot.toFixed(0)}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                            {variazioneEntrate >= 0 ? (
                              <TrendingUp className="w-4 h-4" style={{ color: '#10b981' }} />
                            ) : (
                              <TrendingDown className="w-4 h-4" style={{ color: '#ef4444' }} />
                            )}
                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: variazioneEntrate >= 0 ? '#10b981' : '#ef4444' }}>
                              {variazioneEntrate >= 0 ? '+' : ''}{variazioneEntrate.toFixed(1)}%
                            </span>
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              (era € {entrateTotPrec.toFixed(0)})
                            </span>
                          </div>
                        </div>

                        {/* Uscite */}
                        <div style={{ padding: '1rem', background: '#fef2f2', borderRadius: '10px', border: '1px solid #fecaca' }}>
                          <div style={{ fontSize: '0.8rem', color: '#991b1b', marginBottom: '0.5rem' }}>Uscite</div>
                          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ef4444' }}>€ {usciteTot.toFixed(0)}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                            {variazioneUscite <= 0 ? (
                              <TrendingDown className="w-4 h-4" style={{ color: '#10b981' }} />
                            ) : (
                              <TrendingUp className="w-4 h-4" style={{ color: '#ef4444' }} />
                            )}
                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: variazioneUscite <= 0 ? '#10b981' : '#ef4444' }}>
                              {variazioneUscite >= 0 ? '+' : ''}{variazioneUscite.toFixed(1)}%
                            </span>
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              (era € {usciteTotPrec.toFixed(0)})
                            </span>
                          </div>
                        </div>

                        {/* Saldo */}
                        <div style={{ padding: '1rem', background: (entrateTot - usciteTot) >= 0 ? '#eff6ff' : '#fef2f2', borderRadius: '10px', border: '1px solid ' + ((entrateTot - usciteTot) >= 0 ? '#bfdbfe' : '#fecaca') }}>
                          <div style={{ fontSize: '0.8rem', color: '#1e40af', marginBottom: '0.5rem' }}>Saldo Netto</div>
                          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: (entrateTot - usciteTot) >= 0 ? '#3b82f6' : '#ef4444' }}>€ {(entrateTot - usciteTot).toFixed(0)}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                            {variazioneSaldo >= 0 ? (
                              <TrendingUp className="w-4 h-4" style={{ color: '#10b981' }} />
                            ) : (
                              <TrendingDown className="w-4 h-4" style={{ color: '#ef4444' }} />
                            )}
                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: variazioneSaldo >= 0 ? '#10b981' : '#ef4444' }}>
                              {variazioneSaldo >= 0 ? '+' : ''}{variazioneSaldo.toFixed(1)}%
                            </span>
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              (era € {(entrateTotPrec - usciteTotPrec).toFixed(0)})
                            </span>
                          </div>
                        </div>

                        {/* Movimenti */}
                        <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                          <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.5rem' }}>Movimenti</div>
                          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>{movPeriodo.length}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>
                              {movPeriodo.length - movPeriodoPrecedente.length >= 0 ? '+' : ''}{movPeriodo.length - movPeriodoPrecedente.length}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                              (erano {movPeriodoPrecedente.length})
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Prima riga: Torte */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                    {/* Pie Chart - Entrate vs Uscite */}
                    <div style={{ background: 'white', borderRadius: '14px', padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
                      <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        💰 Entrate vs Uscite
                      </h3>
                      {pieDataEntrateUscite.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                          <PieChart>
                            <Pie
                              data={pieDataEntrateUscite}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={90}
                              paddingAngle={3}
                              dataKey="value"
                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            >
                              {pieDataEntrateUscite.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} stroke="white" strokeWidth={2} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => `€ ${value.toFixed(2)}`} />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div style={{ height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>Nessun dato</div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '0.5rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem' }}>
                          <span style={{ width: '12px', height: '12px', background: '#10b981', borderRadius: '3px' }}></span>
                          Entrate: € {entrateTot.toFixed(0)}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem' }}>
                          <span style={{ width: '12px', height: '12px', background: '#ef4444', borderRadius: '3px' }}></span>
                          Uscite: € {usciteTot.toFixed(0)}
                        </span>
                      </div>
                    </div>

                    {/* Pie Chart - Categorie Entrate */}
                    <div style={{ background: 'white', borderRadius: '14px', padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
                      <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        📈 Entrate per Categoria
                      </h3>
                      {pieDataCategorieEntrate.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                          <PieChart>
                            <Pie
                              data={pieDataCategorieEntrate}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={90}
                              paddingAngle={2}
                              dataKey="value"
                            >
                              {pieDataCategorieEntrate.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} stroke="white" strokeWidth={2} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => `€ ${value.toFixed(2)}`} />
                            <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div style={{ height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>Nessun dato</div>
                      )}
                    </div>

                    {/* Pie Chart - Categorie Uscite */}
                    <div style={{ background: 'white', borderRadius: '14px', padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
                      <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        📉 Uscite per Categoria
                      </h3>
                      {pieDataCategorieUscite.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                          <PieChart>
                            <Pie
                              data={pieDataCategorieUscite}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={90}
                              paddingAngle={2}
                              dataKey="value"
                            >
                              {pieDataCategorieUscite.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} stroke="white" strokeWidth={2} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => `€ ${value.toFixed(2)}`} />
                            <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div style={{ height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>Nessun dato</div>
                      )}
                    </div>
                  </div>

                  {/* Grafico Andamento Mensile */}
                  <div style={{ background: 'white', borderRadius: '14px', padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
                    <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      📊 Andamento Mensile
                    </h3>
                    {lineDataMensile.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={lineDataMensile} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
                          <defs>
                            <linearGradient id="colorEntrateAdmin" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                            </linearGradient>
                            <linearGradient id="colorUsciteAdmin" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="meseLabel" tick={{ fontSize: 11, fill: '#64748b' }} />
                          <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v) => `€${(v/1000).toFixed(0)}k`} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend wrapperStyle={{ fontSize: '0.85rem' }} />
                          <Area type="monotone" dataKey="entrate" name="Entrate" stroke="#10b981" fillOpacity={1} fill="url(#colorEntrateAdmin)" />
                          <Area type="monotone" dataKey="uscite" name="Uscite" stroke="#ef4444" fillOpacity={1} fill="url(#colorUsciteAdmin)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>Nessun dato mensile</div>
                    )}
                  </div>

                  {/* Bar Chart per Conto + Riepilogo */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
                    <div style={{ background: 'white', borderRadius: '14px', padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
                      <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        🏦 Movimenti per Conto
                      </h3>
                      {contiData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={260}>
                          <BarChart data={contiData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} />
                            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v) => `€${(v/1000).toFixed(0)}k`} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
                            <Bar dataKey="entrate" name="Entrate" fill="#10b981" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="uscite" name="Uscite" fill="#ef4444" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>Nessun conto configurato</div>
                      )}
                    </div>

                    {/* Riepilogo Finanziario */}
                    <div style={{ background: 'white', borderRadius: '14px', padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
                      <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        📋 Riepilogo Finanziario
                      </h3>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <div style={{ padding: '1rem', background: '#dcfce7', borderRadius: '10px', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.8rem', color: '#166534', marginBottom: '0.25rem' }}>Totale Entrate</div>
                          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#10b981' }}>€ {entrateTot.toFixed(0)}</div>
                        </div>
                        <div style={{ padding: '1rem', background: '#fef2f2', borderRadius: '10px', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.8rem', color: '#991b1b', marginBottom: '0.25rem' }}>Totale Uscite</div>
                          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ef4444' }}>€ {usciteTot.toFixed(0)}</div>
                        </div>
                        <div style={{ padding: '1rem', background: (entrateTot - usciteTot) >= 0 ? '#f0fdf4' : '#fef2f2', borderRadius: '10px', textAlign: 'center', border: '2px solid ' + ((entrateTot - usciteTot) >= 0 ? '#86efac' : '#fecaca') }}>
                          <div style={{ fontSize: '0.8rem', color: '#1e293b', marginBottom: '0.25rem', fontWeight: 600 }}>Saldo</div>
                          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: (entrateTot - usciteTot) >= 0 ? '#10b981' : '#ef4444' }}>€ {(entrateTot - usciteTot).toFixed(0)}</div>
                        </div>
                        <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '10px', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.25rem' }}>Movimenti</div>
                          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>{movimenti.length}</div>
                        </div>
                        <div style={{ padding: '1rem', background: '#fef3c7', borderRadius: '10px', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.8rem', color: '#92400e', marginBottom: '0.25rem' }}>Da Riconciliare</div>
                          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f59e0b' }}>{movimenti.filter(m => !m.riconciliato).length}</div>
                        </div>
                        <div style={{ padding: '1rem', background: '#dbeafe', borderRadius: '10px', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.8rem', color: '#1e40af', marginBottom: '0.25rem' }}>Riconciliati</div>
                          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#3b82f6' }}>{riconciliati.length}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* ==================== PRIMA NOTA ==================== */}
        {activeTab === 'prima-nota' && (
          <div className="admin-section-inner">
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <h2 style={{ margin: 0, color: '#1e293b', fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BookOpen className="w-5 h-5" />
                Prima Nota - Movimenti Bancari
              </h2>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <select value={ledgerFilterYear} onChange={e => setLedgerFilterYear(e.target.value)} style={{ padding: '0.6rem 1rem', border: '2px solid #667eea', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600, color: '#667eea', background: 'white', cursor: 'pointer' }}>
                  <option value="2024">📅 2024</option>
                  <option value="2025">📅 2025</option>
                  <option value="2026">📅 2026</option>
                </select>
                {selectedRows.size > 0 && (
                  <button onClick={handleDeleteSelected} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: 'white', border: 'none', padding: '0.6rem 1rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                    <Trash2 className="w-4 h-4" /> Elimina ({selectedRows.size})
                  </button>
                )}
                <button onClick={() => { setMovimentoForm(p => ({ ...p, tipo: 'uscita' })); setShowNuovoMovimento(true); }} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'linear-gradient(135deg, #f97316, #ea580c)', color: 'white', border: 'none', padding: '0.6rem 1rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                  <DollarSign className="w-4 h-4" /> Uscita Contanti
                </button>
                <button onClick={() => setShowNuovoConto(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1rem', background: 'white', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontWeight: 500, cursor: 'pointer', color: '#475569' }}>
                  <Plus className="w-4 h-4" /> Nuovo Conto
                </button>
                <button onClick={() => setShowImportModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#3b82f6', color: 'white', border: 'none', padding: '0.6rem 1rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                  <Upload className="w-4 h-4" /> Carica CSV Banca
                </button>
                <button type="button" onClick={exportExcel} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }} title="Esporta tutti i movimenti filtrati">
                  <Download className="w-4 h-4" /> Excel
                </button>
                <button type="button" onClick={exportPerCommercialista} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }} title="Esporta solo riconciliati con riepilogo per commercialista">
                  <FileSpreadsheet className="w-4 h-4" /> Commercialista
                </button>
              </div>
            </div>

            {/* Filtri */}
            <div style={{ background: 'white', borderRadius: '12px', padding: '1rem 1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', alignItems: 'end' }}>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>
                    <CreditCard className="w-4 h-4" /> Conto
                  </label>
                  <select value={ledgerFilterAccount} onChange={e => setLedgerFilterAccount(e.target.value)} style={{ width: '100%', padding: '0.6rem', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem' }}>
                    <option value="all">Tutti i conti</option>
                    {contiBancari.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>
                    <Calendar className="w-4 h-4" /> Da
                  </label>
                  <input type="date" value={ledgerFilterFrom} onChange={e => setLedgerFilterFrom(e.target.value)} style={{ width: '100%', padding: '0.6rem', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>
                    <Calendar className="w-4 h-4" /> A
                  </label>
                  <input type="date" value={ledgerFilterTo} onChange={e => setLedgerFilterTo(e.target.value)} style={{ width: '100%', padding: '0.6rem', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>
                    <RefreshCw className="w-4 h-4" /> Stato
                  </label>
                  <select value={ledgerFilterStatus} onChange={e => setLedgerFilterStatus(e.target.value)} style={{ width: '100%', padding: '0.6rem', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem' }}>
                    <option value="all">Tutti</option>
                    <option value="NEW">Da riconciliare</option>
                    <option value="RECONCILED">Riconciliati</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>
                    <Search className="w-4 h-4" /> Cerca
                  </label>
                  <input type="text" placeholder="Descrizione, controparte..." value={ledgerFilterSearch} onChange={e => setLedgerFilterSearch(e.target.value)} style={{ width: '100%', padding: '0.6rem', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' }} />
                </div>
              </div>
            </div>

            {/* Riepilogo KPI */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ background: 'white', padding: '1.25rem', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.35rem' }}>Totale Uscite</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#dc2626' }}>{formatCurrency(ledgerTotals.totalDare)}</div>
              </div>
              <div style={{ background: 'white', padding: '1.25rem', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.35rem' }}>Totale Entrate</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#16a34a' }}>{formatCurrency(ledgerTotals.totalAvere)}</div>
              </div>
              <div style={{ background: 'white', padding: '1.25rem', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.35rem' }}>Saldo Periodo</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: ledgerTotals.saldo >= 0 ? '#16a34a' : '#dc2626' }}>{formatCurrency(ledgerTotals.saldo)}</div>
              </div>
              <div style={{ background: 'white', padding: '1.25rem', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.35rem' }}>Da Riconciliare</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f59e0b' }}>{ledgerTotals.countNew}</div>
              </div>
            </div>

            {/* Tabella Movimenti */}
            <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <input type="checkbox" checked={selectAll} onChange={e => { setSelectAll(e.target.checked); if (e.target.checked) setSelectedRows(new Set(ledgerTransactions.map(t => t.id))); else setSelectedRows(new Set()); }} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                  <span style={{ fontWeight: 600, color: '#1e293b' }}>Movimenti</span>
                  <span style={{ background: '#f1f5f9', color: '#64748b', padding: '0.25rem 0.6rem', borderRadius: '20px', fontSize: '0.8rem' }}>{ledgerTransactions.length}</span>
                </div>
              </div>

              {ledgerTransactions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                  {movimenti.length === 0 ? (
                    <>
                      <p style={{ marginBottom: '1rem' }}>Nessun movimento. Importa un CSV o crea un movimento manualmente.</p>
                      <button onClick={creaDatiDemo} style={{ padding: '0.75rem 1.5rem', background: '#667eea', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', marginRight: '0.5rem' }}>
                        Carica Dati Demo
                      </button>
                    </>
                  ) : (
                    <p>Nessun movimento trovato con i filtri attuali</p>
                  )}
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  {ledgerTransactions.map(t => {
                    const conto = contiBancari.find(c => c.id === t.conto);
                    const imp = Math.abs(parseFloat(t.importo) || 0);
                    const statusBadge = t.riconciliato 
                      ? <span style={{ background: '#dcfce7', color: '#166534', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 500 }}>OK</span>
                      : <span style={{ background: '#fef3c7', color: '#92400e', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 500 }}>Nuovo</span>;

                    return (
                      <div key={t.id} style={{ display: 'flex', alignItems: 'center', padding: '0.75rem 1rem', borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s', gap: '1rem', cursor: 'pointer' }}
                        onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
                        onMouseOut={e => e.currentTarget.style.background = 'white'}
                        onClick={(e) => { if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT' && e.target.tagName !== 'BUTTON') openReconcileModal(t); }}>
                        <div style={{ minWidth: '30px' }} onClick={e => e.stopPropagation()}>
                          <input type="checkbox" checked={selectedRows.has(t.id)} onChange={e => { const newSet = new Set(selectedRows); if (e.target.checked) newSet.add(t.id); else newSet.delete(t.id); setSelectedRows(newSet); }} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                        </div>
                        <div style={{ minWidth: '80px', color: '#64748b', fontSize: '0.85rem' }}>{t.data ? new Date(t.data).toLocaleDateString('it-IT') : '-'}</div>
                        <div style={{ minWidth: '120px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <div style={{ width: '20px', height: '20px', background: '#dbeafe', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Landmark className="w-3 h-3" style={{ color: '#3b82f6' }} />
                          </div>
                          <span style={{ fontSize: '0.85rem', color: '#475569' }}>{conto?.nome || '-'}</span>
                        </div>
                        <div style={{ flex: 1, color: '#1e293b', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={t.descrizione}>{t.descrizione || '-'}</div>
                        <div style={{ minWidth: '100px', color: '#64748b', fontSize: '0.85rem' }}>{t.controparte || '-'}</div>
                        <div style={{ minWidth: '100px', textAlign: 'right', color: t.tipo === 'uscita' ? '#dc2626' : '#cbd5e1', fontWeight: t.tipo === 'uscita' ? 600 : 400, fontSize: '0.9rem' }}>
                          {t.tipo === 'uscita' ? `€ ${imp.toLocaleString('it-IT', { minimumFractionDigits: 2 })}` : ''}
                        </div>
                        <div style={{ minWidth: '100px', textAlign: 'right', color: t.tipo === 'entrata' ? '#16a34a' : '#cbd5e1', fontWeight: t.tipo === 'entrata' ? 600 : 400, fontSize: '0.9rem' }}>
                          {t.tipo === 'entrata' ? `€ ${imp.toLocaleString('it-IT', { minimumFractionDigits: 2 })}` : ''}
                        </div>
                        <div style={{ minWidth: '130px' }} onClick={e => e.stopPropagation()}>
                          <select value={t.categoria || ''} onChange={e => handleAssignCategory(t.id, e.target.value)} style={{ padding: '0.3rem 0.5rem', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '0.8rem', background: 'white', maxWidth: '120px' }}>
                            <option value="">-</option>
                            <optgroup label="📈 Ricavi">
                              {categorieRicavi.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                            </optgroup>
                            <optgroup label="📉 Costi">
                              {categorieCosti.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                            </optgroup>
                          </select>
                        </div>
                        <div style={{ minWidth: '50px', textAlign: 'center' }}>{statusBadge}</div>
                        <div style={{ minWidth: '40px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                          <button type="button" onClick={() => handleDeleteMovimento(t.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.25rem' }} title="Elimina">
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

        {/* ==================== CONTO ECONOMICO ==================== */}
        {activeTab === 'conto-economico' && (
          <div>
            {/* Header con filtri */}
            <div style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)', borderRadius: '20px', padding: '1.5rem 2rem', color: 'white' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '48px', height: '48px', background: 'rgba(255,255,255,0.15)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <BarChart3 className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.5px' }}>Conto Economico</h2>
                    <p style={{ margin: '0.25rem 0 0 0', opacity: 0.8, fontSize: '0.9rem' }}>Analisi ricavi, costi e margini</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', background: 'rgba(255,255,255,0.1)', borderRadius: '10px', padding: '4px', gap: '2px' }}>
                    {['day', 'week', 'month', 'quarter', 'total'].map(type => (
                      <button key={type} type="button" onClick={() => setCeFilterType(type)} style={{ padding: '0.5rem 1rem', border: 'none', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s ease', background: ceFilterType === type ? 'white' : 'transparent', color: ceFilterType === type ? '#0f172a' : 'white' }}>
                        {type === 'day' ? 'Giorno' : type === 'week' ? 'Settimana' : type === 'month' ? 'Mese' : type === 'quarter' ? 'Trimestre' : 'Totale'}
                      </button>
                    ))}
                  </div>
                  <select value={ceFilterYear} onChange={e => setCeFilterYear(parseInt(e.target.value))} style={{ padding: '0.6rem 1rem', border: 'none', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 600, background: 'rgba(255,255,255,0.15)', color: 'white', cursor: 'pointer' }}>
                    {[2024, 2025, 2026].map(y => <option key={y} value={y} style={{ color: '#0f172a' }}>{y}</option>)}
                  </select>
                  <button 
                    type="button" 
                    onClick={exportContoEconomico} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.5rem', 
                      padding: '0.6rem 1.25rem', 
                      background: 'rgba(255,255,255,0.2)', 
                      color: 'white', 
                      border: '1px solid rgba(255,255,255,0.3)', 
                      borderRadius: '10px', 
                      fontWeight: 600, 
                      cursor: 'pointer',
                      fontSize: '0.9rem'
                    }}
                    title="Esporta Conto Economico per commercialista"
                  >
                    <Download className="w-4 h-4" /> Esporta Excel
                  </button>
                </div>
              </div>
            </div>

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ background: contoEconomicoData.totalRicavi - contoEconomicoData.totalCosti >= 0 ? 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)' : 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)', borderRadius: '20px', padding: '1.5rem', border: `2px solid ${contoEconomicoData.totalRicavi - contoEconomicoData.totalCosti >= 0 ? '#10b981' : '#ef4444'}20` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{ width: '40px', height: '40px', background: contoEconomicoData.totalRicavi - contoEconomicoData.totalCosti >= 0 ? '#10b981' : '#ef4444', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <DollarSign className="w-5 h-5" style={{ color: 'white' }} />
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Risultato</span>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: contoEconomicoData.totalRicavi - contoEconomicoData.totalCosti >= 0 ? '#10b981' : '#ef4444', letterSpacing: '-1px' }}>
                  {contoEconomicoData.totalRicavi - contoEconomicoData.totalCosti >= 0 ? '+' : ''}{formatCurrencyShort(contoEconomicoData.totalRicavi - contoEconomicoData.totalCosti)}
                </div>
              </div>
              <div style={{ background: 'white', borderRadius: '20px', padding: '1.5rem', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <TrendingUp className="w-5 h-5" style={{ color: 'white' }} />
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ricavi</span>
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10b981', letterSpacing: '-1px' }}>{formatCurrencyShort(contoEconomicoData.totalRicavi)}</div>
              </div>
              <div style={{ background: 'white', borderRadius: '20px', padding: '1.5rem', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <TrendingDown className="w-5 h-5" style={{ color: 'white' }} />
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Costi</span>
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ef4444', letterSpacing: '-1px' }}>{formatCurrencyShort(contoEconomicoData.totalCosti)}</div>
              </div>
              <div style={{ background: 'white', borderRadius: '20px', padding: '1.5rem', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Percent className="w-5 h-5" style={{ color: 'white' }} />
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Margine</span>
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#3b82f6', letterSpacing: '-1px' }}>{contoEconomicoData.totalRicavi > 0 ? ((contoEconomicoData.totalRicavi - contoEconomicoData.totalCosti) / contoEconomicoData.totalRicavi * 100).toFixed(1) : 0}%</div>
              </div>
            </div>

            {/* Tabella Dettaglio */}
            <div style={{ background: 'white', borderRadius: '20px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
              <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #f1f5f9' }}>
                <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: '#0f172a' }}>Dettaglio Conto Economico</h3>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                  Breakdown ricavi e costi per periodo 
                  {contoEconomicoData.totalRicavi === 0 && contoEconomicoData.totalCosti === 0 && (
                    <span style={{ color: '#f59e0b', marginLeft: '0.5rem' }}> — Riconcilia i movimenti per vedere i dati</span>
                  )}
                </p>
              </div>
              
              {/* Messaggio informativo se non ci sono dati */}
              {contoEconomicoData.totalRicavi === 0 && contoEconomicoData.totalCosti === 0 && (
                <div style={{ padding: '3rem 2rem', textAlign: 'center' }}>
                  <div style={{ width: '80px', height: '80px', background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                    <AlertCircle className="w-10 h-10" style={{ color: '#f59e0b' }} />
                  </div>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>Nessun movimento riconciliato</h4>
                  <p style={{ margin: '0 0 1.5rem 0', color: '#64748b', maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto' }}>
                    I movimenti appaiono nel Conto Economico solo dopo essere stati <strong>riconciliati</strong> con una categoria. 
                    Vai su <strong>Prima Nota</strong>, clicca su un movimento e assegna una categoria.
                  </p>
                  <button 
                    type="button" 
                    onClick={() => setActiveTab('prima-nota')} 
                    style={{ 
                      padding: '0.875rem 1.75rem', 
                      border: 'none', 
                      borderRadius: '12px', 
                      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', 
                      color: 'white', 
                      fontWeight: 700, 
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                    }}
                  >
                    <BookOpen className="w-5 h-5" /> Vai a Prima Nota
                  </button>
                </div>
              )}
              
              {(contoEconomicoData.totalRicavi > 0 || contoEconomicoData.totalCosti > 0) && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '1.25rem 1.5rem', textAlign: 'left', fontWeight: 700, color: '#0f172a', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', minWidth: '250px' }}>Voce</th>
                      {contoEconomicoData.sortedDates.map(d => (
                        <th key={d} style={{ padding: '1.25rem 1rem', textAlign: 'right', fontWeight: 700, color: '#0f172a', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px', minWidth: '100px', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)' }}>{formatDateLabel(d)}</th>
                      ))}
                      <th style={{ padding: '1.25rem 1.5rem', textAlign: 'right', fontWeight: 700, color: '#0f172a', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)', minWidth: '130px' }}>Totale</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* RICAVI */}
                    <tr>
                      <td colSpan={contoEconomicoData.sortedDates.length + 2} style={{ padding: '1.25rem 1.5rem 0.75rem', fontWeight: 700, color: '#0f172a', fontSize: '0.95rem', borderTop: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)' }}>
                            <TrendingUp className="w-4 h-4" style={{ color: 'white' }} />
                          </div>
                          <span>Ricavi</span>
                        </div>
                      </td>
                    </tr>
                    {Object.entries(contoEconomicoData.revenues).filter(([_, v]) => v.netto > 0).map(([cat, data]) => (
                      <tr key={cat}>
                        <td style={{ padding: '1rem 1.5rem', color: '#475569', paddingLeft: '4rem', background: 'white', fontSize: '0.9rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ width: '28px', height: '28px', background: '#dcfce7', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <TrendingUp className="w-4 h-4" style={{ color: '#16a34a' }} />
                            </div>
                            <span style={{ fontWeight: 500 }}>{data.nome || cat}</span>
                          </div>
                        </td>
                        {contoEconomicoData.sortedDates.map(d => (
                          <td key={d} style={{ padding: '1rem 1.5rem', textAlign: 'right', color: '#1e293b', fontWeight: 500, fontSize: '0.9rem' }}>{formatCurrencyShort(data.by_date[d] || 0)}</td>
                        ))}
                        <td style={{ padding: '1rem 1.5rem', textAlign: 'right', color: '#0f172a', fontWeight: 600, background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', fontSize: '0.9rem' }}>{formatCurrencyShort(data.netto)}</td>
                      </tr>
                    ))}
                    <tr style={{ background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)' }}>
                      <td style={{ padding: '1.25rem 1.5rem', fontWeight: 700, color: '#059669', fontSize: '0.95rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <CheckCircle className="w-5 h-5" /> Totale Ricavi
                        </div>
                      </td>
                      {contoEconomicoData.sortedDates.map(d => (
                        <td key={d} style={{ padding: '1.25rem 1.5rem', textAlign: 'right', fontWeight: 700, color: '#059669', fontSize: '0.95rem' }}>{formatCurrencyShort(contoEconomicoData.totalByDate[d] || 0)}</td>
                      ))}
                      <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right', fontWeight: 800, color: '#059669', background: 'linear-gradient(135deg, #bbf7d0 0%, #86efac 100%)', fontSize: '1rem' }}>{formatCurrencyShort(contoEconomicoData.totalRicavi)}</td>
                    </tr>

                    <tr><td colSpan={contoEconomicoData.sortedDates.length + 2} style={{ height: '0.5rem' }}></td></tr>

                    {/* COSTI */}
                    <tr>
                      <td colSpan={contoEconomicoData.sortedDates.length + 2} style={{ padding: '1.25rem 1.5rem 0.75rem', fontWeight: 700, color: '#0f172a', fontSize: '0.95rem', borderTop: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)' }}>
                            <TrendingDown className="w-4 h-4" style={{ color: 'white' }} />
                          </div>
                          <span>Costi</span>
                        </div>
                      </td>
                    </tr>
                    {Object.entries(contoEconomicoData.costs).filter(([_, v]) => v.total > 0).map(([cat, data]) => {
                      const pct = contoEconomicoData.totalCosti > 0 ? (data.total / contoEconomicoData.totalCosti * 100) : 0;
                      return (
                        <tr key={cat}>
                          <td style={{ padding: '1rem 1.5rem', color: '#475569', paddingLeft: '4rem', background: 'white', fontSize: '0.9rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#fef2f2', border: '2px solid #fecaca', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <TrendingDown className="w-3 h-3" style={{ color: '#ef4444' }} />
                              </div>
                              <span style={{ fontWeight: 500 }}>{data.nome || cat}</span>
                              <span style={{ fontSize: '0.75rem', color: '#94a3b8', background: '#f1f5f9', padding: '0.125rem 0.5rem', borderRadius: '4px' }}>({pct.toFixed(1)}%)</span>
                            </div>
                          </td>
                          {contoEconomicoData.sortedDates.map(d => (
                            <td key={d} style={{ padding: '1rem 1.5rem', textAlign: 'right', color: '#1e293b', fontWeight: 500, fontSize: '0.9rem' }}>{formatCurrencyShort(data.by_date[d] || 0)}</td>
                          ))}
                          <td style={{ padding: '1rem 1.5rem', textAlign: 'right', color: '#0f172a', fontWeight: 600, background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', fontSize: '0.9rem' }}>{formatCurrencyShort(data.total)}</td>
                        </tr>
                      );
                    })}
                    <tr style={{ background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)' }}>
                      <td style={{ padding: '1.25rem 1.5rem', fontWeight: 700, color: '#dc2626', fontSize: '0.95rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <X className="w-5 h-5" /> Totale Costi
                        </div>
                      </td>
                      {contoEconomicoData.sortedDates.map(d => (
                        <td key={d} style={{ padding: '1.25rem 1.5rem', textAlign: 'right', fontWeight: 700, color: '#dc2626', fontSize: '0.95rem' }}>{formatCurrencyShort(contoEconomicoData.totalCostsByDate[d] || 0)}</td>
                      ))}
                      <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right', fontWeight: 800, color: '#dc2626', background: 'linear-gradient(135deg, #fecaca 0%, #fca5a5 100%)', fontSize: '1rem' }}>{formatCurrencyShort(contoEconomicoData.totalCosti)}</td>
                    </tr>
                    
                    {/* RISULTATO NETTO */}
                    <tr><td colSpan={contoEconomicoData.sortedDates.length + 2} style={{ height: '0.75rem' }}></td></tr>
                    <tr style={{ background: contoEconomicoData.totalRicavi - contoEconomicoData.totalCosti >= 0 ? 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)' : 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)' }}>
                      <td style={{ padding: '1.5rem', fontWeight: 800, color: contoEconomicoData.totalRicavi - contoEconomicoData.totalCosti >= 0 ? '#059669' : '#dc2626', fontSize: '1.05rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ width: '36px', height: '36px', background: contoEconomicoData.totalRicavi - contoEconomicoData.totalCosti >= 0 ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                            <DollarSign className="w-5 h-5" style={{ color: 'white' }} />
                          </div>
                          UTILE / PERDITA
                        </div>
                      </td>
                      {contoEconomicoData.sortedDates.map(d => {
                        const r = contoEconomicoData.totalByDate[d] || 0;
                        const c = contoEconomicoData.totalCostsByDate[d] || 0;
                        const net = r - c;
                        return (
                          <td key={d} style={{ padding: '1.5rem', textAlign: 'right', fontWeight: 800, color: net >= 0 ? '#059669' : '#dc2626', fontSize: '1rem' }}>
                            {net >= 0 ? '+' : ''}{formatCurrencyShort(net)}
                          </td>
                        );
                      })}
                      <td style={{ padding: '1.5rem', textAlign: 'right', fontWeight: 900, color: contoEconomicoData.totalRicavi - contoEconomicoData.totalCosti >= 0 ? '#059669' : '#dc2626', background: contoEconomicoData.totalRicavi - contoEconomicoData.totalCosti >= 0 ? 'linear-gradient(135deg, #86efac 0%, #4ade80 100%)' : 'linear-gradient(135deg, #fca5a5 0%, #f87171 100%)', fontSize: '1.15rem' }}>
                        {contoEconomicoData.totalRicavi - contoEconomicoData.totalCosti >= 0 ? '+' : ''}{formatCurrencyShort(contoEconomicoData.totalRicavi - contoEconomicoData.totalCosti)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== MODALS ==================== */}

        {/* Modal Nuovo Movimento */}
        {showNuovoMovimento && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }} onClick={() => setShowNuovoMovimento(false)}>
            <div style={{ background: 'white', borderRadius: '12px', maxWidth: '500px', width: '90%' }} onClick={e => e.stopPropagation()}>
              <div style={{ padding: '1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Nuovo Movimento</h3>
                <button onClick={() => setShowNuovoMovimento(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem' }}><X className="w-5 h-5" style={{ color: '#64748b' }} /></button>
              </div>
              <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => setMovimentoForm(p => ({ ...p, tipo: 'entrata' }))} style={{ flex: 1, padding: '0.75rem', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', background: movimentoForm.tipo === 'entrata' ? '#22c55e' : '#f1f5f9', color: movimentoForm.tipo === 'entrata' ? 'white' : '#64748b' }}>Entrata</button>
                  <button onClick={() => setMovimentoForm(p => ({ ...p, tipo: 'uscita' }))} style={{ flex: 1, padding: '0.75rem', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', background: movimentoForm.tipo === 'uscita' ? '#ef4444' : '#f1f5f9', color: movimentoForm.tipo === 'uscita' ? 'white' : '#64748b' }}>Uscita</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div><label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.375rem' }}>Data</label><input type="date" value={movimentoForm.data} onChange={e => setMovimentoForm(p => ({ ...p, data: e.target.value }))} style={{ width: '100%', padding: '0.625rem', border: '1px solid #e2e8f0', borderRadius: '6px' }} /></div>
                  <div><label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.375rem' }}>Importo</label><input type="number" value={movimentoForm.importo} onChange={e => setMovimentoForm(p => ({ ...p, importo: e.target.value }))} placeholder="0.00" style={{ width: '100%', padding: '0.625rem', border: '1px solid #e2e8f0', borderRadius: '6px' }} /></div>
                </div>
                <div><label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.375rem' }}>Descrizione</label><input type="text" value={movimentoForm.descrizione} onChange={e => setMovimentoForm(p => ({ ...p, descrizione: e.target.value }))} style={{ width: '100%', padding: '0.625rem', border: '1px solid #e2e8f0', borderRadius: '6px' }} /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div><label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.375rem' }}>Conto</label><select value={movimentoForm.conto} onChange={e => setMovimentoForm(p => ({ ...p, conto: e.target.value }))} style={{ width: '100%', padding: '0.625rem', border: '1px solid #e2e8f0', borderRadius: '6px' }}><option value="">Seleziona</option>{contiBancari.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.375rem' }}>Categoria</label>
                    <select value={movimentoForm.categoria} onChange={e => setMovimentoForm(p => ({ ...p, categoria: e.target.value, riconciliato: !!e.target.value }))} style={{ width: '100%', padding: '0.625rem', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                      <option value="">Seleziona</option>
                      {movimentoForm.tipo === 'entrata' ? (
                        <optgroup label="📈 Ricavi">{categorieRicavi.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</optgroup>
                      ) : (
                        <optgroup label="📉 Costi">{categorieCosti.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</optgroup>
                      )}
                    </select>
                  </div>
                </div>
              </div>
              <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button onClick={() => setShowNuovoMovimento(false)} style={{ padding: '0.625rem 1rem', border: '1px solid #e2e8f0', borderRadius: '6px', fontWeight: 500, cursor: 'pointer' }}>Annulla</button>
                <button onClick={handleSaveMovimento} style={{ padding: '0.625rem 1rem', border: 'none', borderRadius: '6px', background: '#3b82f6', color: 'white', fontWeight: 600, cursor: 'pointer' }}>Salva</button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Nuovo Conto */}
        {showNuovoConto && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }} onClick={() => setShowNuovoConto(false)}>
            <div style={{ background: 'white', borderRadius: '12px', maxWidth: '400px', width: '90%' }} onClick={e => e.stopPropagation()}>
              <div style={{ padding: '1.25rem', borderBottom: '1px solid #e2e8f0' }}><h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Nuovo Conto Bancario</h3></div>
              <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div><label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.375rem' }}>Nome</label><input type="text" value={contoForm.nome} onChange={e => setContoForm(p => ({ ...p, nome: e.target.value }))} placeholder="Es: Banco BPM" style={{ width: '100%', padding: '0.625rem', border: '1px solid #e2e8f0', borderRadius: '6px' }} /></div>
                <div><label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.375rem' }}>IBAN</label><input type="text" value={contoForm.iban} onChange={e => setContoForm(p => ({ ...p, iban: e.target.value }))} placeholder="IT..." style={{ width: '100%', padding: '0.625rem', border: '1px solid #e2e8f0', borderRadius: '6px' }} /></div>
                <div><label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.375rem' }}>Saldo Iniziale</label><input type="number" value={contoForm.saldoIniziale} onChange={e => setContoForm(p => ({ ...p, saldoIniziale: e.target.value }))} placeholder="0.00" style={{ width: '100%', padding: '0.625rem', border: '1px solid #e2e8f0', borderRadius: '6px' }} /></div>
              </div>
              <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button onClick={() => setShowNuovoConto(false)} style={{ padding: '0.625rem 1rem', border: '1px solid #e2e8f0', borderRadius: '6px', fontWeight: 500, cursor: 'pointer' }}>Annulla</button>
                <button onClick={handleSaveConto} style={{ padding: '0.625rem 1rem', border: 'none', borderRadius: '6px', background: '#3b82f6', color: 'white', fontWeight: 600, cursor: 'pointer' }}>Salva</button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Import CSV */}
        {showImportModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }} onClick={() => { setShowImportModal(false); setImportStep(1); }}>
            <div style={{ background: 'white', borderRadius: '12px', maxWidth: '550px', width: '90%' }} onClick={e => e.stopPropagation()}>
              <div style={{ padding: '1.25rem', borderBottom: '1px solid #e2e8f0' }}><h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Carica CSV Banca</h3></div>
              <div style={{ padding: '1.5rem' }}>
                {importStep === 1 ? (
                  <div style={{ textAlign: 'center' }}>
                    <Landmark className="w-12 h-12 mx-auto" style={{ color: '#94a3b8', marginBottom: '1rem' }} />
                    <p style={{ marginBottom: '0.75rem', color: '#64748b', fontSize: '0.875rem' }}>Seleziona conto di destinazione</p>
                    <select value={importContoId} onChange={e => setImportContoId(e.target.value)} style={{ padding: '0.625rem 1rem', border: '1px solid #e2e8f0', borderRadius: '6px', marginBottom: '1rem', minWidth: '180px' }}>
                      <option value="">Nessun conto</option>
                      {contiBancari.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                    <div>
                      <input type="file" accept=".csv,.txt" onChange={handleFileUpload} style={{ display: 'none' }} id="csv-upload" />
                      <label htmlFor="csv-upload" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem', background: '#3b82f6', color: 'white', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                        <Upload className="w-4 h-4" /> Seleziona File
                      </label>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p style={{ marginBottom: '0.75rem', fontWeight: 500, fontSize: '0.875rem' }}>Mappa colonne ({importedData.length} righe)</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
                      {['data', 'descrizione', 'importo'].map(f => (
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

        {/* ==================== MODAL RICONCILIAZIONE (identico a Hub) ==================== */}
        {showReconciliationModal && (() => {
          const transactionAmount = Math.abs(parseFloat(showReconciliationModal.importo) || 0);
          const isIncome = showReconciliationModal.tipo === 'entrata';
          
          return (
            <div 
              className="modal-overlay"
              style={{ 
                position: 'fixed', 
                top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0,0,0,0.5)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                zIndex: 10001 
              }} 
              onClick={() => setShowReconciliationModal(null)}
            >
              <div 
                className="modal-content"
                style={{ 
                  background: 'white', 
                  borderRadius: '12px', 
                  maxWidth: '800px', 
                  width: '95%',
                  maxHeight: '90vh',
                  overflowY: 'auto',
                  boxShadow: '0 25px 50px rgba(0,0,0,0.25)'
                }} 
                onClick={e => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  padding: '1.5rem', 
                  borderBottom: '1px solid #e2e8f0',
                  position: 'sticky',
                  top: 0,
                  background: 'white',
                  zIndex: 10
                }}>
                  <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.25rem', fontWeight: 700 }}>Riconciliazione Movimento</h3>
                  <button 
                    type="button"
                    onClick={() => setShowReconciliationModal(null)} 
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      fontSize: '1.5rem', 
                      cursor: 'pointer', 
                      color: '#64748b', 
                      padding: 0, 
                      width: '30px', 
                      height: '30px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      borderRadius: '4px' 
                    }}
                  >
                    ×
                  </button>
                </div>

                {/* Modal Body */}
                <div style={{ padding: '1.5rem' }}>
                  {/* Dati movimento */}
                  <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>Data</label>
                        <div style={{ color: '#1e293b' }}>{showReconciliationModal.data ? new Date(showReconciliationModal.data).toLocaleDateString('it-IT') : '-'}</div>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>Importo</label>
                        <div style={{ color: isIncome ? '#16a34a' : '#dc2626', fontWeight: 600, fontSize: '1.1rem' }}>
                          € {transactionAmount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>Descrizione Attuale</label>
                      <div style={{ background: 'white', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '6px', color: '#64748b', fontSize: '0.9rem', minHeight: '40px' }}>
                        {showReconciliationModal.descrizione || '-'}
                      </div>
                    </div>
                    
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>Nuova Descrizione *</label>
                      <textarea
                        value={reconcileForm.descrizione}
                        onChange={e => setReconcileForm(p => ({ ...p, descrizione: e.target.value }))}
                        placeholder="La descrizione verrà aggiornata solo dopo il salvataggio"
                        style={{ 
                          width: '100%', 
                          padding: '0.6rem', 
                          border: '1.5px solid #e2e8f0', 
                          borderRadius: '8px', 
                          fontSize: '0.9rem', 
                          boxSizing: 'border-box', 
                          minHeight: '80px', 
                          fontFamily: 'inherit',
                          resize: 'vertical'
                        }}
                      />
                    </div>
                  </div>

                  {/* Selezione categoria gerarchica */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', fontSize: '0.95rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.75rem' }}>Categoria</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#64748b', marginBottom: '0.4rem' }}>Categoria Principale</label>
                        <select
                          value={reconcileForm.categoriaMain}
                          onChange={e => setReconcileForm(p => ({ ...p, categoriaMain: e.target.value, categoriaSub: '' }))}
                          style={{ 
                            width: '100%', 
                            padding: '0.6rem', 
                            border: '1.5px solid #e2e8f0', 
                            borderRadius: '8px', 
                            fontSize: '0.9rem', 
                            boxSizing: 'border-box' 
                          }}
                        >
                          <option value="">-- Nessuna --</option>
                          {getMainCategories().map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#64748b', marginBottom: '0.4rem' }}>Sotto-Categoria</label>
                        <select
                          value={reconcileForm.categoriaSub}
                          onChange={e => setReconcileForm(p => ({ ...p, categoriaSub: e.target.value }))}
                          style={{ 
                            width: '100%', 
                            padding: '0.6rem', 
                            border: '1.5px solid #e2e8f0', 
                            borderRadius: '8px', 
                            fontSize: '0.9rem', 
                            boxSizing: 'border-box' 
                          }}
                        >
                          <option value="">-- Nessuna --</option>
                          {getCategorieByMain(reconcileForm.categoriaMain).map(c => (
                            <option key={c.id} value={c.id}>{c.nome}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    {/* Bottone aggiungi categoria */}
                    <div style={{ marginTop: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setNuovaCategoriaForm(p => ({ 
                            ...p, 
                            tipo: isIncome ? 'ricavo' : 'costo',
                            gruppo: reconcileForm.categoriaMain || ''
                          }));
                          setShowNuovaCategoria(true);
                        }}
                        style={{ 
                          fontSize: '0.85rem', 
                          padding: '0.4rem 0.8rem', 
                          background: '#f1f5f9', 
                          border: '1px solid #e2e8f0', 
                          borderRadius: '6px', 
                          cursor: 'pointer',
                          color: '#475569',
                          fontWeight: 500,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem'
                        }}
                      >
                        <Plus className="w-4 h-4" /> Aggiungi Categoria
                      </button>
                    </div>

                    {/* Info categoria selezionata */}
                    {reconcileForm.categoriaSub && (
                      <div style={{ 
                        marginTop: '0.75rem', 
                        padding: '0.6rem 0.85rem', 
                        background: isIncome ? '#ecfdf5' : '#fef2f2', 
                        borderRadius: '6px', 
                        fontSize: '0.8rem', 
                        color: isIncome ? '#166534' : '#991b1b',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <CheckCircle className="w-4 h-4" />
                        {isIncome 
                          ? 'Questo ricavo apparirà nel Conto Economico' 
                          : 'Questo costo apparirà nel Conto Economico'
                        }
                      </div>
                    )}
                  </div>

                  {/* Controparte */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', fontSize: '0.95rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.75rem' }}>Controparte (opzionale)</label>
                    <input
                      type="text"
                      value={reconcileForm.controparte}
                      onChange={e => setReconcileForm(p => ({ ...p, controparte: e.target.value }))}
                      placeholder="Es: Fornitore XYZ, Cliente ABC..."
                      style={{ 
                        width: '100%', 
                        padding: '0.6rem', 
                        border: '1.5px solid #e2e8f0', 
                        borderRadius: '8px', 
                        fontSize: '0.9rem', 
                        boxSizing: 'border-box' 
                      }}
                    />
                  </div>

                  {/* Footer con bottoni */}
                  <div style={{ 
                    display: 'flex', 
                    gap: '0.75rem', 
                    justifyContent: 'flex-end', 
                    paddingTop: '1rem', 
                    borderTop: '1px solid #e2e8f0' 
                  }}>
                    <button
                      type="button"
                      onClick={() => setShowReconciliationModal(null)}
                      style={{ 
                        padding: '0.65rem 1.25rem', 
                        background: '#64748b', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '8px', 
                        cursor: 'pointer', 
                        fontWeight: 500 
                      }}
                    >
                      Annulla
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveReconciliation}
                      disabled={!reconcileForm.categoriaSub}
                      style={{ 
                        padding: '0.65rem 1.25rem', 
                        background: reconcileForm.categoriaSub ? '#3b82f6' : '#cbd5e1', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '8px', 
                        cursor: reconcileForm.categoriaSub ? 'pointer' : 'not-allowed', 
                        fontWeight: 600 
                      }}
                    >
                      Riconcilia
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ==================== MODAL NUOVA CATEGORIA ==================== */}
        {showNuovaCategoria && (
          <div 
            style={{ 
              position: 'fixed', 
              top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.6)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              zIndex: 10002 
            }} 
            onClick={() => setShowNuovaCategoria(false)}
          >
            <div 
              style={{ 
                background: 'white', 
                borderRadius: '12px', 
                maxWidth: '450px', 
                width: '95%',
                boxShadow: '0 25px 50px rgba(0,0,0,0.25)'
              }} 
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                padding: '1.25rem 1.5rem', 
                borderBottom: '1px solid #e2e8f0'
              }}>
                <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.1rem', fontWeight: 700 }}>
                  Nuova Categoria
                </h3>
                <button 
                  type="button"
                  onClick={() => setShowNuovaCategoria(false)} 
                  style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}
                >×</button>
              </div>

              {/* Body */}
              <div style={{ padding: '1.5rem' }}>
                {/* Tipo */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>Tipo *</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => setNuovaCategoriaForm(p => ({ ...p, tipo: 'ricavo', gruppo: '' }))}
                      style={{ 
                        flex: 1, 
                        padding: '0.75rem', 
                        border: 'none', 
                        borderRadius: '8px', 
                        fontWeight: 600, 
                        cursor: 'pointer', 
                        background: nuovaCategoriaForm.tipo === 'ricavo' ? '#10b981' : '#f1f5f9', 
                        color: nuovaCategoriaForm.tipo === 'ricavo' ? 'white' : '#64748b' 
                      }}
                    >
                      📈 Ricavo
                    </button>
                    <button
                      type="button"
                      onClick={() => setNuovaCategoriaForm(p => ({ ...p, tipo: 'costo', gruppo: '' }))}
                      style={{ 
                        flex: 1, 
                        padding: '0.75rem', 
                        border: 'none', 
                        borderRadius: '8px', 
                        fontWeight: 600, 
                        cursor: 'pointer', 
                        background: nuovaCategoriaForm.tipo === 'costo' ? '#ef4444' : '#f1f5f9', 
                        color: nuovaCategoriaForm.tipo === 'costo' ? 'white' : '#64748b' 
                      }}
                    >
                      📉 Costo
                    </button>
                  </div>
                </div>

                {/* Gruppo esistente o nuovo */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>Gruppo (Categoria Principale) *</label>
                  <select
                    value={nuovaCategoriaForm.gruppo}
                    onChange={e => setNuovaCategoriaForm(p => ({ ...p, gruppo: e.target.value, nuovoGruppo: '' }))}
                    style={{ 
                      width: '100%', 
                      padding: '0.6rem', 
                      border: '1.5px solid #e2e8f0', 
                      borderRadius: '8px', 
                      fontSize: '0.9rem', 
                      marginBottom: '0.5rem'
                    }}
                  >
                    <option value="">Seleziona gruppo esistente...</option>
                    {nuovaCategoriaForm.tipo === 'ricavo' 
                      ? [...new Set(categorieRicavi.map(c => c.gruppo))].map(g => (
                          <option key={g} value={g}>{g}</option>
                        ))
                      : [...new Set(categorieCosti.map(c => c.gruppo))].map(g => (
                          <option key={g} value={g}>{g}</option>
                        ))
                    }
                  </select>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>oppure</span>
                    <input
                      type="text"
                      value={nuovaCategoriaForm.nuovoGruppo}
                      onChange={e => setNuovaCategoriaForm(p => ({ ...p, nuovoGruppo: e.target.value, gruppo: '' }))}
                      placeholder="Crea nuovo gruppo..."
                      style={{ 
                        flex: 1, 
                        padding: '0.5rem', 
                        border: '1.5px solid #e2e8f0', 
                        borderRadius: '6px', 
                        fontSize: '0.85rem'
                      }}
                    />
                  </div>
                </div>

                {/* Nome categoria */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>Nome Categoria (Sotto-Categoria) *</label>
                  <input
                    type="text"
                    value={nuovaCategoriaForm.nome}
                    onChange={e => setNuovaCategoriaForm(p => ({ ...p, nome: e.target.value }))}
                    placeholder="Es: Pubblicità, Manutenzione..."
                    style={{ 
                      width: '100%', 
                      padding: '0.6rem', 
                      border: '1.5px solid #e2e8f0', 
                      borderRadius: '8px', 
                      fontSize: '0.9rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Preview */}
                {(nuovaCategoriaForm.gruppo || nuovaCategoriaForm.nuovoGruppo) && nuovaCategoriaForm.nome && (
                  <div style={{ 
                    padding: '0.75rem', 
                    background: nuovaCategoriaForm.tipo === 'ricavo' ? '#ecfdf5' : '#fef2f2', 
                    borderRadius: '8px', 
                    marginBottom: '1rem',
                    fontSize: '0.85rem'
                  }}>
                    <strong>Anteprima:</strong> {nuovaCategoriaForm.nuovoGruppo || nuovaCategoriaForm.gruppo} → {nuovaCategoriaForm.nome}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div style={{ 
                padding: '1rem 1.5rem', 
                borderTop: '1px solid #e2e8f0', 
                display: 'flex', 
                justifyContent: 'flex-end', 
                gap: '0.75rem' 
              }}>
                <button
                  type="button"
                  onClick={() => setShowNuovaCategoria(false)}
                  style={{ 
                    padding: '0.65rem 1.25rem', 
                    background: '#64748b', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '8px', 
                    cursor: 'pointer', 
                    fontWeight: 500 
                  }}
                >
                  Annulla
                </button>
                <button
                  type="button"
                  onClick={handleSaveNuovaCategoria}
                  disabled={!nuovaCategoriaForm.nome || (!nuovaCategoriaForm.gruppo && !nuovaCategoriaForm.nuovoGruppo)}
                  style={{ 
                    padding: '0.65rem 1.25rem', 
                    background: (nuovaCategoriaForm.nome && (nuovaCategoriaForm.gruppo || nuovaCategoriaForm.nuovoGruppo)) ? '#3b82f6' : '#cbd5e1', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '8px', 
                    cursor: (nuovaCategoriaForm.nome && (nuovaCategoriaForm.gruppo || nuovaCategoriaForm.nuovoGruppo)) ? 'pointer' : 'not-allowed', 
                    fontWeight: 600 
                  }}
                >
                  Crea Categoria
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default ContoEconomicoNuovoPage;
