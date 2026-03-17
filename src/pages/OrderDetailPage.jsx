import React, { useState, useEffect } from 'react';
import { loadLargeData } from '../lib/dataManager';
import { ArrowLeft, Package, User, MapPin, CreditCard, Calendar, Tag, Truck, Phone, Mail, Hash, Clock, CheckCircle, XCircle, AlertCircle, ExternalLink, Copy } from 'lucide-react';

const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
    {children}
  </div>
);

const CardHeader = ({ children, className = '' }) => (
  <div className={`px-6 py-4 border-b border-gray-200 ${className}`}>
    {children}
  </div>
);

const CardContent = ({ children, className = '' }) => (
  <div className={`px-6 py-4 ${className}`}>
    {children}
  </div>
);

const CardTitle = ({ children, className = '' }) => (
  <h3 className={`text-lg font-semibold text-gray-900 ${className}`}>
    {children}
  </h3>
);

const Button = ({ children, onClick, disabled = false, className = '' }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`px-4 py-2 rounded-md font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center ${className}`}
  >
    {children}
  </button>
);

const InfoRow = ({ label, value, className = '' }) => (
  <div className={`flex justify-between py-2 ${className}`}>
    <span className="text-gray-600">{label}</span>
    <span className="font-medium text-gray-900 text-right">{value || 'N/A'}</span>
  </div>
);

