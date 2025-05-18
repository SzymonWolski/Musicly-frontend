import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";

interface SongFormData {
  nazwa_utworu: string;
  data_wydania: string;
  kryptonim_artystyczny: string;
}

interface BackendErrors {
  [key: string]: string | undefined;
}

interface Song {
  ID_utworu: number;
  nazwa_utworu: string;
  data_wydania: string;
  Autor: {
    imie: string;
    nazwisko: string;
    kryptonim_artystyczny: string;
  };
}

const AdminPanel = () => {
  const { user, isadmin } = useAuth();
  const navigate = useNavigate();
  const [isAddingMode, setIsAddingMode] = useState(false);
  const [isDeletingMode, setIsDeletingMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<BackendErrors>({});
  const [songFile, setSongFile] = useState<File | null>(null);
  
  // Search and delete states
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [songToDelete, setSongToDelete] = useState<Song | null>(null);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  
  const [songData, setSongData] = useState<SongFormData>({
    nazwa_utworu: "",
    data_wydania: "",
    kryptonim_artystyczny: ""
  });

  // Redirect if not admin
  React.useEffect(() => {
    if (!isadmin) {
      navigate("/dashboard");
    }
  }, [isadmin, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSongData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSongFile(e.target.files[0]);
      
      if (errors.song) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.song;
          return newErrors;
        });
      }
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setDeleteError("");

    try {
      const response = await axios.get(`http://localhost:5000/files/list`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem("token")}`
        }
      });

      if (response.data && response.data.utwory) {
        // Filter songs locally based on search query
        const filteredResults = response.data.utwory.filter((song: Song) => 
          song.nazwa_utworu.toLowerCase().includes(searchQuery.toLowerCase()) ||
          song.Autor.kryptonim_artystyczny.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setSearchResults(filteredResults);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error("Error searching songs:", error);
      setDeleteError("Błąd podczas wyszukiwania piosenek. Spróbuj ponownie później.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleDeleteClick = (song: Song) => {
    setSongToDelete(song);
    setIsConfirmationOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!songToDelete) return;
    
    setIsSubmitting(true);
    setDeleteError("");

    try {
      const response = await axios.delete(
        `http://localhost:5000/files/delete/${songToDelete.ID_utworu}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem("token")}`
          }
        }
      );

      if (response.data) {
        // Remove deleted song from results
        setSearchResults(prevResults => 
          prevResults.filter(song => song.ID_utworu !== songToDelete.ID_utworu)
        );
        
        // Close confirmation dialog
        setIsConfirmationOpen(false);
        setSongToDelete(null);
        
        alert("Piosenka została pomyślnie usunięta.");
      }
    } catch (error) {
      console.error("Error deleting song:", error);
      setDeleteError("Wystąpił błąd podczas usuwania piosenki. Spróbuj ponownie później.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCancel = () => {
    setIsConfirmationOpen(false);
    setSongToDelete(null);
  };

  const handleAddSong = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    if (!songFile) {
      setErrors({ song: "Proszę wybrać plik z piosenką" });
      setIsSubmitting(false);
      return;
    }

    // Create form data to send files
    const formData = new FormData();
    formData.append('nazwa_utworu', songData.nazwa_utworu);
    formData.append('data_wydania', songData.data_wydania);
    formData.append('kryptonim_artystyczny', songData.kryptonim_artystyczny);
    formData.append('file', songFile);  // Backend oczekuje pole 'file' dla pliku audio

    try {
      const response = await axios.post("http://localhost:5000/files/upload", formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${localStorage.getItem("token")}`
        }
      });
      
      if (response.data.success) {
        alert("Piosenka została dodana pomyślnie!");
        setSongData({
          nazwa_utworu: "",
          data_wydania: "",
          kryptonim_artystyczny: ""
        });
        setSongFile(null);
        setIsAddingMode(false);
      }
    } catch (error: any) {
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      } else {
        setErrors({ 
          general: error.response?.data?.message || 
                  "Wystąpił błąd podczas dodawania piosenki. Spróbuj ponownie później." 
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-800 text-white p-4">
      <div className="max-w-2xl mx-auto bg-gray-700 rounded-lg p-6 shadow-lg">
        <h1 className="text-3xl font-bold mb-6 text-center">Panel Administracyjny</h1>
        
        {!isAddingMode && !isDeletingMode && (
          <div className="flex flex-col space-y-4">
            <div className="text-center text-yellow-500 font-bold mb-4">
              Zalogowano jako administrator: {user?.nick}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => setIsAddingMode(true)}
                className="px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center"
              >
                <span className="text-xl">Dodaj piosenkę</span>
              </button>
              
              <button
                onClick={() => setIsDeletingMode(true)}
                className="px-6 py-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center justify-center"
              >
                <span className="text-xl">Usuń piosenkę</span>
              </button>
            </div>
            
            <button
              onClick={() => navigate("/dashboard")}
              className="mt-8 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500 transition self-center"
            >
              Powrót do profilu
            </button>
          </div>
        )}
        
        {isAddingMode && (
          <div>
            <h2 className="text-2xl font-bold mb-4 text-center">Dodaj nową piosenkę</h2>
            
            {errors.general && (
              <div className="mb-4 p-2 bg-red-500 text-white rounded text-center">
                {errors.general}
              </div>
            )}
            
            <form onSubmit={handleAddSong} className="flex flex-col gap-4">
              <div>
                <input
                  type="text"
                  name="nazwa_utworu"
                  placeholder="Tytuł piosenki"
                  value={songData.nazwa_utworu}
                  onChange={handleChange}
                  className={`w-full p-2 rounded bg-gray-600 text-white focus:outline-none focus:ring-2 ${
                    errors.nazwa_utworu ? "focus:ring-red-500 border-red-500" : "focus:ring-blue-500"
                  }`}
                  required
                />
                {errors.nazwa_utworu && (
                  <p className="text-red-500 text-sm mt-1">{errors.nazwa_utworu}</p>
                )}
              </div>
              
              <div>
                <input
                  type="text"
                  name="kryptonim_artystyczny"
                  placeholder="Artysta"
                  value={songData.kryptonim_artystyczny}
                  onChange={handleChange}
                  className={`w-full p-2 rounded bg-gray-600 text-white focus:outline-none focus:ring-2 ${
                    errors.kryptonim_artystyczny ? "focus:ring-red-500 border-red-500" : "focus:ring-blue-500"
                  }`}
                  required
                />
                {errors.kryptonim_artystyczny && (
                  <p className="text-red-500 text-sm mt-1">{errors.kryptonim_artystyczny}</p>
                )}
              </div>
              
              <div>
                <input
                  type="text"
                  name="data_wydania"
                  placeholder="Rok wydania"
                  value={songData.data_wydania}
                  onChange={handleChange}
                  className={`w-full p-2 rounded bg-gray-600 text-white focus:outline-none focus:ring-2 ${
                    errors.data_wydania ? "focus:ring-red-500 border-red-500" : "focus:ring-blue-500"
                  }`}
                  required
                />
                {errors.data_wydania && (
                  <p className="text-red-500 text-sm mt-1">{errors.data_wydania}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Plik z piosenką (MP3, WAV)</label>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleFileChange}
                  className={`w-full p-2 rounded bg-gray-600 text-white file:mr-4 file:py-2 file:px-4
                  file:rounded file:border-0 file:text-sm file:font-semibold
                  file:bg-gray-700 file:text-white hover:file:bg-gray-600 ${
                    errors.song ? "focus:ring-red-500 border-red-500" : "focus:ring-blue-500"
                  }`}
                  required
                />
                {errors.song && (
                  <p className="text-red-500 text-sm mt-1">{errors.song}</p>
                )}
                {songFile && (
                  <p className="text-green-500 text-sm mt-1">Wybrano: {songFile.name}</p>
                )}
              </div>
              
              <div className="flex justify-between mt-4">
                <button
                  type="button"
                  onClick={() => setIsAddingMode(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500 transition"
                >
                  Anuluj
                </button>
                
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition ${
                    isSubmitting ? "opacity-70 cursor-not-allowed" : ""
                  }`}
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Dodawanie...
                    </span>
                  ) : "Dodaj piosenkę"}
                </button>
              </div>
            </form>
          </div>
        )}
        
        {isDeletingMode && (
          <div>
            <h2 className="text-2xl font-bold mb-4 text-center">Usuń piosenkę</h2>
            
            {deleteError && (
              <div className="mb-4 p-2 bg-red-500 text-white rounded text-center">
                {deleteError}
              </div>
            )}
            
            <div className="bg-gray-600 rounded-lg p-4">
              <div className="flex mb-4">
                <input
                  type="text"
                  placeholder="Wyszukaj piosenkę po tytule lub artyście"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="flex-grow p-2 rounded-l bg-gray-700 text-white border-r-0 border-gray-600 focus:outline-none"
                />
                <button 
                  onClick={handleSearch}
                  disabled={isSearching}
                  className={`px-4 py-2 bg-blue-600 text-white rounded-r hover:bg-blue-700 transition ${
                    isSearching ? "opacity-70 cursor-not-allowed" : ""
                  }`}
                >
                  {isSearching ? "Szukam..." : "Szukaj"}
                </button>
              </div>
              
              <div className="max-h-80 overflow-y-auto mt-4">
                {searchResults.length === 0 ? (
                  <p className="text-center text-gray-400 p-4">
                    {searchQuery ? "Nie znaleziono pasujących piosenek" : "Wyszukaj piosenki, aby zobaczyć wyniki"}
                  </p>
                ) : (
                  <ul className="divide-y divide-gray-700">
                    {searchResults.map((song) => (
                      <li key={song.ID_utworu} className="py-3 flex justify-between items-center">
                        <div>
                          <p className="font-medium">{song.nazwa_utworu}</p>
                          <p className="text-sm text-gray-400">{song.Autor.kryptonim_artystyczny} • {song.data_wydania}</p>
                        </div>
                        <button
                          onClick={() => handleDeleteClick(song)}
                          className="ml-4 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition text-sm"
                        >
                          Usuń
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              
              <div className="mt-6 flex justify-center">
                <button
                  onClick={() => setIsDeletingMode(false)}
                  className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition"
                >
                  Powrót
                </button>
              </div>
            </div>
            
            {/* Confirmation Modal */}
            {isConfirmationOpen && songToDelete && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-gray-700 p-6 rounded-lg shadow-lg max-w-md w-full">
                  <h3 className="text-xl font-bold mb-4">Potwierdź usunięcie</h3>
                  <p className="mb-6">
                    Czy na pewno chcesz usunąć piosenkę "{songToDelete.nazwa_utworu}" wykonawcy {songToDelete.Autor.kryptonim_artystyczny}? 
                    Ta operacja jest nieodwracalna.
                  </p>
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={handleDeleteCancel}
                      className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500 transition"
                    >
                      Anuluj
                    </button>
                    <button
                      onClick={handleDeleteConfirm}
                      disabled={isSubmitting}
                      className={`px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition ${
                        isSubmitting ? "opacity-70 cursor-not-allowed" : ""
                      }`}
                    >
                      {isSubmitting ? "Usuwanie..." : "Usuń piosenkę"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;