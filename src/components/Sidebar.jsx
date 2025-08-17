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
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { cn } from '../lib/utils';

const Sidebar = ({ isCollapsed, onToggle }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [logo, setLogo] = useState(null);
  const [appName, setAppName] = useState('MVL');
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



  const navItems = [
    { 
      key: 'dashboard',
      icon: BarChart3, 
      label: 'Dashboard',
      path: '/dashboard'
    },
    { 
      key: 'magazzino',
      icon: Warehouse, 
      label: 'Magazzino',
      path: '/magazzino'
    },
    { 
      key: 'stock',
      icon: Package, 
      label: 'Stock',
      path: '/stock'
    },
    { 
      key: 'ordini',
      icon: ShoppingCart, 
      label: 'Ordini',
      path: '/ordini'
    },
    { 
      key: 'shopify-orders',
      icon: ShoppingCart, 
      label: 'Ordini Shopify',
      path: '/shopify-orders'
    },
    { 
      key: 'ordini-fornitori',
      icon: Truck, 
      label: 'Ordini Fornitori',
      path: '/ordini-fornitori'
    },
    { 
      key: 'marketing',
      icon: TrendingUp, 
      label: 'Marketing',
      path: '/marketing'
    },
    { 
      key: 'costi',
      icon: DollarSign, 
      label: 'Costi',
      path: '/costi'
    },
    { 
      key: 'conto-economico',
      icon: Calculator, 
      label: 'Conto Economico',
      path: '/conto-economico'
    },
    { 
      key: 'settings',
      icon: Settings, 
      label: 'Impostazioni',
      path: '/settings'
    }
  ];

  return (
    <div className={cn(
      "bg-white border-r border-gray-200 h-screen flex flex-col transition-all duration-300",
      isCollapsed ? "w-16" : "w-64"
    )}>
      {/* Header con Logo e Nome */}
      <div className="p-4 border-b border-gray-200">
        <div 
          className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={handleLogoClick}
        >
          {logo ? (
            <img
              src={logo}
              alt="Logo MVL"
              className={cn(
                "object-contain transition-all duration-300",
                isCollapsed ? "h-8 w-8" : "h-12 w-12"
              )}
            />
          ) : (
            <div className={cn(
              "bg-purple-700 rounded-lg flex items-center justify-center transition-all duration-300",
              isCollapsed ? "h-8 w-8" : "h-12 w-12"
            )}>
              {isCollapsed ? (
                <span className="text-white font-bold text-lg">M</span>
              ) : (
                <div className="flex flex-col items-center text-white">
                  <span className="font-bold text-lg">MVL</span>
                  <span className="text-xs">LOGISTICA</span>
                </div>
              )}
            </div>
          )}
          
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-lg font-bold text-gray-900">
                MVL
              </span>
              <span className="text-xs text-gray-500">
                Il tuo partner di logistica
              </span>
            </div>
          )}
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
                  title={isCollapsed ? item.label : undefined}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={cn(
                      'h-5 w-5',
                      isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'
                    )} />
                    {!isCollapsed && <span>{item.label}</span>}
                  </div>
                  {!isCollapsed && (
                    <div className="text-gray-400 group-hover:text-gray-600">
                      →
                    </div>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Pulsante per collassare/espandere */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center p-3 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-700 transition-all duration-200 border border-blue-200 hover:border-blue-300"
          title={isCollapsed ? "Espandi sidebar" : "Collassa sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </button>
      </div>
    </div>
  );
};

export default Sidebar; 