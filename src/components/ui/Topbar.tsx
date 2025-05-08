import { LayoutDashboardIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useNavigate } from "react-router-dom";
import { useAuth } from '../../context/AuthContext'; // Załóżmy, że masz kontekst autentykacji

const TopBar = () => {
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth(); // Pobieramy dane z kontekstu

  const handleLoginClick = () => {
    navigate("/login");
  };

  const handleLogoutClick = () => {
    logout();
    navigate("/"); // Przekierowanie na stronę główną po wylogowaniu
  };

  return (
    <div className="flex items-center rounded-lg justify-between bg-gray-900 text-white p-4">
      <div className="flex items-center space-x-4">
        {isAuthenticated && (
          <Link to="/dashboard" className="flex items-center hover:text-blue-400">
            <LayoutDashboardIcon className="mr-2" />
            Dashboard
          </Link>
        )}
      </div>
      
      <div className="text-xl font-bold">Musicly</div>

      <div className="flex items-center space-x-4">
        {isAuthenticated ? (
          <>
            <span className="text-blue-300">{user?.nick || user?.email}</span>
            <button
              onClick={handleLogoutClick}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
            >
              Wyloguj się
            </button>
          </>
        ) : (
          <button
            onClick={handleLoginClick}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
          >
            Zaloguj się
          </button>
        )}
      </div>
    </div>
  );
};

export default TopBar;