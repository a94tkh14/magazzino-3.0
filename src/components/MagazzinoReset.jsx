import React, { useState } from 'react';
import { Trash2, AlertTriangle, CheckCircle, X, Lock } from 'lucide-react';
import { resetMagazzino } from '../lib/firebase';

const MagazzinoReset = () => {
  const [isResetting, setIsResetting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [result, setResult] = useState(null);

  const handleReset = async () => {
    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }

    if (!showPassword) {
      setShowPassword(true);
      return;
    }

    if (password !== 'cancella') {
      alert('Password errata! Devi scrivere "cancella" per confermare.');
      setPassword('');
      return;
    }

    setIsResetting(true);
    setResult(null);

    try {
      const resetResult = await resetMagazzino();
      setResult(resetResult);
      
      if (resetResult.success) {
        // Ricarica la pagina per aggiornare l'interfaccia
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    } catch (error) {
      setResult({ success: false, error: error.message });
    } finally {
      setIsResetting(false);
      setShowConfirm(false);
      setShowPassword(false);
      setPassword('');
    }
  };

  const cancelReset = () => {
    setShowConfirm(false);
    setShowPassword(false);
    setPassword('');
    setResult(null);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-red-200">
      <div className="flex items-center space-x-3 mb-4">
        <Trash2 className="h-6 w-6 text-red-600" />
        <h3 className="text-lg font-semibold text-gray-900">Reset Completo Magazzino</h3>
      </div>

      <div className="mb-4">
        <div className="flex items-start space-x-3 p-4 bg-red-50 rounded-lg border border-red-200">
          <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-red-800">
            <p className="font-medium">⚠️ Attenzione!</p>
            <p>Questa azione cancellerà <strong>TUTTI</strong> i prodotti dal magazzino in modo permanente.</p>
            <p className="mt-2">I dati verranno rimossi sia da Firebase che dal localStorage.</p>
          </div>
        </div>
      </div>

      {!showConfirm && !showPassword && !result && (
        <button
          onClick={handleReset}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
        >
          <Trash2 className="h-4 w-4" />
          <span>Reset Completo Magazzino</span>
        </button>
      )}

      {showConfirm && !showPassword && (
        <div className="space-y-3">
          <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <p className="text-sm text-yellow-800 font-medium">
              <strong>Prima Conferma:</strong> Sei sicuro di voler cancellare TUTTI i prodotti? Questa azione non può essere annullata.
            </p>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={handleReset}
              className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
            >
              <AlertTriangle className="h-4 w-4" />
              <span>Conferma Prima Volta</span>
            </button>
            
            <button
              onClick={cancelReset}
              className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
            >
              <X className="h-4 w-4" />
              <span>Annulla</span>
            </button>
          </div>
        </div>
      )}

      {showPassword && (
        <div className="space-y-3">
          <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
            <p className="text-sm text-orange-800 font-medium">
              <strong>Seconda Conferma:</strong> Scrivi "cancella" per confermare definitivamente il reset.
            </p>
          </div>
          
          <div className="space-y-3">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Scrivi 'cancella' per confermare"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                autoFocus
              />
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={handleReset}
                disabled={isResetting}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
              >
                {isResetting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Resettando...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    <span>Conferma Definitiva</span>
                  </>
                )}
              </button>
              
              <button
                onClick={cancelReset}
                disabled={isResetting}
                className="flex-1 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
              >
                <X className="h-4 w-4" />
                <span>Annulla</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {result && (
        <div className={`mt-4 p-4 rounded-lg border ${
          result.success 
            ? 'bg-green-50 border-green-200' 
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center space-x-3">
            {result.success ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-red-600" />
            )}
            <div className="text-sm">
              {result.success ? (
                <p className="text-green-800 font-medium">{result.message}</p>
              ) : (
                <p className="text-red-800 font-medium">Errore: {result.error}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MagazzinoReset; 