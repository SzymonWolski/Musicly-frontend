import { LayoutDashboardIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useNavigate } from "react-router-dom";
import { useAuth } from '../../context/AuthContext';
import { cn } from "@/lib/utils"
import { HomeIcon, MessageCircleMore} from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { useState, useEffect } from 'react';

const TopBar = () => {
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();
  const [imageLoading, setImageLoading] = useState(true);
  const [imageKey, setImageKey] = useState(0); // Key for image component refresh
  const [userDataKey, setUserDataKey] = useState(0); // Key for user data refresh

  // Handle profile image updates by forcing rerender
  useEffect(() => {
    if (user?.id) {
      setImageLoading(true);
      setImageKey(prev => prev + 1);
    }
  }, [user?.id]);

  // Refresh user data display when user details change
  useEffect(() => {
    if (user) {
      setUserDataKey(prev => prev + 1);
    }
  }, [user?.nick, user?.email, user?.id]);

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  const handleImageError = () => {
    setImageLoading(false);
  };

  const handleLoginClick = () => {
    navigate("/login");
  };

  const handleLogoutClick = () => {
    logout();
    navigate("/"); // Redirect to home after logout
  };

  return (
    <div className="flex items-center rounded-lg justify-between bg-gray-900 text-white p-4">
      <div className="flex items-center space-x-4">
        
        {/* Home navigation link */}
        <Link
          to="/"
          className={cn(buttonVariants(
            { 
              variant: "ghost", 
              className: "w-full justify-start text-white hover:bg-zinc-600"
            }
          ))}
        >
          <HomeIcon className="mr-2 size-5 " />
          <span className="hidden md:inline">Home</span>
        </Link>
        
        {/* Friends navigation link */}
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
        /* Dashboard link - only for authenticated users */
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
        /* Admin panel link - only for admin users */
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
          /* User profile section for logged in users */
          <>
            <div className="flex items-center space-x-3" key={userDataKey}>
              <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-600 flex items-center justify-center">
                {imageLoading && (
                  /* Loading spinner while profile image loads */
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                )}
                {user?.id && (
                  /* User profile image with cache-busting timestamp */
                  <img
                    key={imageKey}
                    src={`http://localhost:5000/profile/profile-image/${user.id}?t=${Date.now()}`}
                    alt="Profile"
                    className={`w-full h-full object-cover ${imageLoading ? 'hidden' : 'block'}`}
                    onLoad={handleImageLoad}
                    onError={handleImageError}
                  />
                )}
              </div>
              <span className="text-blue-300">{user?.nick || user?.email}</span>
            </div>
            <button
              onClick={handleLogoutClick}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
            >
              Wyloguj się
            </button>
          </>
        ) : (
          /* Login button for non-authenticated users */
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