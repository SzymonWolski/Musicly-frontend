import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

// Remove PlaybackSource type

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
  // Remove currentPlaybackSource
  playSong: (song: Song, clearQueue?: boolean, playlistSongs?: Song[]) => Promise<void>;
  addToPlaylist: (song: Song) => void;
  removeFromPlaylist: (songId: number) => void;
  clearPlaylist: () => void;
  togglePlayPause: () => void;
  seekTo: (time: number) => void;
  setVolume: (volume: number) => void;
  toggleLoop: () => void;
  toggleFavorite: (songId: number) => Promise<void>;
  currentSongIndex: number;
  refreshSongs: () => Promise<void>;
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
  // Remove currentPlaybackSource state
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

  // Modified handleEnded function to properly handle queue playback
  const handleEnded = () => {
    console.log("Track ended. Loop:", isLooping, "Current index:", currentSongIndex, "Playlist length:", playlist.length);
    
    // Najpierw sprawdźmy, czy mamy playlistę z localStorage, jeśli nasza jest pusta
    if (playlist.length === 0) {
      try {
        const savedPlaylist = localStorage.getItem('musiclyPlaylist');
        if (savedPlaylist) {
          const parsedPlaylist = JSON.parse(savedPlaylist);
          if (Array.isArray(parsedPlaylist) && parsedPlaylist.length > 0) {
            console.log("Restoring playlist from localStorage during handleEnded");
            setPlaylist(parsedPlaylist);
            
            // Jeśli mamy currentSong, znajdźmy jego indeks
            if (currentSong) {
              const songIndex = parsedPlaylist.findIndex(s => s.ID_utworu === currentSong.ID_utworu);
              if (songIndex !== -1) {
                setCurrentSongIndex(songIndex);
                
                // Sprawdźmy, czy jest następna piosenka
                if (songIndex < parsedPlaylist.length - 1) {
                  const nextSong = parsedPlaylist[songIndex + 1];
                  setTimeout(() => {
                    playSong(nextSong, false);
                  }, 100);
                  return;
                }
              }
            }
          }
        }
      } catch (error) {
        console.error("Failed to restore playlist in handleEnded:", error);
      }
    }
    
    if (isLooping) {
      console.log("Looping enabled - audio element will handle this automatically");
      return; // Audio element obsługuje zapętlenie automatycznie
    }

    // Szukanie następnego utworu w kolejce
    if (playlist.length === 0) {
      console.log("Queue is empty, nothing to play next");
      return;
    }

    // Znajdź aktualny indeks piosenki w kolejce
    let currentIndex = currentSongIndex;
    
    // Jeśli z jakiegoś powodu indeks jest niepoprawny, spróbuj go znaleźć na podstawie ID utworu
    if (currentIndex < 0 || currentIndex >= playlist.length) {
      console.log("Current index is invalid, trying to find by song ID");
      if (currentSong) {
        currentIndex = playlist.findIndex(song => song.ID_utworu === currentSong.ID_utworu);
        console.log("Found index by song ID:", currentIndex);
        
        // Od razu zaktualizuj stan, żeby mieć poprawny indeks
        if (currentIndex !== -1) {
          setCurrentSongIndex(currentIndex);
        } else {
          console.log("Could not find song in playlist, setting index to 0");
          setCurrentSongIndex(0);
          currentIndex = 0;
        }
      }
    }

    // Sprawdź czy jest następny utwór w kolejce
    if (currentIndex >= 0 && currentIndex < playlist.length - 1) {
      const nextIndex = currentIndex + 1;
      const nextSong = playlist[nextIndex];
      
      console.log("Playing next song at index:", nextIndex, "Song:", nextSong.nazwa_utworu);
      
      // Zaktualizuj indeks przed odtworzeniem, żeby zachować synchronizację
      setCurrentSongIndex(nextIndex);
      
      // Odtwórz następny utwór bez czyszczenia kolejki
      if (nextSong) {
        // Użyj setTimeout, żeby dać czas na zaktualizowanie stanu
        setTimeout(() => {
          playSong(nextSong, false)
            .then(() => console.log("Next song started successfully"))
            .catch(err => console.error("Failed to start next song:", err));
        }, 50);
      }
    } else {
      console.log("Reached the end of queue, stopping playback");
      setIsPlaying(false);
    }
  };

  // Dodatkowy mechanizm wykrywania zakończenia utworu
  useEffect(() => {
    if (!isPlaying || !audioRef.current || isLooping) return;
    
    // Sprawdzaj co sekundę, czy utwór się nie zakończył
    const checkEndInterval = setInterval(() => {
      if (audioRef.current && 
          audioRef.current.duration > 0 && 
          audioRef.current.currentTime > 0 && 
          audioRef.current.currentTime >= audioRef.current.duration - 0.5) {
        console.log("Track ending detected by interval check");
        // Czyścimy interwał przed wywołaniem handleEnded, aby uniknąć wielokrotnego wywołania
        clearInterval(checkEndInterval);
        handleEnded();
      }
    }, 1000);
    
    return () => clearInterval(checkEndInterval);
  }, [isPlaying, currentSong, isLooping, playlist, currentSongIndex]);

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

  // Monitorowanie zmian w playliście
  useEffect(() => {
    console.log("Playlist state changed:", {
      length: playlist.length,
      currentIndex: currentSongIndex,
      songs: playlist.map(s => s.nazwa_utworu)
    });
  }, [playlist, currentSongIndex]);

  // Utrwalanie playlisty w localStorage i przywracanie po restarcie
  useEffect(() => {
    // Zapisz playlistę i currentSongIndex do localStorage gdy się zmienią
    if (playlist && playlist.length > 0) {
      try {
        localStorage.setItem('musiclyPlaylist', JSON.stringify(playlist));
        localStorage.setItem('musiclyCurrentSongIndex', currentSongIndex.toString());
        console.log("Saved playlist to localStorage, length:", playlist.length, "index:", currentSongIndex);
      } catch (error) {
        console.error("Failed to save playlist to localStorage:", error);
      }
    }
  }, [playlist, currentSongIndex]);

  // Wczytywanie playlisty z localStorage przy starcie
  useEffect(() => {
    if (token && playlist.length === 0) {
      try {
        const savedPlaylist = localStorage.getItem('musiclyPlaylist');
        const savedIndex = localStorage.getItem('musiclyCurrentSongIndex');
        
        if (savedPlaylist) {
          const parsedPlaylist = JSON.parse(savedPlaylist);
          if (Array.isArray(parsedPlaylist) && parsedPlaylist.length > 0) {
            console.log("Restored playlist from localStorage, length:", parsedPlaylist.length);
            setPlaylist(parsedPlaylist);
            
            if (savedIndex && !isNaN(Number(savedIndex))) {
              const indexNum = Number(savedIndex);
              if (indexNum >= 0 && indexNum < parsedPlaylist.length) {
                setCurrentSongIndex(indexNum);
              }
            }
          }
        }
      } catch (error) {
        console.error("Failed to restore playlist from localStorage:", error);
      }
    }
  }, [token]);


  // Zabezpieczenie funkcji playSong przed utratą playlisty
  const playSong = async (song: Song, clearQueue: boolean = true, playlistSongs?: Song[]) => {
    // Prevent multiple rapid calls for the same song
    if (isLoadingSongRef.current) {
      console.log("Already loading a song, please wait...");
      return;
    }
    
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
      
      // Set current song
      setCurrentSong(song);

      // Kopia playlisty do pracy, aby uniknąć problemów z asynchronicznością
      let newPlaylist: Song[] = [...playlist];
      let newIndex: number = currentSongIndex;

      // Update playlist based on parameters
      if (playlistSongs && playlistSongs.length > 0) {
        console.log("[playSong] Adding all playlist songs to queue:", playlistSongs.length);
        newPlaylist = [...playlistSongs]; // Użyj kopii, aby uniknąć referencji
        
        // Find index of the current song in the playlist
        const songIndex = playlistSongs.findIndex(s => s.ID_utworu === song.ID_utworu);
        newIndex = songIndex !== -1 ? songIndex : 0;
        
        console.log("[playSong] Setting current song index to:", newIndex, "in playlist of length:", newPlaylist.length);
      } else if (clearQueue) {
        // Clear the queue and add only this song
        console.log("[playSong] Clearing queue and adding single song");
        newPlaylist = [song];
        newIndex = 0;
      } else if (!playlist.some(s => s.ID_utworu === song.ID_utworu)) {
        // If song is not in the current playlist, add it to the end
        console.log("[playSong] Adding song to existing queue");
        newPlaylist = [...playlist, song];
        
        // Also update the current song index
        newIndex = playlist.length; // Index will be the current length (since we're adding to the end)
        console.log("[playSong] Setting current song index to:", newIndex, "in playlist of length:", newPlaylist.length);
      } else {
        // Song is already in playlist, just update the current index
        const existingIndex = playlist.findIndex(s => s.ID_utworu === song.ID_utworu);
        if (existingIndex !== -1) {
          newIndex = existingIndex;
          console.log("[playSong] Song already in queue, updating index to:", newIndex);
        }
      }

      // Zabezpieczenie przed niepoprawną playlistą
      if (newPlaylist.length === 0) {
        console.warn("[playSong] Playlist is empty after updates, adding current song");
        newPlaylist = [song];
        newIndex = 0;
      }

      // Zaktualizuj stan playlisty i indeksu - używamy ustawionych wartości
      setPlaylist(newPlaylist);
      setCurrentSongIndex(newIndex);
      
      // Zapisz playlistę do localStorage od razu, aby uniknąć jej utraty
      try {
        localStorage.setItem('musiclyPlaylist', JSON.stringify(newPlaylist));
        localStorage.setItem('musiclyCurrentSongIndex', newIndex.toString());
      } catch (error) {
        console.error("[playSong] Failed to save playlist to localStorage:", error);
      }
      
      // Logujemy aktualny stan zaraz po jego ustawieniu
      console.log("[playSong] After update - playlist:", newPlaylist.length, "songs, current index:", newIndex);

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
        
        // Explicitly add the ended event with log
        audioRef.current.addEventListener('ended', () => {
          console.log("Audio 'ended' event triggered");
          handleEnded();
        });
        
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

  // Refresh songs function
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
        // Remove currentPlaybackSource
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
        refreshSongs,
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
