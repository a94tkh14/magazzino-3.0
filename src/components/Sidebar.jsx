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
  ChevronRight,
  ChevronDown,
  BookOpen
} from 'lucide-react';
import { cn } from '../lib/utils';

const Sidebar = ({ isCollapsed, onToggle }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [logo, setLogo] = useState(null);
  const [appName, setAppName] = useState('MV Hub');
  const [expandedMenus, setExpandedMenus] = useState({});
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



  const toggleSubmenu = (key) => {
    setExpandedMenus(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Espandi automaticamente il menu se siamo in una sottopagina
  useEffect(() => {
    if (location.pathname.startsWith('/prima-nota')) {
      setExpandedMenus(prev => ({ ...prev, 'conto-economico-menu': true }));
    }
  }, [location.pathname]);

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
      label: 'Cruscotto',
      path: '/conto-economico'
    },
    { 
      key: 'prima-nota',
      icon: BookOpen, 
      label: 'Amministrazione',
      path: '/prima-nota'
    },
    { 
      key: 'logistica',
      icon: Truck, 
      label: 'Logistica',
      path: '/logistica'
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
              alt="Logo MV Hub"
              className={cn(
                "object-contain transition-all duration-300",
                isCollapsed ? "h-8 w-8" : "h-12 w-12"
              )}
            />
          ) : (
            <div className={cn(
              "bg-[#c68776] rounded-lg flex items-center justify-center transition-all duration-300",
              isCollapsed ? "h-8 w-8" : "h-10 w-10"
            )}>
              <span className="text-white font-bold text-sm">MV</span>
            </div>
          )}
          
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-lg font-bold text-gray-900">
                MV Hub
              </span>
              <span className="text-xs text-gray-500">
                Gestionale
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
            const isActive = item.path && location.pathname === item.path;
            const isSubmenuActive = item.hasSubmenu && location.pathname.startsWith('/prima-nota');
            const isExpanded = expandedMenus[item.key];
            
            // Item con submenu
            if (item.hasSubmenu) {
              return (
                <li key={item.key}>
                  <button
                    onClick={() => toggleSubmenu(item.key)}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors group',
                      isSubmenuActive
                        ? 'bg-[#c68776]/10 text-[#c68776]'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    )}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className={cn(
                        'h-5 w-5',
                        isSubmenuActive ? 'text-[#c68776]' : 'text-gray-400 group-hover:text-gray-600'
                      )} />
                      {!isCollapsed && <span>{item.label}</span>}
                    </div>
                    {!isCollapsed && (
                      <ChevronDown className={cn(
                        'h-4 w-4 transition-transform duration-200',
                        isExpanded ? 'rotate-180' : '',
                        isSubmenuActive ? 'text-[#c68776]' : 'text-gray-400'
                      )} />
                    )}
                  </button>
                  
                  {/* Submenu */}
                  {!isCollapsed && isExpanded && (
                    <ul className="mt-1 ml-4 pl-4 border-l border-gray-200 space-y-1">
                      {item.submenu.map((subItem) => {
                        const SubIcon = subItem.icon;
                        const isSubActive = location.pathname + location.search === subItem.path || 
                          (location.pathname === '/prima-nota' && subItem.path.includes(new URLSearchParams(location.search).get('tab') || 'prima-nota'));
                        
                        return (
                          <li key={subItem.key}>
                            <Link
                              to={subItem.path}
                              className={cn(
                                'flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
                                isSubActive
                                  ? 'bg-[#c68776]/10 text-[#c68776] font-medium'
                                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                              )}
                            >
                              <SubIcon className={cn(
                                'h-4 w-4',
                                isSubActive ? 'text-[#c68776]' : 'text-gray-400'
                              )} />
                              <span>{subItem.label}</span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            }
            
            // Item normale senza submenu
            return (
              <li key={item.key}>
                <Link
                  to={item.path}
                  className={cn(
                    'flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors group',
                    isActive
                      ? 'bg-[#c68776]/10 text-[#c68776] border-r-2 border-[#c68776]'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  )}
                  title={isCollapsed ? item.label : undefined}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={cn(
                      'h-5 w-5',
                      isActive ? 'text-[#c68776]' : 'text-gray-400 group-hover:text-gray-600'
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
          className="w-full flex items-center justify-center p-3 rounded-lg bg-[#c68776]/10 hover:bg-[#c68776]/20 text-[#c68776] hover:text-[#b07567] transition-all duration-200 border border-[#c68776]/30 hover:border-[#c68776]/50"
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