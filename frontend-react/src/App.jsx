import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import RoutePlanner from './pages/RoutePlanner';
import ChatAgent from './pages/ChatAgent';

import Dashboard from './pages/Dashboard';
import Skus from './pages/Skus';
import Ports from './pages/Ports';
import Countries from './pages/Countries';
import Cities from './pages/Cities';
import PricingPlans from './pages/PricingPlans';
import Inventory from './pages/Inventory';
import Packings from './pages/Packings';
import Rates from './pages/Rates';
import FxRates from './pages/FxRates';
import Rules from './pages/Rules';
import Segments from './pages/Segments';
import TransportModes from './pages/TransportModes';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/planner" element={<RoutePlanner />} />
            <Route path="/skus" element={<Skus />} />
            <Route path="/ports" element={<Ports />} />
            <Route path="/countries" element={<Countries />} />
            <Route path="/cities" element={<Cities />} />
            <Route path="/pricing-plans" element={<PricingPlans />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/packings" element={<Packings />} />
            <Route path="/rates" element={<Rates />} />
            <Route path="/fx-rates" element={<FxRates />} />
            <Route path="/rules" element={<Rules />} />
            <Route path="/segments" element={<Segments />} />
            <Route path="/transport-modes" element={<TransportModes />} />
            <Route path="/chat" element={<ChatAgent />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
