import { useAuth } from "../context/AuthContext";
import { useState, useRef } from "react";
import { Upload } from "lucide-react";

const Dashboard = () => {
  const { user, logout, isadmin, updateProfileImage } = useAuth();
  const [imageLoading, setImageLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [imageKey, setImageKey] = useState(0); // Key to force image refresh
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  const handleImageError = () => {
    setImageLoading(false);
  };

  const handleImageClick = () => {
    setShowDropdown(!showDropdown);
  };

  const handleUploadClick = () => {
    setShowDropdown(false);
    setShowUploadModal(true);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      validateAndUploadImage(file);
    }
  };

  const validateAndUploadImage = (file: File) => {
    const img = new Image();
    img.onload = () => {
      if (img.width > 400 || img.height > 400) {
        alert('Zdjęcie nie może być większe niż 400x400 pikseli');
        return;
      }
      uploadProfileImage(file);
    };
    img.onerror = () => {
      alert('Nie można wczytać obrazu');
    };
    img.src = URL.createObjectURL(file);
  };

  const uploadProfileImage = async (file: File) => {
    setUploadLoading(true);
    try {
      const formData = new FormData();
      formData.append('profileImage', file);
      formData.append('userId', user?.id?.toString() || '');

      const response = await fetch('http://localhost:5000/profile/upload-profile-image', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        setShowUploadModal(false);
        setImageLoading(true);
        
        // Force image refresh by updating key
        setImageKey(prev => prev + 1);
        
        // Update profile image in context - this will trigger Topbar refresh
        updateProfileImage();
      } else {
        alert('Błąd podczas przesyłania zdjęcia');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Błąd podczas przesyłania zdjęcia');
    } finally {
      setUploadLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-800 text-white p-4">
      <div className="max-w-4xl mx-auto bg-gray-700 rounded-lg p-8 shadow-lg">
        <h1 className="text-3xl font-bold mb-8 text-center">Twój Profil</h1>

        <div className="space-y-6">
          <div className="flex items-start space-x-6">
            {/* Profile Image */}
            <div className="relative">
              <div 
                className="w-40 h-40 bg-gray-600 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0 cursor-pointer hover:bg-gray-500 transition"
                onClick={handleImageClick}
              >
                {imageLoading && (
                  <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                )}
                {user?.id && (
                  <img
                    key={imageKey} // Force re-render when key changes
                    src={`http://localhost:5000/profile/profile-image/${user.id}?t=${Date.now()}`}
                    alt="Profile"
                    className={`w-full h-full object-cover ${imageLoading ? 'hidden' : 'block'}`}
                    onLoad={handleImageLoad}
                    onError={handleImageError}
                  />
                )}
              </div>
              
              {/* Dropdown Button */}
              {showDropdown && (
                <div className="absolute top-full left-0 mt-2 bg-gray-600 rounded-lg shadow-lg z-10 min-w-full">
                  <button
                    onClick={handleUploadClick}
                    className="flex items-center w-full px-4 py-2 text-left hover:bg-gray-500 rounded-t-lg transition"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Zmień zdjęcie
                  </button>
                </div>
              )}
            </div>

            {/* User Information */}
            <div className="flex-1 space-y-3">
              <div>
                <div className="text-2xl font-medium text-white">
                  {user?.nick || "Nie ustawiono"}
                </div>
              </div>

              <div>
                <div className="text-lg text-gray-300">
                  {user?.email}
                </div>
              </div>

              <div>
                <span className="text-lg text-gray-400">Rola: </span>
                <span className={`text-lg font-medium ${isadmin ? 'text-yellow-500' : 'text-white'}`}>
                  {isadmin ? 'administrator' : 'użytkownik'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-6">
            <button
              onClick={logout}
              className="px-6 py-3 bg-red-600 text-white rounded hover:bg-red-700 transition text-lg"
            >
              Wyloguj się
            </button>
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-700 rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Zmień zdjęcie profilowe</h2>
            
            <div className="space-y-4">
              <div
                className="border-2 border-dashed border-gray-500 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-400">Kliknij aby wybrać zdjęcie</p>
                <p className="text-sm text-gray-500 mt-2">PNG, JPG do 20MB, max 400x400px</p>
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500 transition"
                  disabled={uploadLoading}
                >
                  Anuluj
                </button>
              </div>
            </div>
            
            {uploadLoading && (
              <div className="mt-4 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2"></div>
                <span>Przesyłanie...</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;