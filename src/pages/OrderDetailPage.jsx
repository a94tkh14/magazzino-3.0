import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import Button from '../components/ui/button';
import { ArrowLeft, Package, User, Truck as TruckIcon, Download } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

const OrderDetailPage = () => {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadOrder = () => {
      try {
        // Ottieni l'ID dall'URL
        const pathParts = window.location.pathname.split('/');
        const orderId = pathParts[pathParts.length - 1];
        
        console.log('OrderDetailPage - URL pathname:', window.location.pathname);
        console.log('OrderDetailPage - Extracted orderId:', orderId);
        
        // Carica gli ordini dal localStorage
        const savedOrders = localStorage.getItem('shopify_orders');
        if (!savedOrders) {
          setError('Nessun ordine trovato');
          setLoading(false);
          return;
        }
        
        const orders = JSON.parse(savedOrders);
        console.log('OrderDetailPage - Total orders in localStorage:', orders.length);
        console.log('OrderDetailPage - First few orders:', orders.slice(0, 3));
        
        // Converti l'ID in numero per il confronto
        const numericOrderId = parseInt(orderId, 10);
        console.log('OrderDetailPage - Looking for order with ID:', numericOrderId);
        
        let foundOrder = orders.find(o => o.id === numericOrderId);
        
        // Se non trovato per ID, prova a cercare per numero ordine
        if (!foundOrder) {
          console.log('OrderDetailPage - Order not found by ID, trying orderNumber...');
          foundOrder = orders.find(o => o.orderNumber.toString() === orderId);
        }
        
        if (!foundOrder) {
          console.log('OrderDetailPage - Order not found. Available IDs:', orders.map(o => o.id).slice(0, 10));
          console.log('OrderDetailPage - Available orderNumbers:', orders.map(o => o.orderNumber).slice(0, 10));
          setError('Ordine non trovato');
          setLoading(false);
          return;
        }
        
        console.log('OrderDetailPage - Found order:', foundOrder);
        setOrder(foundOrder);
      } catch (err) {
        console.error('OrderDetailPage - Error loading order:', err);
        setError('Errore nel caricamento dell\'ordine');
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, []);

  const formatDate = (dateString) => {
    return format(new Date(dateString), 'dd MMMM yyyy HH:mm', { locale: it });
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'refunded':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'paid':
        return 'Pagato';
      case 'pending':
        return 'In Attesa';
      case 'cancelled':
        return 'Cancellato';
      case 'refunded':
        return 'Rimborsato';
      default:
        return status;
    }
  };

  const getFulfillmentStatusColor = (status) => {
    switch (status) {
      case 'fulfilled':
        return 'bg-green-100 text-green-800';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800';
      case 'unfulfilled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getFulfillmentStatusLabel = (status) => {
    switch (status) {
      case 'fulfilled':
        return 'Spedito';
      case 'partial':
        return 'Parzialmente Spedito';
      case 'unfulfilled':
        return 'Non Spedito';
      default:
        return status || 'Non Spedito';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Caricamento ordine...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">
          <p className="text-red-600">{error}</p>
          <Button 
            onClick={() => window.history.back()} 
            className="mt-4"
            variant="outline"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Torna Indietro
          </Button>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">
          <p className="text-muted-foreground">Ordine non trovato</p>
          <Button 
            onClick={() => window.history.back()} 
            className="mt-4"
            variant="outline"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Torna Indietro
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            onClick={() => window.history.back()} 
            variant="outline"
            size="sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Torna Indietro
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Ordine #{order.orderNumber}</h1>
            <p className="text-muted-foreground">
              Creato il {formatDate(order.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Esporta
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Informazioni Principali */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stato Ordine */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Stato Ordine
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Stato Pagamento</p>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                    {getStatusLabel(order.status)}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Stato Spedizione</p>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getFulfillmentStatusColor(order.fulfillmentStatus)}`}>
                    {getFulfillmentStatusLabel(order.fulfillmentStatus)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Informazioni Cliente */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Informazioni Cliente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Informazioni Cliente Principali */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Nome Completo</p>
                    <p className="font-medium">{order.customerName || 'Non specificato'}</p>
                  </div>
                  {order.customerEmail && (
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{order.customerEmail}</p>
                    </div>
                  )}
                  {order.customerPhone && (
                    <div>
                      <p className="text-sm text-muted-foreground">Telefono</p>
                      <p className="font-medium">{order.customerPhone}</p>
                    </div>
                  )}
                  {order.customerFirstName && order.customerLastName && (
                    <div>
                      <p className="text-sm text-muted-foreground">Nome e Cognome</p>
                      <p className="font-medium">{order.customerFirstName} {order.customerLastName}</p>
                    </div>
                  )}
                </div>

                {/* Indirizzo di Spedizione Dettagliato */}
                {order.shippingAddress && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Indirizzo di Spedizione Completo</p>
                    <div className="bg-gray-50 p-3 rounded border text-sm space-y-1">
                      {order.shippingAddress.name && (
                        <p className="font-medium">📋 {order.shippingAddress.name}</p>
                      )}
                      {order.shippingAddress.address1 && (
                        <p>📍 {order.shippingAddress.address1}</p>
                      )}
                      {order.shippingAddress.address2 && (
                        <p>📍 {order.shippingAddress.address2}</p>
                      )}
                      {(order.shippingAddress.city || order.shippingAddress.province || order.shippingAddress.zip) && (
                        <p>🏙️ {order.shippingAddress.city || ''} {order.shippingAddress.province || ''} {order.shippingAddress.zip || ''}</p>
                      )}
                      {order.shippingAddress.country && (
                        <p>🌍 {order.shippingAddress.country}</p>
                      )}
                      {order.shippingAddress.phone && (
                        <p>📞 {order.shippingAddress.phone}</p>
                      )}
                      {order.shippingAddress.email && (
                        <p>📧 {order.shippingAddress.email}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Indirizzo di Fatturazione (se diverso) */}
                {order.billingAddress && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Indirizzo di Fatturazione</p>
                    <div className="bg-blue-50 p-3 rounded border text-sm space-y-1">
                      {order.billingAddress.name && (
                        <p className="font-medium">📋 {order.billingAddress.name}</p>
                      )}
                      {order.billingAddress.address1 && (
                        <p>📍 {order.billingAddress.address1}</p>
                      )}
                      {order.billingAddress.address2 && (
                        <p>📍 {order.billingAddress.address2}</p>
                      )}
                      {(order.billingAddress.city || order.billingAddress.province || order.billingAddress.zip) && (
                        <p>🏙️ {order.billingAddress.city || ''} {order.billingAddress.province || ''} {order.billingAddress.zip || ''}</p>
                      )}
                      {order.billingAddress.country && (
                        <p>🌍 {order.billingAddress.country}</p>
                      )}
                      {order.billingAddress.phone && (
                        <p>📞 {order.billingAddress.phone}</p>
                      )}
                      {order.billingAddress.email && (
                        <p>📧 {order.billingAddress.email}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Sezione Spedizione */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <TruckIcon className="w-5 h-5 mr-2" />
              Informazioni di Spedizione
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Tipo di Spedizione */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo di Spedizione
                </label>
                <div className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded border">
                  {order.shippingType || 'Standard'}
                </div>
              </div>

              {/* Corriere */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Corriere
                </label>
                <div className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded border">
                  {order.shippingCarrier || 'N/A'}
                </div>
              </div>

              {/* Costo Spedizione */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Costo Spedizione
                </label>
                <div className={`text-sm px-3 py-2 rounded border ${
                  order.shippingPrice > 0 
                    ? 'text-gray-900 bg-gray-50' 
                    : 'text-green-700 bg-green-50 border-green-200'
                }`}>
                  {order.shippingPrice > 0 
                    ? `${order.shippingPrice.toFixed(2)} ${order.currency}`
                    : '🆓 Gratuita'
                  }
                </div>
              </div>

              {/* Stato Pagamento */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stato Pagamento
                </label>
                <div className={`text-sm px-3 py-2 rounded border ${
                  order.status === 'paid' 
                    ? 'text-green-700 bg-green-50 border-green-200' 
                    : order.status === 'pending'
                    ? 'text-yellow-700 bg-yellow-50 border-yellow-200'
                    : 'text-gray-900 bg-gray-50'
                }`}>
                  {order.status === 'paid' ? '✅ Pagato' : 
                   order.status === 'pending' ? '⏳ In attesa' : 
                   order.status === 'refunded' ? '🔄 Rimborsato' : 
                   order.status}
                </div>
              </div>
            </div>

            {/* Note dell'Ordine */}
            {order.note && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Note dell'Ordine
                </label>
                <div className="bg-yellow-50 p-3 rounded border text-sm">
                  <div className="text-gray-800">{order.note}</div>
                </div>
              </div>
            )}

            {/* Dettagli Shipping Lines */}
            {order.shippingLines && (Array.isArray(order.shippingLines) ? order.shippingLines : []).length > 0 && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dettagli Spedizione
                </label>
                <div className="space-y-2">
                  {(Array.isArray(order.shippingLines) ? order.shippingLines : []).map((line, index) => (
                    <div key={index} className="bg-gray-50 p-3 rounded border text-sm">
                      <div className="font-medium">{line.title}</div>
                      <div className="text-gray-600">
                        Prezzo: {parseFloat(line.price || 0).toFixed(2)} {order.currency}
                      </div>
                      {line.carrier_identifier && (
                        <div className="text-gray-600">
                          Corriere: {line.carrier_identifier}
                        </div>
                      )}
                      {line.code && (
                        <div className="text-gray-600">
                          Codice: {line.code}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Prodotti */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Prodotti ({order.items.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(Array.isArray(order.items) ? order.items : []).map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                          <Package className="w-6 h-6 text-gray-500" />
                        </div>
                        <div>
                          <h4 className="font-medium">{item.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            SKU: {item.sku || 'N/A'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Quantità: {item.quantity}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatPrice(item.price)}</p>
                      <p className="text-sm text-muted-foreground">
                        Totale: {formatPrice(item.price * item.quantity)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          {/* Debug: JSON grezzo dell'ordine */}
          <div className="mt-8">
            <details>
              <summary className="cursor-pointer font-mono text-xs text-gray-500 mb-2">Mostra dati JSON grezzi dell'ordine</summary>
              <pre className="bg-gray-100 p-4 rounded text-xs overflow-x-auto border mt-2" style={{maxHeight: 400}}>
                {JSON.stringify(order._rawShopifyOrder || order.rawShopifyOrder || order, null, 2)}
              </pre>
            </details>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Riepilogo */}
          <Card>
            <CardHeader>
              <CardTitle>Riepilogo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Subtotale Prodotti</span>
                  <span>{formatPrice(order.totalPrice - order.shippingPrice - order.taxPrice)}</span>
                </div>
                {order.shippingPrice > 0 && (
                  <div className="flex justify-between">
                    <span>Spedizione</span>
                    <span>{formatPrice(order.shippingPrice)}</span>
                  </div>
                )}
                {order.taxPrice > 0 && (
                  <div className="flex justify-between">
                    <span>Tasse</span>
                    <span>{formatPrice(order.taxPrice)}</span>
                  </div>
                )}
                <div className="border-t pt-3">
                  <div className="flex justify-between font-semibold">
                    <span>Totale</span>
                    <span>{formatPrice(order.totalPrice)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Informazioni Aggiuntive */}
          <Card>
            <CardHeader>
              <CardTitle>Informazioni Aggiuntive</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">ID Ordine Shopify</p>
                  <p className="font-mono text-sm">{order.id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Nome Ordine</p>
                  <p className="font-medium">{order.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Valuta</p>
                  <p className="font-medium">{order.currency}</p>
                </div>
                {order.note && (
                  <div>
                    <p className="text-sm text-muted-foreground">Note</p>
                    <p className="text-sm">{order.note}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailPage; 