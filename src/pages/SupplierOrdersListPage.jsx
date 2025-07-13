import React, { useState, useEffect } from 'react';
import { Search, Filter, Eye, Truck, CheckCircle, Clock, AlertCircle, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import Button from '../components/ui/button';
import { Input } from '../components/ui/input';
import DateRangePicker from '../components/DateRangePicker';
import { 
  getSupplierOrders, 
  ORDER_STATUS,
  updateSupplierOrder,
  deleteSupplierOrder
} from '../lib/supplierOrders';
import { getTrackingInfo, formatTrackingDate, getStatusColor } from '../lib/trackingAPI';
import { loadMagazzinoData } from '../lib/magazzinoStorage';

const SupplierOrdersListPage = () => {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [creationDateRange, setCreationDateRange] = useState([null, null]);
  const [dueDateRange, setDueDateRange] = useState([null, null]);
  const [onlyDueSoon, setOnlyDueSoon] = useState(false);
  const [orderAmountFilter, setOrderAmountFilter] = useState({ type: 'all', min: '', max: '' });
  const [onlyToReceive, setOnlyToReceive] = useState(false);
  const [sortOption, setSortOption] = useState('recent');
  
  // Configurazione ordinamento
  const [sortField, setSortField] = useState('purchaseDate'); // 'purchaseDate', 'totalValue', 'supplier', 'status', 'paymentDate'
  const [sortOrder, setSortOrder] = useState('decrescente'); // 'crescente' o 'decrescente'

  // Statistiche ordini fornitori
  const [supplierStats, setSupplierStats] = useState({
    totalOrders: 0,
    totalValue: 0,
    toPay: 0,
    paid: 0,
    inTransit: 0,
    partial: 0,
    received: 0,
    paidValue: 0,
    toPayValue: 0,
    dueLast5Days: 0
  });



  // Carica gli ordini
  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    // Calcola statistiche ordini fornitori
    const supplierOrders = getSupplierOrders();
    const totalOrders = supplierOrders.length;
    const totalValue = supplierOrders.reduce((sum, o) => sum + o.totalValue, 0);
    const paid = supplierOrders.filter(o => o.status === ORDER_STATUS.PAID).length;
    const toPay = supplierOrders.filter(o => o.status === ORDER_STATUS.PARTIAL || o.status === ORDER_STATUS.RECEIVED).length;
    const inTransit = supplierOrders.filter(o => o.status === ORDER_STATUS.IN_TRANSIT).length;
    const partial = supplierOrders.filter(o => o.status === ORDER_STATUS.PARTIAL).length;
    const received = supplierOrders.filter(o => o.status === ORDER_STATUS.RECEIVED).length;
    // Valore pagato: somma solo il valore effettivamente ricevuto nei pagati
    const paidValue = supplierOrders.filter(o => o.status === ORDER_STATUS.PAID).reduce((sum, o) => {
      if (o.receivedItems && o.products) {
        return sum + o.receivedItems.reduce((t, item) => {
          const prod = o.products.find(p => p.sku === item.sku);
          return t + (prod ? prod.price * item.quantity : 0);
        }, 0);
      }
      return sum;
    }, 0);
    // Valore da pagare: somma solo il valore effettivo ricevuto nei parziali e ricevuti
    const toPayValue = supplierOrders.filter(o => o.status === ORDER_STATUS.PARTIAL || o.status === ORDER_STATUS.RECEIVED).reduce((sum, o) => {
      if (o.receivedItems && o.products) {
        return sum + o.receivedItems.reduce((t, item) => {
          const prod = o.products.find(p => p.sku === item.sku);
          return t + (prod ? prod.price * item.quantity : 0);
        }, 0);
      }
      return sum;
    }, 0);
    // Scadenze ultimi 5 giorni
    const now = new Date();
    const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
    const dueLast5Days = supplierOrders.filter(o => o.paymentDate && new Date(o.paymentDate) >= fiveDaysAgo && new Date(o.paymentDate) <= now).length;
    setSupplierStats({ totalOrders, totalValue, toPay, paid, inTransit, partial, received, paidValue, toPayValue, dueLast5Days });
  }, []);

  const loadOrders = () => {
    const allOrders = getSupplierOrders();
    setOrders(allOrders);
    setFilteredOrders(allOrders);
  };

  // Filtra gli ordini
  useEffect(() => {
    let filtered = orders;

    // Filtro per ricerca
    if (searchTerm) {
      filtered = filtered.filter(order => 
        order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.products.some(p => p.sku.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filtro per stato
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    // Filtro per data creazione ordine
    if (creationDateRange[0] && creationDateRange[1]) {
      filtered = filtered.filter(order => {
        const d = new Date(order.purchaseDate);
        return d >= creationDateRange[0] && d <= creationDateRange[1];
      });
    }

    // Filtro per data scadenza pagamento
    if (dueDateRange[0] && dueDateRange[1]) {
      filtered = filtered.filter(order => {
        if (!order.paymentDate) return false;
        const d = new Date(order.paymentDate);
        return d >= dueDateRange[0] && d <= dueDateRange[1];
      });
    }

    // Filtro per scadenza vicina (entro 5 giorni)
    if (onlyDueSoon) {
      filtered = filtered.filter(order => {
        if (!order.paymentDate) return false;
        const today = new Date();
        const dueDate = new Date(order.paymentDate);
        const diffTime = dueDate.setHours(0,0,0,0) - today.setHours(0,0,0,0);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 5 && diffDays >= 0;
      });
    }

    // Filtro per grandezza ordine (importo totale)
    if (orderAmountFilter.type !== 'all') {
      filtered = filtered.filter(order => {
        const value = order.totalValue;
        if (orderAmountFilter.type === 'min' && orderAmountFilter.min) {
          return value >= parseFloat(orderAmountFilter.min);
        }
        if (orderAmountFilter.type === 'max' && orderAmountFilter.max) {
          return value <= parseFloat(orderAmountFilter.max);
        }
        if (orderAmountFilter.type === 'range' && orderAmountFilter.min && orderAmountFilter.max) {
          return value >= parseFloat(orderAmountFilter.min) && value <= parseFloat(orderAmountFilter.max);
        }
        return true;
      });
    }

    // Filtro per ordini da ricevere (non completamente ricevuti)
    if (onlyToReceive) {
      filtered = filtered.filter(order => {
        const totalOrdered = order.products.reduce((sum, p) => sum + p.quantity, 0);
        const totalReceived = order.receivedItems.reduce((sum, item) => sum + item.quantity, 0);
        return totalReceived < totalOrdered;
      });
    }

    setFilteredOrders(filtered);
  }, [orders, searchTerm, statusFilter, creationDateRange, dueDateRange, onlyDueSoon, orderAmountFilter, onlyToReceive]);

  // Cambia stato ordine
  const changeOrderStatus = async (orderId, newStatus) => {
    setLoading(true);
    try {
      await updateSupplierOrder(orderId, { status: newStatus });
      loadOrders(); // Ricarica gli ordini
    } catch (error) {
      console.error('Errore nel cambiare stato:', error);
    } finally {
      setLoading(false);
    }
  };

  // Cancella ordine
  const deleteOrder = async (orderId, orderNumber) => {
    // Controlla se l'ordine può essere cancellato
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    // Non permettere la cancellazione di ordini già ricevuti o pagati
    if (order.status === ORDER_STATUS.RECEIVED || order.status === ORDER_STATUS.PAID) {
      alert('Non è possibile cancellare un ordine già ricevuto o pagato.');
      return;
    }

    // Conferma la cancellazione
    const confirmed = window.confirm(
      `Sei sicuro di voler cancellare l'ordine ${orderNumber}?\n\n` +
      'Questa azione non può essere annullata.'
    );

    if (!confirmed) return;

    setLoading(true);
    try {
      await deleteSupplierOrder(orderId);
      loadOrders(); // Ricarica gli ordini
      alert('Ordine cancellato con successo.');
    } catch (error) {
      console.error('Errore nella cancellazione dell\'ordine:', error);
      alert('Errore durante la cancellazione dell\'ordine.');
    } finally {
      setLoading(false);
    }
  };

  // Formatta prezzo in formato italiano
  const formatPrice = (price) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(price);
  };

  // Formatta data
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('it-IT');
  };

  // Ottieni badge per lo stato
  const getStatusBadge = (status) => {
    const statusConfig = {
      [ORDER_STATUS.DRAFT]: { color: 'bg-gray-100 text-gray-800', icon: Clock, label: 'Bozza' },
      [ORDER_STATUS.CONFIRMED]: { color: 'bg-blue-100 text-blue-800', icon: Truck, label: 'Confermato' },
      [ORDER_STATUS.IN_TRANSIT]: { color: 'bg-yellow-100 text-yellow-800', icon: Truck, label: 'In Transito' },
      [ORDER_STATUS.RECEIVED]: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Ricevuto' },
      [ORDER_STATUS.PARTIAL]: { color: 'bg-orange-100 text-orange-800', icon: AlertCircle, label: 'Parziale' },
      [ORDER_STATUS.PAID]: { color: 'bg-purple-100 text-purple-800', icon: CheckCircle, label: 'Pagato' }
    };

    const config = statusConfig[status] || statusConfig[ORDER_STATUS.DRAFT];
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </span>
    );
  };

  // Calcola progresso ricezione
  const getReceiptProgress = (order) => {
    const totalItems = order.products.reduce((sum, p) => sum + p.quantity, 0);
    const receivedItems = order.receivedItems.reduce((sum, item) => sum + item.quantity, 0);
    const percentage = totalItems > 0 ? Math.round((receivedItems / totalItems) * 100) : 0;
    
    return {
      received: receivedItems,
      total: totalItems,
      percentage
    };
  };

  // Calcola progresso pagamento
  const getPaymentProgress = (order) => {
    // Per ordini parziali, calcola solo il valore dei prodotti ricevuti
    let totalToPay = order.totalValue;
    let paidAmount = 0;
    
    if (order.status === ORDER_STATUS.PARTIAL) {
      // Calcola il valore dei prodotti ricevuti
      totalToPay = order.receivedItems.reduce((total, item) => {
        const product = order.products.find(p => p.sku === item.sku);
        return total + (product ? product.price * item.quantity : 0);
      }, 0);
    }
    
    // Se l'ordine è pagato, considera tutto come pagato
    if (order.status === ORDER_STATUS.PAID) {
      paidAmount = totalToPay;
    }
    
    const percentage = totalToPay > 0 ? Math.round((paidAmount / totalToPay) * 100) : 0;
    
    return {
      paid: paidAmount,
      total: totalToPay,
      percentage
    };
  };

  // Ordina gli ordini in base al campo e ordine selezionati
  const sortOrders = (orders) => {
    const sorted = [...orders];
    
    let aValue, bValue;
    
    switch (sortField) {
      case 'purchaseDate':
        sorted.sort((a, b) => {
          aValue = new Date(a.purchaseDate);
          bValue = new Date(b.purchaseDate);
          return sortOrder === 'crescente' 
            ? aValue - bValue 
            : bValue - aValue;
        });
        break;
      case 'totalValue':
        sorted.sort((a, b) => {
          aValue = a.totalValue;
          bValue = b.totalValue;
          return sortOrder === 'crescente' 
            ? aValue - bValue 
            : bValue - aValue;
        });
        break;
      case 'supplier':
        sorted.sort((a, b) => {
          aValue = a.supplier.toLowerCase();
          bValue = b.supplier.toLowerCase();
          return sortOrder === 'crescente' 
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        });
        break;
      case 'status':
        sorted.sort((a, b) => {
          aValue = a.status;
          bValue = b.status;
          return sortOrder === 'crescente' 
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        });
        break;
      case 'paymentDate':
        sorted.sort((a, b) => {
          // Gestisce i casi dove paymentDate potrebbe essere null
          if (!a.paymentDate && !b.paymentDate) return 0;
          if (!a.paymentDate) return 1;
          if (!b.paymentDate) return -1;
          
          aValue = new Date(a.paymentDate);
          bValue = new Date(b.paymentDate);
          return sortOrder === 'crescente' 
            ? aValue - bValue 
            : bValue - aValue;
        });
        break;
      default:
        // Default: ordina per data di acquisto decrescente
        sorted.sort((a, b) => new Date(b.purchaseDate) - new Date(a.purchaseDate));
        break;
    }
    
    return sorted;
  };

  // Sostituisco filteredOrders con quelli ordinati
  const displayedOrders = sortOrders(filteredOrders);

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Storico Ordini Fornitori</h1>
          <p className="text-gray-600 mt-2">Gestisci e monitora gli ordini ai fornitori</p>
        </div>
        <Button
          onClick={() => window.location.href = '/ordini-fornitori/nuovo'}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nuovo Ordine
        </Button>
      </div>

      {/* Statistiche Ordini Fornitori */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Statistiche Ordini Fornitori
          </CardTitle>
          <CardDescription>
            Totale valore ordini, pagati, da pagare, rapporto pagato/da pagare, scadenze ultimi 5 giorni
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-xs text-gray-500">Totale ordini</div>
              <div className="text-lg font-bold">{supplierStats.totalOrders}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Valore totale</div>
              <div className="text-lg font-bold text-green-700">{formatPrice(supplierStats.totalValue)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Valore pagato</div>
              <div className="text-lg font-bold text-blue-700">{formatPrice(supplierStats.paidValue)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Valore da pagare</div>
              <div className="text-lg font-bold text-yellow-700">{formatPrice(supplierStats.toPayValue)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Pagato / Da pagare</div>
              <div className="text-lg font-bold">
                <span className="text-blue-700">{formatPrice(supplierStats.paidValue)}</span>
                <span className="text-gray-400"> / </span>
                <span className="text-yellow-700">{formatPrice(supplierStats.toPayValue)}</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Scadenze ultimi 5 giorni</div>
              <div className="text-lg font-bold text-red-600">{supplierStats.dueLast5Days}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">In transito</div>
              <div className="text-lg font-bold text-blue-700">{supplierStats.inTransit}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Parziali</div>
              <div className="text-lg font-bold text-orange-700">{supplierStats.partial}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Ricevuti</div>
              <div className="text-lg font-bold text-green-600">{supplierStats.received}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Pagati</div>
              <div className="text-lg font-bold text-green-700">{supplierStats.paid}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Da pagare</div>
              <div className="text-lg font-bold text-yellow-700">{supplierStats.toPay}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filtri */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtri
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cerca
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Numero ordine, fornitore, SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Stato
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Tutti gli stati</option>
                <option value={ORDER_STATUS.DRAFT}>Bozza</option>
                <option value={ORDER_STATUS.CONFIRMED}>Confermato</option>
                <option value={ORDER_STATUS.IN_TRANSIT}>In Transito</option>
                <option value={ORDER_STATUS.RECEIVED}>Ricevuto</option>
                <option value={ORDER_STATUS.PARTIAL}>Parziale</option>
                <option value={ORDER_STATUS.PAID}>Pagato</option>
              </select>
            </div>

            <div className="flex items-end">
              <Button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setCreationDateRange([null, null]);
                  setDueDateRange([null, null]);
                  setOnlyDueSoon(false);
                  setOrderAmountFilter({ type: 'all', min: '', max: '' });
                  setOnlyToReceive(false);
                }}
                variant="outline"
                className="w-full"
              >
                Reset Filtri
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Data Creazione Ordine</label>
              <DateRangePicker value={creationDateRange} onChange={setCreationDateRange} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Data Scadenza Pagamento</label>
              <DateRangePicker value={dueDateRange} onChange={setDueDateRange} />
            </div>
            <div className="flex items-center gap-2 mt-6">
              <input type="checkbox" id="onlyDueSoon" checked={onlyDueSoon} onChange={e => setOnlyDueSoon(e.target.checked)} />
              <label htmlFor="onlyDueSoon" className="text-sm">Solo scadenze entro 5 giorni</label>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Grandezza Ordine (€)</label>
              <div className="flex gap-2">
                <select value={orderAmountFilter.type} onChange={e => setOrderAmountFilter(f => ({ ...f, type: e.target.value }))} className="border rounded px-2 py-1">
                  <option value="all">Tutti</option>
                  <option value="min">Maggiore di</option>
                  <option value="max">Minore di</option>
                  <option value="range">Tra</option>
                </select>
                <Input
                  type="number"
                  placeholder="Min"
                  value={orderAmountFilter.min}
                  onChange={e => setOrderAmountFilter(f => ({ ...f, min: e.target.value }))}
                  disabled={orderAmountFilter.type === 'all' || orderAmountFilter.type === 'max'}
                  className="w-20"
                />
                <Input
                  type="number"
                  placeholder="Max"
                  value={orderAmountFilter.max}
                  onChange={e => setOrderAmountFilter(f => ({ ...f, max: e.target.value }))}
                  disabled={orderAmountFilter.type === 'all' || orderAmountFilter.type === 'min'}
                  className="w-20"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-6">
              <input type="checkbox" id="onlyToReceive" checked={onlyToReceive} onChange={e => setOnlyToReceive(e.target.checked)} />
              <label htmlFor="onlyToReceive" className="text-sm">Solo ordini da ricevere</label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Intestazioni Ordinamento */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="grid grid-cols-5 gap-4 text-sm font-medium">
            <div 
              className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
              onClick={() => {
                if (sortField === 'purchaseDate') {
                  setSortOrder(sortOrder === 'crescente' ? 'decrescente' : 'crescente');
                } else {
                  setSortField('purchaseDate');
                  setSortOrder('decrescente');
                }
              }}
            >
              Data Acquisto
              <div className="flex flex-col">
                <svg className={`w-3 h-3 ${sortField === 'purchaseDate' && sortOrder === 'decrescente' ? 'text-blue-600' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
                <svg className={`w-3 h-3 ${sortField === 'purchaseDate' && sortOrder === 'crescente' ? 'text-blue-600' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div 
              className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
              onClick={() => {
                if (sortField === 'supplier') {
                  setSortOrder(sortOrder === 'crescente' ? 'decrescente' : 'crescente');
                } else {
                  setSortField('supplier');
                  setSortOrder('crescente');
                }
              }}
            >
              Fornitore
              <div className="flex flex-col">
                <svg className={`w-3 h-3 ${sortField === 'supplier' && sortOrder === 'decrescente' ? 'text-blue-600' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
                <svg className={`w-3 h-3 ${sortField === 'supplier' && sortOrder === 'crescente' ? 'text-blue-600' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div 
              className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
              onClick={() => {
                if (sortField === 'totalValue') {
                  setSortOrder(sortOrder === 'crescente' ? 'decrescente' : 'crescente');
                } else {
                  setSortField('totalValue');
                  setSortOrder('decrescente');
                }
              }}
            >
              Valore Totale
              <div className="flex flex-col">
                <svg className={`w-3 h-3 ${sortField === 'totalValue' && sortOrder === 'decrescente' ? 'text-blue-600' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
                <svg className={`w-3 h-3 ${sortField === 'totalValue' && sortOrder === 'crescente' ? 'text-blue-600' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div 
              className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
              onClick={() => {
                if (sortField === 'status') {
                  setSortOrder(sortOrder === 'crescente' ? 'decrescente' : 'crescente');
                } else {
                  setSortField('status');
                  setSortOrder('crescente');
                }
              }}
            >
              Stato
              <div className="flex flex-col">
                <svg className={`w-3 h-3 ${sortField === 'status' && sortOrder === 'decrescente' ? 'text-blue-600' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
                <svg className={`w-3 h-3 ${sortField === 'status' && sortOrder === 'crescente' ? 'text-blue-600' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div 
              className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
              onClick={() => {
                if (sortField === 'paymentDate') {
                  setSortOrder(sortOrder === 'crescente' ? 'decrescente' : 'crescente');
                } else {
                  setSortField('paymentDate');
                  setSortOrder('crescente');
                }
              }}
            >
              Scadenza Pagamento
              <div className="flex flex-col">
                <svg className={`w-3 h-3 ${sortField === 'paymentDate' && sortOrder === 'decrescente' ? 'text-blue-600' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
                <svg className={`w-3 h-3 ${sortField === 'paymentDate' && sortOrder === 'crescente' ? 'text-blue-600' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista Ordini */}
      <div className="space-y-4">
        {displayedOrders.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Truck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nessun ordine trovato
              </h3>
              <p className="text-gray-600">
                {orders.length === 0 
                  ? 'Non ci sono ancora ordini. Crea il primo ordine!'
                  : 'Prova a modificare i filtri di ricerca.'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          displayedOrders.map((order) => {
            const progress = getReceiptProgress(order);
            
            return (
              <Card key={order.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    {/* Info Principali */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 
                          className="text-lg font-semibold text-blue-600 hover:text-blue-800 cursor-pointer transition-colors"
                          onClick={() => window.location.href = `/ordini-fornitori/${order.id}`}
                          title="Clicca per vedere i dettagli dell'ordine"
                        >
                          {order.orderNumber}
                        </h3>
                        {getStatusBadge(order.status)}
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Fornitore:</span>
                          <p className="font-medium">{order.supplier}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Data Acquisto:</span>
                          <p className="font-medium">{formatDate(order.purchaseDate)}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Prodotti:</span>
                          <p className="font-medium">
                            {(() => {
                              const totalOrdered = order.products.reduce((sum, p) => sum + p.quantity, 0);
                              const totalReceived = order.receivedItems.reduce((sum, item) => sum + item.quantity, 0);
                              const isEqual = totalReceived === totalOrdered;
                              return (
                                <>
                                  <span className={isEqual ? 'text-green-600' : 'text-green-600 font-semibold'}>
                                    {totalReceived}
                                  </span>
                                  <span className={isEqual ? 'text-green-600' : 'text-gray-400 font-normal'}>
                                    {' / ' + totalOrdered}
                                  </span>
                                </>
                              );
                            })()}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500">Valore Totale:</span>
                          <p className="font-medium">
                            {(() => {
                              const receivedTotal = order.receivedItems.reduce((total, item) => {
                                const product = order.products.find(p => p.sku === item.sku);
                                return total + (product ? product.price * item.quantity : 0);
                              }, 0);
                              const isEqual = receivedTotal === order.totalValue;
                              return (
                                <>
                                  <span className={isEqual ? 'text-green-600' : 'text-green-600 font-semibold'}>
                                    {formatPrice(receivedTotal)}
                                  </span>
                                  <span className={isEqual ? 'text-green-600' : 'text-gray-400 font-normal'}>
                                    {' / ' + formatPrice(order.totalValue)}
                                  </span>
                                </>
                              );
                            })()}
                          </p>
                        </div>
                      </div>

                      {/* SOLO BARRA per CONFERMATO o IN_TRANSITO */}
                      {(order.status === ORDER_STATUS.CONFIRMED || order.status === ORDER_STATUS.IN_TRANSIT) && (
                        <div className="mt-3 space-y-2">
                          {/* Progresso Ricezione con barra */}
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-600">📦 Ricezione</span>
                              <span className="font-medium text-blue-600">
                                {progress.received}/{progress.total} prodotti
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${progress.percentage}%` }}
                              ></div>
                            </div>
                          </div>
                          {/* Progresso Pagamento con barra */}
                          {(() => {
                            const paymentProgress = getPaymentProgress(order);
                            return (
                              <div>
                                <div className="flex justify-between text-sm mb-1">
                                  <span className="text-gray-600">💰 Pagamento</span>
                                  <span className="font-medium text-green-600">
                                    {formatPrice(paymentProgress.paid)}/{formatPrice(paymentProgress.total)}
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div 
                                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${paymentProgress.percentage}%` }}
                                  ></div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {/* Data scadenza pagamento per RICEVUTO, PARZIALE, PAGATO */}
                      {(order.status === ORDER_STATUS.PARTIAL || order.status === ORDER_STATUS.RECEIVED || order.status === ORDER_STATUS.PAID) && order.paymentDate && (
                        <div className="mt-3 flex flex-wrap gap-6 items-center">
                          <div className="flex flex-col items-center">
                            <span className="text-xs text-gray-500">Scadenza Pagamento</span>
                            {(() => {
                              const today = new Date();
                              const dueDate = new Date(order.paymentDate);
                              const diffTime = dueDate.setHours(0,0,0,0) - today.setHours(0,0,0,0);
                              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                              let color = 'text-blue-700';
                              if (diffDays < 0) color = 'text-red-600 font-bold';
                              else if (diffDays <= 5) color = 'text-yellow-600 font-bold';
                              return (
                                <span className={`text-sm font-semibold ${color}`}>{formatDate(order.paymentDate)}</span>
                              );
                            })()}
                          </div>
                        </div>
                      )}

                      {/* Tracking Info */}
                      {order.trackingNumber && (
                        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Truck className="w-4 h-4 text-blue-600" />
                              <span className="text-sm font-medium text-blue-900">
                                Tracking: {order.trackingNumber}
                              </span>
                            </div>
                            <Button
                              onClick={() => window.location.href = `/ordini-fornitori/${order.id}`}
                              variant="outline"
                              size="sm"
                              className="text-xs"
                            >
                              Vedi Dettagli
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Info Ordine Parziale: mostra note come commento */}
                      {order.status === ORDER_STATUS.PARTIAL && order.partialReason && (
                        <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded text-xs text-orange-900">
                          <strong>Nota ordine parziale:</strong> {order.partialReason}
                        </div>
                      )}

                      {/* Info Ordine Parziale */}
                      {order.status === ORDER_STATUS.PARTIAL && (
                        <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-orange-600" />
                              <div>
                                <span className="text-sm font-medium text-orange-900">
                                  Ordine Parziale
                                </span>
                                <p className="text-xs text-orange-700">
                                  Valore da pagare: {formatPrice(getPaymentProgress(order).total)}
                                </p>
                              </div>
                            </div>
                            <Button
                              onClick={() => window.location.href = `/ordini-fornitori/${order.id}`}
                              variant="outline"
                              size="sm"
                              className="text-xs bg-orange-100 text-orange-700 border-orange-300"
                            >
                              Gestisci
                            </Button>
                          </div>
                        </div>
                      )}


                    </div>

                    {/* Azioni */}
                    <div className="flex flex-col gap-2 min-w-fit">
                      <Button
                        onClick={() => window.location.href = `/ordini-fornitori/${order.id}`}
                        className="w-full"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Visualizza Dettaglio
                      </Button>

                      {/* Pulsante Cancella - solo per ordini non ricevuti/pagati */}
                      {(order.status === ORDER_STATUS.DRAFT || order.status === ORDER_STATUS.CONFIRMED || order.status === ORDER_STATUS.IN_TRANSIT) && (
                        <Button
                          onClick={() => deleteOrder(order.id, order.orderNumber)}
                          disabled={loading}
                          variant="outline"
                          className="w-full bg-red-50 text-red-700 hover:bg-red-100 border-red-300"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Cancella Ordine
                        </Button>
                      )}

                      {/* Azioni per stato */}
                      {order.status === ORDER_STATUS.DRAFT && (
                        <Button
                          onClick={() => changeOrderStatus(order.id, ORDER_STATUS.CONFIRMED)}
                          disabled={loading}
                          variant="outline"
                          className="w-full bg-blue-50 text-blue-700 hover:bg-blue-100"
                        >
                          <Truck className="w-4 h-4 mr-2" />
                          Conferma Ordine
                        </Button>
                      )}

                      {order.status === ORDER_STATUS.CONFIRMED && (
                        <Button
                          onClick={() => changeOrderStatus(order.id, ORDER_STATUS.IN_TRANSIT)}
                          disabled={loading}
                          variant="outline"
                          className="w-full bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
                        >
                          <Truck className="w-4 h-4 mr-2" />
                          In Transito
                        </Button>
                      )}

                      {order.status === ORDER_STATUS.PARTIAL && (
                        <Button
                          onClick={() => changeOrderStatus(order.id, ORDER_STATUS.RECEIVED)}
                          disabled={loading}
                          variant="outline"
                          className="w-full bg-green-50 text-green-700 hover:bg-green-100"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Chiudi Parziale
                        </Button>
                      )}

                      {order.status === ORDER_STATUS.RECEIVED && (
                        <Button
                          onClick={() => changeOrderStatus(order.id, ORDER_STATUS.PAID)}
                          disabled={loading}
                          variant="outline"
                          className="w-full bg-purple-50 text-purple-700 hover:bg-purple-100"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Marca Pagato
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

export default SupplierOrdersListPage; 