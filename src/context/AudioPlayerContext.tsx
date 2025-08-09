import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

// Define playback source types
export type PlaybackSource = 'playlist' | 'favorites' | 'single';

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

interface AudioPlayerContextType {
  currentSong: Song | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isLooping: boolean;
  playlist: Song[]; // This is now specifically the playback queue
  allSongs: Song[]; // New property for all available songs
  favoriteSongs: number[];
  favoriteDetails: Song[];
  currentPlaybackSource: PlaybackSource;
  playSong: (song: Song, source?: PlaybackSource) => Promise<void>;
  addToPlaylist: (song: Song) => void;
  removeFromPlaylist: (songId: number) => void; // New function to remove songs from playlist
  clearPlaylist: () => void; // New function to clear the queue
  togglePlayPause: () => void;
  seekTo: (time: number) => void;
  setVolume: (volume: number) => void;
  toggleLoop: () => void;
  toggleFavorite: (songId: number) => Promise<void>;
  currentSongIndex: number; // Index of the current song in the playlist
  refreshSongs: () => Promise<void>; // Dodaj tę linię
}

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(undefined);

export const AudioPlayerProvider = ({ children }: { children: ReactNode }) => {
  const { token } = useAuth();
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [isLooping, setIsLooping] = useState(false);
  const [playlist, setPlaylist] = useState<Song[]>([]);
  const [allSongs, setAllSongs] = useState<Song[]>([]);
  const [favoriteSongs, setFavoriteSongs] = useState<number[]>([]);
  const [favoriteDetails, setFavoriteDetails] = useState<Song[]>([]);
  const [currentPlaybackSource, setCurrentPlaybackSource] = useState<PlaybackSource>('single');
  const [currentSongIndex, setCurrentSongIndex] = useState<number>(-1);
  const animationRef = useRef<number | null>(null);

  // Add a new ref to track if we're currently loading a song
  const isLoadingSongRef = useRef(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio element
  useEffect(() => {
    // Create audio element if it doesn't exist
    if (!audioRef.current) {
      audioRef.current = new Audio();
      
      // Set up event listeners
      audioRef.current.addEventListener('timeupdate', handleTimeUpdate);
      audioRef.current.addEventListener('loadedmetadata', handleLoadedMetadata);
      audioRef.current.addEventListener('durationchange', handleDurationChange); // Add durationchange listener
      audioRef.current.addEventListener('ended', handleEnded);
      audioRef.current.addEventListener('play', () => setIsPlaying(true));
      audioRef.current.addEventListener('pause', () => setIsPlaying(false));
      audioRef.current.addEventListener('error', handleAudioError); // Add error listener
    }
    
    // Load saved state from localStorage
    const savedState = localStorage.getItem('audioPlayerState');
    if (savedState) {
      try {
        const { volume, isLooping } = JSON.parse(savedState);
        
        // Restore settings
        setVolumeState(volume || 1);
        setIsLooping(isLooping || false);
        if (audioRef.current) {
          audioRef.current.volume = volume || 1;
          audioRef.current.loop = isLooping || false;
        }
      } catch (error) {
        console.error("Error restoring player state:", error);
      }
    }
    
    // Fetch favorites and playlist
    fetchFavorites();
    fetchRecentSongs();
    
    // Clean up on unmount
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (audioRef.current) {
        audioRef.current.removeEventListener('timeupdate', handleTimeUpdate);
        audioRef.current.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audioRef.current.removeEventListener('durationchange', handleDurationChange);
        audioRef.current.removeEventListener('ended', handleEnded);
        audioRef.current.removeEventListener('error', handleAudioError);
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [token]);

  // Animation function for smooth progress updates
  const animateProgress = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      if (isPlaying) {
        animationRef.current = requestAnimationFrame(animateProgress);
      }
    }
  };

  // Start/stop animation when playing state changes
  useEffect(() => {
    if (isPlaying) {
      animationRef.current = requestAnimationFrame(animateProgress);
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  }, [isPlaying]);

  // Save current state to localStorage whenever it changes
  useEffect(() => {
    if (currentSong) {
      const stateToSave = {
        songId: currentSong.ID_utworu,
        currentTime: audioRef.current?.currentTime || 0,
        volume,
        isLooping
      };
      localStorage.setItem('audioPlayerState', JSON.stringify(stateToSave));
      
      // Also notify other components about the player state update
      const playerState = {
        currentSong,
        isPlaying,
        currentTime,
        duration
      };
      
      window.dispatchEvent(new CustomEvent('playerStateUpdate', {
        detail: playerState
      }));
      
      // Also emit current playlist
      window.dispatchEvent(new CustomEvent('playlistUpdate', {
        detail: { songs: playlist }
      }));
    }
  }, [currentSong, isPlaying, currentTime, duration, volume, isLooping]);

  // Handlers
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      // We don't set currentTime here, it's handled by the animation frame
      // But we do save to localStorage every 5 seconds to avoid too many writes
      if (Math.floor(audioRef.current.currentTime) % 5 === 0) {
        const stateToSave = {
          songId: currentSong?.ID_utworu,
          currentTime: audioRef.current.currentTime,
          volume,
          isLooping
        };
        localStorage.setItem('audioPlayerState', JSON.stringify(stateToSave));
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      console.log("Metadata loaded, duration:", audioRef.current.duration);
      if (!isNaN(audioRef.current.duration) && audioRef.current.duration > 0) {
        setDuration(audioRef.current.duration);
      } else {
        console.warn("Invalid duration in loadedmetadata:", audioRef.current.duration);
        // Try to get duration another way - sometimes it's available in the durationchange event
      }
    }
  };

  // Add a new handler for durationchange event
  const handleDurationChange = () => {
    if (audioRef.current) {
      if (!isNaN(audioRef.current.duration) && audioRef.current.duration > 0) {
        setDuration(audioRef.current.duration);
      }
    }
  };

  // Add error handler
  const handleAudioError = (e: ErrorEvent) => {
    console.error("Audio error:", e);
    // Try to recover if possible
    if (audioRef.current) {
      console.log("Current audio source:", audioRef.current.src);
    }
  };

  // Add the missing handleEnded function
  const handleEnded = () => {
    if (!isLooping) {
      // Play next song based on current source if not looping
      if (currentPlaybackSource !== 'single' && currentSong) {
        playNextSong();
      } else {
        setIsPlaying(false);
      }
    }
    // If looping is enabled, the audio element will loop automatically due to the loop property
  };

  // New function to play the next song based on current source
  const playNextSong = () => {
    if (!currentSong) return;
    
    const sourceList = 
      currentPlaybackSource === 'favorites' ? favoriteDetails : 
      currentPlaybackSource === 'playlist' ? playlist : 
      [];
    
    if (sourceList.length > 0) {
      const currentIndex = sourceList.findIndex(song => song.ID_utworu === currentSong.ID_utworu);
      if (currentIndex !== -1 && currentIndex < sourceList.length - 1) {
        const nextSong = sourceList[currentIndex + 1];
        playSong(nextSong, currentPlaybackSource);
      } else {
        // We're at the end of the list
        setIsPlaying(false);
      }
    }
  };

  // API functions
  const fetchFavorites = async () => {
    if (!token) {
      console.log("No token available, skipping favorites fetch");
      return;
    }

    try {
      const response = await axios.get("http://localhost:5000/favorites", {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.data && response.data.favorites) {
        const favoriteIds = response.data.favorites.map((fav: any) => fav.songId);
        setFavoriteSongs(favoriteIds);
        
        // Also store the full song details for favorites
        const formattedFavorites = response.data.favorites.map((fav: any) => ({
          ID_utworu: fav.songId,
          nazwa_utworu: fav.songName,
          data_wydania: fav.likedAt.split('T')[0],
          Autor: {
            imie: "",
            nazwisko: "",
            kryptonim_artystyczny: fav.artistName
          }
        }));
        setFavoriteDetails(formattedFavorites);
      }
    } catch (err) {
      console.error("Error fetching favorites:", err);
    }
  };

  // Modified to populate allSongs instead of playlist
  const fetchRecentSongs = async () => {
    try {
      const response = await axios.get("http://localhost:5000/files/list", {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.data && response.data.utwory) {
        const songs = response.data.utwory
          .sort((a: Song, b: Song) => b.ID_utworu - a.ID_utworu)
          .slice(0, 100);
        
        setAllSongs(songs); // Set all songs, but don't populate playlist
      }
    } catch (err) {
      console.error("Error fetching songs:", err);
    }
  };

  // Add a function to add songs to playlist
  const addToPlaylist = (song: Song) => {
    // Check if song is already in playlist
    const exists = playlist.some(item => item.ID_utworu === song.ID_utworu);
    if (!exists) {
      setPlaylist(prev => [...prev, song]);
    }
  };

  // Add a function to remove songs from playlist
  const removeFromPlaylist = (songId: number) => {
    setPlaylist(prev => prev.filter(song => song.ID_utworu !== songId));
  };

  // Add a function to clear the playlist
  const clearPlaylist = () => {
    setPlaylist([]);
    setCurrentSongIndex(-1);
  };

  // Enhanced playSong with source parameter
  const playSong = async (song: Song, source: PlaybackSource = 'single') => {
    // Prevent multiple rapid calls for the same song
    if (isLoadingSongRef.current) {
      console.log("Already loading a song, please wait...");
      return;
    }
    
    // Set the current playback source
    setCurrentPlaybackSource(source);
    
    // If it's the same song that's already playing, just resume playback
    if (currentSong && song.ID_utworu === currentSong.ID_utworu && audioRef.current) {
      if (!isPlaying) {
        audioRef.current.play()
          .then(() => setIsPlaying(true))
          .catch(e => console.error("Error resuming playback:", e));
      }
      return;
    }
    
    isLoadingSongRef.current = true;
    
    try {
      // First check if audio file is available
      await axios.head(`http://localhost:5000/files/play/${song.ID_utworu}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      setCurrentSong(song);

      // Completely stop any existing audio
      if (audioRef.current) {
        // Reset duration first to avoid showing previous song's duration
        setDuration(0);
        
        // Explicitly stop and unload previous audio
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current.load();
        
        // Store settings we want to keep
        const previousVolume = audioRef.current.volume;
        const previousLoop = audioRef.current.loop;
        
        // Remove old listeners
        audioRef.current.removeEventListener('timeupdate', handleTimeUpdate);
        audioRef.current.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audioRef.current.removeEventListener('durationchange', handleDurationChange);
        audioRef.current.removeEventListener('ended', handleEnded);
        audioRef.current.removeEventListener('error', handleAudioError);
        
        // Create new audio element
        audioRef.current = new Audio();
        
        // Restore settings
        audioRef.current.volume = previousVolume;
        audioRef.current.loop = previousLoop;
        
        // Add listeners to new element
        audioRef.current.addEventListener('timeupdate', handleTimeUpdate);
        audioRef.current.addEventListener('loadedmetadata', handleLoadedMetadata);
        audioRef.current.addEventListener('durationchange', handleDurationChange);
        audioRef.current.addEventListener('ended', handleEnded);
        audioRef.current.addEventListener('play', () => setIsPlaying(true));
        audioRef.current.addEventListener('pause', () => setIsPlaying(false));
        audioRef.current.addEventListener('error', handleAudioError);
        
        // Set source and attempt to load & play
        audioRef.current.src = `http://localhost:5000/files/play/${song.ID_utworu}`;

        // Use preload to ensure metadata is loaded
        audioRef.current.preload = "metadata";
        
        // Fetch duration manually if needed
        const fetchDuration = async () => {
          try {
            // Try to get metadata directly
            const response = await axios.head(`http://localhost:5000/files/play/${song.ID_utworu}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Range': 'bytes=0-1' // Just request a tiny bit to get headers
              }
            });
            
            // Some servers provide Content-Duration header
            const contentDuration = response.headers['content-duration'];
            if (contentDuration && !isNaN(Number(contentDuration))) {
              console.log("Got duration from headers:", contentDuration);
              setDuration(Number(contentDuration));
            }
          } catch (err) {
            console.error("Failed to fetch duration data:", err);
          }
        };
        
        // Start playing with a small delay to ensure the src is set
        setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.play()
              .then(() => {
                setIsPlaying(true);
                // Double check if duration is set after successful play
                if (audioRef.current && !isNaN(audioRef.current.duration) && audioRef.current.duration > 0) {
                  setDuration(audioRef.current.duration);
                } else {
                  // Last resort - try to fetch duration separately
                  fetchDuration();
                }
              })
              .catch(e => {
                console.error("Playback error:", e);
                setIsPlaying(false);
                fetchDuration(); // Try to get duration even if playback fails
              })
              .finally(() => {
                isLoadingSongRef.current = false;
              });
          } else {
            isLoadingSongRef.current = false;
          }
        }, 100);
      }
    } catch (err) {
      console.error("Error checking audio file:", err);
      alert("Nie można załadować pliku audio. Plik może nie istnieć lub nie masz do niego dostępu.");
      isLoadingSongRef.current = false;
    }
  };

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else if (currentSong) {
        audioRef.current.play().catch(e => console.error("Playback error:", e));
      }
    }
  };

  const seekTo = (time: number) => {
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const setVolume = (newVolume: number) => {
    setVolumeState(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const toggleLoop = () => {
    const newLoopingState = !isLooping;
    setIsLooping(newLoopingState);
    if (audioRef.current) {
      audioRef.current.loop = newLoopingState;
    }
  };

  const toggleFavorite = async (songId: number) => {
    const isFavorite = favoriteSongs.includes(songId);
    
    try {
      if (isFavorite) {
        // Remove from favorites
        await axios.delete(`http://localhost:5000/favorites/${songId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        // Update local state
        setFavoriteSongs(favoriteSongs.filter(id => id !== songId));
      } else {
        // Add to favorites
        await axios.post("http://localhost:5000/favorites", {
          songId
        }, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        // Update local state
        setFavoriteSongs([...favoriteSongs, songId]);
      }
    } catch (err) {
      console.error("Error updating favorites:", err);
      alert("Nie udało się zaktualizować ulubionych. Spróbuj ponownie.");
    }
  };

  // For debugging during development
  useEffect(() => {
    const handlePlaySongRequest = (event: CustomEvent) => {
      if (event.detail && event.detail.song) {
        playSong(event.detail.song);
      }
    };
    
    const handleTogglePlayRequest = () => {
      togglePlayPause();
    };
    
    window.addEventListener('playSongFromSidebar', handlePlaySongRequest as EventListener);
    window.addEventListener('togglePlayFromMini', handleTogglePlayRequest as EventListener);
    
    return () => {
      window.removeEventListener('playSongFromSidebar', handlePlaySongRequest as EventListener);
      window.removeEventListener('togglePlayFromMini', handleTogglePlayRequest as EventListener);
    };
  }, []);

  // Hidden audio element for the whole application
  const audioElement = (
    <audio 
      ref={audioRef}
      style={{ display: 'none' }}
    />
  );

  // Add event listener to handle song ending
  useEffect(() => {
    const audioElement = audioRef.current;
    
    const handleSongEnd = () => {
      // When current song ends, play the next one if available
      if (currentSongIndex < playlist.length - 1) {
        const nextSong = playlist[currentSongIndex + 1];
        setCurrentSongIndex(currentSongIndex + 1);
        playSong(nextSong, 'playlist');
      } else {
        // End of playlist reached
        setCurrentSong(null);
        setIsPlaying(false);
      }
    };

    if (audioElement) {
      audioElement.addEventListener('ended', handleSongEnd);
    }

    return () => {
      if (audioElement) {
        audioElement.removeEventListener('ended', handleSongEnd);
      }
    };
  }, [currentSongIndex, playlist]);

  // Dodaj tę funkcję
  const refreshSongs = async () => {
    try {
      const response = await axios.get("http://localhost:5000/files/list", {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.data && response.data.utwory) {
        const songs = response.data.utwory
          .sort((a: Song, b: Song) => b.ID_utworu - a.ID_utworu)
          .slice(0, 100);
        
        setAllSongs(songs);
      }
    } catch (err) {
      console.error("Error refreshing songs:", err);
    }
  };

  return (
    <AudioPlayerContext.Provider
      value={{
        currentSong,
        isPlaying,
        currentTime,
        duration,
        volume,
        isLooping,
        playlist,
        allSongs,
        favoriteSongs,
        favoriteDetails,
        currentPlaybackSource,
        playSong,
        addToPlaylist,
        removeFromPlaylist,
        clearPlaylist,
        togglePlayPause,
        seekTo,
        setVolume,
        toggleLoop,
        toggleFavorite,
        currentSongIndex,
        refreshSongs, // Dodaj tę linię
      }}
    >
      {audioElement}
      {children}
    </AudioPlayerContext.Provider>
  );
};

export const useAudioPlayer = () => {
  const context = useContext(AudioPlayerContext);
  if (context === undefined) {
    throw new Error('useAudioPlayer must be used within an AudioPlayerProvider');
  }
  return context;
};
