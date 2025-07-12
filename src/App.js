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

function App() {
  return (
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
    </Router>
  );
}

export default App;