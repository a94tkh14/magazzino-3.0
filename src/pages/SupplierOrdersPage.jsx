import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Download, Plus, Eye, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import Button from '../components/ui/button';
import { Input } from '../components/ui/input';
import { 
  generateOrderNumber
} from '../lib/supplierOrders';
import { saveSupplierOrder } from '../lib/supabase';

const SupplierOrdersPage = () => {
  const navigate = useNavigate();
  const [csvData, setCsvData] = useState(null);
  const [supplierData, setSupplierData] = useState({
    supplier: '',
    purchaseDate: '',
    invoiceNumber: '',
    paymentDate: ''
  });
  const [previewData, setPreviewData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Gestisce il caricamento del CSV
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csv = e.target.result;
        const lines = csv.split('\n');
        const headers = lines[0].split(';').map(h => h.trim());
        
        // Valida headers
        const requiredHeaders = ['SKU', 'Quantità', 'Prezzo Unitario'];
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
        
        if (missingHeaders.length > 0) {
          setError(`Headers mancanti: ${missingHeaders.join(', ')}`);
          return;
        }

        // Parsing dei dati
        const products = lines.slice(1)
          .filter(line => line.trim())
          .map((line, index) => {
            const values = line.split(';').map(v => v.trim());
            // Gestisce sia punto che virgola come separatore decimale
            const priceStr = values[2] || '0';
            const price = parseFloat(priceStr.replace(',', '.')) || 0;
            return {
              sku: values[0],
              quantity: parseInt(values[1]) || 0,
              price: price
            };
          })
          .filter(product => product.sku && product.quantity > 0);

        setCsvData(products);
        setError('');
      } catch (error) {
        setError('Errore nel leggere il file CSV');
        console.error(error);
      }
    };
    reader.readAsText(file);
  };

  // Genera template CSV
  const downloadTemplate = () => {
    const template = 'SKU;Quantità;Prezzo Unitario\nABC123;10;25.50\nDEF456;5;15.75';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_ordine_fornitore.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Preview dell'ordine
  const handlePreview = () => {
    if (!csvData || csvData.length === 0) {
      setError('Carica prima un file CSV');
      return;
    }

    if (!supplierData.supplier || !supplierData.purchaseDate) {
      setError('Compila tutti i campi obbligatori');
      return;
    }

    const totalValue = csvData.reduce((sum, product) => sum + (product.quantity * product.price), 0);
    
    setPreviewData({
      orderNumber: generateOrderNumber(),
      supplier: supplierData.supplier,
      purchaseDate: supplierData.purchaseDate,
      invoiceNumber: supplierData.invoiceNumber,
      paymentDate: supplierData.paymentDate,
      products: csvData,
      totalValue: totalValue
    });
  };

  // Conferma e salva l'ordine
  const handleConfirmOrder = async () => {
    if (!previewData) return;

    setLoading(true);
    try {
      const order = {
        orderNumber: previewData.orderNumber,
        supplier: previewData.supplier,
        purchaseDate: previewData.purchaseDate,
        invoiceNumber: previewData.invoiceNumber,
        paymentDate: previewData.paymentDate,
        products: previewData.products,
        totalValue: previewData.totalValue
      };

      await saveSupplierOrder(order);
      
      // Salva anche nel database Supabase
      try {
        await saveSupplierOrder(order);
      } catch (error) {
        console.error('Errore nel salvare ordine fornitore nel database:', error);
      }
      
      // Reset form
      setCsvData(null);
      setSupplierData({
        supplier: '',
        purchaseDate: '',
        invoiceNumber: '',
        paymentDate: ''
      });
      setPreviewData(null);
      setError('');
      
      alert('Ordine creato con successo!');
      
      // Reindirizza alla lista dopo 2 secondi
      setTimeout(() => {
        navigate('/ordini-fornitori');
      }, 2000);
    } catch (error) {
      setError('Errore nel salvare l\'ordine');
      console.error(error);
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

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Nuovo Ordine Fornitore</h1>
          <p className="text-gray-600 mt-2">Crea un nuovo ordine ai fornitori</p>
        </div>
        <Button
          onClick={() => navigate('/ordini-fornitori')}
          variant="outline"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Torna alla Lista
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sezione Caricamento CSV */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <Upload className="w-5 h-5" />
              Carica Prodotti
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                File CSV Prodotti
              </label>
              <div className="flex gap-2">
                <Input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  onClick={downloadTemplate}
                  className="bg-white"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Template
                </Button>
              </div>
            </div>

            {csvData && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center gap-2 text-green-800">
                  <CheckCircle className="w-4 h-4" />
                  <span className="font-medium">
                    {csvData.length} prodotti caricati
                  </span>
                </div>
                <p className="text-sm text-green-600 mt-1">
                  Totale: {formatPrice(csvData.reduce((sum, p) => sum + (p.quantity * p.price), 0))}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sezione Dati Fornitore */}
        <Card className="bg-yellow-50 border-yellow-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800">
              <Plus className="w-5 h-5" />
              Dati Fornitore
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Fornitore *
              </label>
              <Input
                value={supplierData.supplier}
                onChange={(e) => setSupplierData(prev => ({ ...prev, supplier: e.target.value }))}
                placeholder="Nome fornitore"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Data Acquisto *
              </label>
              <Input
                type="date"
                value={supplierData.purchaseDate}
                onChange={(e) => setSupplierData(prev => ({ ...prev, purchaseDate: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Numero Fattura
              </label>
              <Input
                value={supplierData.invoiceNumber}
                onChange={(e) => setSupplierData(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                placeholder="Numero fattura"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Data Pagamento
              </label>
              <Input
                type="date"
                value={supplierData.paymentDate}
                onChange={(e) => setSupplierData(prev => ({ ...prev, paymentDate: e.target.value }))}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Errori */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-800">
            <AlertCircle className="w-4 h-4" />
            <span className="font-medium">{error}</span>
          </div>
        </div>
      )}

      {/* Preview e Conferma */}
      {csvData && supplierData.supplier && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Preview Ordine
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Fornitore</label>
                  <p className="text-lg font-semibold">{supplierData.supplier}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Data Acquisto</label>
                  <p className="text-lg font-semibold">{supplierData.purchaseDate}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Prodotti</label>
                  <p className="text-lg font-semibold">{csvData.length}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Valore Totale</label>
                  <p className="text-lg font-semibold text-green-600">
                    {formatPrice(csvData.reduce((sum, p) => sum + (p.quantity * p.price), 0))}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Button
                  onClick={handlePreview}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Anteprima Completa
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview Completa */}
      {previewData && (
        <Card className="mt-6 border-2 border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <CheckCircle className="w-5 h-5" />
              Conferma Ordine
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Numero Ordine</label>
                  <p className="text-lg font-semibold text-blue-600">{previewData.orderNumber}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Fornitore</label>
                  <p className="text-lg font-semibold">{previewData.supplier}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Data Acquisto</label>
                  <p className="text-lg font-semibold">{previewData.purchaseDate}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Valore Totale</label>
                  <p className="text-lg font-semibold text-green-600">
                    {formatPrice(previewData.totalValue)}
                  </p>
                </div>
              </div>

              {/* Tabella Prodotti */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        SKU
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantità
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Prezzo Unitario
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Totale
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {previewData.products.map((product, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {product.sku}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {product.quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatPrice(product.price)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          {formatPrice(product.quantity * product.price)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleConfirmOrder}
                  disabled={loading}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {loading ? 'Salvando...' : 'Conferma Ordine'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setPreviewData(null)}
                  className="flex-1"
                >
                  Annulla
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SupplierOrdersPage; 