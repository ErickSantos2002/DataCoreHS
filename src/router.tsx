import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./pages/Home"; // Novo import

const AppRoutes: React.FC = () => (
  <Routes>
    <Route path="/login" element={<Login />} />
    
    <Route
      path="/inicio"
      element={
        <ProtectedRoute>
          <Home />
        </ProtectedRoute>
      }
    />

    <Route
      path="/dashboard"
      element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      }
    />

    {/* Rota padrão agora redireciona para "inicio" */}
    <Route path="/" element={<Navigate to="/inicio" />} />
    
    <Route path="*" element={<NotFound />} />
  </Routes>
);

export default AppRoutes;
