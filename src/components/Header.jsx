import React, { useState, useEffect } from 'react';
import { User, Clock, Wifi } from 'lucide-react';

const Header = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [syncTime, setSyncTime] = useState(new Date());

  useEffect(() => {
    // Aggiorna l'ora corrente ogni minuto
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    // Simula sincronizzazione ogni 5 minuti
    const syncInterval = setInterval(() => {
      setSyncTime(new Date());
    }, 300000);

    return () => {
      clearInterval(timeInterval);
      clearInterval(syncInterval);
    };
  }, []);

  const formatDate = (date) => {
    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-blue-600 text-white px-6 py-3 shadow-sm">
      <div className="flex justify-between items-center">
        {/* Lato sinistro - Nome applicazione */}
        <div className="flex items-center space-x-4">
          <h1 className="text-lg font-semibold">Magazzino 3.0</h1>
          <div className="flex items-center space-x-2 text-blue-100">
            <Wifi className="h-4 w-4" />
            <span className="text-sm">Online</span>
          </div>
        </div>

        {/* Lato destro - Info utente e sincronizzazione */}
        <div className="flex items-center space-x-6">
          {/* Sincronizzazione */}
          <div className="flex items-center space-x-2 text-blue-100">
            <Clock className="h-4 w-4" />
            <span className="text-sm">
              Sync: {formatDate(syncTime)} {formatTime(syncTime)}
            </span>
          </div>

          {/* Utente */}
          <div className="flex items-center space-x-2">
            <User className="h-4 w-4" />
            <span className="text-sm font-medium">admin</span>
          </div>

          {/* Ora corrente */}
          <div className="text-blue-100 text-sm">
            {formatTime(currentTime)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header; 