import React, { useState, useEffect } from "react";
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

// Add this interface for user management
interface User {
  ID_uzytkownik: number;
  nick: string;
  email: string;
  isadmin: boolean;
}

const AdminPanel = () => {
  const { user, isadmin } = useAuth();
  const navigate = useNavigate();
  const [isAddingMode, setIsAddingMode] = useState(false);
  const [isDeletingMode, setIsDeletingMode] = useState(false);
  const [isUserManagementMode, setIsUserManagementMode] = useState(false);
  // New state for song management mode
  const [isManagingMode, setIsManagingMode] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<BackendErrors>({});
  const [songFile, setSongFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  
  // Search and delete states
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [songToDelete, setSongToDelete] = useState<Song | null>(null);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [isLoadingSongs, setIsLoadingSongs] = useState(false);
  
  const [songData, setSongData] = useState<SongFormData>({
    nazwa_utworu: "",
    data_wydania: "",
    kryptonim_artystyczny: ""
  });

  // User management states
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]); // New state for filtered users
  const [userSearchQuery, setUserSearchQuery] = useState(""); // New state for user search
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [userError, setUserError] = useState("");

  // New states for song management
  const [managementSearchQuery, setManagementSearchQuery] = useState("");
  const [managementSearchResults, setManagementSearchResults] = useState<Song[]>([]);
  const [isManagementSearching, setIsManagementSearching] = useState(false);
  const [isLoadingManagementSongs, setIsLoadingManagementSongs] = useState(false);
  const [managementError, setManagementError] = useState("");
  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [editFormData, setEditFormData] = useState<SongFormData>({
    nazwa_utworu: "",
    data_wydania: "",
    kryptonim_artystyczny: ""
  });
  const [isUpdating, setIsUpdating] = useState(false);

  // Redirect if not admin
  React.useEffect(() => {
    if (!isadmin) {
      navigate("/dashboard");
    }
  }, [isadmin, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // For year field, only accept numbers and limit to 4 characters
    if (name === 'data_wydania') {
      // Only allow digits (0-9)
      const onlyNums = value.replace(/[^0-9]/g, '');
      // Limit to 4 characters
      const truncated = onlyNums.slice(0, 4);
      setSongData(prev => ({
        ...prev,
        [name]: truncated
      }));
    } else {
      setSongData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
      
      if (errors.image) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.image;
          return newErrors;
        });
      }
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Fetch all songs when entering deletion mode
  useEffect(() => {
    if (isDeletingMode) {
      fetchAllSongs();
    }
  }, [isDeletingMode]);

  // Function to fetch all songs from the API
  const fetchAllSongs = async () => {
    setIsLoadingSongs(true);
    setDeleteError("");
    
    try {
      const response = await axios.get(`http://localhost:5000/files/list`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem("token")}`
        }
      });

      if (response.data && response.data.utwory) {
        setSearchResults(response.data.utwory);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error("Error fetching songs:", error);
      setDeleteError("Błąd podczas pobierania piosenek. Spróbuj ponownie później.");
    } finally {
      setIsLoadingSongs(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      // If search query is empty, show all songs
      fetchAllSongs();
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

  // Add this new function to check if a song already exists
  const checkIfSongExists = async (title: string, artist: string): Promise<boolean> => {
    try {
      const response = await axios.get(`http://localhost:5000/files/list`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem("token")}`
        }
      });

      if (response.data && response.data.utwory) {
        // Check if any song matches both title and artist (case insensitive)
        return response.data.utwory.some((song: Song) => 
          song.nazwa_utworu.toLowerCase() === title.toLowerCase() && 
          song.Autor.kryptonim_artystyczny.toLowerCase() === artist.toLowerCase()
        );
      }
      return false;
    } catch (error) {
      console.error("Error checking if song exists:", error);
      // If there's an error checking, we'll proceed (fail open) but log the error
      return false;
    }
  };

  const handleAddSong = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    if (songData.nazwa_utworu.length > 50) {
      setErrors(prev => ({
        ...prev,
        nazwa_utworu: "Tytuł piosenki nie może przekraczać 50 znaków"
      }));
      setIsSubmitting(false);
      return;
    }

    if (songData.kryptonim_artystyczny.length > 50) {
      setErrors(prev => ({
        ...prev,
        kryptonim_artystyczny: "Nazwa artysty nie może przekraczać 50 znaków"
      }));
      setIsSubmitting(false);
      return;
    }

    // Validate year format (must be numeric and max 4 characters)
    if (!/^\d{1,4}$/.test(songData.data_wydania)) {
      setErrors(prev => ({
        ...prev,
        data_wydania: "Rok wydania musi być liczbą do 4 cyfr"
      }));
      setIsSubmitting(false);
      return;
    }

    if (!songFile) {
      setErrors({ song: "Proszę wybrać plik z piosenką" });
      setIsSubmitting(false);
      return;
    }

    // Check if song already exists
    try {
      const songExists = await checkIfSongExists(songData.nazwa_utworu, songData.kryptonim_artystyczny);
      if (songExists) {
        setErrors(prev => ({
          ...prev,
          general: `Piosenka "${songData.nazwa_utworu}" wykonawcy "${songData.kryptonim_artystyczny}" już istnieje w bazie!`
        }));
        setIsSubmitting(false);
        return;
      }
    } catch (error) {
      console.error("Error in duplicate check:", error);
      // Continue with submission if check fails
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
        // If image file is selected, upload it separately
        if (imageFile) {
          try {
            const imageFormData = new FormData();
            imageFormData.append('image', imageFile);
            
            const imageResponse = await axios.post(
              `http://localhost:5000/files/upload-image/${response.data.utwor.ID_utworu}`,
              imageFormData,
              {
                headers: {
                  'Content-Type': 'multipart/form-data',
                  'Authorization': `Bearer ${localStorage.getItem("token")}`
                }
              }
            );
            
            if (imageResponse.data.success) {
              alert(`Piosenka "${songData.nazwa_utworu}" została dodana pomyślnie wraz z obrazem!`);
            } else {
              alert(`Piosenka "${songData.nazwa_utworu}" została dodana pomyślnie, ale wystąpił problem z przesłaniem obrazu.`);
            }
          } catch (imageError) {
            console.error('Error uploading image:', imageError);
            alert(`Piosenka "${songData.nazwa_utworu}" została dodana pomyślnie, ale wystąpił błąd podczas przesyłania obrazu.`);
          }
        } else {
          alert(`Piosenka "${songData.nazwa_utworu}" została dodana pomyślnie!`);
        }
        
        setSongData({
          nazwa_utworu: "",
          data_wydania: "",
          kryptonim_artystyczny: ""
        });
        setSongFile(null);
        setImageFile(null);
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

  // Function to fetch all users
  const fetchAllUsers = async () => {
    setIsLoadingUsers(true);
    setUserError("");
    
    try {
      const response = await axios.get(`http://localhost:5000/users/list`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem("token")}`
        }
      });

      if (response.data && response.data.users) {
        setUsers(response.data.users);
        setFilteredUsers(response.data.users); // Initialize filtered users with all users
      } else {
        setUsers([]);
        setFilteredUsers([]);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      setUserError("Błąd podczas pobierania użytkowników. Spróbuj ponownie później.");
    } finally {
      setIsLoadingUsers(false);
    }
  };
  
  // Handle user search input change
  const handleUserSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setUserSearchQuery(query);
    
    // Filter users based on search query
    if (!query.trim()) {
      setFilteredUsers(users); // Show all users when search is cleared
    } else {
      const filtered = users.filter(user => 
        user.nick.toLowerCase().includes(query.toLowerCase()) || 
        user.email.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  };

  // Load users when entering user management mode
  useEffect(() => {
    if (isUserManagementMode) {
      fetchAllUsers();
    }
  }, [isUserManagementMode]);

  // Function to toggle admin status
  const toggleAdminStatus = async (userId: number, currentStatus: boolean) => {
    try {
      const response = await axios.put(
        `http://localhost:5000/users/toggleAdmin/${userId}`,
        { isAdmin: !currentStatus },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem("token")}`
          }
        }
      );

      if (response.data && response.data.success) {
        // Update local users list
        setUsers(prevUsers => 
          prevUsers.map(user => 
            user.ID_uzytkownik === userId 
            ? { ...user, isadmin: !currentStatus }
            : user
          )
        );
        alert(`Uprawnienia administratora ${currentStatus ? 'odebrane' : 'nadane'}.`);
      }
    } catch (error) {
      console.error("Error toggling admin status:", error);
      alert("Wystąpił błąd podczas zmiany uprawnień. Spróbuj ponownie później.");
    }
  };

  // Function to delete user
  const handleDeleteUser = async (userId: number, userNick: string) => {
    // Don't allow deleting yourself
    if (userId === Number(user?.id)) {
      alert("Nie możesz usunąć własnego konta!");
      return;
    }
    
    if (window.confirm(`Czy na pewno chcesz usunąć użytkownika "${userNick}"? Ta operacja jest nieodwracalna.`)) {
      try {
        const response = await axios.delete(
          `http://localhost:5000/users/${userId}`,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem("token")}`
            }
          }
        );

        if (response.data && response.data.success) {
          // Remove user from the list
          setUsers(prevUsers => prevUsers.filter(user => user.ID_uzytkownik !== userId));
          alert("Użytkownik został pomyślnie usunięty.");
        }
      } catch (error) {
        console.error("Error deleting user:", error);
        alert("Wystąpił błąd podczas usuwania użytkownika. Spróbuj ponownie później.");
      }
    }
  };

  // Fetch all songs when entering management mode
  useEffect(() => {
    if (isManagingMode) {
      fetchSongsForManagement();
    }
  }, [isManagingMode]);

  // Function to fetch all songs for management
  const fetchSongsForManagement = async () => {
    setIsLoadingManagementSongs(true);
    setManagementError("");
    
    try {
      const response = await axios.get(`http://localhost:5000/files/list`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem("token")}`
        }
      });

      if (response.data && response.data.utwory) {
        setManagementSearchResults(response.data.utwory);
      } else {
        setManagementSearchResults([]);
      }
    } catch (error) {
      console.error("Error fetching songs for management:", error);
      setManagementError("Błąd podczas pobierania piosenek. Spróbuj ponownie później.");
    } finally {
      setIsLoadingManagementSongs(false);
    }
  };

  const handleManagementSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setManagementSearchQuery(e.target.value);
  };

  const handleManagementSearch = async () => {
    if (!managementSearchQuery.trim()) {
      // If search query is empty, show all songs
      fetchSongsForManagement();
      return;
    }

    setIsManagementSearching(true);
    setManagementError("");

    try {
      const response = await axios.get(`http://localhost:5000/files/list`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem("token")}`
        }
      });

      if (response.data && response.data.utwory) {
        // Filter songs locally based on search query
        const filteredResults = response.data.utwory.filter((song: Song) => 
          song.nazwa_utworu.toLowerCase().includes(managementSearchQuery.toLowerCase()) ||
          song.Autor.kryptonim_artystyczny.toLowerCase().includes(managementSearchQuery.toLowerCase())
        );
        setManagementSearchResults(filteredResults);
      } else {
        setManagementSearchResults([]);
      }
    } catch (error) {
      console.error("Error searching songs:", error);
      setManagementError("Błąd podczas wyszukiwania piosenek. Spróbuj ponownie później.");
    } finally {
      setIsManagementSearching(false);
    }
  };

  const handleEditClick = (song: Song) => {
    setEditingSong(song);
    setEditFormData({
      nazwa_utworu: song.nazwa_utworu,
      data_wydania: song.data_wydania,
      kryptonim_artystyczny: song.Autor.kryptonim_artystyczny
    });
    setErrors({});
  };

  const handleEditCancel = () => {
    setEditingSong(null);
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // For year field, only accept numbers and limit to 4 characters
    if (name === 'data_wydania') {
      // Only allow digits (0-9)
      const onlyNums = value.replace(/[^0-9]/g, '');
      // Limit to 4 characters
      const truncated = onlyNums.slice(0, 4);
      setEditFormData(prev => ({
        ...prev,
        [name]: truncated
      }));
    } else {
      setEditFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSong) return;
    
    setIsUpdating(true);
    setErrors({});

    // Validate inputs
    if (editFormData.nazwa_utworu.length > 50) {
      setErrors(prev => ({
        ...prev,
        nazwa_utworu: "Tytuł piosenki nie może przekraczać 50 znaków"
      }));
      setIsUpdating(false);
      return;
    }

    if (editFormData.kryptonim_artystyczny.length > 50) {
      setErrors(prev => ({
        ...prev,
        kryptonim_artystyczny: "Nazwa artysty nie może przekraczać 50 znaków"
      }));
      setIsUpdating(false);
      return;
    }

    // Validate year format
    if (!/^\d{1,4}$/.test(editFormData.data_wydania)) {
      setErrors(prev => ({
        ...prev,
        data_wydania: "Rok wydania musi być liczbą do 4 cyfr"
      }));
      setIsUpdating(false);
      return;
    }

    // Check if song with new title and artist already exists (unless it's the same song)
    try {
      const response = await axios.get(`http://localhost:5000/files/list`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem("token")}`
        }
      });
      
      if (response.data && response.data.utwory) {
        const isDuplicate = response.data.utwory.some((song: Song) => 
          song.ID_utworu !== editingSong.ID_utworu &&
          song.nazwa_utworu.toLowerCase() === editFormData.nazwa_utworu.toLowerCase() && 
          song.Autor.kryptonim_artystyczny.toLowerCase() === editFormData.kryptonim_artystyczny.toLowerCase()
        );
        
        if (isDuplicate) {
          setErrors(prev => ({
            ...prev,
            general: `Piosenka "${editFormData.nazwa_utworu}" wykonawcy "${editFormData.kryptonim_artystyczny}" już istnieje w bazie!`
          }));
          setIsUpdating(false);
          return;
        }
      }
    } catch (error) {
      console.error("Error in duplicate check:", error);
      // Continue with update if check fails
    }

    try {
      const response = await axios.put(
        `http://localhost:5000/files/update/${editingSong.ID_utworu}`,
        {
          nazwa_utworu: editFormData.nazwa_utworu,
          data_wydania: editFormData.data_wydania,
          kryptonim_artystyczny: editFormData.kryptonim_artystyczny
        },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem("token")}`
          }
        }
      );

      if (response.data && response.data.success) {
        // Update the song in the local state
        setManagementSearchResults(prevResults => 
          prevResults.map(song => 
            song.ID_utworu === editingSong.ID_utworu 
            ? {
                ...song,
                nazwa_utworu: editFormData.nazwa_utworu,
                data_wydania: editFormData.data_wydania,
                Autor: {
                  ...song.Autor,
                  kryptonim_artystyczny: editFormData.kryptonim_artystyczny
                }
              }
            : song
          )
        );
        
        setEditingSong(null);
        alert("Piosenka została pomyślnie zaktualizowana.");
      }
    } catch (error: any) {
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      } else {
        setErrors({ 
          general: error.response?.data?.message || 
                  "Wystąpił błąd podczas aktualizacji piosenki. Spróbuj ponownie później." 
        });
      }
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-800 text-white p-4">
      <div className="max-w-2xl mx-auto bg-gray-700 rounded-lg p-6 shadow-lg">
        <h1 className="text-3xl font-bold mb-6 text-center">Panel Administracyjny</h1>
        
        {!isAddingMode && !isDeletingMode && !isUserManagementMode && !isManagingMode && (
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

              {/* New button for song management */}
              <button
                onClick={() => setIsManagingMode(true)}
                className="px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center"
              >
                <span className="text-xl">Zarządzaj piosenkami</span>
              </button>

              <button
                onClick={() => setIsUserManagementMode(true)}
                className="px-6 py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center justify-center"
              >
                <span className="text-xl">Zarządzanie użytkownikami</span>
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
                  placeholder="Tytuł piosenki (max 50 znaków)"
                  value={songData.nazwa_utworu}
                  onChange={handleChange}
                  className={`w-full p-2 rounded bg-gray-600 text-white focus:outline-none focus:ring-2 ${
                    errors.nazwa_utworu ? "focus:ring-red-500 border-red-500" : "focus:ring-blue-500"
                  }`}
                  required
                />
                {errors.nazwa_utworu ? (
                  <p className="text-red-500 text-sm mt-1">{errors.nazwa_utworu}</p>
                ) : (
                  <p className="text-gray-400 text-xs mt-1">{songData.nazwa_utworu.length}/50 znaków</p>
                )}
              </div>
              
              <div>
                <input
                  type="text"
                  name="kryptonim_artystyczny"
                  placeholder="Artysta (max 50 znaków)"
                  value={songData.kryptonim_artystyczny}
                  onChange={handleChange}
                  className={`w-full p-2 rounded bg-gray-600 text-white focus:outline-none focus:ring-2 ${
                    errors.kryptonim_artystyczny ? "focus:ring-red-500 border-red-500" : "focus:ring-blue-500"
                  }`}
                  required
                />
                {errors.kryptonim_artystyczny ? (
                  <p className="text-red-500 text-sm mt-1">{errors.kryptonim_artystyczny}</p>
                ) : (
                  <p className="text-gray-400 text-xs mt-1">{songData.kryptonim_artystyczny.length}/50 znaków</p>
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

              <div>
                <label className="block text-sm font-medium mb-1">Obraz utworu (JPG, PNG) - opcjonalnie</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className={`w-full p-2 rounded bg-gray-600 text-white file:mr-4 file:py-2 file:px-4
                  file:rounded file:border-0 file:text-sm file:font-semibold
                  file:bg-gray-700 file:text-white hover:file:bg-gray-600 ${
                    errors.image ? "focus:ring-red-500 border-red-500" : "focus:ring-blue-500"
                  }`}
                />
                {errors.image && (
                  <p className="text-red-500 text-sm mt-1">{errors.image}</p>
                )}
                {imageFile && (
                  <p className="text-green-500 text-sm mt-1">Wybrano obraz: {imageFile.name}</p>
                )}
                <p className="text-gray-400 text-xs mt-1">
                  Maksymalny rozmiar: 10MB. Obraz zostanie automatycznie przeskalowany do max 1000x1000px.
                </p>
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
                {isLoadingSongs ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin h-8 w-8 border-2 border-blue-500 rounded-full border-t-transparent"></div>
                  </div>
                ) : searchResults.length === 0 ? (
                  <p className="text-center text-gray-400 p-4">
                    {searchQuery ? "Nie znaleziono pasujących piosenek" : "Brak dostępnych piosenek"}
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
        
        {/* New section for user management */}
        {isUserManagementMode && (
          <div>
            <h2 className="text-2xl font-bold mb-4 text-center">Zarządzanie użytkownikami</h2>
            
            {userError && (
              <div className="mb-4 p-2 bg-red-500 text-white rounded text-center">
                {userError}
              </div>
            )}
            
            <div className="bg-gray-600 rounded-lg p-4">
              {/* Add search input for users */}
              <div className="mb-4">
                <div className="flex">
                  <input
                    type="text"
                    placeholder="Szukaj użytkownika po nazwie lub email"
                    value={userSearchQuery}
                    onChange={handleUserSearchChange}
                    className="flex-grow p-2 rounded-l bg-gray-700 text-white border-r-0 border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="px-4 py-2 bg-blue-600 text-white rounded-r flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8"></circle>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                  </div>
                </div>
              </div>
              
              {/* Fixed height container with scrolling */}
              <div className="max-h-[400px] overflow-y-auto border border-gray-700 rounded">
                {isLoadingUsers ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin h-8 w-8 border-2 border-blue-500 rounded-full border-t-transparent"></div>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <p className="text-center text-gray-400 p-4">
                    {userSearchQuery ? "Nie znaleziono pasujących użytkowników" : "Brak użytkowników w systemie"}
                  </p>
                ) : (
                  <table className="w-full text-left">
                    <thead className="bg-gray-700 sticky top-0">
                      <tr>
                        <th className="py-2 px-4">Nick</th>
                        <th className="py-2 px-4">Email</th>
                        <th className="py-2 px-4">Status</th>
                        <th className="py-2 px-4">Akcje</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((userItem) => (
                        <tr key={userItem.ID_uzytkownik} className="border-b border-gray-700 hover:bg-gray-700 hover:bg-opacity-50">
                          <td className="py-3 px-4">{userItem.nick}</td>
                          <td className="py-3 px-4">{userItem.email}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded-full text-xs ${userItem.isadmin ? 'bg-green-600' : 'bg-blue-600'}`}>
                              {userItem.isadmin ? 'Administrator' : 'Użytkownik'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex space-x-2">
                              <button 
                                onClick={() => toggleAdminStatus(userItem.ID_uzytkownik, userItem.isadmin)}
                                className={`px-3 py-1 ${userItem.isadmin ? 'bg-yellow-600' : 'bg-green-600'} text-white rounded hover:opacity-90 transition text-xs`}
                                disabled={userItem.ID_uzytkownik === Number(user?.id)}
                                title={userItem.ID_uzytkownik === Number(user?.id) ? "Nie możesz zmienić własnych uprawnień" : ""}
                              >
                                {userItem.isadmin ? 'Odbierz uprawnienia' : 'Nadaj uprawnienia'}
                              </button>
                              
                              <button
                                onClick={() => handleDeleteUser(userItem.ID_uzytkownik, userItem.nick)}
                                className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition text-xs"
                                disabled={userItem.ID_uzytkownik === Number(user?.id)}
                                title={userItem.ID_uzytkownik === Number(user?.id) ? "Nie możesz usunąć własnego konta" : ""}
                              >
                                Usuń
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              
              <div className="mt-6 flex justify-center">
                <button
                  onClick={() => setIsUserManagementMode(false)}
                  className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition"
                >
                  Powrót
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* New section for song management */}
        {isManagingMode && (
          <div>
            <h2 className="text-2xl font-bold mb-4 text-center">Zarządzaj piosenkami</h2>
            
            {managementError && (
              <div className="mb-4 p-2 bg-red-500 text-white rounded text-center">
                {managementError}
              </div>
            )}

            {/* Edit Form */}
            {editingSong && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-gray-700 p-6 rounded-lg shadow-lg max-w-md w-full">
                  <h3 className="text-xl font-bold mb-4">Edytuj dane piosenki</h3>
                  
                  {errors.general && (
                    <div className="mb-4 p-2 bg-red-500 text-white rounded text-center">
                      {errors.general}
                    </div>
                  )}
                  
                  <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Tytuł piosenki</label>
                      <input
                        type="text"
                        name="nazwa_utworu"
                        placeholder="Tytuł piosenki (max 50 znaków)"
                        value={editFormData.nazwa_utworu}
                        onChange={handleEditChange}
                        className={`w-full p-2 rounded bg-gray-600 text-white focus:outline-none focus:ring-2 ${
                          errors.nazwa_utworu ? "focus:ring-red-500 border-red-500" : "focus:ring-blue-500"
                        }`}
                        required
                      />
                      {errors.nazwa_utworu ? (
                        <p className="text-red-500 text-sm mt-1">{errors.nazwa_utworu}</p>
                      ) : (
                        <p className="text-gray-400 text-xs mt-1">{editFormData.nazwa_utworu.length}/50 znaków</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Artysta</label>
                      <input
                        type="text"
                        name="kryptonim_artystyczny"
                        placeholder="Artysta (max 50 znaków)"
                        value={editFormData.kryptonim_artystyczny}
                        onChange={handleEditChange}
                        className={`w-full p-2 rounded bg-gray-600 text-white focus:outline-none focus:ring-2 ${
                          errors.kryptonim_artystyczny ? "focus:ring-red-500 border-red-500" : "focus:ring-blue-500"
                        }`}
                        required
                      />
                      {errors.kryptonim_artystyczny ? (
                        <p className="text-red-500 text-sm mt-1">{errors.kryptonim_artystyczny}</p>
                      ) : (
                        <p className="text-gray-400 text-xs mt-1">{editFormData.kryptonim_artystyczny.length}/50 znaków</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Rok wydania</label>
                      <input
                        type="text"
                        name="data_wydania"
                        placeholder="Rok wydania"
                        value={editFormData.data_wydania}
                        onChange={handleEditChange}
                        className={`w-full p-2 rounded bg-gray-600 text-white focus:outline-none focus:ring-2 ${
                          errors.data_wydania ? "focus:ring-red-500 border-red-500" : "focus:ring-blue-500"
                        }`}
                        required
                      />
                      {errors.data_wydania && (
                        <p className="text-red-500 text-sm mt-1">{errors.data_wydania}</p>
                      )}
                    </div>
                    
                    <div className="flex justify-between mt-4">
                      <button
                        type="button"
                        onClick={handleEditCancel}
                        className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500 transition"
                      >
                        Anuluj
                      </button>
                      <button
                        type="submit"
                        disabled={isUpdating}
                        className={`px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition ${
                          isUpdating ? "opacity-70 cursor-not-allowed" : ""
                        }`}
                      >
                        {isUpdating ? (
                          <span className="flex items-center justify-center">
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Aktualizowanie...
                          </span>
                        ) : "Zapisz zmiany"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
            
            <div className="bg-gray-600 rounded-lg p-4">
              <div className="flex mb-4">
                <input
                  type="text"
                  placeholder="Wyszukaj piosenkę po tytule lub artyście"
                  value={managementSearchQuery}
                  onChange={handleManagementSearchChange}
                  className="flex-grow p-2 rounded-l bg-gray-700 text-white border-r-0 border-gray-600 focus:outline-none"
                />
                <button 
                  onClick={handleManagementSearch}
                  disabled={isManagementSearching}
                  className={`px-4 py-2 bg-blue-600 text-white rounded-r hover:bg-blue-700 transition ${
                    isManagementSearching ? "opacity-70 cursor-not-allowed" : ""
                  }`}
                >
                  {isManagementSearching ? "Szukam..." : "Szukaj"}
                </button>
              </div>
              
              <div className="max-h-80 overflow-y-auto mt-4">
                {isLoadingManagementSongs ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin h-8 w-8 border-2 border-blue-500 rounded-full border-t-transparent"></div>
                  </div>
                ) : managementSearchResults.length === 0 ? (
                  <p className="text-center text-gray-400 p-4">
                    {managementSearchQuery ? "Nie znaleziono pasujących piosenek" : "Brak dostępnych piosenek"}
                  </p>
                ) : (
                  <ul className="divide-y divide-gray-700">
                    {managementSearchResults.map((song) => (
                      <li key={song.ID_utworu} className="py-3 flex justify-between items-center">
                        <div>
                          <p className="font-medium">{song.nazwa_utworu}</p>
                          <p className="text-sm text-gray-400">{song.Autor.kryptonim_artystyczny} • {song.data_wydania}</p>
                        </div>
                        <button
                          onClick={() => handleEditClick(song)}
                          className="ml-4 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition text-sm"
                        >
                          Edytuj
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              
              <div className="mt-6 flex justify-center">
                <button
                  onClick={() => setIsManagingMode(false)}
                  className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition"
                >
                  Powrót
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;