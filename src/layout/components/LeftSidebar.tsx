import { ScrollArea } from "@/components/ui/scroll-area"
import { Music, Heart, ListMusic, ChevronDown, ChevronUp, Play, Pause, Volume2, VolumeX, Volume1, Repeat } from "lucide-react"
import { useEffect, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { useAudioPlayer } from "@/context/AudioPlayerContext"
import axios from "axios"

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

const LeftSidebar = () => {
  const { token } = useAuth();
  const { 
    currentSong, 
    isPlaying, 
    currentTime, 
    duration, 
    playlist, 
    favoriteSongs,
    volume,
    isLooping,
    playSong, 
    togglePlayPause,
    toggleLoop,
    setVolume
  } = useAudioPlayer();
  
  // Lists state
  const [favoriteDetails, setFavoriteDetails] = useState<Song[]>([]);
  const [loadingFavorites, setLoadingFavorites] = useState(true);
  
  // UI state
  const [favoritesOpen, setFavoritesOpen] = useState(true);
  const [playlistOpen, setPlaylistOpen] = useState(true);
  const [isVolumeVisible, setIsVolumeVisible] = useState(false);

  // Fetch detailed info for favorite songs
  useEffect(() => {
    // Only fetch when token is available
    if (token) {
      fetchFavoriteSongDetails();
    }
  }, [token, favoriteSongs]); // Add favoriteSongs as dependency to update when they change

  const fetchFavoriteSongDetails = async () => {
    // Don't attempt to fetch if there's no token
    if (!token) {
      console.log("No token available, skipping favorites fetch");
      return;
    }
    
    setLoadingFavorites(true);
    try {
      // Using the direct favorites endpoint instead of fetching each song individually
      const response = await axios.get('http://localhost:5000/favorites', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log("Fetched favorites data:", response.data);
      
      if (response.data && response.data.favorites && Array.isArray(response.data.favorites)) {
        const formattedFavorites = response.data.favorites.map((fav: { songId: any; songName: any; likedAt: string; artistName: any }) => ({
          ID_utworu: fav.songId,
          nazwa_utworu: fav.songName,
          data_wydania: fav.likedAt.split('T')[0], // Format date to YYYY-MM-DD
          Autor: {
            imie: "",
            nazwisko: "",
            kryptonim_artystyczny: fav.artistName
          }
        }));
        
        setFavoriteDetails(formattedFavorites);
      } else {
        console.log("No favorites found in response or invalid format", response.data);
        setFavoriteDetails([]);
      }
    } catch (err) {
      console.error("Error fetching favorite songs:", err);
      setFavoriteDetails([]);
    } finally {
      setLoadingFavorites(false);
    }
  };
  
  // Format time for display
  const formatTime = (time: number) => {
    if (isNaN(time)) return "00:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Toggle volume slider visibility
  const toggleVolumeSlider = () => {
    setIsVolumeVisible(!isVolumeVisible);
  };

  // Get the appropriate volume icon based on current volume level
  const getVolumeIcon = () => {
    if (volume === 0) return <VolumeX size={14} />;
    if (volume < 0.5) return <Volume1 size={14} />;
    return <Volume2 size={14} />;
  };

  return (
    <div className="h-full flex flex-col gap-2">
      <div className="flex-1 rounded-lg bg-zinc-900 overflow-hidden flex flex-col">
        {/* Mini Player Section */}
        <div className="bg-zinc-800 p-3 border-b border-zinc-700">
          <div className="flex flex-col">
            {currentSong ? (
              <>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1 truncate">
                    <h3 className="text-sm font-medium text-white truncate">{currentSong.nazwa_utworu}</h3>
                    <p className="text-xs text-gray-400 truncate">{currentSong.Autor.kryptonim_artystyczny}</p>
                  </div>
                  <button 
                    onClick={togglePlayPause}
                    className="p-1.5 bg-blue-600 text-white rounded-full hover:bg-blue-700"
                  >
                    {isPlaying ? (
                      <Pause size={14} />
                    ) : (
                      <Play size={14} />
                    )}
                  </button>
                </div>
                
                {/* Mini progress bar */}
                <div className="w-full bg-zinc-700 h-1 rounded-full overflow-hidden">
                  <div 
                    className="bg-blue-500 h-full" 
                    style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-1 mb-2">
                  <span>{formatTime(currentTime)}</span>
                  <span>{duration > 0 ? formatTime(duration) : "--:--"}</span>
                </div>

                {/* Add controls row with loop and volume buttons */}
                <div className="flex justify-center items-center gap-4 mt-1">
                  {/* Loop Button */}
                  <button 
                    onClick={toggleLoop}
                    className={`p-1 rounded-full transition ${isLooping ? 'text-blue-500' : 'text-gray-400 hover:text-white'}`}
                    title={isLooping ? "Wyłącz zapętlenie" : "Zapętlaj"}
                  >
                    <Repeat size={14} />
                  </button>

                  {/* Volume Control */}
                  <div className="relative">
                    <button 
                      onClick={toggleVolumeSlider}
                      className="p-1 text-gray-400 hover:text-white transition"
                      title="Głośność"
                    >
                      {getVolumeIcon()}
                    </button>
                    
                    {isVolumeVisible && (
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-zinc-800 p-2 rounded-md shadow-lg z-10 w-24">
                        <input 
                          type="range"
                          min={0}
                          max={1}
                          step={0.01}
                          value={volume}
                          onChange={(e) => setVolume(Number(e.target.value))}
                          className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer"
                          style={{
                            background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${volume * 100}%, #4b5563 ${volume * 100}%, #4b5563 100%)`,
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center py-3">
                <Music className="mr-2 text-gray-400" size={16} />
                <span className="text-gray-400 text-sm">Brak odtwarzanej muzyki</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Favorites Section */}
        <div className="border-b border-zinc-700">
          <div 
            className="flex items-center justify-between p-3 bg-zinc-800 cursor-pointer hover:bg-zinc-750"
            onClick={() => setFavoritesOpen(!favoritesOpen)}
          >
            <div className="flex items-center">
              <Heart size={16} className="text-red-500 mr-2" />
              <span className="text-white text-sm font-medium">Ulubione</span>
            </div>
            {favoritesOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
          </div>
          
          {favoritesOpen && (
            <div className="max-h-[30vh]">
              <ScrollArea className="h-full">
                {loadingFavorites ? (
                  <div className="flex justify-center items-center py-4">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                  </div>
                ) : favoriteDetails.length === 0 ? (
                  <div className="py-3 px-4 text-sm text-gray-400 text-center">
                    Brak ulubionych piosenek
                  </div>
                ) : (
                  <ul className="divide-y divide-zinc-700/50">
                    {favoriteDetails.map((song) => (
                      <li 
                        key={song.ID_utworu}
                        className={`px-4 py-2 text-sm hover:bg-zinc-800 cursor-pointer flex items-center justify-between ${
                          currentSong?.ID_utworu === song.ID_utworu ? 'bg-zinc-800' : ''
                        }`}
                        onClick={() => playSong(song)}
                      >
                        <div className="truncate">
                          <p className="text-sm text-white truncate">{song.nazwa_utworu}</p>
                          <p className="text-xs text-gray-400 truncate">{song.Autor.kryptonim_artystyczny}</p>
                        </div>
                        {currentSong?.ID_utworu === song.ID_utworu ? (
                          <div className="flex-shrink-0 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                            {isPlaying ? (
                              <span className="w-2 h-2 bg-white rounded-full"></span>
                            ) : (
                              <Play size={8} className="text-white" />
                            )}
                          </div>
                        ) : (
                          <Play size={14} className="text-blue-400 flex-shrink-0" />
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </ScrollArea>
            </div>
          )}
        </div>
        
        {/* Current Playlist Section */}
        <div className="flex-1 flex flex-col">
          <div 
            className="flex items-center justify-between p-3 bg-zinc-800 cursor-pointer hover:bg-zinc-750"
            onClick={() => setPlaylistOpen(!playlistOpen)}
          >
            <div className="flex items-center">
              <ListMusic size={16} className="text-blue-500 mr-2" />
              <span className="text-white text-sm font-medium">Obecna playlista</span>
            </div>
            {playlistOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
          </div>
          
          {playlistOpen && (
            <div className="flex-1">
              <ScrollArea className="h-[calc(100vh-350px)]">
                {!playlist || playlist.length === 0 ? (
                  <div className="py-3 px-4 text-sm text-gray-400 text-center">
                    Brak utworów na playliście
                  </div>
                ) : (
                  <ul className="divide-y divide-zinc-700/50">
                    {playlist.map((song) => (
                      <li 
                        key={song.ID_utworu}
                        className={`px-4 py-2 text-sm hover:bg-zinc-800 cursor-pointer flex items-center justify-between ${
                          currentSong?.ID_utworu === song.ID_utworu ? 'bg-zinc-800' : ''
                        }`}
                        onClick={() => playSong(song)}
                      >
                        <div className="truncate">
                          <p className="text-sm text-white truncate">{song.nazwa_utworu}</p>
                          <p className="text-xs text-gray-400 truncate">{song.Autor.kryptonim_artystyczny}</p>
                        </div>
                        {currentSong?.ID_utworu === song.ID_utworu ? (
                          <div className="flex-shrink-0 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                            {isPlaying ? (
                              <span className="w-2 h-2 bg-white rounded-full"></span>
                            ) : (
                              <Play size={8} className="text-white" />
                            )}
                          </div>
                        ) : (
                          <Play size={14} className="text-blue-400 flex-shrink-0" />
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </ScrollArea>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeftSidebar;