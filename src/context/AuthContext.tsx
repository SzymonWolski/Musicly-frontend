import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useNavigate } from "react-router-dom";

interface User {
  id: string;
  email: string;
  nick: string;
  isadmin: boolean;
  // Dodaj inne pola, które są potrzebne
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, userData: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
  nick: string | null;
  isadmin: boolean;
  profileImageUrl: string;
  updateProfileImage: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [profileImageUrl, setProfileImageUrl] = useState('');
  const navigate = useNavigate();

  // Inicjalizacja stanu z localStorage przy pierwszym renderze
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
  }, []);

  // Update profile image URL when user changes
  useEffect(() => {
    if (user?.id) {
      const timestamp = new Date().getTime();
      const imageUrl = `http://localhost:5000/profile/profile-image/${user.id}?t=${timestamp}`;
      setProfileImageUrl(imageUrl);
    }
  }, [user?.id]);

  const login = (newToken: string, userData: User) => {
    setToken(newToken);
    setUser(userData);
    localStorage.setItem("token", newToken);
    localStorage.setItem("user", JSON.stringify(userData));
    navigate("/dashboard");
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const updateProfileImage = () => {
    if (user?.id) {
      const timestamp = new Date().getTime();
      const imageUrl = `http://localhost:5000/profile/profile-image/${user.id}?t=${timestamp}`;
      setProfileImageUrl(imageUrl);
    }
  };

  const value = {
    user,
    token,
    isAuthenticated: !!token,
    login,
    logout,
    nick: user?.nick || null,
    isadmin: user?.isadmin || false,
    profileImageUrl,
    updateProfileImage,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};