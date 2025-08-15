import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Warehouse, 
  Package, 
  ShoppingCart, 
  DollarSign, 
  Settings, 
  BarChart3, 
  Truck, 
  TrendingUp, 
  Calculator,
  Users,
  FileText,
  Store,
  Eye,
  User,
  Calendar,
  LineChart
} from 'lucide-react';
import { cn } from '../lib/utils';

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [logo, setLogo] = useState(null);
  const [appName, setAppName] = useState('Magazzino App');
  const [expandedItems, setExpandedItems] = useState({});

  // Carica il logo e il nome dal localStorage all'avvio
  useEffect(() => {
    const savedLogo = localStorage.getItem('appLogo');
    const savedName = localStorage.getItem('appName');
    
    if (savedLogo) {
      setLogo(savedLogo);
    }
    
    if (savedName) {
      setAppName(savedName);
    }
  }, []);

  // Ascolta i cambiamenti del logo e del nome
  useEffect(() => {
    const handleLogoChange = () => {
      const savedLogo = localStorage.getItem('appLogo');
      setLogo(savedLogo);
    };

    const handleNameChange = () => {
      const savedName = localStorage.getItem('appName');
      setAppName(savedName);
    };

    window.addEventListener('logoChanged', handleLogoChange);
    window.addEventListener('nameChanged', handleNameChange);
    
    return () => {
      window.removeEventListener('logoChanged', handleLogoChange);
      window.removeEventListener('nameChanged', handleNameChange);
    };
  }, []);

  const handleLogoClick = () => {
    navigate('/');
  };

  const toggleExpanded = (key) => {
    setExpandedItems(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const navItems = [
    { 
      key: 'partners',
      icon: Users, 
      label: 'Partners',
      path: '/partners'
    },
    { 
      key: 'magazzino',
      icon: Warehouse, 
      label: 'Magazzino',
      path: '/magazzino'
    },
    { 
      key: 'listini',
      icon: DollarSign, 
      label: 'Listini',
      path: '/listini'
    },
    { 
      key: 'vendite',
      icon: ShoppingCart, 
      label: 'Vendite',
      path: '/vendite'
    },
    { 
      key: 'acquisti',
      icon: Package, 
      label: 'Acquisti',
      path: '/acquisti'
    },
    { 
      key: 'scadenzario',
      icon: Calendar, 
      label: 'Scadenzario',
      path: '/scadenzario'
    },
    { 
      key: 'produzione',
      icon: LineChart, 
      label: 'Produzione',
      path: '/produzione'
    },
    { 
      key: 'negozi',
      icon: Store, 
      label: 'Negozi',
      path: '/negozi'
    },
    { 
      key: 'contabilita',
      icon: Eye, 
      label: 'Contabilità',
      path: '/contabilita'
    },
    { 
      key: 'personale',
      icon: User, 
      label: 'Personale',
      path: '/personale'
    },
    { 
      key: 'statistiche',
      icon: BarChart3, 
      label: 'Statistiche e Analisi',
      path: '/statistiche'
    },
    { 
      key: 'report-magazzino',
      icon: BarChart3, 
      label: 'Report di Magazzino',
      path: '/report-magazzino'
    },
    { 
      key: 'anagrafiche',
      icon: FileText, 
      label: 'Anagrafiche',
      path: '/anagrafiche'
    },
    { 
      key: 'configurazione',
      icon: Settings, 
      label: 'Configurazione',
      path: '/settings'
    }
  ];

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-screen flex flex-col">
      {/* Header con Logo e Nome */}
      <div className="p-4 border-b border-gray-200">
        <div 
          className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={handleLogoClick}
        >
          {logo ? (
            <img
              src={logo}
              alt="Logo"
              className="h-10 w-10 object-contain"
            />
          ) : (
            <div className="h-10 w-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">M</span>
            </div>
          )}
          <div className="flex flex-col">
            <span className="text-lg font-bold text-gray-900">
              {appName}
            </span>
            <span className="text-xs text-gray-500">
              magazzino-app.netlify.app
            </span>
          </div>
        </div>
      </div>

      {/* Menu di Navigazione */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <li key={item.key}>
                <Link
                  to={item.path}
                  className={cn(
                    'flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors group',
                    isActive
                      ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  )}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={cn(
                      'h-5 w-5',
                      isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'
                    )} />
                    <span>{item.label}</span>
                  </div>
                  <div className="text-gray-400 group-hover:text-gray-600">
                    →
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar; 