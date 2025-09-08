import React, { useState } from 'react';
import { saveLargeData, loadLargeData } from '../lib/dataManager';
import { Upload, FileText, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

const CSVUpload = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

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
      
      const orders = [];
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

          // Converti in formato compatibile con il sistema
          const convertedOrder = {
            id: orderData['Id'] || orderData['id'] || `csv_${i}`,
            order_number: orderData['Name'] || orderData['name'] || i,
            email: orderData['Email'] || orderData['email'] || '',
            total_price: orderData['Total'] || orderData['total'] || '0',
            currency: orderData['Currency'] || orderData['currency'] || 'EUR',
            financial_status: orderData['Financial Status'] || orderData['financial_status'] || 'paid',
            fulfillment_status: orderData['Fulfillment Status'] || orderData['fulfillment_status'] || 'unfulfilled',
            created_at: orderData['Created at'] || orderData['created_at'] || new Date().toISOString(),
            updated_at: orderData['Created at'] || orderData['created_at'] || new Date().toISOString(),
            source: 'csv_manual',
            line_items: [],
            customer: {
              id: orderData['Id'] || orderData['id'] || null,
              email: orderData['Email'] || orderData['email'] || '',
              first_name: orderData['Billing Name'] || orderData['billing_name'] || '',
              last_name: ''
            },
            billing_address: {
              first_name: orderData['Billing Name'] || orderData['billing_name'] || '',
              last_name: '',
              address1: orderData['Billing Address1'] || orderData['billing_address1'] || '',
              address2: orderData['Billing Address2'] || orderData['billing_address2'] || '',
              city: orderData['Billing City'] || orderData['billing_city'] || '',
              zip: orderData['Billing Zip'] || orderData['billing_zip'] || '',
              province: orderData['Billing Province'] || orderData['billing_province'] || '',
              country: orderData['Billing Country'] || orderData['billing_country'] || '',
              phone: orderData['Billing Phone'] || orderData['billing_phone'] || ''
            },
            shipping_address: {
              first_name: orderData['Shipping Name'] || orderData['shipping_name'] || '',
              last_name: '',
              address1: orderData['Shipping Address1'] || orderData['shipping_address1'] || '',
              address2: orderData['Shipping Address2'] || orderData['shipping_address2'] || '',
              city: orderData['Shipping City'] || orderData['shipping_city'] || '',
              zip: orderData['Shipping Zip'] || orderData['shipping_zip'] || '',
              province: orderData['Shipping Province'] || orderData['shipping_province'] || '',
              country: orderData['Shipping Country'] || orderData['shipping_country'] || '',
              phone: orderData['Shipping Phone'] || orderData['shipping_phone'] || ''
            }
          };

          // Aggiungi prodotti se presenti
          if (orderData['Lineitem name']) {
            convertedOrder.line_items = [{
              id: orderData['Id'] || `line_${i}`,
              name: orderData['Lineitem name'] || '',
              price: orderData['Lineitem price'] || '0',
              quantity: orderData['Lineitem quantity'] || 1,
              sku: orderData['Lineitem sku'] || '',
              vendor: orderData['Vendor'] || '',
              requires_shipping: orderData['Lineitem requires shipping'] === 'true',
              taxable: orderData['Lineitem taxable'] === 'true',
              fulfillment_status: orderData['Lineitem fulfillment status'] || 'pending'
            }];
          }

          orders.push(convertedOrder);
          processedCount++;

          // Aggiorna progresso
          const progress = Math.round((i / (lines.length - 1)) * 100);
          setUploadProgress(progress);

        } catch (error) {
          console.error(`❌ Errore riga ${i}:`, error);
          errorCount++;
        }
      }

      console.log(`✅ CSV processato: ${processedCount} ordini, ${errorCount} errori`);

      if (orders.length > 0) {
        // Salva gli ordini
        await saveLargeData('shopify_orders', orders);
        
        setMessage(`✅ CSV caricato con successo! ${orders.length} ordini importati`);
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

        <div className="text-sm text-gray-600 space-y-2">
          <p><strong>Istruzioni:</strong></p>
          <ul className="list-disc list-inside space-y-1">
            <li>Esporta il CSV completo da Shopify (tutti i 4039 ordini)</li>
            <li>Il file deve essere in formato CSV con le colonne standard di Shopify</li>
            <li>Questo sostituirà tutti gli ordini esistenti nel sistema</li>
            <li>Dopo il caricamento, usa "Sincronizza Recenti" per aggiornamenti automatici</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CSVUpload;
