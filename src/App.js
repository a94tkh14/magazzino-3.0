import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import DashboardPage from './pages/DashboardPage';
import StockPage from './pages/StockPage';
import MagazzinoPage from './pages/MagazzinoPage';
import OrdiniPage from './pages/OrdiniPage';
import OrderDetailPage from './pages/OrderDetailPage';
import SupplierOrdersPage from './pages/SupplierOrdersPage';
import SupplierOrdersListPage from './pages/SupplierOrdersListPage';
import SupplierOrderDetailPage from './pages/SupplierOrderDetailPage';
import CostiPage from './pages/CostiPage';
import MagazzinoDetailPage from './pages/MagazzinoDetailPage';
import SettingsPage from './pages/SettingsPage';
import MarketingPage from './pages/MarketingPage';
import './index.css';

// Debug Component
function DebugInfo() {
  const [showDebug, setShowDebug] = React.useState(false);
  
  React.useEffect(() => {
    // Mostra debug se siamo in modalità sviluppo
    if (process.env.NODE_ENV === 'development') {
      setShowDebug(true);
    }
  }, []);

  if (!showDebug) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-black bg-opacity-75 text-white p-4 rounded-lg text-xs max-w-sm">
      <div className="flex justify-between items-center mb-2">
        <span className="font-bold">Debug Info</span>
        <button onClick={() => setShowDebug(false)} className="text-gray-300 hover:text-white">×</button>
      </div>
      <div className="space-y-1">
        <div>NODE_ENV: {process.env.NODE_ENV}</div>
        <div>REACT_APP_SUPABASE_URL: {process.env.REACT_APP_SUPABASE_URL ? 'Set' : 'Not set'}</div>
        <div>REACT_APP_SUPABASE_ANON_KEY: {process.env.REACT_APP_SUPABASE_ANON_KEY ? 'Set' : 'Not set'}</div>
        <div>User Agent: {navigator.userAgent.substring(0, 50)}...</div>
      </div>
    </div>
  );
}

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Errore nell'applicazione</h1>
            <div className="bg-gray-100 p-4 rounded mb-4">
              <h2 className="font-semibold mb-2">Dettagli dell'errore:</h2>
              <pre className="text-sm overflow-auto">{this.state.error && this.state.error.toString()}</pre>
            </div>
            <div className="bg-gray-100 p-4 rounded">
              <h2 className="font-semibold mb-2">Stack trace:</h2>
              <pre className="text-sm overflow-auto">{this.state.errorInfo && this.state.errorInfo.componentStack}</pre>
            </div>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Ricarica la pagina
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <div className="min-h-screen bg-background">
          <Navbar />
          <main className="pt-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            <div className="py-6">
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/stock" element={<StockPage />} />
                <Route path="/magazzino" element={<MagazzinoPage />} />
                <Route path="/ordini" element={<OrdiniPage />} />
                <Route path="/ordini/:orderId" element={<OrderDetailPage />} />
                <Route path="/ordini-fornitori" element={<SupplierOrdersListPage />} />
                <Route path="/ordini-fornitori/nuovo" element={<SupplierOrdersPage />} />
                <Route path="/ordini-fornitori/:orderId" element={<SupplierOrderDetailPage />} />
                <Route path="/marketing" element={<MarketingPage />} />
                <Route path="/costi" element={<CostiPage />} />
                <Route path="/magazzino/:sku" element={<MagazzinoDetailPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Routes>
            </div>
          </main>
        </div>
        <DebugInfo />
      </Router>
    </ErrorBoundary>
  );
}

export default App;