import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Trash2, Edit, Save, X, Download, Upload, Filter, 
  Calendar, DollarSign, TrendingUp, TrendingDown, FileText,
  ChevronDown, ChevronUp, Search, RefreshCw, ArrowUpRight,
  ArrowDownRight, Wallet, CreditCard, Receipt, PiggyBank,
  BarChart3, PieChart, AlertCircle, CheckCircle, Clock,
  Building, Users, Megaphone, Package, Truck, Calculator
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

// Piano dei Conti strutturato
const PIANO_DEI_CONTI = {
  // ATTIVO - RICAVI
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
  // PASSIVO - COSTI DIRETTI
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
  // COSTI MARKETING
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
  // COSTI OPERATIVI
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
  // COSTI PERSONALE
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
  // COSTI PROFESSIONALI
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
  // IMPOSTE E TASSE
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

// Funzione per ottenere il colore Tailwind
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
  // Stati principali
  const [movimenti, setMovimenti] = useState([]);
  const [activeTab, setActiveTab] = useState('prima-nota');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // Filtri
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('');
  const [filterPeriodo, setFilterPeriodo] = useState('this_month');
  const [customDateStart, setCustomDateStart] = useState('');
  const [customDateEnd, setCustomDateEnd] = useState('');
  
  // Sezioni espanse
  const [expandedCategorie, setExpandedCategorie] = useState({});
  
  // Form
  const [formData, setFormData] = useState({
    data: new Date().toISOString().slice(0, 10),
    categoria: '',
    conto: '',
    descrizione: '',
    importo: '',
    tipo: 'dare',
    documento: '',
    fornitore: '',
    note: '',
    ricorrente: false,
    pagato: true
  });

  // Carica dati
  useEffect(() => {
    const saved = localStorage.getItem('conto_economico_movimenti');
    if (saved) {
      try {
        setMovimenti(JSON.parse(saved));
      } catch (e) {
        console.error('Errore caricamento movimenti:', e);
      }
    }
  }, []);

  // Salva dati
  const saveMovimenti = (newMovimenti) => {
    localStorage.setItem('conto_economico_movimenti', JSON.stringify(newMovimenti));
    setMovimenti(newMovimenti);
  };

  // Calcola range date
  const getDateRange = () => {
    const now = new Date();
    let start, end = new Date(now);
    end.setHours(23, 59, 59, 999);
    
    switch (filterPeriodo) {
      case 'today':
        start = new Date(now);
        start.setHours(0, 0, 0, 0);
        break;
      case 'this_week':
        start = new Date(now);
        const day = start.getDay();
        const diff = start.getDate() - day + (day === 0 ? -6 : 1);
        start.setDate(diff);
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
      case 'last_year':
        start = new Date(now.getFullYear() - 1, 0, 1);
        end = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
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

  // Filtra movimenti
  const filteredMovimenti = useMemo(() => {
    const { start, end } = getDateRange();
    
    return movimenti
      .filter(m => {
        const date = new Date(m.data);
        if (date < start || date > end) return false;
        if (filterCategoria && m.categoria !== filterCategoria) return false;
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          return (
            m.descrizione?.toLowerCase().includes(term) ||
            m.documento?.toLowerCase().includes(term) ||
            m.fornitore?.toLowerCase().includes(term) ||
            m.conto?.toLowerCase().includes(term)
          );
        }
        return true;
      })
      .sort((a, b) => new Date(b.data) - new Date(a.data));
  }, [movimenti, filterPeriodo, filterCategoria, searchTerm, customDateStart, customDateEnd]);

  // Calcoli aggregati
  const totali = useMemo(() => {
    const totDare = filteredMovimenti
      .filter(m => m.tipo === 'dare')
      .reduce((sum, m) => sum + parseFloat(m.importo || 0), 0);
    
    const totAvere = filteredMovimenti
      .filter(m => m.tipo === 'avere')
      .reduce((sum, m) => sum + parseFloat(m.importo || 0), 0);
    
    return {
      dare: totDare,
      avere: totAvere,
      utile: totAvere - totDare,
      margine: totAvere > 0 ? ((totAvere - totDare) / totAvere * 100) : 0
    };
  }, [filteredMovimenti]);

  // Raggruppa per categoria
  const perCategoria = useMemo(() => {
    const grouped = {};
    
    Object.keys(PIANO_DEI_CONTI).forEach(catId => {
      grouped[catId] = {
        ...PIANO_DEI_CONTI[catId],
        totale: 0,
        movimenti: [],
        perConto: {}
      };
    });
    
    filteredMovimenti.forEach(m => {
      if (grouped[m.categoria]) {
        const importo = parseFloat(m.importo || 0);
        grouped[m.categoria].totale += importo;
        grouped[m.categoria].movimenti.push(m);
        
        if (!grouped[m.categoria].perConto[m.conto]) {
          grouped[m.categoria].perConto[m.conto] = 0;
        }
        grouped[m.categoria].perConto[m.conto] += importo;
      }
    });
    
    return grouped;
  }, [filteredMovimenti]);

  // Handlers form
  const handleInputChange = (field, value) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      if (field === 'categoria' && value) {
        newData.conto = '';
        newData.tipo = PIANO_DEI_CONTI[value]?.tipo || 'dare';
      }
      
      return newData;
    });
  };

  const handleSubmit = () => {
    if (!formData.data || !formData.descrizione || !formData.importo || !formData.categoria || !formData.conto) {
      alert('Compila tutti i campi obbligatori');
      return;
    }

    const movimento = {
      id: editingId || `mov_${Date.now()}`,
      ...formData,
      importo: parseFloat(formData.importo),
      createdAt: editingId ? movimenti.find(m => m.id === editingId)?.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    let newMovimenti;
    if (editingId) {
      newMovimenti = movimenti.map(m => m.id === editingId ? movimento : m);
    } else {
      newMovimenti = [...movimenti, movimento];
    }

    saveMovimenti(newMovimenti);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      data: new Date().toISOString().slice(0, 10),
      categoria: '',
      conto: '',
      descrizione: '',
      importo: '',
      tipo: 'dare',
      documento: '',
      fornitore: '',
      note: '',
      ricorrente: false,
      pagato: true
    });
    setShowForm(false);
    setEditingId(null);
  };

  const handleEdit = (movimento) => {
    setFormData({
      ...movimento,
      importo: movimento.importo.toString()
    });
    setEditingId(movimento.id);
    setShowForm(true);
    setActiveTab('prima-nota');
  };

  const handleDelete = (id) => {
    if (window.confirm('Eliminare questo movimento?')) {
      saveMovimenti(movimenti.filter(m => m.id !== id));
    }
  };

  // Export
  const exportCSV = () => {
    const headers = ['Data', 'Categoria', 'Conto', 'Descrizione', 'Fornitore', 'Documento', 'Dare', 'Avere', 'Note'];
    const rows = filteredMovimenti.map(m => [
      m.data,
      PIANO_DEI_CONTI[m.categoria]?.nome || m.categoria,
      m.conto,
      m.descrizione,
      m.fornitore || '',
      m.documento || '',
      m.tipo === 'dare' ? m.importo : '',
      m.tipo === 'avere' ? m.importo : '',
      m.note || ''
    ]);
    
    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `conto_economico_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  // Formattazione
  const formatCurrency = (val) => parseFloat(val || 0).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
  const formatDate = (d) => new Date(d).toLocaleDateString('it-IT');

  // Toggle categoria espansa
  const toggleCategoria = (catId) => {
    setExpandedCategorie(prev => ({ ...prev, [catId]: !prev[catId] }));
  };

  // Nome periodo
  const getPeriodoLabel = () => {
    const labels = {
      today: 'Oggi',
      this_week: 'Questa Settimana',
      this_month: 'Questo Mese',
      last_month: 'Mese Scorso',
      this_quarter: 'Questo Trimestre',
      this_year: 'Anno Corrente',
      last_year: 'Anno Scorso',
      custom: 'Personalizzato'
    };
    return labels[filterPeriodo] || 'Questo Mese';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Conto Economico</h1>
          <p className="text-gray-500 mt-1">Prima Nota e analisi economica • {getPeriodoLabel()}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            Esporta
          </button>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nuovo Movimento
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-700">Ricavi Totali</p>
                <p className="text-3xl font-bold text-emerald-800 mt-1">{formatCurrency(totali.avere)}</p>
                <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
                  <ArrowUpRight className="w-3 h-3" />
                  Entrate nel periodo
                </p>
              </div>
              <div className="p-3 bg-emerald-200 rounded-xl">
                <TrendingUp className="w-6 h-6 text-emerald-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-red-700">Costi Totali</p>
                <p className="text-3xl font-bold text-red-800 mt-1">{formatCurrency(totali.dare)}</p>
                <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                  <ArrowDownRight className="w-3 h-3" />
                  Uscite nel periodo
                </p>
              </div>
              <div className="p-3 bg-red-200 rounded-xl">
                <TrendingDown className="w-6 h-6 text-red-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`bg-gradient-to-br ${totali.utile >= 0 ? 'from-blue-50 to-blue-100 border-blue-200' : 'from-orange-50 to-orange-100 border-orange-200'}`}>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className={`text-sm font-medium ${totali.utile >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                  {totali.utile >= 0 ? 'Utile' : 'Perdita'}
                </p>
                <p className={`text-3xl font-bold mt-1 ${totali.utile >= 0 ? 'text-blue-800' : 'text-orange-800'}`}>
                  {formatCurrency(Math.abs(totali.utile))}
                </p>
                <p className={`text-xs mt-2 flex items-center gap-1 ${totali.utile >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                  {totali.utile >= 0 ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                  Risultato operativo
                </p>
              </div>
              <div className={`p-3 rounded-xl ${totali.utile >= 0 ? 'bg-blue-200' : 'bg-orange-200'}`}>
                <Wallet className={`w-6 h-6 ${totali.utile >= 0 ? 'text-blue-700' : 'text-orange-700'}`} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700">Margine %</p>
                <p className="text-3xl font-bold text-purple-800 mt-1">{totali.margine.toFixed(1)}%</p>
                <p className="text-xs text-purple-600 mt-2 flex items-center gap-1">
                  <PieChart className="w-3 h-3" />
                  {filteredMovimenti.length} movimenti
                </p>
              </div>
              <div className="p-3 bg-purple-200 rounded-xl">
                <BarChart3 className="w-6 h-6 text-purple-700" />
              </div>
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
              <select
                value={filterPeriodo}
                onChange={e => setFilterPeriodo(e.target.value)}
                className="px-3 py-2 border rounded-lg bg-white"
              >
                <option value="today">Oggi</option>
                <option value="this_week">Questa Settimana</option>
                <option value="this_month">Questo Mese</option>
                <option value="last_month">Mese Scorso</option>
                <option value="this_quarter">Questo Trimestre</option>
                <option value="this_year">Anno Corrente</option>
                <option value="last_year">Anno Scorso</option>
                <option value="custom">Personalizzato</option>
              </select>
            </div>

            {filterPeriodo === 'custom' && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customDateStart}
                  onChange={e => setCustomDateStart(e.target.value)}
                  className="px-3 py-2 border rounded-lg"
                />
                <span className="text-gray-400">→</span>
                <input
                  type="date"
                  value={customDateEnd}
                  onChange={e => setCustomDateEnd(e.target.value)}
                  className="px-3 py-2 border rounded-lg"
                />
              </div>
            )}

            <select
              value={filterCategoria}
              onChange={e => setFilterCategoria(e.target.value)}
              className="px-3 py-2 border rounded-lg bg-white"
            >
              <option value="">Tutte le categorie</option>
              {Object.entries(PIANO_DEI_CONTI).map(([id, cat]) => (
                <option key={id} value={id}>{cat.nome}</option>
              ))}
            </select>

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
      <div className="flex gap-2 border-b">
        {[
          { id: 'prima-nota', label: 'Prima Nota', icon: FileText },
          { id: 'riepilogo', label: 'Riepilogo', icon: PieChart },
          { id: 'bilancio', label: 'Bilancio', icon: BarChart3 }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
              activeTab === tab.id 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Form nuovo movimento */}
      {showForm && (
        <Card className="border-2 border-blue-300 shadow-lg">
          <CardHeader className="bg-blue-50 border-b">
            <div className="flex items-center justify-between">
              <CardTitle>{editingId ? 'Modifica Movimento' : 'Nuovo Movimento'}</CardTitle>
              <button onClick={resetForm} className="p-2 hover:bg-blue-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data *</label>
                <input
                  type="date"
                  value={formData.data}
                  onChange={e => handleInputChange('data', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoria *</label>
                <select
                  value={formData.categoria}
                  onChange={e => handleInputChange('categoria', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">Seleziona...</option>
                  {Object.entries(PIANO_DEI_CONTI).map(([id, cat]) => (
                    <option key={id} value={id}>{cat.nome}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Conto *</label>
                <select
                  value={formData.conto}
                  onChange={e => handleInputChange('conto', e.target.value)}
                  disabled={!formData.categoria}
                  className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-100"
                >
                  <option value="">Seleziona...</option>
                  {formData.categoria && PIANO_DEI_CONTI[formData.categoria]?.conti.map(c => (
                    <option key={c.codice} value={c.codice}>{c.codice} - {c.nome}</option>
                  ))}
                </select>
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione *</label>
                <input
                  type="text"
                  value={formData.descrizione}
                  onChange={e => handleInputChange('descrizione', e.target.value)}
                  placeholder="Descrizione del movimento"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Importo (€) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.importo}
                  onChange={e => handleInputChange('importo', e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fornitore/Cliente</label>
                <input
                  type="text"
                  value={formData.fornitore}
                  onChange={e => handleInputChange('fornitore', e.target.value)}
                  placeholder="Nome fornitore o cliente"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">N. Documento</label>
                <input
                  type="text"
                  value={formData.documento}
                  onChange={e => handleInputChange('documento', e.target.value)}
                  placeholder="Es: FT-2024/001"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <div className="flex gap-4 mt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={formData.tipo === 'dare'}
                      onChange={() => handleInputChange('tipo', 'dare')}
                      className="text-red-600"
                    />
                    <span className="text-red-600 font-medium">Costo (Dare)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={formData.tipo === 'avere'}
                      onChange={() => handleInputChange('tipo', 'avere')}
                      className="text-green-600"
                    />
                    <span className="text-green-600 font-medium">Ricavo (Avere)</span>
                  </label>
                </div>
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                <input
                  type="text"
                  value={formData.note}
                  onChange={e => handleInputChange('note', e.target.value)}
                  placeholder="Note aggiuntive..."
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              
              <div className="flex items-center gap-6 mt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.pagato}
                    onChange={e => handleInputChange('pagato', e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">Pagato</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.ricorrente}
                    onChange={e => handleInputChange('ricorrente', e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">Ricorrente</span>
                </label>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
              <button
                onClick={resetForm}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Annulla
              </button>
              <button
                onClick={handleSubmit}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Save className="w-4 h-4" />
                {editingId ? 'Salva Modifiche' : 'Registra'}
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab Content */}
      {activeTab === 'prima-nota' && (
        <Card>
          <CardHeader>
            <CardTitle>Prima Nota</CardTitle>
            <CardDescription>Registro cronologico dei movimenti contabili</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-3 font-semibold text-gray-700">Data</th>
                    <th className="text-left p-3 font-semibold text-gray-700">Categoria / Conto</th>
                    <th className="text-left p-3 font-semibold text-gray-700">Descrizione</th>
                    <th className="text-left p-3 font-semibold text-gray-700">Documento</th>
                    <th className="text-right p-3 font-semibold text-red-600">Dare</th>
                    <th className="text-right p-3 font-semibold text-green-600">Avere</th>
                    <th className="text-center p-3 font-semibold text-gray-700">Stato</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMovimenti.map(m => {
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
                        <td className="p-3 text-right text-red-600 font-medium">
                          {m.tipo === 'dare' ? formatCurrency(m.importo) : ''}
                        </td>
                        <td className="p-3 text-right text-green-600 font-medium">
                          {m.tipo === 'avere' ? formatCurrency(m.importo) : ''}
                        </td>
                        <td className="p-3 text-center">
                          {m.pagato ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                              <CheckCircle className="w-3 h-3" /> Pagato
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                              <Clock className="w-3 h-3" /> Da pagare
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleEdit(m)}
                              className="p-1.5 hover:bg-gray-200 rounded"
                              title="Modifica"
                            >
                              <Edit className="w-4 h-4 text-gray-500" />
                            </button>
                            <button
                              onClick={() => handleDelete(m.id)}
                              className="p-1.5 hover:bg-red-100 rounded"
                              title="Elimina"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-100 font-bold">
                    <td colSpan={4} className="p-3">TOTALI</td>
                    <td className="p-3 text-right text-red-600">{formatCurrency(totali.dare)}</td>
                    <td className="p-3 text-right text-green-600">{formatCurrency(totali.avere)}</td>
                    <td colSpan={2} className={`p-3 text-center ${totali.utile >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                      Saldo: {formatCurrency(totali.utile)}
                    </td>
                  </tr>
                </tfoot>
              </table>
              
              {filteredMovimenti.length === 0 && (
                <div className="text-center py-16">
                  <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-lg font-medium text-gray-600 mb-2">Nessun movimento trovato</p>
                  <p className="text-gray-500 mb-6">Inizia a registrare i movimenti contabili</p>
                  <button
                    onClick={() => { resetForm(); setShowForm(true); }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4 inline mr-2" />
                    Registra primo movimento
                  </button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'riepilogo' && (
        <div className="space-y-4">
          {Object.entries(perCategoria).map(([catId, catData]) => {
            if (catData.movimenti.length === 0) return null;
            
            const Icona = catData.icona;
            const isExpanded = expandedCategorie[catId];
            
            return (
              <Card key={catId} className={`border-l-4 ${getColorClass(catData.colore, 'border')}`}>
                <button
                  onClick={() => toggleCategoria(catId)}
                  className="w-full"
                >
                  <CardHeader className={`${getColorClass(catData.colore, 'bg')} hover:opacity-90 transition-opacity`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Icona className={`w-5 h-5 ${getColorClass(catData.colore, 'text')}`} />
                        <div className="text-left">
                          <CardTitle className="text-lg">{catData.nome}</CardTitle>
                          <CardDescription>{catData.movimenti.length} movimenti</CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`text-2xl font-bold ${catData.tipo === 'dare' ? 'text-red-600' : 'text-green-600'}`}>
                          {formatCurrency(catData.totale)}
                        </span>
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </div>
                    </div>
                  </CardHeader>
                </button>
                
                {isExpanded && (
                  <CardContent className="pt-4">
                    <div className="space-y-4">
                      {/* Riepilogo per conto */}
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {Object.entries(catData.perConto).map(([codice, totale]) => {
                          const contoInfo = catData.conti.find(c => c.codice === codice);
                          return (
                            <div key={codice} className="p-3 bg-white border rounded-lg">
                              <div className="text-xs text-gray-500">{codice}</div>
                              <div className="font-medium text-sm">{contoInfo?.nome || codice}</div>
                              <div className={`font-bold ${catData.tipo === 'dare' ? 'text-red-600' : 'text-green-600'}`}>
                                {formatCurrency(totale)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      
                      {/* Lista movimenti */}
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-gray-600">
                            <th className="pb-2">Data</th>
                            <th className="pb-2">Conto</th>
                            <th className="pb-2">Descrizione</th>
                            <th className="pb-2 text-right">Importo</th>
                            <th className="pb-2"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {catData.movimenti.map(m => (
                            <tr key={m.id} className="border-b hover:bg-gray-50">
                              <td className="py-2">{formatDate(m.data)}</td>
                              <td className="py-2">{m.conto}</td>
                              <td className="py-2">{m.descrizione}</td>
                              <td className={`py-2 text-right font-medium ${catData.tipo === 'dare' ? 'text-red-600' : 'text-green-600'}`}>
                                {formatCurrency(m.importo)}
                              </td>
                              <td className="py-2 text-right">
                                <button onClick={() => handleEdit(m)} className="p-1 hover:bg-gray-200 rounded">
                                  <Edit className="w-4 h-4 text-gray-400" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
          
          {Object.values(perCategoria).every(c => c.movimenti.length === 0) && (
            <Card>
              <CardContent className="py-16 text-center">
                <PieChart className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">Nessun dato da visualizzare per questo periodo</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'bilancio' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Conto Economico */}
          <Card>
            <CardHeader className="bg-gray-50 border-b">
              <CardTitle>Conto Economico</CardTitle>
              <CardDescription>Ricavi e Costi del periodo</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {/* Ricavi */}
                <div className="pb-4 border-b">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold text-emerald-700">RICAVI</span>
                    <span className="font-bold text-emerald-700">{formatCurrency(totali.avere)}</span>
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
                
                {/* Costi */}
                <div className="pb-4 border-b">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold text-red-700">COSTI</span>
                    <span className="font-bold text-red-700">{formatCurrency(totali.dare)}</span>
                  </div>
                  {Object.entries(PIANO_DEI_CONTI)
                    .filter(([id]) => id !== 'ricavi')
                    .map(([id, cat]) => {
                      const catData = perCategoria[id];
                      if (!catData || catData.totale === 0) return null;
                      
                      return (
                        <div key={id} className="mb-3 pl-4">
                          <div className="flex justify-between text-sm font-medium text-gray-700">
                            <span>{cat.nome}</span>
                            <span className="text-red-600">{formatCurrency(catData.totale)}</span>
                          </div>
                        </div>
                      );
                    })}
                </div>
                
                {/* Risultato */}
                <div className={`p-4 rounded-lg ${totali.utile >= 0 ? 'bg-blue-50' : 'bg-orange-50'}`}>
                  <div className="flex items-center justify-between">
                    <span className={`font-bold text-lg ${totali.utile >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                      {totali.utile >= 0 ? 'UTILE DEL PERIODO' : 'PERDITA DEL PERIODO'}
                    </span>
                    <span className={`font-bold text-2xl ${totali.utile >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                      {formatCurrency(Math.abs(totali.utile))}
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-gray-600">
                    Margine: <span className="font-semibold">{totali.margine.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Dettaglio Costi */}
          <Card>
            <CardHeader className="bg-gray-50 border-b">
              <CardTitle>Composizione Costi</CardTitle>
              <CardDescription>Dettaglio per categoria</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-3">
                {Object.entries(PIANO_DEI_CONTI)
                  .filter(([id]) => id !== 'ricavi')
                  .map(([id, cat]) => {
                    const catData = perCategoria[id];
                    const percentuale = totali.dare > 0 ? (catData?.totale || 0) / totali.dare * 100 : 0;
                    const Icona = cat.icona;
                    
                    return (
                      <div key={id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Icona className={`w-4 h-4 ${getColorClass(cat.colore, 'text')}`} />
                            <span className="font-medium text-sm">{cat.nome}</span>
                          </div>
                          <span className="font-bold">{formatCurrency(catData?.totale || 0)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all`}
                            style={{ 
                              width: `${Math.min(percentuale, 100)}%`,
                              backgroundColor: cat.colore === 'red' ? '#ef4444' :
                                              cat.colore === 'orange' ? '#f97316' :
                                              cat.colore === 'purple' ? '#a855f7' :
                                              cat.colore === 'blue' ? '#3b82f6' :
                                              cat.colore === 'slate' ? '#64748b' : '#6b7280'
                            }}
                          />
                        </div>
                        <div className="text-right text-xs text-gray-500 mt-1">
                          {percentuale.toFixed(1)}% dei costi totali
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ContoEconomicoNuovoPage;
