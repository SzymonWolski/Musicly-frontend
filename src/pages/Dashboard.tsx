import { useAuth } from "../context/AuthContext";
import { useState, useRef, useEffect } from "react";
import { Upload, Plus, ListMusic, X, ArrowLeft } from "lucide-react";
import axios from "axios";
import { useAudioPlayer } from "../context/AudioPlayerContext";

interface Playlist {
  id: number;
  name: string;
  songCount: number;
  imageFilename?: string;
  isFavorite?: boolean;
  createdBy?: {
    id?: number;
    username: string;
    firstName?: string;
    lastName?: string;
  };
}

interface Song {
  ID_utworu: number;
  nazwa_utworu: string;
  data_wydania: string;
  likes_count?: number; // Made optional since backend might not provide it
  Autor: {
    imie: string;
    nazwisko: string;
    kryptonim_artystyczny: string;
  };
}

const Dashboard = () => {
  const { user, token, isadmin, updateProfileImage } = useAuth();
  const { favoriteSongs, toggleFavorite, playSong } = useAudioPlayer();
  const [imageLoading, setImageLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [imageKey, setImageKey] = useState(0); // Key to force image refresh
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Nickname change states
  const [showChangeNickModal, setShowChangeNickModal] = useState(false);
  const [newNickname, setNewNickname] = useState('');
  const [changeNickLoading, setChangeNickLoading] = useState(false);
  const [changeNickError, setChangeNickError] = useState('');

  // Playlist states
  const [userPlaylists, setUserPlaylists] = useState<Playlist[]>([]);
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);
  const [showCreatePlaylistModal, setShowCreatePlaylistModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistImage, setNewPlaylistImage] = useState<File | null>(null);
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
  const [createPlaylistError, setCreatePlaylistError] = useState('');
  const [playlistImages, setPlaylistImages] = useState<{[key: number]: string}>({});
  const playlistFileInputRef = useRef<HTMLInputElement>(null);

  // Favorite playlists states
  const [favoritePlaylists, setFavoritePlaylists] = useState<Playlist[]>([]);
  const [loadingFavoritePlaylists, setLoadingFavoritePlaylists] = useState(false);
  const [favoritePlaylistImages, setFavoritePlaylistImages] = useState<{[key: number]: string}>({});

  // Playlist content view states
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [playlistSongs, setPlaylistSongs] = useState<Song[]>([]);
  const [loadingPlaylistSongs, setLoadingPlaylistSongs] = useState(false);
  const [playlistError, setPlaylistError] = useState('');

  // Helper function to get song image URL with cache busting
  const getSongImageUrl = (songId: number) => {
    return `http://localhost:5000/files/image/${songId}?t=${Date.now()}`;
  };

  // Helper function to render song image with error handling
  const renderSongImage = (song: Song, className: string) => (
    <div className={`flex-shrink-0 rounded-md overflow-hidden bg-gray-700 ${className}`}>
      <img
        src={getSongImageUrl(song.ID_utworu)}
        alt={`Okładka ${song.nazwa_utworu}`}
        className="w-full h-full object-cover"
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          target.parentElement!.innerHTML = `
            <div class="w-full h-full flex items-center justify-center bg-gray-700">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
          `;
        }}
      />
    </div>
  );

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

  // Fetch user playlists
  useEffect(() => {
    if (token) {
      fetchUserPlaylists();
      fetchFavoritePlaylists();
    }
  }, [token]);

  const fetchUserPlaylists = async () => {
    setLoadingPlaylists(true);
    try {
      const response = await axios.get('http://localhost:5000/playlists?myOnly=true', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.data && Array.isArray(response.data.playlists)) {
        // Map the response to match our interface - updated mapping
        const mappedPlaylists = response.data.playlists.map((playlist: any) => ({
          id: playlist.id,
          name: playlist.name,
          songCount: parseInt(playlist.songCount) || 0,
          imageFilename: playlist.imageFilename,
          isFavorite: playlist.isFavorite || false,
          createdBy: {
            username: user?.nick || ""
          }
        }));
        
        setUserPlaylists(mappedPlaylists);
        
        // Fetch images for playlists that have them
        mappedPlaylists.forEach((playlist: Playlist) => {
          if (playlist.imageFilename) {
            fetchPlaylistImage(playlist.id);
          }
        });
      }
    } catch (error) {
      console.error('Error fetching playlists:', error);
    } finally {
      setLoadingPlaylists(false);
    }
  };

  const fetchFavoritePlaylists = async () => {
    setLoadingFavoritePlaylists(true);
    try {
      // Use the updated endpoint for favorite playlists
      const response = await axios.get('http://localhost:5000/favorites/playlists', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.data && Array.isArray(response.data.favoritePlaylists)) {
        // Map the response to match our interface with updated fields
        const mappedPlaylists = response.data.favoritePlaylists.map((playlist: any) => ({
          id: playlist.playlistId,
          name: playlist.playlistName,
          songCount: parseInt(playlist.songCount) || 0,
          imageFilename: playlist.imageFilename,
          isFavorite: true, // These are favorites by definition
          createdBy: {
            username: playlist.createdBy
          }
        }));
        
        setFavoritePlaylists(mappedPlaylists);
        
        // Fetch images for favorite playlists that have them
        mappedPlaylists.forEach((playlist: Playlist) => {
          if (playlist.imageFilename) {
            fetchFavoritePlaylistImage(playlist.id);
          }
        });
      }
    } catch (error) {
      console.error('Error fetching favorite playlists:', error);
    } finally {
      setLoadingFavoritePlaylists(false);
    }
  };

  const fetchPlaylistImage = async (playlistId: number) => {
    try {
      // Use the updated image endpoint
      const response = await fetch(`http://localhost:5000/playlists/${playlistId}/image`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        // Add cache control to prevent browser caching
        cache: 'no-store'
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const imageUrl = URL.createObjectURL(blob);
        setPlaylistImages(prev => ({
          ...prev,
          [playlistId]: imageUrl
        }));
      }
    } catch (error) {
      console.error('Error fetching playlist image:', error);
    }
  };

  const fetchFavoritePlaylistImage = async (playlistId: number) => {
    try {
      // No need for public endpoint anymore, the regular endpoint works for all accessible playlists
      const response = await fetch(`http://localhost:5000/playlists/${playlistId}/image`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        cache: 'no-store'
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const imageUrl = URL.createObjectURL(blob);
        setFavoritePlaylistImages(prev => ({
          ...prev,
          [playlistId]: imageUrl
        }));
      }
    } catch (error) {
      console.error('Error fetching favorite playlist image:', error);
    }
  };

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) {
      setCreatePlaylistError('Nazwa playlisty nie może być pusta.');
      return;
    }
    
    if (newPlaylistName.trim().length > 70) {
      setCreatePlaylistError('Nazwa playlisty nie może przekraczać 70 znaków.');
      return;
    }
    
    setIsCreatingPlaylist(true);
    setCreatePlaylistError('');
    
    try {
      // Najpierw utwórz playlistę (bez obrazu)
      const response = await axios.post('http://localhost:5000/playlists', {
        name: newPlaylistName.trim()
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data && response.data.playlist) {
        const newPlaylist = {
          id: response.data.playlist.id,
          name: response.data.playlist.name,
          songCount: 0,
          isFavorite: false,
          imageFilename: undefined,
          createdBy: {
            username: user?.nick || ""
          }
        };
        
        // Jeśli wybrano obraz, prześlij go osobno
        if (newPlaylistImage) {
          try {
            const imageFormData = new FormData();
            imageFormData.append('image', newPlaylistImage);
            
            const imageResponse = await axios.post(
              `http://localhost:5000/playlists/${newPlaylist.id}/image`, 
              imageFormData, 
              {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'multipart/form-data'
                }
              }
            );
            
            if (imageResponse.data && imageResponse.data.image) {
              newPlaylist.imageFilename = imageResponse.data.image.imageFilename;
              // Pobierz obraz do wyświetlenia
              fetchPlaylistImage(newPlaylist.id);
            }
          } catch (imageError) {
            console.error('Error uploading playlist image:', imageError);
            // Nie przerywamy procesu - playlista została utworzona, tylko obraz się nie udał
          }
        }
        
        setUserPlaylists(prev => [...prev, newPlaylist]);
      }
      
      closeCreatePlaylistModal();
      
    } catch (error) {
      console.error('Error creating playlist:', error);
      if (axios.isAxiosError(error) && error.response?.data?.error) {
        setCreatePlaylistError(error.response.data.error);
      } else {
        setCreatePlaylistError('Nie udało się utworzyć playlisty. Spróbuj ponownie.');
      }
    } finally {
      setIsCreatingPlaylist(false);
    }
  };

  const validatePlaylistImage = (file: File) => {
    const img = new Image();
    img.onload = () => {
      if (img.width > 1000 || img.height > 1000) {
        alert('Obraz playlisty nie może przekraczać wymiarów 1000x1000 pikseli');
        return;
      }
      setNewPlaylistImage(file);
    };
    img.onerror = () => {
      alert('Nie można wczytać obrazu');
    };
    img.src = URL.createObjectURL(file);
  };

  const handlePlaylistImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      validatePlaylistImage(file);
    }
  };

  const openCreatePlaylistModal = () => {
    setShowCreatePlaylistModal(true);
    setNewPlaylistName('');
    setNewPlaylistImage(null);
    setCreatePlaylistError('');
  };

  const closeCreatePlaylistModal = () => {
    setShowCreatePlaylistModal(false);
    setNewPlaylistName('');
    setNewPlaylistImage(null);
    setCreatePlaylistError('');
  };

  const handleDeletePlaylist = async (playlistId: number, playlistName: string) => {
    const isConfirmed = window.confirm(`Czy na pewno chcesz usunąć playlistę "${playlistName}"? Ta operacja jest nieodwracalna.`);
    
    if (!isConfirmed) return;
    
    try {
      await axios.delete(`http://localhost:5000/playlists/${playlistId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      setUserPlaylists(prev => prev.filter(playlist => playlist.id !== playlistId));
      
      // Clean up image URL
      if (playlistImages[playlistId]) {
        URL.revokeObjectURL(playlistImages[playlistId]);
        setPlaylistImages(prev => {
          const newImages = { ...prev };
          delete newImages[playlistId];
          return newImages;
        });
      }
      
    } catch (error) {
      console.error('Error deleting playlist:', error);
      alert('Nie udało się usunąć playlisty. Spróbuj ponownie.');
    }
  };

  // Handle opening playlist content view
  const openPlaylistContent = async (playlist: Playlist) => {
    setSelectedPlaylist(playlist);
    setLoadingPlaylistSongs(true);
    setPlaylistError('');
    
    try {
      const response = await axios.get(`http://localhost:5000/playlists/${playlist.id}/songs`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.data && Array.isArray(response.data.songs)) {
        // Add likes_count: 0 as default since backend doesn't provide it yet
        const songsWithLikes = response.data.songs.map((song: any) => ({
          ...song,
          likes_count: song.likes_count || 0
        }));
        setPlaylistSongs(songsWithLikes);
      } else {
        setPlaylistSongs([]);
      }
    } catch (error) {
      console.error('Error fetching playlist songs:', error);
      setPlaylistError('Nie udało się załadować utworów z playlisty.');
    } finally {
      setLoadingPlaylistSongs(false);
    }
  };
  
  // Handle closing playlist content view
  const closePlaylistContent = () => {
    setSelectedPlaylist(null);
    setPlaylistSongs([]);
  };

  // Handle removing a song from playlist
  const handleRemoveSongFromPlaylist = async (songId: number) => {
    if (!selectedPlaylist) return;
    
    try {
      await axios.delete(`http://localhost:5000/playlists/${selectedPlaylist.id}/songs/${songId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Update the UI by removing the song from the list
      setPlaylistSongs(prevSongs => prevSongs.filter(song => song.ID_utworu !== songId));
      
      // Update the song count in the selected playlist
      setSelectedPlaylist(prev => prev ? {
        ...prev,
        songCount: prev.songCount - 1
      } : null);
      
      // Also update in the playlists list
      setUserPlaylists(prevPlaylists => 
        prevPlaylists.map(playlist => 
          playlist.id === selectedPlaylist.id 
            ? { ...playlist, songCount: playlist.songCount - 1 }
            : playlist
        )
      );
      
    } catch (error) {
      console.error('Error removing song from playlist:', error);
      alert('Nie udało się usunąć utworu z playlisty. Spróbuj ponownie.');
    }
  };

  // Handle playing a song from playlist
  const handlePlaySong = async (song: Song) => {
    try {
      // Ensure likes_count is always a number for playSong
      const songWithLikes = {
        ...song,
        likes_count: song.likes_count || 0
      };
      await playSong(songWithLikes);
    } catch (error) {
      console.error('Error playing song:', error);
      alert('Nie można załadować utworu. Spróbuj ponownie.');
    }
  };

  // Handle toggling playlist favorite
  const togglePlaylistFavorite = async (playlistId: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation(); // Prevent opening playlist when clicking favorite button
    
    try {
      const playlist = userPlaylists.find(p => p.id === playlistId) || favoritePlaylists.find(p => p.id === playlistId) || selectedPlaylist;
      if (!playlist) return;
      
      // Check if this is a favorite playlist
      const isFavorite = favoritePlaylists.some(p => p.id === playlistId);
      
      if (isFavorite) {
        // Remove from favorites
        await axios.delete(`http://localhost:5000/favorites/playlists/${playlistId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        // Remove from favorite playlists list
        setFavoritePlaylists(prev => prev.filter(p => p.id !== playlistId));
        
        // Clean up image URL
        if (favoritePlaylistImages[playlistId]) {
          URL.revokeObjectURL(favoritePlaylistImages[playlistId]);
          setFavoritePlaylistImages(prev => {
            const newImages = { ...prev };
            delete newImages[playlistId];
            return newImages;
          });
        }
        
        // If this was a user's own playlist, update its isFavorite status
        setUserPlaylists(prev => prev.map(p => 
          p.id === playlistId ? { ...p, isFavorite: false } : p
        ));
        
        // Update selected playlist if it's the one being unfavorited
        if (selectedPlaylist?.id === playlistId) {
          setSelectedPlaylist(prev => prev ? { ...prev, isFavorite: false } : null);
        }
        
        alert('Usunięto z ulubionych playlist!');
      } else {
        // Add to favorites
        await axios.post('http://localhost:5000/favorites/playlists', 
          { playlistId },
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        
        // If this was a user's own playlist, update its isFavorite status
        setUserPlaylists(prev => prev.map(p => 
          p.id === playlistId ? { ...p, isFavorite: true } : p
        ));
        
        // Update selected playlist if it's the one being favorited
        if (selectedPlaylist?.id === playlistId) {
          setSelectedPlaylist(prev => prev ? { ...prev, isFavorite: true } : null);
        }
        
        // Refresh the favorites list
        fetchFavoritePlaylists();
        
        alert('Dodano do ulubionych playlist!');
      }
    } catch (error) {
      console.error('Error toggling playlist favorite:', error);
      alert('Nie udało się zmienić statusu ulubionej playlisty.');
    }
  };

  // Handle nickname change
  const handleChangeNickname = async () => {
    if (!newNickname.trim()) {
      setChangeNickError('Nick nie może być pusty.');
      return;
    }

    if (newNickname.trim().length < 3 || newNickname.trim().length > 30) {
      setChangeNickError('Nick musi mieć od 3 do 30 znaków.');
      return;
    }

    const nickRegex = /^[a-zA-Z0-9_-]+$/;
    if (!nickRegex.test(newNickname.trim())) {
      setChangeNickError('Nick może zawierać tylko litery, cyfry, podkreślniki i myślniki.');
      return;
    }

    setChangeNickLoading(true);
    setChangeNickError('');

    try {
      const response = await axios.put('http://localhost:5000/users/change-nick', {
        newNick: newNickname.trim()
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        // Update user context or trigger refresh
        updateProfileImage(); // This will refresh user data
        setShowChangeNickModal(false);
        setNewNickname('');
        alert('Nick został pomyślnie zmieniony!');
      }
    } catch (error) {
      console.error('Error changing nickname:', error);
      if (axios.isAxiosError(error) && error.response?.data?.error) {
        setChangeNickError(error.response.data.error);
      } else {
        setChangeNickError('Nie udało się zmienić nicku. Spróbuj ponownie.');
      }
    } finally {
      setChangeNickLoading(false);
    }
  };

  const openChangeNickModal = () => {
    setShowChangeNickModal(true);
    setNewNickname(user?.nick || '');
    setChangeNickError('');
  };

  const closeChangeNickModal = () => {
    setShowChangeNickModal(false);
    setNewNickname('');
    setChangeNickError('');
  };

  return (
    <div className="min-h-screen bg-gray-800 text-white p-4">
      <div className="max-w-7xl mx-auto bg-gray-700 rounded-lg p-8 shadow-lg">
        <h1 className="text-3xl font-bold mb-8 text-center">Twój Profil</h1>

        <div className="space-y-8">
          {/* User Profile Section */}
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
              <div className="flex items-center gap-3">
                <div className="text-2xl font-medium text-white">
                  {user?.nick || "Nie ustawiono"}
                </div>
                <button
                  onClick={openChangeNickModal}
                  className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-600 rounded transition"
                  title="Zmień nick"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              </div>

              <div>
                <div className="text-lg text-gray-400">
                  #{user?.id ? user.id.toString().padStart(10, '0') : '0000000000'}
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

          {/* Playlists Section */}
          <div className="border-t border-gray-600 pt-6">
            {selectedPlaylist ? (
              /* Playlist content view */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <button 
                      onClick={closePlaylistContent}
                      className="mr-3 text-gray-400 hover:text-white transition"
                    >
                      <ArrowLeft size={20} />
                    </button>
                    <h2 className="text-2xl font-bold text-white">{selectedPlaylist.name}</h2>
                    <span className="ml-3 text-sm text-gray-400">
                      ({selectedPlaylist.songCount} utwor{selectedPlaylist.songCount === 1 ? '' : selectedPlaylist.songCount < 5 ? 'y' : 'ów'})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Favorite button for playlists */}
                    <button
                      onClick={(e) => togglePlaylistFavorite(selectedPlaylist.id, e)}
                      className={`p-2 transition ${
                        favoritePlaylists.some(p => p.id === selectedPlaylist.id)
                          ? 'text-red-500 hover:text-red-400' 
                          : 'text-gray-400 hover:text-red-400'
                      }`}
                      title={favoritePlaylists.some(p => p.id === selectedPlaylist.id) ? "Usuń z ulubionych" : "Dodaj do ulubionych"}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                      </svg>
                    </button>
                    
                    {/* Only show delete button if it's the user's own playlist */}
                    {!selectedPlaylist.createdBy?.username || selectedPlaylist.createdBy.username === user?.nick && (
                      <button
                        onClick={() => handleDeletePlaylist(selectedPlaylist.id, selectedPlaylist.name)}
                        className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition"
                        title="Usuń playlistę"
                      >
                        Usuń playlistę
                      </button>
                    )}
                  </div>
                </div>

                {loadingPlaylistSongs ? (
                  <div className="flex justify-center items-center h-40">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
                  </div>
                ) : playlistError ? (
                  <div className="text-center text-red-500 p-4">{playlistError}</div>
                ) : playlistSongs.length === 0 ? (
                  <div className="bg-gray-600 rounded-lg text-center text-gray-300 p-8">
                    <ListMusic size={48} className="mx-auto mb-4 text-gray-400" />
                    <p className="text-lg mb-2">Ta playlista jest pusta</p>
                    <p className="text-sm text-gray-400">Dodaj utwory do tej playlisty z głównej strony</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {playlistSongs.map((song) => (
                      <div 
                        key={song.ID_utworu} 
                        className="bg-gray-600 rounded-lg p-4 hover:bg-gray-500 transition cursor-pointer"
                        onClick={() => handlePlaySong(song)}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center space-x-3">
                            {/* Song Image with cache busting */}
                            {renderSongImage(song, "w-12 h-12")}
                            
                            {/* Song Info */}
                            <div>
                              <p className="font-medium text-white">{song.nazwa_utworu}</p>
                              <p className="text-sm text-gray-300">{song.Autor.kryptonim_artystyczny} • {song.data_wydania}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            {/* Like count */}
                            <span className="text-sm text-gray-400">{song.likes_count}</span>
                            
                            {/* Heart/Favorite button */}
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(song.ID_utworu);
                              }}
                              className={`p-1 transition ${
                                favoriteSongs.includes(song.ID_utworu) 
                                  ? 'text-red-500 hover:text-red-400' 
                                  : 'text-gray-400 hover:text-red-400'
                              }`}
                              title={favoriteSongs.includes(song.ID_utworu) ? "Usuń z ulubionych" : "Dodaj do ulubionych"}
                            >
                              {favoriteSongs.includes(song.ID_utworu) ? (
                                // Filled heart
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                                </svg>
                              ) : (
                                // Empty heart
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                </svg>
                              )}
                            </button>
                            
                            {/* Remove from playlist button */}
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveSongFromPlaylist(song.ID_utworu);
                              }}
                              className="p-1 text-gray-400 hover:text-red-400 transition"
                              title="Usuń z playlisty"
                            >
                              <X size={18} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Main playlists view - split into two columns */
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column - Your Playlists */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center h-10">
                    <h2 className="text-2xl font-bold text-white">Twoje Playlisty</h2>
                    <button
                      onClick={openCreatePlaylistModal}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      <Plus size={20} />
                      Nowa Playlista
                    </button>
                  </div>

                  {loadingPlaylists ? (
                    <div className="flex justify-center items-center h-40">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
                    </div>
                  ) : userPlaylists.length === 0 ? (
                    <div className="bg-gray-600 rounded-lg text-center text-gray-300 p-8">
                      <ListMusic size={48} className="mx-auto mb-4 text-gray-400" />
                      <p className="text-lg mb-2">Nie masz jeszcze żadnych playlist</p>
                      <p className="text-sm text-gray-400">Stwórz swoją pierwszą playlistę, aby organizować swoją muzykę</p>
                        <button
                          onClick={openCreatePlaylistModal}
                          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                        >
                          Stwórz Playlistę
                        </button>
                      </div>
                  ) : (
                    <div className="space-y-3">
                      {userPlaylists.map((playlist) => (
                        <div 
                          key={playlist.id}
                          className="bg-gray-600 rounded-lg overflow-hidden hover:bg-gray-500 transition cursor-pointer flex"
                          onClick={() => openPlaylistContent(playlist)}
                        >
                          <div className="w-16 h-17 bg-gradient-to-br from-red-600 to-pink-600 flex items-center justify-center flex-shrink-0">
                            {playlist.imageFilename && playlistImages[playlist.id] ? (
                              <img
                                src={playlistImages[playlist.id]}
                                alt={`Okładka ${playlist.name}`}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <ListMusic size={24} className="text-white" />
                            )}
                          </div>
                          
                          <div className="flex-1 p-3 flex justify-between items-center">
                            <div>
                              <h4 className="font-medium text-white truncate">{playlist.name}</h4>
                              <p className="text-sm text-gray-300">
                                {playlist.songCount} utwor{playlist.songCount === 1 ? '' : playlist.songCount < 5 ? 'y' : 'ów'}
                              </p>
                            </div>
                            
                            <button
                              onClick={(e) => togglePlaylistFavorite(playlist.id, e)}
                              className={`p-2 transition ${
                                favoritePlaylists.some(p => p.id === playlist.id) 
                                  ? 'text-red-500 hover:text-red-400' 
                                  : 'text-gray-400 hover:text-red-400'
                              }`}
                              title={favoritePlaylists.some(p => p.id === playlist.id) ? "Usuń z ulubionych" : "Dodaj do ulubionych"}
                            >
                              {favoritePlaylists.some(p => p.id === playlist.id) ? (
                                // Filled heart
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                                </svg>
                              ) : (
                                // Empty heart
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                </svg>
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right Column - Favorite Playlists */}
                <div className="space-y-4">
                  <div className="h-10 flex items-center">
                    <h2 className="text-2xl font-bold text-white">Ulubione Playlisty</h2>
                  </div>

                  {loadingFavoritePlaylists ? (
                    <div className="flex justify-center items-center h-40">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-500"></div>
                    </div>
                  ) : favoritePlaylists.length === 0 ? (
                    <div className="bg-gray-600 rounded-lg text-center text-gray-300 p-8">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                      <p className="text-lg mb-2">Brak ulubionych playlist</p>
                      <p className="text-sm text-gray-400">Polub playlisty innych użytkowników, aby pojawiły się tutaj</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {favoritePlaylists.map((playlist) => (
                        <div 
                          key={playlist.id}
                          className="bg-gray-600 rounded-lg overflow-hidden hover:bg-gray-500 transition cursor-pointer flex"
                          onClick={() => openPlaylistContent(playlist)}
                        >
                          <div className="w-16 h-17 bg-gradient-to-br from-red-600 to-pink-600 flex items-center justify-center flex-shrink-0">
                            {playlist.imageFilename && favoritePlaylistImages[playlist.id] ? (
                              <img
                                src={favoritePlaylistImages[playlist.id]}
                                alt={`Okładka ${playlist.name}`}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                          
                          <div className="flex-1 p-3 flex justify-between items-center">
                            <div>
                              <h4 className="font-medium text-white truncate">{playlist.name}</h4>
                              <p className="text-sm text-gray-300">
                                {playlist.createdBy?.username || 'Nieznany użytkownik'} • {playlist.songCount} utwor{playlist.songCount === 1 ? '' : playlist.songCount < 5 ? 'y' : 'ów'}
                              </p>
                            </div>
                            
                            <button
                              onClick={(e) => togglePlaylistFavorite(playlist.id, e)}
                              className="p-2 transition text-red-500 hover:text-red-400"
                              title="Usuń z ulubionych"
                            >
                              {playlist.createdBy?.username ? (
                                // Filled heart - this is a favorite playlist
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                                </svg>
                              ) : (
                                // Empty heart - this is user's own playlist, can be favorited
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                </svg>
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Change Nickname Modal */}
      {showChangeNickModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-700 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Zmień nick</h2>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="newNickname" className="block text-sm font-medium text-gray-300 mb-1">
                  Nowy nick *
                </label>
                <input
                  type="text"
                  id="newNickname"
                  value={newNickname}
                  onChange={(e) => setNewNickname(e.target.value)}
                  maxLength={30}
                  placeholder="Wprowadź nowy nick"
                  className="w-full p-2 bg-gray-600 text-white rounded border border-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-gray-400">
                    Tylko litery, cyfry, _ i -
                  </span>
                  <span className={`text-xs ${
                    newNickname.length > 25 ? 'text-yellow-400' : 'text-gray-400'
                  }`}>
                    {newNickname.length}/30
                  </span>
                </div>
              </div>
              
              {changeNickError && (
                <p className="text-red-400 text-sm">{changeNickError}</p>
              )}
              
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  onClick={closeChangeNickModal}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500 transition"
                  disabled={changeNickLoading}
                >
                  Anuluj
                </button>
                <button
                  onClick={handleChangeNickname}
                  disabled={changeNickLoading || !newNickname.trim() || newNickname.trim() === user?.nick}
                  className={`px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition flex items-center ${
                    (changeNickLoading || !newNickname.trim() || newNickname.trim() === user?.nick) ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {changeNickLoading ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent mr-2"></div>
                      Zmienianie...
                    </>
                  ) : (
                    'Zmień nick'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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

      {/* Create Playlist Modal */}
      {showCreatePlaylistModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-700 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Utwórz nową playlistę</h2>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="playlistName" className="block text-sm font-medium text-gray-300 mb-1">
                  Nazwa playlisty *
                </label>
                <input
                  type="text"
                  id="playlistName"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  maxLength={70}
                  placeholder="Wprowadź nazwę playlisty"
                  className="w-full p-2 bg-gray-600 text-white rounded border border-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {newPlaylistName.length > 0 && (
                  <div className="flex justify-end mt-1">
                    <span className={`text-xs ${
                      newPlaylistName.length > 60 ? 'text-yellow-400' : 'text-gray-400'
                    }`}>
                      {newPlaylistName.length}/70
                    </span>
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Obraz playlisty (opcjonalnie)
                </label>
                <div
                  className="border-2 border-dashed border-gray-500 rounded-lg p-4 text-center cursor-pointer hover:border-blue-500 transition"
                  onClick={() => playlistFileInputRef.current?.click()}
                >
                  {newPlaylistImage ? (
                    <div className="flex items-center justify-center">
                      <span className="text-green-400">✓ Obraz wybrany</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setNewPlaylistImage(null);
                        }}
                        className="ml-2 text-red-400 hover:text-red-300"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-gray-400">Kliknij aby wybrać obraz</p>
                      <p className="text-xs text-gray-500 mt-1">PNG, JPG - maksymalnie 1000x1000px</p>
                    </>
                  )}
                </div>
                
                <input
                  ref={playlistFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePlaylistImageSelect}
                  className="hidden"
                />
              </div>
              
              {createPlaylistError && (
                <p className="text-red-400 text-sm">{createPlaylistError}</p>
              )}
              
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  onClick={closeCreatePlaylistModal}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500 transition"
                  disabled={isCreatingPlaylist}
                >
                  Anuluj
                </button>
                <button
                  onClick={handleCreatePlaylist}
                  disabled={isCreatingPlaylist || !newPlaylistName.trim()}
                  className={`px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition flex items-center ${
                    (isCreatingPlaylist || !newPlaylistName.trim()) ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {isCreatingPlaylist ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent mr-2"></div>
                      Tworzenie...
                    </>
                  ) : (
                    'Utwórz Playlistę'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;