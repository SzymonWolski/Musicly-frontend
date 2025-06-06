import React, { useState, useEffect, useRef } from "react";
import { useAudioPlayer } from "@/context/AudioPlayerContext";
import { useAuth } from "@/context/AuthContext";
import { Plus, Search, Music, ListMusic, ChevronDown, X } from "lucide-react";
import axios from "axios";
import { AnimatePresence, motion } from "framer-motion";

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

interface Playlist {
  id: number;
  name: string;
  songCount: number;
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
    togglePlayPause,
    seekTo,
    setVolume,
    toggleLoop,
    toggleFavorite
  } = useAudioPlayer();
  
  // Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchResults, setIsSearchResults] = useState(false);
  const [songs, setSongs] = useState<Song[]>(allSongs);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isVolumeVisible, setIsVolumeVisible] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioError, setAudioError] = useState("");
  
  // Tab navigation state
  const [activeTab, setActiveTab] = useState<'songs' | 'playlists'>('songs');
  
  // Playlists state
  const [userPlaylists, setUserPlaylists] = useState<Playlist[]>([]);
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);
  const [filteredPlaylists, setFilteredPlaylists] = useState<Playlist[]>([]);
  
  // Create playlist modal state
  const [isCreatePlaylistModalOpen, setIsCreatePlaylistModalOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
  const [createPlaylistError, setCreatePlaylistError] = useState('');
  
  // Dropdown state for "Add to playlist"
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Initialize local song list with all available songs
  useEffect(() => {
    if (allSongs.length > 0) {
      setSongs(allSongs);
      setLoading(false);
    } else {
      setLoading(false);
    }
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

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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
        setFilteredPlaylists(response.data.playlists);
      }
    } catch (error) {
      console.error('Error fetching playlists:', error);
    } finally {
      setLoadingPlaylists(false);
    }
  };

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
    setOpenDropdownId(openDropdownId === songId ? null : songId);
  };
  
  const handleAddSongToPlaylist = async (e: React.MouseEvent, songId: number, playlistId: number) => {
    e.stopPropagation(); // Prevent other actions
    
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

  // Handle opening and closing the create playlist modal
  const openCreatePlaylistModal = () => {
    setIsCreatePlaylistModalOpen(true);
    setNewPlaylistName('');
    setCreatePlaylistError('');
  };
  
  const closeCreatePlaylistModal = () => {
    setIsCreatePlaylistModalOpen(false);
  };
  
  // Handle creating a new playlist
  const handleCreatePlaylist = async () => {
    // Validate input
    if (!newPlaylistName.trim()) {
      setCreatePlaylistError('Nazwa playlisty nie może być pusta.');
      return;
    }
    
    setIsCreatingPlaylist(true);
    setCreatePlaylistError('');
    
    try {
      const response = await axios.post('http://localhost:5000/playlists', {
        name: newPlaylistName.trim()
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Add the new playlist to state
      if (response.data && response.data.playlist) {
        const newPlaylist = {
          id: response.data.playlist.id,
          name: response.data.playlist.name,
          songCount: 0
        };
        
        setUserPlaylists([...userPlaylists, newPlaylist]);
        setFilteredPlaylists([...userPlaylists, newPlaylist]);
      }
      
      // Close modal
      closeCreatePlaylistModal();
      
    } catch (error) {
      console.error('Error creating playlist:', error);
      setCreatePlaylistError('Nie udało się utworzyć playlisty. Spróbuj ponownie.');
    } finally {
      setIsCreatingPlaylist(false);
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

  return (
    <div className="flex flex-col h-full rounded-lg" 
      style={{
        background: 'linear-gradient(355deg, #000000 20%,rgb(65, 38, 4) 50%,rgb(165, 85, 28) 80%)',
        backgroundAttachment: 'fixed'
      }}>
      {/* Create Playlist Modal */}
      <AnimatePresence>
        {isCreatePlaylistModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4"
            onClick={closeCreatePlaylistModal}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-800 rounded-lg p-6 w-full max-w-md"
              onClick={e => e.stopPropagation()}
            >
              <h2 className="text-xl font-bold text-white mb-4">Utwórz nową playlistę</h2>
              
              <div className="mb-4">
                <label htmlFor="playlistName" className="block text-sm font-medium text-gray-300 mb-1">
                  Nazwa playlisty
                </label>
                <input
                  type="text"
                  id="playlistName"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  placeholder="Wprowadź nazwę playlisty"
                  className="w-full p-2 bg-zinc-700 text-white rounded border border-zinc-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {createPlaylistError && (
                  <p className="text-red-500 text-sm mt-1">{createPlaylistError}</p>
                )}
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={closeCreatePlaylistModal}
                  className="px-4 py-2 bg-zinc-700 text-white rounded hover:bg-zinc-600 transition"
                >
                  Anuluj
                </button>
                <button
                  onClick={handleCreatePlaylist}
                  disabled={isCreatingPlaylist}
                  className={`px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition flex items-center ${
                    isCreatingPlaylist ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                >
                  {isCreatingPlaylist ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent mr-2"></div>
                      Tworzenie...
                    </>
                  ) : (
                    'Utwórz playlistę'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
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
                  <div className="w-full">
                    <h2 className="text-xl font-bold text-white">{currentSong.nazwa_utworu}</h2>
                    <p className="text-gray-400">{currentSong.Autor.kryptonim_artystyczny} • {currentSong.data_wydania}</p>
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
            {/* Search moved inside the songs container */}
            <div className="p-4 border-b border-gray-700">
              <div className="flex bg-gray-800 bg-opacity-50 rounded-lg overflow-hidden">
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

            <h3 className="text-lg font-semibold text-white mb-2 px-4 pt-2">
              {isSearchResults ? "Znalezione utwory" : "Ostatnio dodane utwory"}
            </h3>
            
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
                        <div>
                          <p className="font-medium text-white">{song.nazwa_utworu}</p>
                          <p className="text-sm text-gray-400">{song.Autor.kryptonim_artystyczny} • {song.data_wydania}</p>
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
                              <div className="absolute right-0 mt-1 w-56 bg-zinc-800 rounded-md shadow-lg z-10">
                                <div className="p-2 border-b border-zinc-700 flex justify-between items-center">
                                  <span className="text-white text-sm font-medium">Dodaj do playlisty</span>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
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
                                        onClick={(e) => handleAddSongToPlaylist(e, song.ID_utworu, playlist.id)}
                                        className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-zinc-700 flex justify-between items-center"
                                      >
                                        <span>{playlist.name}</span>
                                        <span className="text-xs text-gray-400">{playlist.songCount} utwor{playlist.songCount === 1 ? '' : playlist.songCount < 5 ? 'y' : 'ów'}</span>
                                      </button>
                                    ))
                                  )}
                                </div>
                                <div className="p-2 border-t border-zinc-700">
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      addToPlaylist(song);
                                      setOpenDropdownId(null);
                                      alert("Dodano do obecnej kolejki odtwarzania!");
                                    }}
                                    className="w-full text-center py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                                  >
                                    Dodaj do aktualnej kolejki
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                          
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

            <h3 className="text-lg font-semibold text-white mb-2 px-4 pt-2">
              {isSearchResults ? "Znalezione playlisty" : "Twoje playlisty"}
            </h3>
            
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
                    <p>Nie masz jeszcze żadnych playlist</p>
                    <p className="text-sm mt-2">Stwórz nową playlistę, aby organizować swoją muzykę</p>
                    <button
                      className="mt-4 px-4 py-2 bg-blue-600 bg-opacity-80 text-white rounded hover:bg-blue-700"
                      onClick={openCreatePlaylistModal}
                    >
                      Stwórz playlistę
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                {filteredPlaylists.map((playlist) => (
                  <div 
                    key={playlist.id}
                    className="bg-zinc-800 bg-opacity-60 rounded-lg overflow-hidden hover:bg-opacity-80 transition cursor-pointer"
                  >
                    <div className="h-32 bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                      <ListMusic size={48} className="text-white" />
                    </div>
                    <div className="p-3">
                      <h4 className="font-medium text-white truncate">{playlist.name}</h4>
                      <p className="text-sm text-gray-400">{playlist.songCount} utwor{playlist.songCount === 1 ? '' : playlist.songCount < 5 ? 'y' : 'ów'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default HomePage;