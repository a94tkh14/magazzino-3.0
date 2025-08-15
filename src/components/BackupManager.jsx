import React, { useState, useEffect } from 'react';
import { Download, Upload, RotateCcw, Clock, FileText, Database, Settings, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import backupManager from '../lib/backupManager';

const BackupManager = () => {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentOperation, setCurrentOperation] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [selectedFile, setSelectedFile] = useState(null);
  const [autoBackup, setAutoBackup] = useState({
    enabled: false,
    frequency: 'weekly',
    type: 'full'
  });

  useEffect(() => {
    loadBackups();
  }, []);

  const loadBackups = async () => {
    try {
      const result = await backupManager.listBackups();
      if (result.success) {
        setBackups(result.backups);
      }
    } catch (error) {
      console.error('Errore caricamento backup:', error);
    }
  };

  const handleBackup = async (type) => {
    setLoading(true);
    setCurrentOperation(`Creazione backup ${type}...`);
    setMessage({ type: '', text: '' });

    try {
      let result;
      switch (type) {
        case 'database':
          result = await backupManager.createDatabaseBackup();
          break;
        case 'config':
          result = await backupManager.createConfigBackup();
          break;
        case 'full':
          result = await backupManager.createFullBackup();
          break;
        default:
          throw new Error('Tipo backup non valido');
      }

      if (result.success) {
        setMessage({ type: 'success', text: result.message });
        await loadBackups(); // Ricarica la lista
      } else {
        setMessage({ type: 'error', text: result.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: `Errore: ${error.message}` });
    } finally {
      setLoading(false);
      setCurrentOperation('');
    }
  };

  const handleRestore = async (backup) => {
    if (!window.confirm(`Sei sicuro di voler ripristinare il backup "${backup.filename}"? Questa operazione sovrascriverà i dati esistenti.`)) {
      return;
    }

    setLoading(true);
    setCurrentOperation('Ripristino in corso...');
    setMessage({ type: '', text: '' });

    try {
      // Per ora ripristiniamo solo i backup del database
      if (backup.type === 'database' || backup.type === 'full') {
        const result = await backupManager.restoreDatabaseBackup(backup);
        if (result.success) {
          setMessage({ type: 'success', text: result.message });
        } else {
          setMessage({ type: 'error', text: result.error });
        }
      } else {
        setMessage({ type: 'error', text: 'Ripristino supportato solo per backup database' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: `Errore ripristino: ${error.message}` });
    } finally {
      setLoading(false);
      setCurrentOperation('');
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/json') {
      setSelectedFile(file);
    } else {
      setMessage({ type: 'error', text: 'Seleziona un file JSON valido' });
    }
  };

  const handleRestoreFromFile = async () => {
    if (!selectedFile) {
      setMessage({ type: 'error', text: 'Seleziona un file backup' });
      return;
    }

    setLoading(true);
    setCurrentOperation('Ripristino da file...');
    setMessage({ type: '', text: '' });

    try {
      const text = await selectedFile.text();
      const backupData = JSON.parse(text);
      
      if (backupData.type === 'database' || backupData.type === 'full') {
        const result = await backupManager.restoreDatabaseBackup(backupData);
        if (result.success) {
          setMessage({ type: 'success', text: result.message });
          setSelectedFile(null);
        } else {
          setMessage({ type: 'error', text: result.error });
        }
      } else {
        setMessage({ type: 'error', text: 'File non supportato per il ripristino' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: `Errore ripristino da file: ${error.message}` });
    } finally {
      setLoading(false);
      setCurrentOperation('');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('it-IT');
  };

  const getBackupIcon = (type) => {
    switch (type) {
      case 'database':
        return <Database className="w-5 h-5" />;
      case 'config':
        return <Settings className="w-5 h-5" />;
      case 'full':
        return <FileText className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const getBackupTypeLabel = (type) => {
    switch (type) {
      case 'database':
        return 'Database';
      case 'config':
        return 'Configurazioni';
      case 'full':
        return 'Completo';
      default:
        return type;
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <FileText className="w-6 h-6 text-blue-600" />
          Gestione Backup Sistema
        </h2>

        {/* Messaggi */}
        {message.text && (
          <div className={`p-4 rounded-lg mb-6 ${
            message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
            message.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
            'bg-blue-50 text-blue-800 border border-blue-200'
          }`}>
            <div className="flex items-center gap-2">
              {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> :
               message.type === 'error' ? <XCircle className="w-5 h-5" /> :
               <AlertCircle className="w-5 h-5" />}
              {message.text}
            </div>
          </div>
        )}

        {/* Operazioni in corso */}
        {currentOperation && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 text-blue-800">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              {currentOperation}
            </div>
          </div>
        )}

        {/* Pulsanti backup */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <button
            onClick={() => handleBackup('database')}
            disabled={loading}
            className="flex items-center justify-center gap-2 p-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Database className="w-5 h-5" />
            Backup Database
          </button>

          <button
            onClick={() => handleBackup('config')}
            disabled={loading}
            className="flex items-center justify-center gap-2 p-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Settings className="w-5 h-5" />
            Backup Configurazioni
          </button>

          <button
            onClick={() => handleBackup('full')}
            disabled={loading}
            className="flex items-center justify-center gap-2 p-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <FileText className="w-5 h-5" />
            Backup Completo
          </button>
        </div>

        {/* Ripristino da file */}
        <div className="bg-gray-50 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Ripristino da File
          </h3>
          
          <div className="flex items-center gap-4">
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            
            <button
              onClick={handleRestoreFromFile}
              disabled={!selectedFile || loading}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Ripristina
            </button>
          </div>
          
          {selectedFile && (
            <p className="text-sm text-gray-600 mt-2">
              File selezionato: {selectedFile.name} ({formatFileSize(selectedFile.size)})
            </p>
          )}
        </div>

        {/* Backup automatici */}
        <div className="bg-gray-50 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Backup Automatici
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="autoBackup"
                checked={autoBackup.enabled}
                onChange={(e) => setAutoBackup(prev => ({ ...prev, enabled: e.target.checked }))}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="autoBackup" className="text-sm font-medium text-gray-700">
                Abilita backup automatici
              </label>
            </div>
            
            <select
              value={autoBackup.frequency}
              onChange={(e) => setAutoBackup(prev => ({ ...prev, frequency: e.target.value }))}
              disabled={!autoBackup.enabled}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
            >
              <option value="daily">Giornaliero</option>
              <option value="weekly">Settimanale</option>
              <option value="monthly">Mensile</option>
            </select>
            
            <select
              value={autoBackup.type}
              onChange={(e) => setAutoBackup(prev => ({ ...prev, type: e.target.value }))}
              disabled={!autoBackup.enabled}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
            >
              <option value="database">Database</option>
              <option value="config">Configurazioni</option>
              <option value="full">Completo</option>
            </select>
          </div>
        </div>

        {/* Lista backup */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <RotateCcw className="w-5 h-5" />
            Backup Disponibili ({backups.length})
          </h3>
          
          {backups.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Nessun backup disponibile
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nome File
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Dimensione
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data Creazione
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Azioni
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {backups.map((backup) => (
                    <tr key={backup.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {getBackupIcon(backup.type)}
                          <span className="text-sm font-medium text-gray-900">
                            {getBackupTypeLabel(backup.type)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {backup.filename}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatFileSize(backup.size)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(backup.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleRestore(backup)}
                            disabled={loading}
                            className="text-orange-600 hover:text-orange-900 disabled:opacity-50"
                          >
                            <Upload className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              // Download del backup
                              const link = document.createElement('a');
                              link.href = `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(backup, null, 2))}`;
                              link.download = backup.filename;
                              link.click();
                            }}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BackupManager; 