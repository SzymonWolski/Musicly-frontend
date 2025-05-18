import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

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

const HomePage = () => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  // Add search states
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchResults, setIsSearchResults] = useState(false);
  const [originalSongs, setOriginalSongs] = useState<Song[]>([]);

  useEffect(() => {
    fetchSongs();
  }, []);

  const fetchSongs = async () => {
    setLoading(true);
    setError("");
    
    try {
      const response = await axios.get("http://localhost:5000/files/list", {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem("token")}`
        }
      });
      
      if (response.data && response.data.utwory) {
        // Sort songs by ID in descending order and limit to 100
        const sortedSongs = response.data.utwory
          .sort((a: Song, b: Song) => b.ID_utworu - a.ID_utworu)
          .slice(0, 100);
        
        setSongs(sortedSongs);
        setOriginalSongs(sortedSongs); // Store original list for reset
        
        // Set the first song as current if available
        if (sortedSongs.length > 0 && !currentSong) {
          setCurrentSong(sortedSongs[0]);
        }
      }
    } catch (err) {
      console.error("Error fetching songs:", err);
      setError("Nie udało się załadować piosenek. Spróbuj ponownie później.");
    } finally {
      setLoading(false);
    }
  };

  // Add function to fetch audio file
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioError, setAudioError] = useState("");

  const fetchAudioFile = async (songId: number) => {
    setAudioLoading(true);
    setAudioError("");

    try {
      // Check if file is available before attempting to play
      await axios.head(`http://localhost:5000/files/play/${songId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem("token")}`
        }
      });
      
      // If head request succeeds, the file exists and can be streamed
      return true;
    } catch (err) {
      console.error("Error checking audio file:", err);
      setAudioError("Nie można załadować pliku audio. Plik może nie istnieć lub nie masz do niego dostępu.");
      return false;
    } finally {
      setAudioLoading(false);
    }
  };

  const handlePlaySong = async (song: Song) => {
    setCurrentSong(song);
    
    // Check if audio file is available
    const isFileAvailable = await fetchAudioFile(song.ID_utworu);
    
    if (isFileAvailable) {
      setIsPlaying(true);
      
      if (audioRef.current) {
        // Set the source and play after a short delay to ensure the source is updated
        setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.play().catch(e => console.error("Playback error:", e));
          }
        }, 100);
      }
    } else {
      setIsPlaying(false);
    }
  };

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(e => console.error("Playback error:", e));
      }
      setIsPlaying(!isPlaying);
    }
  };
  
  // Add search handlers
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    
    // Reset to original list if search query is cleared
    if (e.target.value === "" && isSearchResults) {
      setSongs(originalSongs);
      setIsSearchResults(false);
    }
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      setSongs(originalSongs);
      setIsSearchResults(false);
      return;
    }

    setIsSearching(true);
    
    // Filter songs locally based on search query
    const filteredResults = originalSongs.filter(song => 
      song.nazwa_utworu.toLowerCase().includes(searchQuery.toLowerCase()) ||
      song.Autor.kryptonim_artystyczny.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    setSongs(filteredResults);
    setIsSearchResults(true);
    setIsSearching(false);
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Music player section */}
      <div className="bg-gray-800 p-4 rounded-lg mb-4 shadow-lg">
        {currentSong ? (
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-white">{currentSong.nazwa_utworu}</h2>
                <p className="text-gray-400">{currentSong.Autor.kryptonim_artystyczny} • {currentSong.data_wydania}</p>
              </div>
              {audioLoading ? (
                <div className="p-2 bg-gray-600 rounded-full">
                  <div className="animate-spin h-8 w-8 border-2 border-blue-500 rounded-full border-t-transparent"></div>
                </div>
              ) : (
                <button
                  onClick={togglePlayPause}
                  disabled={!!audioError}
                  className={`p-2 ${audioError ? 'bg-gray-600' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-full transition`}
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
              )}
            </div>
            
            {audioError ? (
              <div className="bg-red-800 text-white p-2 rounded mb-2 text-center">
                {audioError}
              </div>
            ) : null}
            
            <audio 
              ref={audioRef}
              src={`http://localhost:5000/files/play/${currentSong.ID_utworu}`} 
              onEnded={() => setIsPlaying(false)}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onError={() => setAudioError("Błąd odtwarzania pliku audio.")}
              controls
              className="w-full"
            />
          </div>
        ) : (
          <div className="text-center py-6 text-gray-400">
            Wybierz piosenkę z listy aby odtworzyć
          </div>
        )}
      </div>

      {/* Song list section */}
      <div className="flex-1 overflow-hidden">
        {/* Add search bar */}
        <div className="mb-4 px-4">
          <div className="flex bg-gray-800 rounded-lg overflow-hidden">
            <input
              type="text"
              placeholder="Wyszukaj piosenkę po tytule lub artyście"
              value={searchQuery}
              onChange={handleSearchChange}
              onKeyPress={handleKeyPress}
              className="flex-grow p-2 bg-gray-800 text-white border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-l-lg"
            />
            <button 
              onClick={handleSearch}
              disabled={isSearching}
              className={`px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 transition ${
                isSearching ? "opacity-70 cursor-not-allowed" : ""
              }`}
            >
              {isSearching ? "Szukam..." : "Szukaj"}
            </button>
          </div>
        </div>
        
        <h3 className="text-lg font-semibold text-white mb-2 px-4">
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
          <div className="overflow-y-auto h-full pb-20">
            <ul className="divide-y divide-gray-700">
              {songs.map((song) => (
                <li 
                  key={song.ID_utworu} 
                  className={`px-4 py-3 hover:bg-gray-700 cursor-pointer transition ${
                    currentSong?.ID_utworu === song.ID_utworu ? 'bg-gray-700' : ''
                  }`}
                  onClick={() => handlePlaySong(song)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-white">{song.nazwa_utworu}</p>
                      <p className="text-sm text-gray-400">{song.Autor.kryptonim_artystyczny} • {song.data_wydania}</p>
                    </div>
                    <button className="p-1 text-blue-400 hover:text-blue-300 transition">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      </svg>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;