const OrderDetailPage = ({ orderId, onBack }) => {
  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  const loadOrder = async () => {
    try {
      setIsLoading(true);
      const orders = await loadLargeData('shopify_orders') || [];
      const foundOrder = orders.find(o => o.id?.toString() === orderId?.toString());
      
      if (foundOrder) {
        setOrder(foundOrder);
        console.log('Ordine caricato:', foundOrder);
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
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('it-IT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateShort = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'refunded': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'partially_refunded': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      case 'voided': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      'paid': 'Pagato',
      'pending': 'In Attesa',
      'refunded': 'Rimborsato',
      'partially_refunded': 'Parzialmente Rimborsato',
      'cancelled': 'Cancellato',
      'voided': 'Annullato',
      'authorized': 'Autorizzato',
      'partially_paid': 'Parzialmente Pagato'
    };
    return labels[status] || status || 'N/A';
  };

  const getFulfillmentLabel = (status) => {
    const labels = {
      'fulfilled': 'Evaso',
      'partial': 'Parzialmente Evaso',
      'unfulfilled': 'Non Evaso',
      null: 'Non Evaso'
    };
    return labels[status] || status || 'Non Evaso';
  };

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(''), 2000);
  };

  // Helper per ottenere valori con fallback
  const getVal = (primary, ...fallbacks) => {
    if (primary !== undefined && primary !== null && primary !== '') return primary;
    for (const fb of fallbacks) {
      if (fb !== undefined && fb !== null && fb !== '') return fb;
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-4 text-gray-600 text-lg">Caricamento ordine...</span>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <div className="text-red-600 mb-4 text-lg">{error || 'Ordine non trovato'}</div>
        <Button onClick={onBack} className="bg-blue-600 hover:bg-blue-700 text-white">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Torna alla Lista
        </Button>
      </div>
    );
  }

  // Estrai dati con fallback
  const orderNumber = getVal(order.order_number, order.orderNumber, order.name);
  const totalPrice = getVal(order.total_price, order.totalPrice, 0);
  const subtotal = getVal(order.subtotal, order.subtotal_price, 0);
  const shippingCost = getVal(order.shipping_cost, order.shippingPrice, 0);
  const discountAmount = getVal(order.discount_amount, order.total_discounts, 0);
  const taxes = getVal(order.taxes, order.total_tax, 0);
  const financialStatus = getVal(order.financial_status, order.financialStatus, order.status);
  const fulfillmentStatus = getVal(order.fulfillment_status, order.fulfillmentStatus);
  const createdAt = getVal(order.created_at, order.createdAt);
  const updatedAt = getVal(order.updated_at, order.updatedAt);
  const email = getVal(order.email, order.customerEmail, order.customer?.email);
  const phone = getVal(order.phone, order.customer?.phone);
  const customerName = getVal(order.customerName, 
    order.customer ? `${order.customer.first_name || ''} ${order.customer.last_name || ''}`.trim() : null);
  const products = getVal(order.products, order.line_items, order.items) || [];
  const shipping = order.shipping || {};
  const billing = order.billing || {};
  const shippingMethod = getVal(order.shipping_method, order.shippingType);
  const isFreeShipping = order.is_free_shipping || shippingCost === 0;
  const isShipped = order.is_shipped || fulfillmentStatus === 'fulfilled';
  const trackingNumber = getVal(order.tracking_number, order.fulfillments?.[0]?.tracking_number);
  const trackingUrl = getVal(order.tracking_url, order.fulfillments?.[0]?.tracking_url);
  const trackingCompany = getVal(order.tracking_company, order.fulfillments?.[0]?.tracking_company);
  const paymentMethod = getVal(order.payment_method, order.gateway);
  const discountCode = getVal(order.discount_code, order.discount_codes?.[0]?.code);
  const note = getVal(order.note);
  const tags = getVal(order.tags);

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <Button onClick={onBack} className="bg-gray-100 hover:bg-gray-200 text-gray-700">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Indietro
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                  Ordine #{orderNumber}
                </h1>
                <button 
                  onClick={() => copyToClipboard(orderNumber, 'order')}
                  className="p-1 hover:bg-gray-100 rounded"
                  title="Copia numero ordine"
                >
                  <Copy className="w-4 h-4 text-gray-400" />
                </button>
                {copied === 'order' && <span className="text-xs text-green-600">Copiato!</span>}
              </div>
              <p className="text-gray-500 text-sm mt-1">ID: {order.id}</p>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-2">
            <div className="text-3xl font-bold text-gray-900">
              {formatPrice(totalPrice)}
            </div>
            <div className="flex gap-2">
              <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full border ${getStatusColor(financialStatus)}`}>
                {getStatusLabel(financialStatus)}
              </span>
              <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full border ${
                isShipped ? 'bg-green-100 text-green-800 border-green-200' : 'bg-orange-100 text-orange-800 border-orange-200'
              }`}>
                {isShipped ? '✓ Spedito' : '○ Non Spedito'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid principale */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Colonna 1: Info Ordine e Cliente */}
        <div className="space-y-6">
          {/* Info Ordine */}
          <Card>
            <CardHeader className="bg-blue-50">
              <CardTitle className="flex items-center text-blue-800">
                <Calendar className="w-5 h-5 mr-2" />
                Informazioni Ordine
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-gray-100">
                <InfoRow label="Data Creazione" value={formatDate(createdAt)} />
                <InfoRow label="Data Aggiornamento" value={formatDate(updatedAt)} />
                <InfoRow label="Fonte" value={getVal(order.source_name, order.source, 'Shopify')} />
                <InfoRow label="Valuta" value={order.currency || 'EUR'} />
                <InfoRow label="Status Pagamento" value={getStatusLabel(financialStatus)} />
                <InfoRow label="Status Evasione" value={getFulfillmentLabel(fulfillmentStatus)} />
                {paymentMethod && <InfoRow label="Metodo Pagamento" value={paymentMethod} />}
              </div>
            </CardContent>
          </Card>

          {/* Info Cliente */}
          <Card>
            <CardHeader className="bg-purple-50">
              <CardTitle className="flex items-center text-purple-800">
                <User className="w-5 h-5 mr-2" />
                Cliente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="font-medium text-lg">{customerName || 'N/A'}</span>
                </div>
                {email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <a href={`mailto:${email}`} className="text-blue-600 hover:underline">{email}</a>
                    <button 
                      onClick={() => copyToClipboard(email, 'email')}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <Copy className="w-3 h-3 text-gray-400" />
                    </button>
                    {copied === 'email' && <span className="text-xs text-green-600">Copiato!</span>}
                  </div>
                )}
                {phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <a href={`tel:${phone}`} className="text-blue-600 hover:underline">{phone}</a>
                  </div>
                )}
                {order.customer?.id && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Hash className="w-4 h-4 text-gray-400" />
                    <span>ID Cliente: {order.customer.id}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Note e Tag */}
          {(note || tags) && (
            <Card>
              <CardHeader className="bg-gray-50">
                <CardTitle className="flex items-center text-gray-800">
                  <Tag className="w-5 h-5 mr-2" />
                  Note e Tag
                </CardTitle>
              </CardHeader>
              <CardContent>
                {note && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-1">Note ordine:</p>
                    <p className="bg-yellow-50 p-3 rounded border border-yellow-200 text-sm">{note}</p>
                  </div>
                )}
                {tags && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Tag:</p>
                    <div className="flex flex-wrap gap-2">
                      {tags.split(',').map((tag, i) => (
                        <span key={i} className="bg-gray-100 px-2 py-1 rounded text-sm text-gray-700">
                          {tag.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Colonna 2: Indirizzi e Spedizione */}
        <div className="space-y-6">
          {/* Indirizzo Spedizione */}
          <Card>
            <CardHeader className="bg-green-50">
              <CardTitle className="flex items-center text-green-800">
                <Truck className="w-5 h-5 mr-2" />
                Indirizzo di Spedizione
              </CardTitle>
            </CardHeader>
            <CardContent>
              {shipping.name || shipping.address ? (
                <div className="space-y-2">
                  {shipping.name && <p className="font-semibold text-lg">{shipping.name}</p>}
                  {shipping.address && <p className="text-gray-700">{shipping.address}</p>}
                  <p className="text-gray-700">
                    {[shipping.zip, shipping.city, shipping.province].filter(Boolean).join(' ')}
                  </p>
                  {shipping.country && <p className="text-gray-600">{shipping.country}</p>}
                  {shipping.phone && (
                    <div className="flex items-center gap-2 pt-2 border-t mt-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <a href={`tel:${shipping.phone}`} className="text-blue-600 hover:underline">{shipping.phone}</a>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 italic">Nessun indirizzo di spedizione</p>
              )}
            </CardContent>
          </Card>

          {/* Indirizzo Fatturazione */}
          <Card>
            <CardHeader className="bg-orange-50">
              <CardTitle className="flex items-center text-orange-800">
                <MapPin className="w-5 h-5 mr-2" />
                Indirizzo di Fatturazione
              </CardTitle>
            </CardHeader>
            <CardContent>
              {billing.name || billing.address ? (
                <div className="space-y-2">
                  {billing.name && <p className="font-semibold text-lg">{billing.name}</p>}
                  {billing.address && <p className="text-gray-700">{billing.address}</p>}
                  <p className="text-gray-700">
                    {[billing.zip, billing.city, billing.province].filter(Boolean).join(' ')}
                  </p>
                  {billing.country && <p className="text-gray-600">{billing.country}</p>}
                  {billing.phone && (
                    <div className="flex items-center gap-2 pt-2 border-t mt-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <a href={`tel:${billing.phone}`} className="text-blue-600 hover:underline">{billing.phone}</a>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 italic">Stesso indirizzo di spedizione</p>
              )}
            </CardContent>
          </Card>

          {/* Tracking Spedizione */}
          <Card>
            <CardHeader className="bg-blue-50">
              <CardTitle className="flex items-center text-blue-800">
                <Truck className="w-5 h-5 mr-2" />
                Spedizione e Tracking
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Metodo:</span>
                  <span className="font-medium">{shippingMethod || 'Standard'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Costo:</span>
                  <span className={`font-medium ${isFreeShipping ? 'text-green-600' : ''}`}>
                    {isFreeShipping ? '🎁 Gratuita' : formatPrice(shippingCost)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className={`font-medium ${isShipped ? 'text-green-600' : 'text-orange-600'}`}>
                    {isShipped ? '✓ Spedito' : '○ In preparazione'}
                  </span>
                </div>
                {trackingCompany && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Corriere:</span>
                    <span className="font-medium">{trackingCompany}</span>
                  </div>
                )}
                {trackingNumber && (
                  <div className="pt-2 border-t">
                    <p className="text-sm text-gray-600 mb-1">Numero Tracking:</p>
                    <div className="flex items-center gap-2">
                      <code className="bg-gray-100 px-3 py-2 rounded font-mono text-sm flex-1">
                        {trackingNumber}
                      </code>
                      <button 
                        onClick={() => copyToClipboard(trackingNumber, 'tracking')}
                        className="p-2 hover:bg-gray-100 rounded"
                      >
                        <Copy className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                    {copied === 'tracking' && <span className="text-xs text-green-600">Copiato!</span>}
                    {trackingUrl && (
                      <a 
                        href={trackingUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-600 hover:underline text-sm mt-2"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Traccia spedizione
                      </a>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Colonna 3: Riepilogo Finanziario */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="bg-emerald-50">
              <CardTitle className="flex items-center text-emerald-800">
                <CreditCard className="w-5 h-5 mr-2" />
                Riepilogo Finanziario
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">Subtotale Prodotti:</span>
                  <span className="font-medium">{formatPrice(subtotal)}</span>
                </div>
                
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">Spedizione:</span>
                  <span className={`font-medium ${isFreeShipping ? 'text-green-600' : ''}`}>
                    {isFreeShipping ? 'Gratuita' : formatPrice(shippingCost)}
                  </span>
                </div>
                
                {discountAmount > 0 && (
                  <div className="flex justify-between py-2 text-green-600">
                    <span>Sconto {discountCode ? `(${discountCode})` : ''}:</span>
                    <span className="font-medium">-{formatPrice(discountAmount)}</span>
                  </div>
                )}
                
                {taxes > 0 && (
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600">Tasse (IVA):</span>
                    <span className="font-medium">{formatPrice(taxes)}</span>
                  </div>
                )}
                
                <div className="border-t-2 border-gray-200 pt-4 mt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xl font-bold text-gray-900">TOTALE:</span>
                    <span className="text-2xl font-bold text-emerald-600">{formatPrice(totalPrice)}</span>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 mt-4 space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    {financialStatus === 'paid' ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <Clock className="w-4 h-4 text-yellow-600" />
                    )}
                    <span>Pagamento: <strong>{getStatusLabel(financialStatus)}</strong></span>
                  </div>
                  {paymentMethod && (
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-gray-400" />
                      <span>Metodo: <strong>{paymentMethod}</strong></span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Prodotti - Full Width */}
      <Card>
        <CardHeader className="bg-indigo-50">
          <CardTitle className="flex items-center text-indigo-800">
            <Package className="w-5 h-5 mr-2" />
            Prodotti Ordinati ({products.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {products.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {products.map((item, index) => {
                const itemPrice = parseFloat(item.price || 0);
                const itemQty = parseInt(item.quantity || 0);
                const itemTotal = itemPrice * itemQty;
                const itemDiscount = parseFloat(item.discount || item.total_discount || 0);
                const comparePrice = parseFloat(item.compare_at_price || 0);
                
                return (
                  <div key={item.id || index} className="p-6 hover:bg-gray-50">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 text-lg">
                          {item.name || item.title || 'Prodotto'}
                        </h4>
                        {item.variant_title && (
                          <p className="text-gray-600 text-sm mt-1">Variante: {item.variant_title}</p>
                        )}
                        
                        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div className="bg-gray-100 rounded p-2">
                            <span className="text-gray-500 block text-xs">SKU</span>
                            <span className="font-mono font-medium">{item.sku || 'N/A'}</span>
                          </div>
                          <div className="bg-gray-100 rounded p-2">
                            <span className="text-gray-500 block text-xs">Quantità</span>
                            <span className="font-bold text-lg">{itemQty}</span>
                          </div>
                          <div className="bg-gray-100 rounded p-2">
                            <span className="text-gray-500 block text-xs">Prezzo Unitario</span>
                            <span className="font-medium">{formatPrice(itemPrice)}</span>
                          </div>
                          {item.vendor && (
                            <div className="bg-gray-100 rounded p-2">
                              <span className="text-gray-500 block text-xs">Vendor</span>
                              <span className="font-medium">{item.vendor}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2 mt-3">
                          {item.requires_shipping !== false && (
                            <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-800">
                              📦 Spedizione richiesta
                            </span>
                          )}
                          {item.taxable !== false && (
                            <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-700">
                              💰 Tassabile
                            </span>
                          )}
                          {item.fulfillment_status === 'fulfilled' && (
                            <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-800">
                              ✓ Evaso
                            </span>
                          )}
                          {itemDiscount > 0 && (
                            <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-800">
                              🏷️ Sconto: -{formatPrice(itemDiscount)}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-right md:min-w-[150px]">
                        <div className="text-2xl font-bold text-gray-900">
                          {formatPrice(itemTotal)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {itemQty} × {formatPrice(itemPrice)}
                        </div>
                        {comparePrice > itemPrice && (
                          <div className="text-sm text-green-600 mt-1">
                            <span className="line-through text-gray-400 mr-1">{formatPrice(comparePrice)}</span>
                            Risparmi {formatPrice(comparePrice - itemPrice)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Nessun prodotto trovato per questo ordine</p>
            </div>
          )}
          
          {/* Totale prodotti */}
          {products.length > 0 && (
            <div className="bg-gray-50 p-6 border-t">
              <div className="flex justify-between items-center">
                <span className="text-lg font-medium text-gray-700">
                  Totale {products.length} {products.length === 1 ? 'prodotto' : 'prodotti'}:
                </span>
                <span className="text-2xl font-bold text-gray-900">
                  {formatPrice(products.reduce((sum, item) => {
                    return sum + (parseFloat(item.price || 0) * parseInt(item.quantity || 0));
                  }, 0))}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OrderDetailPage;
