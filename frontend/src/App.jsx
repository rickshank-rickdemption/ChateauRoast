import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { WebSocketProvider } from './context/WebSocketContext';
import { AuthProvider, useAuth } from './context/AuthContext';

import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import KitchenDashboard from './pages/KitchenDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ShopPage from './pages/ShopPage';
import LocationsPage from './pages/LocationsPage';
import SubscribePage from './pages/SubscribePage';
import EquipmentPage from './pages/EquipmentPage';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (!allowedRoles.includes(user.role)) return <Navigate to="/" />;
  return children;
};

const App = () => {
  return (
    <BrowserRouter>
      <WebSocketProvider>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/shop" element={<ShopPage />} />
            <Route path="/locations" element={<LocationsPage />} />
            <Route path="/subscribe" element={<SubscribePage />} />
            <Route path="/equipment" element={<EquipmentPage />} />

            <Route path="/cashier" element={<Navigate to="/shop" replace />} />

            <Route
              path="/kitchen"
              element={
                <ProtectedRoute allowedRoles={['kitchen']}>
                  <KitchenDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </WebSocketProvider>
    </BrowserRouter>
  );
};

export default App;
