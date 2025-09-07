import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  Package,
  Archive,
  TrendingUp,
  Clock
} from 'lucide-react';

const SyncProgress = ({ syncProgress, onCancel }) => {
  if (!syncProgress.isRunning) {
    return null;
  }

  const getProgressPercentage = () => {
    if (syncProgress.totalPages > 0) {
      return Math.min((syncProgress.currentPage / syncProgress.totalPages) * 100, 100);
    }
    // Stima basata sul numero di ordini scaricati
    if (syncProgress.ordersDownloaded > 0) {
      // Assumiamo che ci siano circa 250 ordini per pagina
      const estimatedPages = Math.ceil(syncProgress.ordersDownloaded / 250);
      return Math.min((estimatedPages / 10) * 100, 90); // Max 90% per stima
    }
    return 0;
  };

  const getStatusIcon = () => {
    if (syncProgress.currentStatus.includes('completata')) {
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    }
    if (syncProgress.currentStatus.includes('errore')) {
      return <AlertCircle className="h-5 w-5 text-red-600" />;
    }
    return <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />;
  };

  const getStatusColor = () => {
    if (syncProgress.currentStatus.includes('completata')) {
      return 'text-green-700';
    }
    if (syncProgress.currentStatus.includes('errore')) {
      return 'text-red-700';
    }
    return 'text-blue-700';
  };

  const getProgressColor = () => {
    if (syncProgress.currentStatus.includes('completata')) {
      return 'bg-green-600';
    }
    if (syncProgress.currentStatus.includes('errore')) {
      return 'bg-red-600';
    }
    return 'bg-blue-600';
  };

  return (
    <Card className="bg-blue-50 border-blue-200 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-blue-800">
          <RefreshCw className="h-5 w-5 animate-spin" />
          Sincronizzazione Ordini Shopify
        </CardTitle>
        <CardDescription className="text-blue-600">
          Scaricamento in corso di tutti gli ordini dal tuo store
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Barra di progresso */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-blue-800">
              Progresso generale
            </span>
            <span className="text-blue-600">
              {Math.round(getProgressPercentage())}%
            </span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-3">
            <div 
              className={`h-3 rounded-full transition-all duration-500 ${getProgressColor()}`}
              style={{ width: `${getProgressPercentage()}%` }}
            ></div>
          </div>
        </div>

        {/* Statistiche in tempo reale */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="text-center p-3 bg-white rounded-lg border border-blue-200">
            <div className="flex items-center justify-center mb-1">
              <Package className="h-4 w-4 text-blue-600" />
            </div>
            <p className="text-xs text-blue-600 font-medium">Pagina Corrente</p>
            <p className="text-lg font-bold text-blue-800">{syncProgress.currentPage}</p>
            {syncProgress.totalPages > 0 && (
              <p className="text-xs text-blue-500">di {syncProgress.totalPages}</p>
            )}
          </div>
          
          <div className="text-center p-3 bg-white rounded-lg border border-blue-200">
            <div className="flex items-center justify-center mb-1">
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
            <p className="text-xs text-green-600 font-medium">Ordini Scaricati</p>
            <p className="text-lg font-bold text-green-800">{syncProgress.ordersDownloaded.toLocaleString()}</p>
            {syncProgress.averageSpeed > 0 && (
              <p className="text-xs text-green-500">{syncProgress.averageSpeed}/sec</p>
            )}
          </div>
          
          <div className="text-center p-3 bg-white rounded-lg border border-blue-200">
            <div className="flex items-center justify-center mb-1">
              <Clock className="h-4 w-4 text-purple-600" />
            </div>
            <p className="text-xs text-purple-600 font-medium">Tempo Trascorso</p>
            <p className="text-sm font-medium text-purple-800">
              {syncProgress.startTime ? 
                (() => {
                  const elapsed = Date.now() - syncProgress.startTime;
                  const minutes = Math.floor(elapsed / 60000);
                  const seconds = Math.floor((elapsed % 60000) / 1000);
                  return `${minutes}m ${seconds}s`;
                })() : 
                '0m 0s'}
            </p>
            {syncProgress.estimatedTimeRemaining && (
              <p className="text-xs text-purple-500">Rimanente: {syncProgress.estimatedTimeRemaining}</p>
            )}
          </div>
          
          <div className="text-center p-3 bg-white rounded-lg border border-blue-200">
            <div className="flex items-center justify-center mb-1">
              <Archive className="h-4 w-4 text-gray-600" />
            </div>
            <p className="text-xs text-gray-600 font-medium">Memoria</p>
            <p className="text-sm font-medium text-gray-800">
              {syncProgress.memoryUsage > 0 ? `${syncProgress.memoryUsage} KB` : 'Calcolando...'}
            </p>
            {syncProgress.errorsCount > 0 && (
              <p className="text-xs text-red-500">Errori: {syncProgress.errorsCount}</p>
            )}
          </div>
        </div>

        {/* Status corrente */}
        <div className="bg-white p-3 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className={`font-medium ${getStatusColor()}`}>
              {syncProgress.currentStatus}
            </span>
          </div>
        </div>

        {/* Informazioni aggiuntive */}
        <div className="text-xs text-blue-600 space-y-1">
          <p>• La sincronizzazione scarica tutti gli ordini attivi e archiviati</p>
          <p>• Gli ordini archiviati includono quelli cancellati e rimborsati</p>
          <p>• Ogni pagina contiene fino a 250 ordini per ottimizzare le prestazioni</p>
          <p>• Le pause tra le chiamate evitano di raggiungere i limiti di rate</p>
        </div>

        {/* Pulsante annulla */}
        {onCancel && (
          <div className="flex justify-center pt-2">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-red-700 bg-red-100 border border-red-300 rounded-md hover:bg-red-200 transition-colors"
            >
              Annulla Sincronizzazione
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SyncProgress;
