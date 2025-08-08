import { useAuth } from "../context/AuthContext";
import { useState, useRef, useEffect } from "react";
import { Upload, Plus, ListMusic, X, Edit2, Trash2, ArrowLeft, Play } from "lucide-react";
import axios from "axios";
import { useAudioPlayer } from "../context/AudioPlayerContext";

interface Playlist {
  id: number;
  name: string;
  songCount: number;
  imageFilename?: string;
}

interface Song {
  ID_utworu: number;
  nazwa_utworu: string;
  data_wydania: string;
  likes_count: number;
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
    }
  }, [token]);

  const fetchUserPlaylists = async () => {
    setLoadingPlaylists(true);
    try {
      const response = await axios.get('http://localhost:5000/playlists', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.data && Array.isArray(response.data.playlists)) {
        setUserPlaylists(response.data.playlists);
        
        // Fetch images for playlists that have them
        response.data.playlists.forEach((playlist: Playlist) => {
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

  const fetchPlaylistImage = async (playlistId: number) => {
    try {
      const response = await fetch(`http://localhost:5000/playlists/${playlistId}/image`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
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
      const formData = new FormData();
      formData.append('name', newPlaylistName.trim());
      
      if (newPlaylistImage) {
        formData.append('playlistImage', newPlaylistImage);
      }
      
      const response = await axios.post('http://localhost:5000/playlists', formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (response.data && response.data.playlist) {
        const newPlaylist = {
          id: response.data.playlist.id,
          name: response.data.playlist.name,
          songCount: 0,
          imageFilename: response.data.playlist.imageFilename
        };
        
        setUserPlaylists(prev => [...prev, newPlaylist]);
        
        if (newPlaylist.imageFilename) {
          fetchPlaylistImage(newPlaylist.id);
        }
      }
      
      closeCreatePlaylistModal();
      
    } catch (error) {
      console.error('Error creating playlist:', error);
      setCreatePlaylistError('Nie udało się utworzyć playlisty. Spróbuj ponownie.');
    } finally {
      setIsCreatingPlaylist(false);
    }
  };

  const validatePlaylistImage = (file: File) => {
    const img = new Image();
    img.onload = () => {
      if (img.width !== 1000 || img.height !== 1000) {
        alert('Obraz playlisty musi mieć wymiary 1000x1000 pikseli');
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
        setPlaylistSongs(response.data.songs);
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
      await playSong(song, 'single');
    } catch (error) {
      console.error('Error playing song:', error);
      alert('Nie można załadować utworu. Spróbuj ponownie.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-800 text-white p-4">
      <div className="max-w-4xl mx-auto bg-gray-700 rounded-lg p-8 shadow-lg">
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
                  <button
                    onClick={() => handleDeletePlaylist(selectedPlaylist.id, selectedPlaylist.name)}
                    className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition"
                    title="Usuń playlistę"
                  >
                    Usuń playlistę
                  </button>
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
              <>
                <div className="flex justify-between items-center mb-4">
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
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {userPlaylists.map((playlist) => (
                      <div 
                        key={playlist.id}
                        className="bg-gray-600 rounded-lg overflow-hidden hover:bg-gray-500 transition group cursor-pointer"
                        onClick={() => openPlaylistContent(playlist)}
                      >
                        <div className="h-32 bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center relative">
                          {playlist.imageFilename && playlistImages[playlist.id] ? (
                            <img
                              src={playlistImages[playlist.id]}
                              alt={`Okładka ${playlist.name}`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <ListMusic size={48} className="text-white" />
                          )}
                          
                          {/* Playlist Actions */}
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePlaylist(playlist.id, playlist.name);
                              }}
                              className="p-1 bg-red-600 bg-opacity-80 text-white rounded hover:bg-red-700 transition"
                              title="Usuń playlistę"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        <div className="p-3">
                          <h4 className="font-medium text-white truncate">{playlist.name}</h4>
                          <p className="text-sm text-gray-300">
                            {playlist.songCount} utwor{playlist.songCount === 1 ? '' : playlist.songCount < 5 ? 'y' : 'ów'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

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
                      <p className="text-xs text-gray-500 mt-1">PNG, JPG - wymiary 1000x1000px</p>
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