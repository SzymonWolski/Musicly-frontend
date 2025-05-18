// src/App.tsx
import { Route, Routes } from "react-router-dom";
import MainLayout from "./layout/MainLayout";
import HomePage from "./pages/home/HomePage";
import AlbumStrona from "./pages/album/AlbumStrona";
import LoginForm from "./components/auth/LoginForm";
import RegisterForm from "./components/auth/RegisterForm";
import Dashboard from "./pages/Dashboard";
import MessagesPage from "./pages/MessagesPage";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import AdminPanel from "./pages/adminPanel";



function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Publiczne ścieżki */}
        <Route path="/login" element={<LoginForm />} />
        <Route path="/register" element={<RegisterForm />} />
        
        {/* Ścieżki z MainLayout */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/album" element={<AlbumStrona />} />
          
          {/* Chronione ścieżki */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/wiadomości" element={<MessagesPage />} />
            <Route path="/adminPanel" element={<AdminPanel />} />
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;