import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Warehouse, Package, ShoppingCart, DollarSign, Settings, BarChart3, Truck, TrendingUp } from 'lucide-react';
import { cn } from '../lib/utils';

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [logo, setLogo] = useState(null);
  const [appName, setAppName] = useState('Dashboard');

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
    { path: '/', icon: BarChart3, label: 'Dashboard' },
    { path: '/magazzino', icon: Warehouse, label: 'Magazzino' },
    { path: '/stock', icon: Package, label: 'Stock' },
    { path: '/ordini', icon: ShoppingCart, label: 'Ordini' },
    { path: '/ordini-fornitori', icon: Truck, label: 'Ordini Fornitori' },
    { path: '/marketing', icon: TrendingUp, label: 'Marketing' },
    { path: '/costi', icon: DollarSign, label: 'Costi' },
    { path: '/settings', icon: Settings, label: 'Impostazioni' },
  ];

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo e Nome */}
          <div className="flex items-center">
            <div 
              className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={handleLogoClick}
            >
              {logo ? (
                <img
                  src={logo}
                  alt="Logo"
                  className="h-8 w-8 object-contain"
                />
              ) : (
                <Warehouse className="h-8 w-8 text-blue-600" />
              )}
              <span className="text-xl font-bold text-gray-900">
                {appName}
              </span>
            </div>
          </div>

          {/* Menu di Navigazione */}
          <div className="flex items-center space-x-1">
            {(Array.isArray(navItems) ? navItems : []).map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  )}
                >
                  <Icon className="h-5 w-5 mr-2" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 