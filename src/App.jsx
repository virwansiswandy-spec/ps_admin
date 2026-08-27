import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import MainLayout from './components/Layout/MainLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Orders from './pages/Orders';
import Items from './pages/Items';
import Categories from './pages/Categories';
import Compositions from './pages/Compositions';
import Bonuses from './pages/Bonuses';
import Purchases from './pages/Purchases';
import Ratings from './pages/Ratings';
import Portfolios from './pages/Portfolios';
import UsersPage from './pages/UsersPage';
import Profile from './pages/Profile';
import StoreSettings from './pages/StoreSettings';
import WhatsAppChat from './pages/WhatsAppChat';
import ActivateEmail from './pages/ActivateEmail';
import ResetPassword from './pages/ResetPassword';
import PublicRating from './pages/PublicRating';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="h-screen w-screen bg-slate-950 flex items-center justify-center text-emerald-400 font-bold">Memuat Sistem Kasir...</div>;
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const SuperAdminRoute = ({ children }) => {
  const { isSuperAdmin, loading } = useAuth();
  if (loading) return <div className="h-screen w-screen bg-slate-950 flex items-center justify-center text-emerald-400 font-bold">Memuat Otentikasi...</div>;
  return isSuperAdmin ? children : <Navigate to="/dashboard" replace />;
};

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/activate" element={<ActivateEmail />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/rate/:invoiceNumber" element={<PublicRating />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Dashboard />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Dashboard />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/pos"
          element={
            <ProtectedRoute>
              <MainLayout>
                <POS />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Orders />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/whatsapp"
          element={
            <ProtectedRoute>
              <MainLayout>
                <WhatsAppChat />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/items"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Items />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/categories"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Categories />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/compositions"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Compositions />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/bonuses"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Bonuses />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/purchases"
          element={
            <SuperAdminRoute>
              <MainLayout>
                <Purchases />
              </MainLayout>
            </SuperAdminRoute>
          }
        />
        <Route
          path="/users"
          element={
            <SuperAdminRoute>
              <MainLayout>
                <UsersPage />
              </MainLayout>
            </SuperAdminRoute>
          }
        />
        <Route
          path="/ratings"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Ratings />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/portfolios"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Portfolios />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Profile />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <SuperAdminRoute>
              <MainLayout>
                <StoreSettings />
              </MainLayout>
            </SuperAdminRoute>
          }
        />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
