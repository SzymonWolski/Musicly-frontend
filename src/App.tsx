// src/App.tsx
import { Routes, Route } from "react-router-dom";
import MainLayout from "./layout/MainLayout";
import HomePage from "./pages/home/HomePage";
import AlbumStrona from "./pages/album/AlbumStrona";
import LoginForm from "./components/auth/LoginForm";
import RegisterForm from "./components/auth/RegisterForm";
import Dashboard from "./pages/Dashboard";
import FriendsPage from "./pages/FriendsPage";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import { AudioPlayerProvider } from "./context/AudioPlayerContext";
import AdminPanel from "./pages/adminPanel";



function App() {
  return (

      <AuthProvider>
        <AudioPlayerProvider>
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
                <Route path="/friends" element={<FriendsPage />} />
                <Route path="/adminPanel" element={<AdminPanel />} />
              </Route>
            </Route>
          </Routes>
        </AudioPlayerProvider>
      </AuthProvider>
  );
}

export default App;