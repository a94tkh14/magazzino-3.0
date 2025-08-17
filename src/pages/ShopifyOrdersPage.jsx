import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import Button from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { 
  Download, 
  RefreshCw, 
  Filter, 
  Eye, 
  ShoppingCart,
  Package,
  DollarSign,
  CheckCircle,
  Clock,
  AlertCircle,
  TrendingUp
} from 'lucide-react';

const ShopifyOrdersPage = () => {
  // Stati principali
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Stati per filtri
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Stati per statistiche
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    paidOrders: 0,
    pendingOrders: 0,
    avgOrderValue: 0
  });

  // Carica ordini all'avvio
  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      // Per ora carica da localStorage
      const savedOrders = localStorage.getItem('shopify_orders');
      if (savedOrders) {
        const parsedOrders = JSON.parse(savedOrders);
        setOrders(parsedOrders);
        calculateStats(parsedOrders);
      }
    } catch (error) {
      console.error('Errore nel caricare ordini:', error);
      setError('Errore nel caricamento ordini');
    }
  };

  const calculateStats = (ordersList) => {
    if (!ordersList || ordersList.length === 0) {
      setStats({
        totalOrders: 0,
        totalRevenue: 0,
        paidOrders: 0,
        pendingOrders: 0,
        avgOrderValue: 0
      });
      return;
    }

    const totalRevenue = ordersList.reduce((sum, order) => sum + (order.totalPrice || 0), 0);
    const paidOrders = ordersList.filter(order => order.status === 'paid').length;
    const pendingOrders = ordersList.filter(order => order.status === 'pending').length;

    setStats({
      totalOrders: ordersList.length,
      totalRevenue,
      paidOrders,
      pendingOrders,
      avgOrderValue: totalRevenue / ordersList.length
    });
  };

  const handleSyncOrders = async () => {
    setMessage('🔄 Funzionalità di sincronizzazione in sviluppo...');
    setTimeout(() => setMessage(''), 3000);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'refunded': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'paid': return 'Pagato';
      case 'pending': return 'In attesa';
      case 'refunded': return 'Rimborsato';
      case 'cancelled': return 'Annullato';
      default: return status;
    }
  };

  const formatPrice = (price) => {
    if (!price) return '€0.00';
    return `€${parseFloat(price).toFixed(2)}`;
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('it-IT');
    } catch {
      return 'Data non valida';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ShoppingCart className="h-8 w-8 text-blue-600" />
            Ordini Shopify
          </h1>
          <p className="text-muted-foreground">
            Gestisci e sincronizza gli ordini dal tuo store Shopify
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handleSyncOrders} 
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Sincronizzazione...' : 'Sincronizza Ordini'}
          </Button>
        </div>
      </div>

      {/* Statistiche */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Totale Ordini</p>
                <p className="text-2xl font-bold">{stats.totalOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Fatturato Totale</p>
                <p className="text-2xl font-bold">{formatPrice(stats.totalRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Ordini Pagati</p>
                <p className="text-2xl font-bold">{stats.paidOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Valore Medio</p>
                <p className="text-2xl font-bold">{formatPrice(stats.avgOrderValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Messaggi e errori */}
      {message && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 text-green-700">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">{message}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 text-red-700">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtri */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtri e Ricerca
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Ricerca */}
            <div>
              <Label htmlFor="search">Ricerca</Label>
              <Input
                id="search"
                placeholder="Numero ordine, cliente, SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mt-1"
              />
            </div>

            {/* Filtro status */}
            <div>
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Tutti gli status</option>
                <option value="paid">Pagato</option>
                <option value="pending">In attesa</option>
                <option value="refunded">Rimborsato</option>
                <option value="cancelled">Annullato</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista ordini */}
      <Card>
        <CardHeader>
          <CardTitle>Lista Ordini</CardTitle>
          <CardDescription>
            {orders.length} ordini trovati
          </CardDescription>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Nessun ordine trovato</p>
              <p className="text-sm">Configura Shopify e sincronizza gli ordini per iniziare</p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.slice(0, 10).map((order) => (
                <Card key={order.id || order.orderNumber} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                            #{order.orderNumber || order.id}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                            {getStatusLabel(order.status)}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {formatDate(order.createdAt)}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Cliente</p>
                            <p className="font-medium">{order.customerName || 'N/A'}</p>
                            <p className="text-sm text-muted-foreground">{order.customerEmail || 'N/A'}</p>
                          </div>
                          
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Prodotti</p>
                            <p className="font-medium">{order.items?.length || 0} articoli</p>
                            <p className="text-sm text-muted-foreground">
                              {order.items?.map(item => item.name).join(', ') || 'N/A'}
                            </p>
                          </div>
                          
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Totale</p>
                            <p className="text-lg font-bold text-green-600">
                              {formatPrice(order.totalPrice)} {order.currency || '€'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ShopifyOrdersPage; 