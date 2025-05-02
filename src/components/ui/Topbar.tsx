import { LayoutDashboardIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useNavigate } from "react-router-dom";

const TopBar = () => {
  const navigate = useNavigate();

  const handleLoginClick = () => {
    navigate("/login");
  };

  return (
    <div className="flex items-center rounded-lg justify-between bg-gray-900 text-white p-4">
      <button
        onClick={handleLoginClick}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
      >
        Zaloguj się
      </button>
      <div>Musicly</div>
    </div>
  );
};

export default TopBar;