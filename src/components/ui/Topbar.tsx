import { LayoutDashboardIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useNavigate } from "react-router-dom";
import { useAuth } from '../../context/AuthContext';
import { cn } from "@/lib/utils"
import { HomeIcon, MessageCircleMore} from "lucide-react"
import { buttonVariants } from "@/components/ui/button"

const TopBar = () => {
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();

  const handleLoginClick = () => {
    navigate("/login");
  };

  const handleLogoutClick = () => {
    logout();
    navigate("/"); // Przekierowanie na stronę główną po wylogowaniu
  };
  
  // New function to handle home button click
  const handleHomeClick = () => {
    // Force reload the page to refresh the song list
    // Using navigate with replace option and then reload window
    navigate("/", { replace: true });
    window.location.reload();
  };

  return (
    <div className="flex items-center rounded-lg justify-between bg-gray-900 text-white p-4">
      <div className="flex items-center space-x-4">
        
        {/* Changed from Link to button with onClick handler */}
        <button
          onClick={handleHomeClick}
          className={cn(buttonVariants(
            { 
              variant: "ghost", 
              className: "w-full justify-start text-white hover:bg-zinc-600"
            }
          ))}
        >
          <HomeIcon className="mr-2 size-5 " />
          <span className="hidden md:inline">Home</span>
        </button>
        
        <Link to={"/friends"}
            className={cn(buttonVariants(
                    { 
                    variant: "ghost", 
                    className: "w-full justify-start text-white hover:bg-zinc-600"
                    }
            ))}>
          <MessageCircleMore className="mr-2 size-5 " />
            <span className="hidden md:inline">Przyjaciele</span>
        </Link>
        {isAuthenticated && (
        <Link to="/dashboard" 
            className={cn(buttonVariants(
                    { 
                    variant: "ghost", 
                    className: "w-full justify-start text-white hover:bg-zinc-600"
                    }
            ))}>
          <LayoutDashboardIcon className="mr-2 size-5 " />
          <span className="hidden md:inline">Dashboard</span>
        </Link>
        )}
        {isAuthenticated && user?.isadmin === true && (
        <Link to="/adminPanel" 
            className={cn(buttonVariants(
                    { 
                    variant: "ghost", 
                    className: "w-full justify-start text-white hover:bg-zinc-600"
                    }
            ))}>
          <LayoutDashboardIcon className="mr-2 size-5 " />
          <span className="hidden md:inline">Admin Panel</span>
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