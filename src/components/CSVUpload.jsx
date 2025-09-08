import React, { useState } from 'react';
import { saveLargeData, loadLargeData } from '../lib/dataManager';
import { Upload, FileText, CheckCircle, AlertCircle, RefreshCw, Database } from 'lucide-react';

// Funzione per formattare i numeri in italiano (con virgola)
const formatPrice = (price) => {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(price);
};

const CSVUpload = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [storageInfo, setStorageInfo] = useState(null);

  // Carica informazioni storage al mount
  React.useEffect(() => {
    loadStorageInfo();
  }, []);

  const loadStorageInfo = async () => {
    try {
      const orders = await loadLargeData('shopify_orders') || [];
      const dataSize = JSON.stringify(orders).length;
      const dataSizeMB = Math.round(dataSize / (1024 * 1024) * 100) / 100;
      
      setStorageInfo({
        orderCount: orders.length,
        dataSizeMB: dataSizeMB,
        estimatedQuota: Math.round((dataSize / (5 * 1024 * 1024)) * 100) // 5MB è il limite tipico
      });
    } catch (error) {
      console.error('Errore caricamento info storage:', error);
    }
  };

  const clearStorage = async () => {
    if (!window.confirm('Sei sicuro di voler pulire tutti gli ordini? Questa azione non può essere annullata.')) {
      return;
    }

    try {
      localStorage.removeItem('shopify_orders');
      localStorage.removeItem('shopify_orders_compressed');
      localStorage.removeItem('shopify_orders_count');
      setStorageInfo({ orderCount: 0, dataSizeMB: 0, estimatedQuota: 0 });
      setMessage('✅ Cache pulita con successo!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setError('Errore nella pulizia della cache');
    }
  };

  const handleCSVUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Per favore seleziona un file CSV');
      return;
    }

    if (!window.confirm(`Vuoi caricare il file CSV "${file.name}"? Questo sostituirà tutti gli ordini esistenti.`)) {
      return;
    }

    setIsLoading(true);
    setError('');
    setMessage('');
    setUploadProgress(0);

    try {
      console.log('📁 Caricamento CSV manuale...');
      
      const text = await file.text();
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      
      console.log('📊 Headers CSV:', headers);
      
      // Raggruppa le righe per ordine (Name)
      const orderGroups = {};
      let processedCount = 0;
      let errorCount = 0;

      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === '') continue;
        
        try {
          const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
          if (values.length !== headers.length) continue;

          const orderData = {};
          headers.forEach((header, index) => {
            orderData[header] = values[index];
          });

          const orderName = orderData['Name'];
          if (!orderName) continue;

          // Debug per vedere cosa contiene ogni riga
          if (orderName === '#5056' || orderName === '#5058') {
            console.log(`🔍 Riga ${i} per ordine ${orderName}:`, {
              hasEmail: !!orderData['Email'],
              hasTotal: !!orderData['Total'],
              hasLineitemName: !!orderData['Lineitem name'],
              hasLineitemPrice: !!orderData['Lineitem price'],
              email: orderData['Email'],
              total: orderData['Total'],
              lineitemName: orderData['Lineitem name'],
              lineitemPrice: orderData['Lineitem price']
            });
          }

          // Se è la prima volta che vediamo questo ordine, crea il gruppo
          if (!orderGroups[orderName]) {
            orderGroups[orderName] = {
              orderData: orderData, // Prima riga con totale, spedizione, cliente
              products: []
            };
          }

          // Aggiungi il prodotto a questo ordine (sia dalla prima riga che dalle successive)
          if (orderData['Lineitem name']) {
            orderGroups[orderName].products.push({
              name: orderData['Lineitem name'] || '',
              price: parseFloat((orderData['Lineitem price'] || '0').toString().replace(/"/g, '')),
              qty: parseInt(orderData['Lineitem quantity'] || '1'),
              sku: orderData['Lineitem sku'] || '',
              vendor: orderData['Vendor'] || '',
              compare_at_price: parseFloat((orderData['Lineitem compare at price'] || '0').toString().replace(/"/g, '')),
              requires_shipping: orderData['Lineitem requires shipping'] === 'true',
              taxable: orderData['Lineitem taxable'] === 'true',
              fulfillment_status: orderData['Lineitem fulfillment status'] || 'pending',
              discount: parseFloat((orderData['Lineitem discount'] || '0').toString().replace(/"/g, ''))
            });
          }

          processedCount++;

          // Aggiorna progresso
          const progress = Math.round((i / (lines.length - 1)) * 100);
          setUploadProgress(progress);

        } catch (error) {
          console.error(`❌ Errore riga ${i}:`, error);
          errorCount++;
        }
      }

      // Converti i gruppi in ordini
      const orders = [];
      Object.keys(orderGroups).forEach((orderName, index) => {
        const group = orderGroups[orderName];
        const orderData = group.orderData;

        // Converti in formato completo con tutti i campi richiesti
        const convertedOrder = {
          // A - Numero ordine (raggruppato)
          id: orderData['Id'] || `csv_${index}`,
          order_number: orderData['Name'] || orderData['name'] || index,
          
          // B - Email cliente
          email: orderData['Email'] || orderData['email'] || '',
          
          // C - Status pagamento (paid = pagato)
          financial_status: orderData['Financial Status'] || orderData['financial_status'] || 'paid',
          is_paid: (orderData['Financial Status'] || '').toLowerCase() === 'paid',
          
          // D - Data e orario acquisto
          created_at: orderData['Created at'] || orderData['created_at'] || new Date().toISOString(),
          paid_at: orderData['Paid at'] || null,
          
          // E - Se è stato spedito o no
          fulfillment_status: orderData['Fulfillment Status'] || orderData['fulfillment_status'] || 'unfulfilled',
          is_shipped: (orderData['Fulfillment Status'] || '').toLowerCase() === 'fulfilled',
          fulfilled_at: orderData['Fulfilled at'] || null,
          
          // I - Sub totale
          subtotal: parseFloat((orderData['Subtotal'] || '0').toString().replace(/"/g, '')),
          
          // J - Costo spedizione (se import = 0 vuol dire che non l'ha pagata)
          shipping_cost: parseFloat((orderData['Shipping'] || '0').toString().replace(/"/g, '')),
          is_free_shipping: parseFloat((orderData['Shipping'] || '0').toString().replace(/"/g, '')) === 0,
          shipping_method: orderData['Shipping Method'] || '',
          
          // L - Totale che ha pagato
          total_price: parseFloat((orderData['Total'] || '0').toString().replace(/"/g, '')),
          
          // M - Codice sconto utilizzato
          discount_code: orderData['Discount Code'] || '',
          
          // N - Quanto sconto ha ottenuto
          discount_amount: parseFloat((orderData['Discount Amount'] || '0').toString().replace(/"/g, '')),
          
          // Altre informazioni
          currency: orderData['Currency'] || 'EUR',
          taxes: parseFloat((orderData['Taxes'] || '0').toString().replace(/"/g, '')),
          payment_method: orderData['Payment Method'] || '',
          payment_reference: orderData['Payment Reference'] || '',
          source: 'csv',
          
          // Dati cliente
          customer: {
            id: orderData['Id'] || orderData['id'] || null,
            email: orderData['Email'] || orderData['email'] || '',
            name: orderData['Billing Name'] || orderData['billing_name'] || ''
          },
          
          // Indirizzo fatturazione (Y,Z,AA,AB,AD,AE,AF,AG,AH,AI,AJ)
          billing: orderData['Billing Address1'] ? {
            name: orderData['Billing Name'] || '',
            street: orderData['Billing Street'] || '',
            address1: orderData['Billing Address1'] || '',
            address2: orderData['Billing Address2'] || '',
            company: orderData['Billing Company'] || '',
            city: orderData['Billing City'] || '',
            zip: orderData['Billing Zip'] || '',
            province: orderData['Billing Province'] || '',
            country: orderData['Billing Country'] || '',
            phone: orderData['Billing Phone'] || ''
          } : null,
          
          // Indirizzo spedizione (Y,Z,AA,AB,AD,AE,AF,AG,AH,AI,AJ)
          shipping: orderData['Shipping Address1'] ? {
            name: orderData['Shipping Name'] || '',
            street: orderData['Shipping Street'] || '',
            address1: orderData['Shipping Address1'] || '',
            address2: orderData['Shipping Address2'] || '',
            company: orderData['Shipping Company'] || '',
            city: orderData['Shipping City'] || '',
            zip: orderData['Shipping Zip'] || '',
            province: orderData['Shipping Province'] || '',
            country: orderData['Shipping Country'] || '',
            phone: orderData['Shipping Phone'] || ''
          } : null,
          
          // Prodotti con tutti i dettagli (Q,R,S,U)
          products: group.products.map(product => ({
            // Q - Quantità dei prodotti
            quantity: product.qty,
            // R - Nome del prodotto
            name: product.name,
            // S - Prezzo del prodotto
            price: product.price,
            // U - SKU code del prodotto
            sku: product.sku,
            // Altri dettagli
            vendor: product.vendor,
            compare_at_price: parseFloat(orderData['Lineitem compare at price'] || '0'),
            requires_shipping: orderData['Lineitem requires shipping'] === 'true',
            taxable: orderData['Lineitem taxable'] === 'true',
            fulfillment_status: orderData['Lineitem fulfillment status'] || 'pending',
            discount: parseFloat(orderData['Lineitem discount'] || '0')
          }))
        };

        orders.push(convertedOrder);
      });

      console.log(`✅ CSV processato: ${processedCount} righe, ${Object.keys(orderGroups).length} ordini unici, ${errorCount} errori`);
      console.log('📊 Esempio ordine:', orders[0]);
      
      // Debug specifico per ordini problematici
      const order5056 = orders.find(o => o.order_number === '#5056');
      const order5058 = orders.find(o => o.order_number === '#5058');
      
      console.log('📊 Ordine #5056:', {
        order_number: order5056?.order_number,
        email: order5056?.email,
        total_price: order5056?.total_price,
        discount_code: order5056?.discount_code,
        discount_amount: order5056?.discount_amount,
        shipping_cost: order5056?.shipping_cost,
        products_count: order5056?.products?.length,
        products: order5056?.products?.map(p => ({ name: p.name, price: p.price, qty: p.qty }))
      });
      
      console.log('📊 Ordine #5058:', {
        order_number: order5058?.order_number,
        email: order5058?.email,
        total_price: order5058?.total_price,
        discount_code: order5058?.discount_code,
        discount_amount: order5058?.discount_amount,
        shipping_cost: order5058?.shipping_cost,
        products_count: order5058?.products?.length,
        products: order5058?.products?.map(p => ({ name: p.name, price: p.price, qty: p.qty }))
      });

      if (orders.length > 0) {
        try {
          // Salva gli ordini con gestione della quota
          await saveLargeData('shopify_orders', orders);
          
          // Calcola la dimensione approssimativa
          const dataSize = JSON.stringify(orders).length;
          const dataSizeKB = Math.round(dataSize / 1024);
          const dataSizeMB = Math.round(dataSize / (1024 * 1024) * 100) / 100;
          
          setMessage(`✅ CSV caricato con successo! ${orders.length} ordini importati (${dataSizeMB}MB)`);
          await loadStorageInfo(); // Aggiorna info storage
        } catch (storageError) {
          if (storageError.message.includes('quota')) {
            setError(`Errore: Troppi dati per il browser. Dimensione: ${Math.round(JSON.stringify(orders).length / (1024 * 1024) * 100) / 100}MB. Prova a caricare un CSV più piccolo o pulisci la cache del browser.`);
          } else {
            setError(`Errore salvataggio: ${storageError.message}`);
          }
        }
      } else {
        setError('Nessun ordine valido trovato nel CSV');
      }

    } catch (error) {
      console.error('❌ Errore caricamento CSV:', error);
      setError(`Errore caricamento CSV: ${error.message}`);
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
      // Reset del file input
      event.target.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <FileText className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold">Caricamento CSV Ordini</h3>
      </div>
      
      <div className="space-y-4">
        <div className="relative">
          <input
            type="file"
            accept=".csv"
            onChange={handleCSVUpload}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={isLoading}
          />
          <button
            disabled={isLoading}
            className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <Upload className="w-5 h-5" />
            )}
            <span>
              {isLoading ? 'Caricamento in corso...' : 'Seleziona File CSV'}
            </span>
          </button>
        </div>

        {isLoading && (
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        )}

        {message && (
          <div className="flex items-center space-x-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-green-700">{message}</span>
          </div>
        )}

        {error && (
          <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {/* Informazioni Storage */}
        {storageInfo && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-blue-800 flex items-center">
                <Database className="w-4 h-4 mr-2" />
                Storage Attuale
              </h4>
              <button
                onClick={clearStorage}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded"
              >
                Pulisci Cache
              </button>
            </div>
            <div className="text-sm text-blue-700 space-y-1">
              <div>Ordini caricati: <strong>{storageInfo.orderCount}</strong></div>
              <div>Dimensione dati: <strong>{storageInfo.dataSizeMB}MB</strong></div>
              <div>Quota utilizzata: <strong>{storageInfo.estimatedQuota}%</strong></div>
              {storageInfo.estimatedQuota > 80 && (
                <div className="text-red-600 font-medium">
                  ⚠️ Quota quasi piena! Considera di pulire la cache.
                </div>
              )}
            </div>
          </div>
        )}

        <div className="text-sm text-gray-600 space-y-2">
          <p><strong>Istruzioni:</strong></p>
          <ul className="list-disc list-inside space-y-1">
            <li>Esporta il CSV completo da Shopify (tutti i 4039 ordini)</li>
            <li>Il file deve essere in formato CSV con le colonne standard di Shopify</li>
            <li>Questo sostituirà tutti gli ordini esistenti nel sistema</li>
            <li>Dopo il caricamento, usa "Sincronizza Recenti" per aggiornamenti automatici</li>
            <li><strong>Nota:</strong> Se ricevi errori di quota, pulisci la cache prima di caricare</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CSVUpload;
