import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
//import MusicPlayer from './';
//import SongList from './';
//import { getAlbumData } from './';

interface Album {
  id: string;
  title: string;
  artist: string;
  coverImage: string;
  songs: Song[];
}

interface Song {
  id: string;
  title: string;
  duration: string;
  audioUrl: string;
}

const MiddleScreen = () => {
  const { albumId } = useParams<{ albumId: string }>();
  const [album, setAlbum] = useState<Album | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAlbumData = async () => {
      try {
        setLoading(true);
        const albumData = await getAlbumData(albumId);
        setAlbum(albumData);
      } catch (err) {
        setError('Failed to load album data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAlbumData();
  }, [albumId]);

  return (
    <div className="h-full p-4 overflow-auto rounded-lg bg-gradient-to-b from-orange-900 via-gray-900 to-black">
      {loading ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-white text-xl">Loading...</div>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-red-500 text-xl">{error}</div>
        </div>
      ) : !album ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-white text-xl">Album not found</div>
        </div>
      ) : (
        <>
          <h2 className="text-xl font-bold mb-4 text-white">{album.title}</h2>
          
          <div className="mb-8">
            <MusicPlayer 
              album={album.title}
              artist={album.artist}
              coverImage={album.coverImage}
              songs={album.songs}
            />
          </div>
          
          <div className="bg-black bg-opacity-30 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4 text-white">
              Utwory w albumie
            </h3>
            <SongList songs={album.songs} />
          </div>
        </>
      )}
    </div>
  );
};

export default MiddleScreen;