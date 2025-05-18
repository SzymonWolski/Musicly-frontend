import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";

interface SongFormData {
  nazwa_utworu: string;
  data_wydania: string;
}

interface BackendErrors {
  [key: string]: string | undefined;
}

const AdminPanel = () => {
  const { user, isadmin } = useAuth();
  const navigate = useNavigate();
  const [isAddingMode, setIsAddingMode] = useState(false);
  const [isDeletingMode, setIsDeletingMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<BackendErrors>({});
  const [songFile, setSongFile] = useState<File | null>(null);
  
  const [songData, setSongData] = useState<SongFormData>({
    nazwa_utworu: "",
    data_wydania: ""
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
    // formData.append('nazwa_utworu', songData.nazwa_utworu);
    // formData.append('data_wydania', songData.data_wydania);
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
          data_wydania: ""
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

  const handleDeletePlaceholder = () => {
    alert("Funkcja usuwania będzie dostępna wkrótce!");
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
                  name="data_wydania"
                  placeholder="Rok wydania"
                  value={songData.data_wydania}
                  onChange={handleChange}
                  className={`w-full p-2 rounded bg-gray-600 text-white focus:outline-none focus:ring-2 ${
                    errors.data_wydania ? "focus:ring-red-500 border-red-500" : "focus:ring-blue-500"
                  }`}
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
            <div className="text-center py-8 bg-gray-600 rounded-lg">
              <p className="text-xl mb-4">Funkcja usuwania będzie dostępna wkrótce</p>
              <button
                onClick={() => setIsDeletingMode(false)}
                className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition"
              >
                Powrót
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;