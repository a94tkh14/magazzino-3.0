import React, { useState, useEffect } from 'react';
import { User, Clock, Wifi, Menu, X } from 'lucide-react';

const Header = ({ sidebarCollapsed, onToggleSidebar }) => {
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
    <div className="bg-[#604EC2] text-white px-6 py-3 shadow-sm">
      <div className="flex justify-between items-center">
                {/* Lato sinistro - Logo MVL e pulsante toggle */}
        <div className="flex items-center space-x-4">
          {/* Pulsante toggle sidebar */}
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-md hover:bg-[#4A3DA8] transition-colors"
            title={sidebarCollapsed ? "Mostra sidebar" : "Nascondi sidebar"}
          >
            {sidebarCollapsed ? (
              <Menu className="h-5 w-5 text-white" />
            ) : (
              <X className="h-5 w-5 text-white" />
            )}
          </button>
          
          {/* Logo MVL Ufficiale */}
          <div className="flex items-center space-x-3">
            {/* Immagine logo MVL */}
            <img 
              src="/MVL solo scirtta.png" 
              alt="Logo MVL" 
              className="h-16 w-auto object-contain"
            />
          </div>
        </div>

        {/* Lato destro - Info utente e sincronizzazione */}
        <div className="flex items-center space-x-6">
          {/* Sincronizzazione */}
          <div className="flex items-center space-x-2 text-purple-100">
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
          <div className="text-purple-100 text-sm">
            {formatTime(currentTime)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header; 