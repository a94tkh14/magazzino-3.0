import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, AlertCircle, Camera, Truck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import Button from '../components/ui/button';
import { Input } from '../components/ui/input';
import { 
  getSupplierOrder, 
  receiveProduct, 
  updateSupplierOrder,
  ORDER_STATUS 
} from '../lib/supplierOrders';
import { getTrackingInfo, formatTrackingDate, getStatusColor } from '../lib/trackingAPI';
import { loadMagazzinoData, saveMagazzinoData, saveToLocalStorage, loadFromLocalStorage } from '../lib/magazzinoStorage';
import { Plus } from 'lucide-react';
import PriceSuggestionModal from '../components/PriceSuggestionModal';

const SupplierOrderDetailPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [scannedCode, setScannedCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPartialModal, setShowPartialModal] = useState(false);
  const [partialReason, setPartialReason] = useState('');
  const [lastScannedProduct, setLastScannedProduct] = useState(null);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingInfo, setTrackingInfo] = useState(null);
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [addProductData, setAddProductData] = useState({ sku: '', nome: '', quantita: '', prezzo: '', anagrafica: '', tipologia: '', marca: '' });
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState(null); // { sku, oldPrice, newPrice, onDecision }
  const [showShippingModal, setShowShippingModal] = useState(false);

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  const loadOrder = () => {
    const orderData = getSupplierOrder(orderId);
    if (orderData) {
      setOrder(orderData);
      // Carica info tracking se disponibile
      if (orderData.trackingNumber) {
        loadTrackingInfo(orderData.trackingNumber);
      }
    } else {
      navigate('/ordini-fornitori');
    }
  };

  const loadTrackingInfo = async (trackingNumber) => {
    try {
      const info = await getTrackingInfo(trackingNumber);
      setTrackingInfo(info);
    } catch (error) {
      console.error('Errore nel caricamento tracking:', error);
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

  // Calcola progresso ricezione
  const getReceiptProgress = () => {
    if (!order) return { received: 0, total: 0, percentage: 0 };
    
    const totalItems = order.products.reduce((sum, p) => sum + p.quantity, 0);
    const receivedItems = order.receivedItems.reduce((sum, item) => sum + item.quantity, 0);
    const percentage = totalItems > 0 ? Math.round((receivedItems / totalItems) * 100) : 0;
    
    return {
      received: receivedItems,
      total: totalItems,
      percentage
    };
  };

  // Trova prodotto per SKU
  const findProductBySku = (sku) => {
    return order.products.find(p => p.sku.toLowerCase() === sku.toLowerCase());
  };

  // Trova prodotto ricevuto per SKU
  const findReceivedProduct = (sku) => {
    return order.receivedItems.find(item => item.sku.toLowerCase() === sku.toLowerCase());
  };

  // Gestisce scansione codice a barre
  const handleScan = async () => {
    if (!scannedCode.trim()) return;

    setLoading(true);
    try {
      const product = findProductBySku(scannedCode);
      
      if (!product) {
        alert('SKU non trovato in questo ordine!');
        setScannedCode('');
        return;
      }

      const receivedProduct = findReceivedProduct(scannedCode);
      const currentQuantity = receivedProduct ? receivedProduct.quantity : 0;
      
      if (currentQuantity >= product.quantity) {
        alert('Tutti i prodotti di questo SKU sono già stati ricevuti!');
        setScannedCode('');
        return;
      }

      // Riceve il prodotto
      await receiveProduct(orderId, scannedCode, 1);
      
      setLastScannedProduct({
        sku: product.sku,
        name: product.name || product.sku,
        quantity: currentQuantity + 1,
        totalQuantity: product.quantity
      });

      // Ricarica l'ordine
      loadOrder();
      setScannedCode('');

      // Ricarica l'ordine per aggiornare i dati
      loadOrder();

    } catch (error) {
      console.error('Errore nella scansione:', error);
      alert('Errore durante la scansione del prodotto');
    } finally {
      setLoading(false);
    }
  };

  // Gestisce conferma ordine parziale
  const handlePartialOrder = async () => {
    setLoading(true);
    try {
      // Calcola la data di pagamento (30 giorni dalla data di acquisto)
      const purchaseDate = new Date(order.purchaseDate);
      const paymentDate = new Date(purchaseDate);
      paymentDate.setDate(paymentDate.getDate() + 30); // +30 giorni
      
      await updateSupplierOrder(orderId, { 
        status: ORDER_STATUS.PARTIAL,
        partialReason: partialReason || 'Ordine parziale - prodotti mancanti',
        paymentDate: paymentDate.toISOString().split('T')[0], // Formato YYYY-MM-DD
        partialClosedAt: new Date().toISOString()
      });
      
      // Aggiorna il magazzino con i prodotti ricevuti
      const magazzinoUpdate = updateMagazzinoFromOrder();
      
      setShowPartialModal(false);
      setPartialReason('');
      
      // Mostra messaggio di conferma con info magazzino
      let message = 'Ordine parziale chiuso! L\'ordine è ora marcato come ricevuto.';
      if (magazzinoUpdate) {
        message += `\n\nMagazzino aggiornato:\n- ${magazzinoUpdate.updatedCount} prodotti aggiornati\n- ${magazzinoUpdate.newCount} nuovi prodotti aggiunti`;
      }
      alert(message);
      
      loadOrder();
    } catch (error) {
      console.error('Errore nel chiudere ordine parziale:', error);
    } finally {
      setLoading(false);
    }
  };

  // Gestisce pagamento ordine parziale
  const handlePayment = async () => {
    setLoading(true);
    try {
      await updateSupplierOrder(orderId, { 
        status: ORDER_STATUS.PAID,
        paidAt: new Date().toISOString()
      });
      alert('Ordine marcato come pagato!');
      loadOrder();
    } catch (error) {
      console.error('Errore nel marcare come pagato:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calcola totale speso per prodotti ricevuti
  const getReceivedTotal = () => {
    if (!order) return 0;
    
    return order.receivedItems.reduce((total, item) => {
      const product = findProductBySku(item.sku);
      return total + (product ? product.price * item.quantity : 0);
    }, 0);
  };

  // Aggiorna il magazzino con i prodotti ricevuti
  const updateMagazzinoFromOrder = async () => {
    if (!order || !order.receivedItems || order.receivedItems.length === 0) return;
    
    try {
      let magazzino = await loadMagazzinoData();
      let updatedCount = 0;
      let newCount = 0;
      let toProcess = [...order.receivedItems];

      const processNext = async () => {
        if (toProcess.length === 0) {
          // Salva il magazzino aggiornato
          await saveMagazzinoData(magazzino);
          return { updatedCount, newCount };
        }

        const receivedItem = toProcess.shift();
        const product = findProductBySku(receivedItem.sku);
        if (!product) {
          setTimeout(processNext, 0);
          return;
        }
        
        const existingIndex = magazzino.findIndex(item => item.sku === receivedItem.sku);
        
        if (existingIndex !== -1 && magazzino[existingIndex].prezzo !== product.price && product.price > 0) {
          // Mostra popup AI per conferma prezzo
          setModalData({
            sku: receivedItem.sku,
            nome: magazzino[existingIndex].nome,
            oldPrice: magazzino[existingIndex].prezzo,
            newPrice: product.price,
            onDecision: async (decision) => {
              if (decision === 'aggiorna') {
                magazzino[existingIndex].prezzo = product.price;
                magazzino[existingIndex].quantita += receivedItem.quantity;
              } else if (decision === 'mantieni') {
                magazzino[existingIndex].quantita += receivedItem.quantity;
              }
              // Se ignora, non aggiorna nulla
              
              // Aggiungi allo storico
              if (decision !== 'ignora') {
                await saveStoricoData({
                  sku: receivedItem.sku,
                  data: new Date().toISOString(),
                  quantita: magazzino[existingIndex].quantita,
                  prezzo: magazzino[existingIndex].prezzo,
                  tipo: 'ordine_fornitore',
                  descrizione: `Ordine ${order.orderNumber} - ${order.supplier}`,
                  dettagli: {
                    orderId: orderId,
                    orderNumber: order.orderNumber,
                    supplier: order.supplier,
                    quantityReceived: receivedItem.quantity
                  }
                });
              }
              
              updatedCount++;
              setModalOpen(false);
              setTimeout(processNext, 0);
            }
          });
          setModalOpen(true);
        } else if (existingIndex !== -1) {
          // Aggiorna prodotto esistente senza conflitto prezzo
          magazzino[existingIndex].quantita += receivedItem.quantity;
          if (product.price > 0) {
            magazzino[existingIndex].prezzo = product.price;
          }
          updatedCount++;
          
          // Aggiungi allo storico
          await saveStoricoData({
            sku: receivedItem.sku,
            data: new Date().toISOString(),
            quantita: magazzino[existingIndex].quantita,
            prezzo: magazzino[existingIndex].prezzo,
            tipo: 'ordine_fornitore',
            descrizione: `Ordine ${order.orderNumber} - ${order.supplier}`,
            dettagli: {
              orderId: orderId,
              orderNumber: order.orderNumber,
              supplier: order.supplier,
              quantityReceived: receivedItem.quantity
            }
          });
          
          setTimeout(processNext, 0);
        } else {
          // Crea nuovo prodotto
          magazzino.push({
            sku: receivedItem.sku,
            nome: product.name || receivedItem.sku,
            quantita: receivedItem.quantity,
            prezzo: product.price || 0,
            anagrafica: product.anagrafica || '',
            tipologia: product.tipologia || '',
            marca: product.marca || ''
          });
          newCount++;
          
          // Aggiungi allo storico
          await saveStoricoData({
            sku: receivedItem.sku,
            data: new Date().toISOString(),
            quantita: receivedItem.quantity,
            prezzo: product.price || 0,
            tipo: 'ordine_fornitore',
            descrizione: `Ordine ${order.orderNumber} - ${order.supplier}`,
            dettagli: {
              orderId: orderId,
              orderNumber: order.orderNumber,
              supplier: order.supplier,
              quantityReceived: receivedItem.quantity
            }
          });
          
          setTimeout(processNext, 0);
        }
      };

      await processNext();
    } catch (error) {
      console.error('Errore nell\'aggiornamento del magazzino:', error);
    }
  };

  const [magazzino, setMagazzino] = useState([]);

  // Carica i dati del magazzino
  useEffect(() => {
    const loadMagazzino = async () => {
      try {
        const data = await loadMagazzinoData();
        setMagazzino(data);
      } catch (error) {
        console.error('Errore nel caricare magazzino:', error);
      }
    };
    loadMagazzino();
  }, []);

  if (!order) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <p>Caricamento ordine...</p>
        </div>
      </div>
    );
  }

  const progress = getReceiptProgress();
  const receivedTotal = getReceivedTotal();

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <Button
          onClick={() => navigate('/ordini-fornitori')}
          variant="outline"
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Torna alla Lista
        </Button>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Ordine {order.orderNumber}
            </h1>
            <p className="text-gray-600 mt-2">
              Fornitore: {order.supplier} • Data: {formatDate(order.purchaseDate)}
            </p>
          </div>
          
          <div className="text-right">
            <div className="text-2xl font-bold text-green-600">
              {formatPrice(receivedTotal)}
            </div>
            <div className="text-sm text-gray-500">
              Totale ricevuto
            </div>
          </div>
        </div>
      </div>

      {/* Progresso Ricezione */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5" />
            Progresso Ricezione
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">Prodotti ricevuti</span>
              <span className="font-medium">
                {progress.received} di {progress.total} ({progress.percentage}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-green-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progress.percentage}%` }}
              ></div>
            </div>
          </div>

          {progress.received > 0 && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Valore ricevuto:</span>
                <p className="font-medium text-green-600">{formatPrice(receivedTotal)}</p>
              </div>
              <div>
                <span className="text-gray-500">Valore totale ordine:</span>
                <p className="font-medium">{formatPrice(order.totalValue)}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sezione Ordine Parziale */}
      {order.status === ORDER_STATUS.PARTIAL && (
        <Card className="mb-6 border-orange-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700">
              <AlertCircle className="w-5 h-5" />
              Ordine Parziale
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Valore da Pagare */}
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <h4 className="font-medium text-orange-900 mb-2">Valore da Pagare</h4>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600 mb-1">
                    {formatPrice(receivedTotal)}
                  </div>
                  <p className="text-sm text-orange-700">
                    Solo per i prodotti ricevuti
                  </p>
                </div>
              </div>

              {/* Data Scadenza Pagamento */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Scadenza Pagamento</h4>
                <div className="text-center">
                  <div className="text-2xl font-semibold text-blue-600 mb-1">
                    {order.paymentDate ? formatDate(order.paymentDate) : 'Non specificata'}
                  </div>
                  <p className="text-sm text-blue-700">
                    {order.paymentDate ? 'Data scadenza pagamento' : 'Aggiungi data scadenza'}
                  </p>
                </div>
              </div>
            </div>

            {order.partialReason && (
              <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <h5 className="font-medium text-gray-900 mb-1">Motivo Parziale:</h5>
                <p className="text-sm text-gray-600">{order.partialReason}</p>
              </div>
            )}

            {/* Pulsanti per gestire ordine parziale */}
            <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
              <Button
                onClick={async () => {
                  setLoading(true);
                  try {
                    await updateSupplierOrder(orderId, { 
                      status: ORDER_STATUS.RECEIVED,
                      partialClosedAt: new Date().toISOString()
                    });
                    
                    // Aggiorna il magazzino con i prodotti ricevuti
                    const magazzinoUpdate = updateMagazzinoFromOrder();
                    
                    let message = 'Ordine parziale chiuso! L\'ordine è ora marcato come ricevuto.';
                    if (magazzinoUpdate) {
                      message += `\n\nMagazzino aggiornato:\n- ${magazzinoUpdate.updatedCount} prodotti aggiornati\n- ${magazzinoUpdate.newCount} nuovi prodotti aggiunti`;
                    }
                    alert(message);
                    loadOrder();
                  } catch (error) {
                    console.error('Errore nel chiudere ordine parziale:', error);
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                {loading ? 'Chiudendo...' : 'Chiudi Ordine Parziale'}
              </Button>
              
              <Button
                onClick={handlePayment}
                disabled={loading}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                {loading ? 'Marcando...' : 'Marca come Pagato'}
              </Button>
              
              <p className="text-xs text-gray-500 text-center">
                <strong>Chiudi Ordine:</strong> Marca come ricevuto • <strong>Marca Pagato:</strong> Completa il pagamento
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tracking Ordine */}
      {order.status === ORDER_STATUS.IN_TRANSIT && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5" />
              Tracciamento Spedizione
            </CardTitle>
          </CardHeader>
          <CardContent>
            {order.trackingNumber ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Numero Tracking</p>
                    <p className="font-medium">{order.trackingNumber}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => loadTrackingInfo(order.trackingNumber)}
                      variant="outline"
                      size="sm"
                    >
                      Aggiorna
                    </Button>
                    <Button
                      onClick={() => setShowTrackingModal(true)}
                      variant="outline"
                      size="sm"
                    >
                      Modifica
                    </Button>
                  </div>
                </div>
                
                {trackingInfo && (
                  <div className={`border rounded-lg p-4 ${
                    trackingInfo.status === 'API non configurata' 
                      ? 'bg-yellow-50 border-yellow-200' 
                      : 'bg-blue-50 border-blue-200'
                  }`}>
                    <h4 className={`font-medium mb-2 ${
                      trackingInfo.status === 'API non configurata' 
                        ? 'text-yellow-900' 
                        : 'text-blue-900'
                    }`}>
                      Stato Spedizione
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className={trackingInfo.status === 'API non configurata' ? 'text-yellow-700' : 'text-blue-700'}>
                          Stato:
                        </span>
                        <span className={`font-medium ${getStatusColor(trackingInfo.status)}`}>
                          {trackingInfo.status}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className={trackingInfo.status === 'API non configurata' ? 'text-yellow-700' : 'text-blue-700'}>
                          Ultima Posizione:
                        </span>
                        <span className="font-medium">{trackingInfo.location}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className={trackingInfo.status === 'API non configurata' ? 'text-yellow-700' : 'text-blue-700'}>
                          Ultimo Aggiornamento:
                        </span>
                        <span className="font-medium">{formatTrackingDate(trackingInfo.lastUpdate)}</span>
                      </div>
                      {trackingInfo.carrier && (
                        <div className="flex justify-between">
                          <span className={trackingInfo.status === 'API non configurata' ? 'text-yellow-700' : 'text-blue-700'}>
                            Corriere:
                          </span>
                          <span className="font-medium">{trackingInfo.carrier}</span>
                        </div>
                      )}
                      {trackingInfo.estimatedDelivery && (
                        <div className="flex justify-between">
                          <span className={trackingInfo.status === 'API non configurata' ? 'text-yellow-700' : 'text-blue-700'}>
                            Consegna Stimata:
                          </span>
                          <span className="font-medium">{formatTrackingDate(trackingInfo.estimatedDelivery)}</span>
                        </div>
                      )}
                      {trackingInfo.message && (
                        <div className="mt-3 p-2 bg-yellow-100 border border-yellow-300 rounded text-xs text-yellow-800">
                          <strong>Nota:</strong> {trackingInfo.message}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-600 mb-4">Nessun numero di tracking configurato</p>
                <Button
                  onClick={() => setShowTrackingModal(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Truck className="w-4 h-4 mr-2" />
                  Aggiungi Tracking
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Informazioni di Spedizione Dettagliate */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5" />
            Informazioni di Spedizione
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Indirizzo di Destinazione */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Indirizzo di Destinazione</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-500">Nome:</span>
                  <p className="font-medium">{order.shippingName || 'Non specificato'}</p>
                </div>
                <div>
                  <span className="text-gray-500">Indirizzo:</span>
                  <p className="font-medium">{order.shippingAddress || 'Non specificato'}</p>
                </div>
                <div>
                  <span className="text-gray-500">Città:</span>
                  <p className="font-medium">{order.shippingCity || 'Non specificato'}</p>
                </div>
                <div>
                  <span className="text-gray-500">CAP:</span>
                  <p className="font-medium">{order.shippingZip || 'Non specificato'}</p>
                </div>
                <div>
                  <span className="text-gray-500">Telefono:</span>
                  <p className="font-medium">{order.shippingPhone || 'Non specificato'}</p>
                </div>
              </div>
            </div>

            {/* Dettagli Spedizione */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Dettagli Spedizione</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-500">Corriere:</span>
                  <p className="font-medium">{order.shippingCarrier || 'Non specificato'}</p>
                </div>
                <div>
                  <span className="text-gray-500">Servizio:</span>
                  <p className="font-medium">{order.shippingService || 'Standard'}</p>
                </div>
                <div>
                  <span className="text-gray-500">Costo spedizione:</span>
                  <p className="font-medium">{order.shippingCost ? formatPrice(order.shippingCost) : 'Non specificato'}</p>
                </div>
                <div>
                  <span className="text-gray-500">Stato pagamento spedizione:</span>
                  <p className={`font-medium ${order.shippingPaid ? 'text-green-600' : 'text-red-600'}`}>
                    {order.shippingPaid ? 'Pagata' : 'Da pagare'}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Data spedizione:</span>
                  <p className="font-medium">{order.shippingDate ? formatDate(order.shippingDate) : 'Non specificato'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Pulsanti per gestire le informazioni di spedizione */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex gap-2">
              <Button
                onClick={() => setShowShippingModal(true)}
                variant="outline"
                size="sm"
              >
                Modifica Info Spedizione
              </Button>
              {order.shippingCost && !order.shippingPaid && (
                <Button
                  onClick={() => {
                    updateSupplierOrder(orderId, { shippingPaid: true, shippingPaidAt: new Date().toISOString() });
                    loadOrder();
                  }}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                >
                  Marca Spedizione Pagata
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scanner Codici a Barre */}
      {(order.status === ORDER_STATUS.CONFIRMED || 
        order.status === ORDER_STATUS.IN_TRANSIT || 
        order.status === ORDER_STATUS.PARTIAL) && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Scansione Prodotti
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="Scansiona codice a barre o inserisci SKU..."
                value={scannedCode}
                onChange={(e) => setScannedCode(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleScan()}
                className="flex-1"
                autoFocus
              />
              <Button
                onClick={handleScan}
                disabled={loading || !scannedCode.trim()}
                className="px-6"
              >
                {loading ? 'Scansionando...' : 'Conferma'}
              </Button>
            </div>

            {lastScannedProduct && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-green-800">
                    Prodotto confermato: {lastScannedProduct.name}
                  </span>
                </div>
                <p className="text-sm text-green-600 mt-1">
                  Ricevuti: {lastScannedProduct.quantity} di {lastScannedProduct.totalQuantity}
                </p>
              </div>
            )}

            {/* Pulsante Conferma Ordine */}
            {progress.received > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <Button
                  onClick={() => {
                    if (progress.received >= progress.total) {
                      // Ordine completo
                      updateSupplierOrder(orderId, { status: ORDER_STATUS.RECEIVED });
                      
                      // Aggiorna il magazzino con i prodotti ricevuti
                      const magazzinoUpdate = updateMagazzinoFromOrder();
                      
                      const difference = order.totalValue - receivedTotal;
                      let message = difference === 0 
                        ? 'Ordine completato! Tutti i prodotti sono stati ricevuti.'
                        : `Ordine completato! Tutti i prodotti sono stati ricevuti.\n\nRiepilogo:\n- Valore ordine: ${formatPrice(order.totalValue)}\n- Valore ricevuto: ${formatPrice(receivedTotal)}\n- Differenza: ${formatPrice(difference)}`;
                      
                      // Aggiungi informazioni sull'aggiornamento del magazzino
                      if (magazzinoUpdate) {
                        message += `\n\nMagazzino aggiornato:\n- ${magazzinoUpdate.updatedCount} prodotti aggiornati\n- ${magazzinoUpdate.newCount} nuovi prodotti aggiunti`;
                      }
                      
                      alert(message);
                      loadOrder();
                    } else {
                      // Ordine parziale - mostra popup
                      setShowPartialModal(true);
                    }
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Conferma Ordine ({progress.received} di {progress.total} prodotti)
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Lista Prodotti */}
      <Card>
        <CardHeader>
          <CardTitle>Prodotti dell'Ordine</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {order.products.map((product) => {
              const receivedProduct = findReceivedProduct(product.sku);
              const receivedQuantity = receivedProduct ? receivedProduct.quantity : 0;
              const isComplete = receivedQuantity >= product.quantity;
              const isPartial = receivedQuantity > 0 && receivedQuantity < product.quantity;
              const magazzinoProd = magazzino.find(m => m.sku === product.sku);
              
              // Carica foto del prodotto se disponibile
              const productImage = localStorage.getItem(`foto_${product.sku}`);
              
              return (
                <div
                  key={product.sku}
                  className={`p-4 border rounded-lg ${
                    isComplete 
                      ? 'bg-green-50 border-green-200' 
                      : isPartial 
                        ? 'bg-yellow-50 border-yellow-200'
                        : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex gap-4">
                    {/* Foto del prodotto */}
                    <div className="flex-shrink-0">
                      {productImage ? (
                        <img 
                          src={productImage} 
                          alt={`Foto ${product.sku}`}
                          className="w-20 h-20 object-contain rounded border bg-white"
                        />
                      ) : (
                        <div className="w-20 h-20 bg-gray-100 rounded border flex items-center justify-center">
                          <Camera className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium">
                          {product.sku}
                          <span className={magazzinoProd ? 'ml-2 text-gray-900' : 'ml-2 text-red-600 font-semibold'}>
                            {magazzinoProd ? magazzinoProd.nome : 'Prodotto non in magazzino'}
                          </span>
                          {!magazzinoProd && (
                            <Button
                              size="xs"
                              className="ml-1 px-2 py-0.5 text-xs bg-red-100 text-red-700 border-red-300"
                              onClick={() => {
                                setAddProductData({
                                  sku: product.sku,
                                  nome: product.name || '',
                                  quantita: product.quantity,
                                  prezzo: product.price,
                                  anagrafica: '',
                                  tipologia: '',
                                  marca: ''
                                });
                                setShowAddProductModal(true);
                              }}
                            >
                              <Plus className="w-3 h-3 inline" />
                            </Button>
                          )}
                        </h3>
                        {isComplete && <CheckCircle className="w-4 h-4 text-green-600" />}
                        {isPartial && <AlertCircle className="w-4 h-4 text-yellow-600" />}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Quantità ordinata:</span>
                          <p className="font-medium">{product.quantity}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Quantità ricevuta:</span>
                          <p className="font-medium">{receivedQuantity}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Prezzo unitario:</span>
                          <p className="font-medium">{formatPrice(product.price)}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Valore totale:</span>
                          <p className="font-medium">{formatPrice(product.price * product.quantity)}</p>
                        </div>
                      </div>
                      
                      {/* Pulsante per aggiungere foto */}
                      <div className="mt-2">
                        <label className="inline-flex items-center gap-2 text-xs text-blue-600 hover:text-blue-700 cursor-pointer">
                          <Camera className="w-3 h-3" />
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (ev) => {
                                  localStorage.setItem(`foto_${product.sku}`, ev.target.result);
                                  loadOrder(); // Ricarica per mostrare la nuova foto
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                            className="hidden"
                          />
                          {productImage ? 'Cambia foto' : 'Aggiungi foto'}
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Modal Tracking */}
      {showTrackingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-2 mb-4">
              <Truck className="w-6 h-6 text-blue-600" />
              <h3 className="text-lg font-semibold">Tracciamento Spedizione</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Numero Tracking
                </label>
                <Input
                  placeholder="Inserisci il numero di tracking..."
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Corriere (opzionale)
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Seleziona corriere...</option>
                  <option value="fedex">FedEx</option>
                  <option value="ups">UPS</option>
                  <option value="dhl">DHL</option>
                  <option value="tnt">TNT</option>
                  <option value="poste">Poste Italiane</option>
                  <option value="bartolini">Bartolini</option>
                  <option value="gls">GLS</option>
                  <option value="sda">SDA</option>
                </select>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <Button
                onClick={() => {
                  if (trackingNumber.trim()) {
                    // Salva tracking number
                    updateSupplierOrder(orderId, { 
                      trackingNumber: trackingNumber.trim(),
                      trackingAddedAt: new Date().toISOString()
                    });
                    setShowTrackingModal(false);
                    setTrackingNumber('');
                    loadOrder();
                  }
                }}
                disabled={!trackingNumber.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                Salva Tracking
              </Button>
              <Button
                onClick={() => {
                  setShowTrackingModal(false);
                  setTrackingNumber('');
                }}
                variant="outline"
                className="flex-1"
              >
                Annulla
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ordine Parziale */}
      {showPartialModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="w-6 h-6 text-orange-600" />
              <h3 className="text-lg font-semibold">Ordine Parziale</h3>
            </div>
            
            <p className="text-gray-600 mb-4">
              Non tutti i prodotti sono stati ricevuti. Vuoi chiudere l'ordine come parziale?
            </p>
            
            {/* Riepilogo Valori */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <h4 className="font-medium text-gray-900 mb-3">Riepilogo Valori</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Valore totale ordine:</span>
                  <span className="font-medium">{formatPrice(order.totalValue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Valore prodotti ricevuti:</span>
                  <span className="font-medium text-green-600">{formatPrice(receivedTotal)}</span>
                </div>
                <div className="border-t pt-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Differenza:</span>
                    <span className={`font-medium ${order.totalValue - receivedTotal > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatPrice(order.totalValue - receivedTotal)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Valore Parziale da Pagare */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
              <h4 className="font-medium text-orange-900 mb-2">Valore da Pagare</h4>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600 mb-1">
                  {formatPrice(receivedTotal)}
                </div>
                <p className="text-sm text-orange-700">
                  Solo per i prodotti ricevuti
                </p>
              </div>
            </div>

            {/* Data Scadenza Pagamento */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h4 className="font-medium text-blue-900 mb-2">Scadenza Pagamento</h4>
              <div className="text-center">
                <div className="text-lg font-semibold text-blue-600 mb-1">
                  {order.paymentDate ? formatDate(order.paymentDate) : 'Non specificata'}
                </div>
                <p className="text-sm text-blue-700">
                  {order.paymentDate ? 'Data scadenza pagamento' : 'Aggiungi data scadenza'}
                </p>
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Motivo (opzionale)
              </label>
              <Input
                placeholder="Es: prodotti mancanti, ritardi fornitore..."
                value={partialReason}
                onChange={(e) => setPartialReason(e.target.value)}
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data Scadenza Pagamento
              </label>
              <Input
                type="date"
                value={order.paymentDate ? order.paymentDate.split('T')[0] : ''}
                onChange={(e) => {
                  const newOrder = { ...order, paymentDate: e.target.value };
                  updateSupplierOrder(orderId, { paymentDate: e.target.value });
                }}
              />
            </div>
            
            <div className="flex gap-3">
              <Button
                onClick={handlePartialOrder}
                disabled={loading}
                className="flex-1 bg-orange-600 hover:bg-orange-700"
              >
                {loading ? 'Salvando...' : 'Chiudi Parziale'}
              </Button>
              <Button
                onClick={() => setShowPartialModal(false)}
                variant="outline"
                className="flex-1"
              >
                Continua Scansione
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL AGGIUNTA PRODOTTO */}
      {showAddProductModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-3 text-center">Aggiungi nuovo prodotto</h2>
            <form onSubmit={e => {
              e.preventDefault();
              // Validazione base
              if (!addProductData.sku.trim() || !addProductData.nome.trim() || !addProductData.quantita || !addProductData.prezzo) return;
              const magazzino = getMagazzino();
              if (magazzino.some(item => item.sku === addProductData.sku.trim())) return;
              const prodotto = {
                sku: addProductData.sku.trim(),
                nome: addProductData.nome.trim(),
                quantita: parseInt(addProductData.quantita),
                prezzo: parseFloat(('' + addProductData.prezzo).replace(',', '.')),
                anagrafica: addProductData.anagrafica.trim(),
                tipologia: addProductData.tipologia.trim(),
                marca: addProductData.marca.trim()
              };
              const nuovoMagazzino = [...magazzino, prodotto];
              setMagazzino(nuovoMagazzino);
              addStorico(prodotto.sku, {
                data: new Date().toISOString(),
                quantita: prodotto.quantita,
                prezzo: prodotto.prezzo,
                tipo: 'da ordine fornitore'
              });
              setShowAddProductModal(false);
            }} className="space-y-2">
              <div className="flex gap-2">
                <input className="border rounded px-2 py-1 flex-1" placeholder="SKU*" value={addProductData.sku} onChange={e => setAddProductData(p => ({ ...p, sku: e.target.value }))} />
                <input className="border rounded px-2 py-1 flex-1" placeholder="Nome*" value={addProductData.nome} onChange={e => setAddProductData(p => ({ ...p, nome: e.target.value }))} />
              </div>
              <div className="flex gap-2">
                <input className="border rounded px-2 py-1 w-24" placeholder="Quantità*" type="number" min="0" value={addProductData.quantita} onChange={e => setAddProductData(p => ({ ...p, quantita: e.target.value }))} />
                <input className="border rounded px-2 py-1 w-24" placeholder="Prezzo*" type="text" value={addProductData.prezzo} onChange={e => setAddProductData(p => ({ ...p, prezzo: e.target.value }))} />
              </div>
              <div className="flex flex-wrap gap-2">
                <input className="border rounded px-2 py-1 flex-1 min-w-0 max-w-[150px]" placeholder="Anagrafica" value={addProductData.anagrafica} onChange={e => setAddProductData(p => ({ ...p, anagrafica: e.target.value }))} />
                <input className="border rounded px-2 py-1 flex-1 min-w-0 max-w-[150px]" placeholder="Tipologia" value={addProductData.tipologia} onChange={e => setAddProductData(p => ({ ...p, tipologia: e.target.value }))} />
                <input className="border rounded px-2 py-1 flex-1 min-w-0 max-w-[150px]" placeholder="Marca" value={addProductData.marca} onChange={e => setAddProductData(p => ({ ...p, marca: e.target.value }))} />
              </div>
              <div className="flex gap-2 justify-end mt-2">
                <Button type="button" variant="outline" onClick={() => setShowAddProductModal(false)}>Annulla</Button>
                <Button type="submit">Salva</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Conferma Prezzo */}
      {modalOpen && modalData && (
        <PriceSuggestionModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          data={modalData}
        />
      )}

      {/* Modal Informazioni di Spedizione */}
      {showShippingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-2 mb-4">
              <Truck className="w-6 h-6 text-blue-600" />
              <h3 className="text-lg font-semibold">Modifica Informazioni di Spedizione</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Indirizzo di Destinazione */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Indirizzo di Destinazione</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome destinatario
                    </label>
                    <Input
                      placeholder="Nome e cognome"
                      value={order.shippingName || ''}
                      onChange={(e) => updateSupplierOrder(orderId, { shippingName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Indirizzo
                    </label>
                    <Input
                      placeholder="Via, numero civico"
                      value={order.shippingAddress || ''}
                      onChange={(e) => updateSupplierOrder(orderId, { shippingAddress: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Città
                      </label>
                      <Input
                        placeholder="Città"
                        value={order.shippingCity || ''}
                        onChange={(e) => updateSupplierOrder(orderId, { shippingCity: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        CAP
                      </label>
                      <Input
                        placeholder="CAP"
                        value={order.shippingZip || ''}
                        onChange={(e) => updateSupplierOrder(orderId, { shippingZip: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Telefono
                    </label>
                    <Input
                      placeholder="Numero di telefono"
                      value={order.shippingPhone || ''}
                      onChange={(e) => updateSupplierOrder(orderId, { shippingPhone: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Dettagli Spedizione */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Dettagli Spedizione</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Corriere
                    </label>
                    <select 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={order.shippingCarrier || ''}
                      onChange={(e) => updateSupplierOrder(orderId, { shippingCarrier: e.target.value })}
                    >
                      <option value="">Seleziona corriere...</option>
                      <option value="fedex">FedEx</option>
                      <option value="ups">UPS</option>
                      <option value="dhl">DHL</option>
                      <option value="tnt">TNT</option>
                      <option value="poste">Poste Italiane</option>
                      <option value="bartolini">Bartolini</option>
                      <option value="gls">GLS</option>
                      <option value="sda">SDA</option>
                      <option value="altro">Altro</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Servizio di spedizione
                    </label>
                    <select 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={order.shippingService || 'standard'}
                      onChange={(e) => updateSupplierOrder(orderId, { shippingService: e.target.value })}
                    >
                      <option value="standard">Standard</option>
                      <option value="express">Express</option>
                      <option value="priority">Priority</option>
                      <option value="economy">Economy</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Costo spedizione (€)
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={order.shippingCost || ''}
                      onChange={(e) => updateSupplierOrder(orderId, { shippingCost: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Data spedizione
                    </label>
                    <Input
                      type="date"
                      value={order.shippingDate ? order.shippingDate.split('T')[0] : ''}
                      onChange={(e) => updateSupplierOrder(orderId, { shippingDate: e.target.value })}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="shippingPaid"
                      checked={order.shippingPaid || false}
                      onChange={(e) => updateSupplierOrder(orderId, { 
                        shippingPaid: e.target.checked,
                        shippingPaidAt: e.target.checked ? new Date().toISOString() : null
                      })}
                    />
                    <label htmlFor="shippingPaid" className="text-sm font-medium text-gray-700">
                      Spedizione pagata
                    </label>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <Button
                onClick={() => {
                  setShowShippingModal(false);
                  loadOrder();
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                Salva Modifiche
              </Button>
              <Button
                onClick={() => setShowShippingModal(false)}
                variant="outline"
                className="flex-1"
              >
                Annulla
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierOrderDetailPage; 