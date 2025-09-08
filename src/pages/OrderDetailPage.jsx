import React, { useState, useEffect } from 'react';
import { loadLargeData } from '../lib/dataManager';
import { ArrowLeft, Package, User, MapPin, CreditCard, Calendar, Tag, Truck } from 'lucide-react';

// Componenti UI
const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
    {children}
  </div>
);

const CardHeader = ({ children }) => (
  <div className="px-6 py-4 border-b border-gray-200">
    {children}
  </div>
);

const CardContent = ({ children }) => (
  <div className="px-6 py-4">
    {children}
  </div>
);

const CardTitle = ({ children }) => (
  <h3 className="text-lg font-semibold text-gray-900">
    {children}
  </h3>
);

const Button = ({ children, onClick, disabled = false, className = '' }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`px-4 py-2 rounded-md font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
  >
    {children}
  </button>
);

const OrderDetailPage = ({ orderId, onBack }) => {
  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  const loadOrder = async () => {
    try {
      setIsLoading(true);
      const orders = await loadLargeData('shopify_orders') || [];
      const foundOrder = orders.find(o => o.id.toString() === orderId.toString());
      
      if (foundOrder) {
        setOrder(foundOrder);
      } else {
        setError('Ordine non trovato');
      }
    } catch (err) {
      console.error('Errore caricamento ordine:', err);
      setError('Errore nel caricamento dell\'ordine');
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(parseFloat(price || 0));
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'refunded': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'paid': return 'Pagato';
      case 'pending': return 'In Attesa';
      case 'refunded': return 'Rimborsato';
      case 'cancelled': return 'Cancellato';
      default: return status;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Caricamento ordine...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 mb-4">{error}</div>
        <Button onClick={onBack} className="bg-blue-600 hover:bg-blue-700 text-white">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Torna alla Lista
        </Button>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500 mb-4">Ordine non trovato</div>
        <Button onClick={onBack} className="bg-blue-600 hover:bg-blue-700 text-white">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Torna alla Lista
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button onClick={onBack} className="bg-gray-600 hover:bg-gray-700 text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Torna alla Lista
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Ordine #{order.order_number}
            </h1>
            <p className="text-gray-600">ID: {order.id}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-900">
            {formatPrice(order.total_price)}
          </div>
          <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(order.financial_status)}`}>
            {getStatusLabel(order.financial_status)}
          </span>
        </div>
      </div>

      {/* Informazioni Generali */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              Informazioni Ordine
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Data Creazione:</span>
                <span className="font-medium">{formatDate(order.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Data Aggiornamento:</span>
                <span className="font-medium">{formatDate(order.updated_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Fonte:</span>
                <span className="font-medium">{order.source || 'Shopify'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Valuta:</span>
                <span className="font-medium">{order.currency || 'EUR'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status Fulfillment:</span>
                <span className="font-medium">{order.fulfillment_status || 'N/A'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="w-5 h-5 mr-2" />
              Informazioni Cliente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Nome:</span>
                <span className="font-medium">
                  {order.customer?.first_name} {order.customer?.last_name} {order.customer?.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Email:</span>
                <span className="font-medium">{order.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">ID Cliente:</span>
                <span className="font-medium">{order.customer?.id || 'N/A'}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Indirizzi */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {order.billing && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="w-5 h-5 mr-2" />
                Indirizzo di Fatturazione
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="font-medium">{order.billing.name}</div>
                <div>{order.billing.address}</div>
                <div>
                  {order.billing.zip} {order.billing.city}
                </div>
                <div>{order.billing.country}</div>
                {order.billing.phone && (
                  <div className="text-blue-600">{order.billing.phone}</div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {order.shipping && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Truck className="w-5 h-5 mr-2" />
                Indirizzo di Spedizione
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="font-medium">{order.shipping.name}</div>
                <div>{order.shipping.address}</div>
                <div>
                  {order.shipping.zip} {order.shipping.city}
                </div>
                <div>{order.shipping.country}</div>
                {order.shipping.phone && (
                  <div className="text-blue-600">{order.shipping.phone}</div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Prodotti */}
      {order.products && order.products.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Package className="w-5 h-5 mr-2" />
              Prodotti ({order.products.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {order.products.map((item, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{item.name}</h4>
                      <div className="mt-2 space-y-1 text-sm text-gray-600">
                        <div className="flex items-center">
                          <Tag className="w-4 h-4 mr-2" />
                          <span>SKU: {item.sku || 'N/A'}</span>
                        </div>
                        <div>Quantità: {item.qty}</div>
                        <div>Prezzo unitario: {formatPrice(item.price)}</div>
                        {item.vendor && <div>Vendor: {item.vendor}</div>}
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-lg font-semibold text-gray-900">
                        {formatPrice(item.price * item.qty)}
                      </div>
                      <div className="text-sm text-gray-600">
                        {item.qty} × {formatPrice(item.price)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Prodotti (formato legacy) */}
      {order.line_items && order.line_items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Package className="w-5 h-5 mr-2" />
              Prodotti ({order.line_items.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {order.line_items.map((item, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{item.name}</h4>
                      <div className="mt-2 space-y-1 text-sm text-gray-600">
                        <div className="flex items-center">
                          <Tag className="w-4 h-4 mr-2" />
                          <span>SKU: {item.sku || 'N/A'}</span>
                        </div>
                        <div>Quantità: {item.quantity}</div>
                        <div>Prezzo unitario: {formatPrice(item.price)}</div>
                        {item.vendor && <div>Vendor: {item.vendor}</div>}
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-lg font-semibold text-gray-900">
                        {formatPrice(item.price * item.quantity)}
                      </div>
                      <div className="text-sm text-gray-600">
                        {item.quantity} × {formatPrice(item.price)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Riepilogo Finanziario */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CreditCard className="w-5 h-5 mr-2" />
            Riepilogo Finanziario
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between text-lg">
              <span className="font-medium">Totale Ordine:</span>
              <span className="font-bold text-xl">{formatPrice(order.total_price)}</span>
            </div>
            <div className="text-sm text-gray-600">
              <div>Valuta: {order.currency || 'EUR'}</div>
              <div>Status Pagamento: {getStatusLabel(order.financial_status)}</div>
              <div>Status Fulfillment: {order.fulfillment_status || 'N/A'}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrderDetailPage;