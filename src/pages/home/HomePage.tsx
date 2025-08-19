import React, { useState, useEffect, useRef } from "react";
import { useAudioPlayer } from "@/context/AudioPlayerContext";
import { useAuth } from "@/context/AuthContext";
import { Plus, Search, Music, ListMusic, X, RefreshCw, Heart } from "lucide-react"; // Dodaj Heart
import axios from "axios";
import { AnimatePresence, motion } from "framer-motion";

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

interface Playlist {
  id: number;
  name: string;
  songCount: number;
  imageFilename?: string;
  createdBy: string;
  isFavorite?: boolean; // Dodaj pole isFavorite
  likesCount?: number; // Dodaj pole likesCount
}

const HomePage = () => {
  const { token } = useAuth();
  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    volume,
    isLooping,
    allSongs,
    favoriteSongs,
    playSong,
    addToPlaylist,
    clearPlaylist,
    togglePlayPause,
    seekTo,
    setVolume,
    toggleLoop,
    toggleFavorite,
    refreshSongs
  } = useAudioPlayer();
  
  // Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchResults, setIsSearchResults] = useState(false);
  const [songs, setSongs] = useState<Song[]>(allSongs);
  const [loading, setLoading] = useState(true);
  const [error] = useState("");
  const [isVolumeVisible, setIsVolumeVisible] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioError, setAudioError] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Tab navigation state
  const [activeTab, setActiveTab] = useState<'songs' | 'playlists'>('songs');
  
  // Playlists state
  const [userPlaylists, setUserPlaylists] = useState<Playlist[]>([]);
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);
  const [filteredPlaylists, setFilteredPlaylists] = useState<Playlist[]>([]);
  
  // Add state for playlist images
  const [playlistImages, setPlaylistImages] = useState<{[key: number]: string}>({});

  // Selected playlist state
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [playlistSongs, setPlaylistSongs] = useState<Song[]>([]);
  const [loadingPlaylistSongs, setLoadingPlaylistSongs] = useState(false);
  const [playlistError, setPlaylistError] = useState('');
  
  // Dropdown state for "Add to playlist"
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{top: number, right: number}>({top: 0, right: 0});
  const dropdownRef = useRef<HTMLDivElement>(null);

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
          // Replace with music note icon on error
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          target.parentElement!.innerHTML = `
            <div class="w-full h-full flex items-center justify-center bg-gray-600">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
          `;
        }}
      />
    </div>
  );

  // Initialize local song list with all available songs
  useEffect(() => {
    setSongs(allSongs);
    setLoading(false);
  }, [allSongs]);

  // Fetch user playlists
  useEffect(() => {
    if (token) {
      fetchUserPlaylists();
    }
  }, [token]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdownId(null);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenDropdownId(null);
      }
    };

    const handleScroll = () => {
      setOpenDropdownId(null);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    document.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

  const fetchUserPlaylists = async () => {
    setLoadingPlaylists(true);
    try {
      const response = await axios.get('http://localhost:5000/playlists?myOnly=true', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.data && Array.isArray(response.data.playlists)) {
        // Backend już zwraca likesCount i isFavorite, więc możemy używać danych bezpośrednio
        const playlistsWithCorrectNaming = response.data.playlists.map((playlist: any) => ({
          ...playlist,
          likesCount: playlist.likeCount, // Mapuj likeCount na likesCount dla spójności
          isFavorite: playlist.isFavorite || false
        }));
        
        setUserPlaylists(playlistsWithCorrectNaming);
        setFilteredPlaylists(playlistsWithCorrectNaming);
        
        // Fetch images for playlists that have them
        const imagePromises = playlistsWithCorrectNaming
          .filter((playlist: Playlist) => playlist.imageFilename)
          .map((playlist: Playlist) => fetchPlaylistImage(playlist.id));
        
        await Promise.allSettled(imagePromises);
      }
    } catch (error) {
      console.error('Error fetching playlists:', error);
    } finally {
      setLoadingPlaylists(false);
    }
  };

  // Function to fetch playlist image - POPRAWKA
  const fetchPlaylistImage = async (playlistId: number): Promise<void> => {
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
      } else {
        console.warn(`Failed to fetch image for playlist ${playlistId}:`, response.status);
      }
    } catch (error) {
      console.error(`Error fetching playlist image for ${playlistId}:`, error);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdownId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Format time helper function
  const formatTime = (time: number) => {
    if (isNaN(time) || time < 0) return "00:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  
  const toggleVolumeSlider = () => {
    setIsVolumeVisible(!isVolumeVisible);
  };
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    
    // Reset to original lists if search query is cleared
    if (e.target.value === "") {
      setSongs(allSongs);
      setFilteredPlaylists(userPlaylists);
      setIsSearchResults(false);
    }
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      setSongs(allSongs);
      setFilteredPlaylists(userPlaylists);
      setIsSearchResults(false);
      return;
    }

    setIsSearching(true);
    
    if (activeTab === 'songs') {
      // Filter songs locally based on search query
      const filteredResults = allSongs.filter(song => 
        song.nazwa_utworu.toLowerCase().includes(searchQuery.toLowerCase()) ||
        song.Autor.kryptonim_artystyczny.toLowerCase().includes(searchQuery.toLowerCase())
      );
      
      setSongs(filteredResults);
    } else {
      // Filter playlists locally based on search query
      const filteredResults = userPlaylists.filter(playlist => 
        playlist.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      
      setFilteredPlaylists(filteredResults);
    }
    
    setIsSearchResults(true);
    setIsSearching(false);
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };
  
  const handlePlayThisSong = async (song: Song) => {
    setAudioLoading(true);
    setAudioError("");
    
    try {
      // Explicitly set source as 'single' for homepage playback
      await playSong(song, 'single');
      console.log("Playing single song from homepage");
    } catch (error) {
      setAudioError("Nie można załadować pliku audio. Spróbuj ponownie później.");
    } finally {
      setAudioLoading(false);
    }
  };
  
  const toggleAddToPlaylistDropdown = (e: React.MouseEvent, songId: number) => {
    e.stopPropagation(); // Prevent triggering the song play
    
    if (openDropdownId === songId) {
      setOpenDropdownId(null);
    } else {
      const button = e.currentTarget as HTMLElement;
      const rect = button.getBoundingClientRect();
      
      // Calculate position relative to viewport
      const top = Math.max(10, rect.top - 8); // 260px is approximate dropdown height
      const right = Math.max(10, window.innerWidth - rect.right);
      
      setDropdownPosition({ top, right });
      setOpenDropdownId(songId);
    }
  };
  
  const handleAddSongToPlaylist = async (e: React.MouseEvent, songId: number, playlistId: number) => {
    e.stopPropagation();
    e.preventDefault();
    
    try {
      await axios.post(`http://localhost:5000/playlists/${playlistId}/songs`, {
        songId
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Show success notification
      alert(`Dodano utwór do playlisty!`);
      
      // Close the dropdown
      setOpenDropdownId(null);
    } catch (error) {
      console.error('Error adding song to playlist:', error);
      alert('Nie udało się dodać utworu do playlisty.');
    }
  };

  // Switch between tabs
  const switchTab = (tab: 'songs' | 'playlists') => {
    setActiveTab(tab);
    setIsSearchResults(false);
    setSearchQuery('');
    
    // Reset filtered results when switching tabs
    if (tab === 'songs') {
      setSongs(allSongs);
    } else {
      setFilteredPlaylists(userPlaylists);
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
      
      // Update the song count
      if (selectedPlaylist) {
        setSelectedPlaylist({
          ...selectedPlaylist,
          songCount: selectedPlaylist.songCount - 1
        });
        
        // Also update in the playlists list
        setUserPlaylists(prevPlaylists => 
          prevPlaylists.map(playlist => 
            playlist.id === selectedPlaylist.id 
              ? { ...playlist, songCount: playlist.songCount - 1 }
              : playlist
          )
        );
        setFilteredPlaylists(prevPlaylists => 
          prevPlaylists.map(playlist => 
            playlist.id === selectedPlaylist.id 
              ? { ...playlist, songCount: playlist.songCount - 1 } 
              : playlist
          )
        );
      }
      
    } catch (error) {
      console.error('Error removing song from playlist:', error);
      alert('Nie udało się usunąć utworu z playlisty. Spróbuj ponownie.');
    }
  };

  // Handle playing all songs in a playlist
  const handlePlayAllSongs = () => {
    if (!selectedPlaylist || playlistSongs.length === 0) return;
    
    // First clear the current playlist/queue
    clearPlaylist();
    
    // Add all songs to the queue
    playlistSongs.forEach(song => {
      addToPlaylist(song);
    });
    
    // Start playback with the first song
    if (playlistSongs.length > 0) {
      playSong(playlistSongs[0], 'playlist');
    }
  };

  // Dodaj funkcję do ręcznego odświeżania
  const handleRefreshSongs = async () => {
    setIsRefreshing(true);
    try {
      await refreshSongs();
    } catch (error) {
      console.error("Error refreshing songs:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle toggling playlist favorite - zaktualizowana funkcja
  const togglePlaylistFavorite = async (playlistId: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation(); // Prevent opening playlist when clicking favorite button
    
    try {
      const playlist = userPlaylists.find(p => p.id === playlistId) || selectedPlaylist;
      if (!playlist) return;
      
      let newIsFavorite = false;
      let newLikesCount = playlist.likesCount || 0;
      
      if (playlist.isFavorite) {
        // Remove from favorites
        await axios.delete(`http://localhost:5000/favorites/playlists/${playlistId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        newIsFavorite = false;
        newLikesCount = Math.max(0, newLikesCount - 1);
      } else {
        // Add to favorites
        await axios.post('http://localhost:5000/favorites/playlists', 
          { playlistId },
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        newIsFavorite = true;
        newLikesCount = newLikesCount + 1;
      }
      
      // Update local state
      const updatePlaylist = (playlist: Playlist) => 
        playlist.id === playlistId 
          ? { 
              ...playlist, 
              isFavorite: newIsFavorite,
              likesCount: newLikesCount
            }
          : playlist;
      
      setUserPlaylists(prev => prev.map(updatePlaylist));
      setFilteredPlaylists(prev => prev.map(updatePlaylist));
      
      if (selectedPlaylist?.id === playlistId) {
        setSelectedPlaylist(prev => prev ? updatePlaylist(prev) : null);
      }
      
      // Odśwież dane z serwera po chwili dla pewności synchronizacji
      setTimeout(async () => {
        try {
          const response = await axios.get('http://localhost:5000/playlists', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (response.data && Array.isArray(response.data.playlists)) {
            const updatedPlaylist = response.data.playlists.find((p: any) => p.id === playlistId);
            if (updatedPlaylist) {
              const playlistWithCorrectNaming = {
                ...updatedPlaylist,
                likesCount: updatedPlaylist.likeCount,
                isFavorite: updatedPlaylist.isFavorite || false
              };
              
              const updateWithServerData = (playlist: Playlist) => 
                playlist.id === playlistId ? playlistWithCorrectNaming : playlist;
              
              setUserPlaylists(prev => prev.map(updateWithServerData));
              setFilteredPlaylists(prev => prev.map(updateWithServerData));
              
              if (selectedPlaylist?.id === playlistId) {
                setSelectedPlaylist(playlistWithCorrectNaming);
              }
            }
          }
        } catch (error) {
          console.error('Error refreshing playlists:', error);
        }
      }, 1000);
    } catch (error) {
      console.error('Error toggling playlist favorite:', error);
      alert('Nie udało się zmienić statusu ulubionej playlisty.');
    }
  };

  return (
    <div className="flex flex-col h-full rounded-lg" 
      style={{
        background: 'linear-gradient(355deg, #000000 20%,rgb(65, 38, 4) 50%,rgb(165, 85, 28) 80%)',
        backgroundAttachment: 'fixed'
      }}>
      
      {/* Animated Music player section */}
      <AnimatePresence>
        {currentSong && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="bg-gray-800 bg-opacity-60 p-4 rounded-lg mb-4 shadow-lg backdrop-blur-sm">
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4 w-full">
                    {/* Song Image in Player with cache busting */}
                    <div className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-700">
                      <img
                        src={getSongImageUrl(currentSong.ID_utworu)}
                        alt={`Okładka ${currentSong.nazwa_utworu}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Replace with music note icon on error
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.parentElement!.innerHTML = `
                            <div class="w-full h-full flex items-center justify-center bg-gray-600">
                              <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                              </svg>
                            </div>
                          `;
                        }}
                      />
                    </div>
                    
                    {/* Song Info */}
                    <div className="flex-1">
                      <h2 className="text-xl font-bold text-white">{currentSong.nazwa_utworu}</h2>
                      <p className="text-gray-400">{currentSong.Autor.kryptonim_artystyczny} • {currentSong.data_wydania}</p>
                    </div>
                  </div>
                  {audioLoading && (
                    <div className="p-2 bg-gray-600 bg-opacity-70 rounded-full">
                      <div className="animate-spin h-8 w-8 border-2 border-blue-500 rounded-full border-t-transparent"></div>
                    </div>
                  )}
                </div>
                
                {audioError ? (
                  <div className="bg-red-800 text-white p-2 rounded mb-2 text-center">
                    {audioError}
                  </div>
                ) : null}

                {/* Custom Audio Player */}
                <div className="bg-gray-900 bg-opacity-60 rounded-lg p-4 backdrop-blur-sm">
                  {/* Progress Bar */}
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-xs text-gray-400">{formatTime(currentTime)}</span>
                    <input 
                      type="range"
                      min={0}
                      max={duration || 100} // Fallback to 100 if duration is 0
                      value={currentTime}
                      onChange={(e) => seekTo(Number(e.target.value))}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(duration > 0 ? (currentTime / duration) * 100 : 0)}%, #4b5563 ${(duration > 0 ? (currentTime / duration) * 100 : 0)}%, #4b5563 100%)`,
                      }}
                    />
                    <span className="text-xs text-gray-400">
                      {duration > 0 ? formatTime(duration) : "--:--"}
                    </span>
                  </div>

                  {/* Controls */}
                  <div className="flex justify-center items-center gap-6 my-2">
                    {/* Loop Button */}
                    <button 
                      onClick={toggleLoop}
                      className={`p-2 rounded-full ${isLooping ? 'bg-blue-600 bg-opacity-70' : 'text-gray-300 hover:text-white'}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                    
                    {/* Play/Pause Button */}
                    <button
                      onClick={togglePlayPause}
                      disabled={!!audioError || !currentSong}
                      className={`p-3 ${audioError || !currentSong ? 'bg-gray-600 bg-opacity-70' : 'bg-blue-600 bg-opacity-80 hover:bg-blue-700 hover:bg-opacity-90'} text-white rounded-full transition`}
                    >
                      {isPlaying ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                    </button>

                    {/* Volume Control */}
                    <div className="relative flex items-center">
                      <button 
                        onClick={toggleVolumeSlider}
                        className="p-2 text-gray-300 hover:text-white rounded-full"
                      >
                        {volume === 0 ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                          </svg>
                        ) : volume < 0.5 ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m4.95-4.95a9 9 0 000 2.828m-4.95-9.9a13 13 0 000 16.972" />
                          </svg>
                        )}
                      </button>
                      
                      {isVolumeVisible && (
                        <div className="absolute left-10 bg-gray-800 p-2 rounded-lg shadow-lg transition-all z-10 w-32">
                          <input 
                            type="range"
                            min={0}
                            max={1}
                            step={0.01}
                            value={volume}
                            onChange={(e) => setVolume(Number(e.target.value))}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                            style={{
                              background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${volume * 100}%, #4b5563 ${volume * 100}%, #4b5563 100%)`,
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content container */}
      <div className="flex-1 overflow-hidden bg-black bg-opacity-30 rounded-lg">
        {/* Tab navigation */}
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => switchTab('songs')}
            className={`flex items-center px-4 py-2 ${
              activeTab === 'songs' 
                ? 'text-blue-400 border-b-2 border-blue-400' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Music size={16} className="mr-2" />
            Utwory
          </button>
          <button
            onClick={() => switchTab('playlists')}
            className={`flex items-center px-4 py-2 ${
              activeTab === 'playlists' 
                ? 'text-blue-400 border-b-2 border-blue-400' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <ListMusic size={16} className="mr-2" />
            Playlisty
          </button>
        </div>

        {/* Conditional content based on active tab */}
        {activeTab === 'songs' ? (
          <>
            {/* Search z przyciskiem odświeżania */}
            <div className="p-4 border-b border-gray-700">
              <div className="flex gap-2">
                <div className="flex-1 bg-gray-800 bg-opacity-50 rounded-lg overflow-hidden">
                  <div className="flex">
                    <input
                      type="text"
                      placeholder="Wyszukaj piosenkę po tytule lub artyście"
                      value={searchQuery}
                      onChange={handleSearchChange}
                      onKeyPress={handleKeyPress}
                      className="flex-grow p-2 bg-transparent text-white border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-l-lg"
                    />
                    <button 
                      onClick={handleSearch}
                      disabled={isSearching}
                      className={`px-4 py-2 bg-blue-600 bg-opacity-80 text-white hover:bg-blue-700 hover:bg-opacity-90 transition ${
                        isSearching ? "opacity-70 cursor-not-allowed" : ""
                      }`}
                    >
                      <Search size={16} />
                    </button>
                  </div>
                </div>
                
                {/* Przycisk odświeżania */}
                <button
                  onClick={handleRefreshSongs}
                  disabled={isRefreshing}
                  className={`px-3 py-2 bg-green-600 bg-opacity-80 text-white rounded-lg hover:bg-green-700 hover:bg-opacity-90 transition flex items-center ${
                    isRefreshing ? "opacity-70 cursor-not-allowed" : ""
                  }`}
                  title="Odśwież listę utworów"
                >
                  <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center px-4 pt-2 mb-2">
              <h3 className="text-lg font-semibold text-white">
                {isSearchResults ? "Znalezione utwory" : "Ostatnio dodane utwory"}
              </h3>
              {!isSearchResults && (
                <span className="text-sm text-gray-400">
                  {songs.length} utwor{songs.length === 1 ? '' : songs.length < 5 ? 'y' : 'ów'}
                </span>
              )}
            </div>
            
            {loading ? (
              <div className="flex justify-center items-center h-40">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
              </div>
            ) : error ? (
              <div className="text-center text-red-500 p-4">{error}</div>
            ) : songs.length === 0 ? (
              <div className="text-center text-gray-400 p-4">
                {isSearchResults ? "Nie znaleziono pasujących piosenek" : "Brak dostępnych piosenek"}
              </div>
            ) : (
              <div className="overflow-y-auto h-[calc(100%-90px)] pb-20">
                <ul className="divide-y divide-gray-700">
                  {songs.map((song) => (
                    <li 
                      key={song.ID_utworu} 
                      className={`px-4 py-3 hover:bg-gray-700 hover:bg-opacity-50 cursor-pointer transition ${
                        currentSong?.ID_utworu === song.ID_utworu ? 'bg-gray-700 bg-opacity-50' : ''
                      }`}
                      onClick={() => handlePlayThisSong(song)}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                          {/* Song Image with cache busting */}
                          {renderSongImage(song, "w-12 h-12")}
                          
                          {/* Song Info */}
                          <div>
                            <p className="font-medium text-white">{song.nazwa_utworu}</p>
                            <p className="text-sm text-gray-400">{song.Autor.kryptonim_artystyczny} • {song.data_wydania}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          {/* Add to playlist button with dropdown */}
                          <div className="relative" ref={dropdownRef}>
                            <button 
                              onClick={(e) => toggleAddToPlaylistDropdown(e, song.ID_utworu)}
                              className="p-1 text-gray-400 hover:text-green-400 transition"
                              title="Dodaj do playlisty"
                            >
                              <Plus size={18} />
                            </button>
                            
                            {/* Playlist dropdown menu */}
                            {openDropdownId === song.ID_utworu && (
                              <div 
                                className="fixed w-56 bg-zinc-800 rounded-md shadow-xl z-50 border border-zinc-600"
                                style={{
                                  top: `${dropdownPosition.top}px`,
                                  right: `${dropdownPosition.right}px`,
                                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.2)'
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                }}
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                }}
                              >
                                <div className="p-2 border-b border-zinc-700 flex justify-between items-center">
                                  <span className="text-white text-sm font-medium">Dodaj do playlisty</span>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      setOpenDropdownId(null);
                                    }}
                                    className="text-gray-400 hover:text-white"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                                <div className="max-h-48 overflow-y-auto py-1">
                                  {loadingPlaylists ? (
                                    <div className="flex justify-center items-center py-4">
                                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                                    </div>
                                  ) : userPlaylists.length === 0 ? (
                                    <div className="py-2 px-4 text-sm text-gray-400">
                                      Brak dostępnych playlist
                                    </div>
                                  ) : (
                                    userPlaylists.map((playlist) => (
                                      <button
                                        key={playlist.id}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          e.preventDefault();
                                          handleAddSongToPlaylist(e, song.ID_utworu, playlist.id);
                                        }}
                                        onMouseDown={(e) => {
                                          e.stopPropagation();
                                          e.preventDefault();
                                        }}
                                        className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-zinc-700 flex justify-between items-center transition-colors"
                                      >
                                        <span>{playlist.name}</span>
                                        <span className="text-xs text-gray-400">{playlist.songCount} utwor{playlist.songCount === 1 ? '' : playlist.songCount < 5 ? 'y' : 'ów'}</span>
                                      </button>
                                    ))
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {/* Like count display */}
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
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                              </svg>
                            )}
                          </button>
                          
                          {/* Play button */}
                          <button className="p-1 text-blue-400 hover:text-blue-300 transition">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          /* Playlists tab content */
          <>
            {/* Search moved inside the playlists container */}
            <div className="p-4 border-b border-gray-700">
              <div className="flex bg-gray-800 bg-opacity-50 rounded-lg overflow-hidden">
                <input
                  type="text"
                  placeholder="Wyszukaj playlistę po nazwie"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onKeyPress={handleKeyPress}
                  className="flex-grow p-2 bg-transparent text-white border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-l-lg"
                />
                <button 
                  onClick={handleSearch}
                  disabled={isSearching}
                  className={`px-4 py-2 bg-blue-600 bg-opacity-80 text-white hover:bg-blue-700 hover:bg-opacity-90 transition ${
                    isSearching ? "opacity-70 cursor-not-allowed" : ""
                  }`}
                >
                  <Search size={16} />
                </button>
              </div>
            </div>

            {selectedPlaylist ? (
              /* Playlist content view */
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between p-4 border-b border-gray-700">
                  <div className="flex items-center">
                    <button 
                      onClick={closePlaylistContent}
                      className="mr-3 text-gray-400 hover:text-white transition"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                    <div>
                      <h2 className="text-xl font-bold text-white">{selectedPlaylist.name}</h2>
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span>
                          ({selectedPlaylist.songCount} utwor{selectedPlaylist.songCount === 1 ? '' : selectedPlaylist.songCount < 5 ? 'y' : 'ów'})
                        </span>
                        <div className="flex items-center gap-1">
                          <Heart size={14} className={selectedPlaylist.isFavorite ? 'text-red-500' : 'text-gray-500'} />
                          <span>{selectedPlaylist.likesCount || 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {/* Favorite button for playlist detail view */}
                    <button
                      onClick={(e) => togglePlaylistFavorite(selectedPlaylist.id, e)}
                      className={`p-2 rounded-full transition ${
                        selectedPlaylist.isFavorite 
                          ? 'text-red-500 hover:text-red-400 bg-red-500 bg-opacity-20' 
                          : 'text-gray-400 hover:text-red-400 hover:bg-red-500 hover:bg-opacity-20'
                      }`}
                      title={selectedPlaylist.isFavorite ? "Usuń z ulubionych" : "Dodaj do ulubionych"}
                    >
                      <Heart size={20} fill={selectedPlaylist.isFavorite ? 'currentColor' : 'none'} />
                    </button>
                    
                    <button
                      onClick={handlePlayAllSongs}
                      disabled={playlistSongs.length === 0}
                      className={`px-3 py-1 text-sm bg-green-600 bg-opacity-70 text-white rounded hover:bg-green-700 hover:bg-opacity-90 transition flex items-center ${
                        playlistSongs.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      title="Odtwórz wszystkie utwory"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="5 3 19 12 5 21 5 3"></polygon>
                      </svg>
                      Odtwórz wszystkie
                    </button>
                  </div>
                </div>

                {loadingPlaylistSongs ? (
                  <div className="flex-1 flex justify-center items-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
                  </div>
                ) : playlistError ? (
                  <div className="flex-1 flex justify-center items-center">
                    <div className="text-red-500">{playlistError}</div>
                  </div>
                ) : playlistSongs.length === 0 ? (
                  <div className="flex-1 flex flex-col justify-center items-center text-center p-4">
                    <Music size={48} className="mb-2 text-gray-500" />
                    <p className="text-gray-400">Ta playlista jest pusta</p>
                    <p className="text-sm text-gray-500 mt-1">Dodaj utwory do tej playlisty</p>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto">
                    <ul className="divide-y divide-gray-700">
                      {playlistSongs.map((song) => (
                        <li 
                          key={song.ID_utworu} 
                          className={`px-4 py-3 hover:bg-gray-700 hover:bg-opacity-50 cursor-pointer transition ${
                            currentSong?.ID_utworu === song.ID_utworu ? 'bg-gray-700 bg-opacity-50' : ''
                          }`}
                          onClick={() => handlePlayThisSong(song)}
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex items-center space-x-3">
                              {/* Song Image with cache busting */}
                              {renderSongImage(song, "w-12 h-12")}
                              
                              {/* Song Info */}
                              <div>
                                <p className="font-medium text-white">{song.nazwa_utworu}</p>
                                <p className="text-sm text-gray-400">{song.Autor.kryptonim_artystyczny} • {song.data_wydania}</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-3">
                              {/* Remove from playlist button - Updated to use the new function */}
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
                              
                              {/* Like count display */}
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
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                  </svg>
                                )}
                              </button>
                              
                              {/* Play button */}
                              <button className="p-1 text-blue-400 hover:text-blue-300 transition">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Modified to include a flex container with the New Playlist button */}
                <div className="flex justify-between items-center px-4 pt-2 mb-2">
                  <h3 className="text-lg font-semibold text-white">
                    {isSearchResults ? "Znalezione playlisty" : "Wszystkie playlisty"}
                  </h3>
                </div>
                
                {loadingPlaylists ? (
                  <div className="flex justify-center items-center h-40">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
                  </div>
                ) : filteredPlaylists.length === 0 ? (
                  <div className="bg-black bg-opacity-30 rounded-lg text-center text-gray-400 p-8">
                    <ListMusic size={48} className="mx-auto mb-2 text-gray-500" />
                    {isSearchResults ? (
                      "Nie znaleziono pasujących playlist"
                    ) : (
                      <>
                        <p>Brak dostępnych playlist</p>
                        <p className="text-sm mt-2">Playlisty użytkowników pojawią się tutaj</p>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                    {filteredPlaylists.map((playlist) => (
                      <div 
                        key={playlist.id}
                        className="bg-zinc-800 bg-opacity-60 rounded-lg overflow-hidden hover:bg-opacity-80 transition cursor-pointer relative group"
                        onClick={() => openPlaylistContent(playlist)}
                      >
                        <div className="h-32 bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center relative">
                          {playlist.imageFilename && playlistImages[playlist.id] ? (
                            <img
                              src={playlistImages[playlist.id]}
                              alt={`Okładka ${playlist.name}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                // Replace with default icon on error
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                target.parentElement!.innerHTML = `
                                  <div class="w-full h-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                                    </svg>
                                  </div>
                                `;
                              }}
                            />
                          ) : (
                            <ListMusic size={48} className="text-white" />
                          )}
                          
                          {/* Favorite button overlay */}
                          <button
                            onClick={(e) => togglePlaylistFavorite(playlist.id, e)}
                            className={`absolute top-2 right-2 p-1.5 rounded-full transition opacity-0 group-hover:opacity-100 ${
                              playlist.isFavorite 
                                ? 'text-red-500 bg-black bg-opacity-50' 
                                : 'text-white bg-black bg-opacity-50 hover:text-red-400'
                            }`}
                            title={playlist.isFavorite ? "Usuń z ulubionych" : "Dodaj do ulubionych"}
                          >
                            <Heart size={16} fill={playlist.isFavorite ? 'currentColor' : 'none'} />
                          </button>
                        </div>
                        <div className="p-3">
                          <h4 className="font-medium text-white truncate">{playlist.name}</h4>
                          <p className="text-sm text-gray-400">{playlist.songCount} utwor{playlist.songCount === 1 ? '' : playlist.songCount < 5 ? 'y' : 'ów'}</p>
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-xs text-gray-500">Utworzona przez: {playlist.createdBy}</p>
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Heart size={12} className={playlist.isFavorite ? 'text-red-500' : 'text-gray-500'} />
                              <span>{playlist.likesCount || 0}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default HomePage;