import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import ProtectedRoute from "./pages/ProtectedRoute.jsx";
import { AuthProvider } from "./pages/AuthContext.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/register" element={<AuthPage mode="register" />} />
          <Route path="/app" element={<ProtectedRoute><App /></ProtectedRoute>} />
          <Route path="/analyze" element={<ProtectedRoute><App /></ProtectedRoute>} />
          <Route path="/history" element={<ProtectedRoute><App /></ProtectedRoute>} />
          <Route path="/analysis/:assessmentId" element={<ProtectedRoute><App /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
