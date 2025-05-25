import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import axios from "axios";

interface User {
  ID_uzytkownik: number;
  nick: string;
  email: string;
}

interface FriendRequest {
  ID_znajomych: number;
  ID_uzytkownik1: number;
  ID_uzytkownik2: number;
  status: string;
  data_dodania: string;
  Uzytkownik1: {
    nick: string;
    email: string;
  };
  Uzytkownik2: {
    nick: string;
    email: string;
  };
}

const FriendsPage = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  
  // Friends state management
  const [friends, setFriends] = useState<FriendRequest[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<FriendRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Tab state for managing different sections
  const [activeTab, setActiveTab] = useState("friends"); // friends, search, requests

  useEffect(() => {
    // Load friends and requests when component mounts
    fetchFriendsAndRequests();
  }, []);

  const fetchFriendsAndRequests = async () => {
    setIsLoading(true);
    setError("");
    
    try {
      const response = await axios.get("http://localhost:5000/friends/list", {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem("token")}`
        }
      });
      
      if (response.data) {
        // Filter friends by status
        const allFriendships = response.data.friendships || [];
        
        // Accepted friends
        const acceptedFriends = allFriendships.filter(
          (fr: FriendRequest) => fr.status === "accepted"
        );
        
        // Pending requests (ones the user has sent)
        const pending = allFriendships.filter(
          (fr: FriendRequest) => 
            fr.status === "pending" && fr.ID_uzytkownik1 === Number(user?.id)
        );
        
        // Received requests (ones sent to the user)
        const received = allFriendships.filter(
          (fr: FriendRequest) => 
            fr.status === "pending" && fr.ID_uzytkownik2 === Number(user?.id)
        );
        
        setFriends(acceptedFriends);
        setPendingRequests(pending);
        setReceivedRequests(received);
      }
    } catch (error) {
      console.error("Error fetching friends data:", error);
      setError("Nie udało się pobrać listy znajomych. Spróbuj ponownie później.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setSearchError("");

    try {
      const response = await axios.get(`http://localhost:5000/friends/search?query=${searchQuery}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem("token")}`
        }
      });

      if (response.data && response.data.users) {
        setSearchResults(response.data.users);
      } else {
        setSearchResults([]);
      }
    } catch (error: any) {
      console.error("Error searching users:", error);
      const errorMessage = error.response?.data?.details || 
                           "Błąd podczas wyszukiwania użytkowników. Spróbuj ponownie później.";
      setSearchError(errorMessage);
    } finally {
      setIsSearching(false);
    }
  };

  const sendFriendRequest = async (userId: number) => {
    try {
      const response = await axios.post(
        "http://localhost:5000/friends/request",
        { recipientId: userId },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem("token")}`
          }
        }
      );

      console.log("Odpowiedź serwera:", response.data);
      
      if (response.data.success) {
        alert("Zaproszenie zostało wysłane!");
        // Refresh the requests list
        fetchFriendsAndRequests();
      }
    } catch (error: any) {
      console.error("Error sending friend request:", error);
      
      // Handle specific error messages from the backend
      const errorMessage = error.response?.data?.error || 
                          "Nie udało się wysłać zaproszenia. Spróbuj ponownie później.";
      alert(errorMessage);
    }
  };

  const handleFriendRequest = async (requestId: number, action: 'accept' | 'reject') => {
    try {
      let url;
      let method;
      
      if (action === 'accept') {
        url = `http://localhost:5000/friends/accept/${requestId}`;
        method = 'put';
      } else {
        url = `http://localhost:5000/friends/reject/${requestId}`;
        method = 'delete';
      }
      
      const response = await axios({
        method,
        url,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem("token")}`
        }
      });
      
      if (response.data.success) {
        alert(`Zaproszenie zostało ${action === 'accept' ? 'zaakceptowane' : 'odrzucone'}.`);
        // Refresh the friends and requests lists
        fetchFriendsAndRequests();
      }
    } catch (error) {
      console.error(`Error ${action}ing friend request:`, error);
      alert(`Nie udało się ${action === 'accept' ? 'zaakceptować' : 'odrzucić'} zaproszenia. Spróbuj ponownie później.`);
    }
  };

  const removeFriend = async (friendshipId: number) => {
    if (window.confirm("Czy na pewno chcesz usunąć tego znajomego?")) {
      try {
        const response = await axios.delete(
          `http://localhost:5000/friends/${friendshipId}`,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem("token")}`
            }
          }
        );
        
        if (response.data.success) {
          alert("Znajomy został usunięty.");
          // Refresh the friends list
          fetchFriendsAndRequests();
        }
      } catch (error) {
        console.error("Error removing friend:", error);
        alert("Nie udało się usunąć znajomego. Spróbuj ponownie później.");
      }
    }
  };

  // Check if a user is already in a friend relationship (as friend or with pending request)
  const getRelationshipStatus = (userId: number) => {
    // Check if they're already friends
    const existingFriend = friends.find(fr => 
      fr.ID_uzytkownik1 === userId || fr.ID_uzytkownik2 === userId
    );
    if (existingFriend) return "friends";
    
    // Check if user has sent a request to this person
    const pendingSent = pendingRequests.find(fr => fr.ID_uzytkownik2 === userId);
    if (pendingSent) return "pending-sent";
    
    // Check if user has received a request from this person
    const pendingReceived = receivedRequests.find(fr => fr.ID_uzytkownik1 === userId);
    if (pendingReceived) return "pending-received";
    
    // No relationship
    return "none";
  };

  return (
    <div className="min-h-screen bg-gray-800 text-white p-4">
      <div className="max-w-2xl mx-auto bg-gray-700 rounded-lg p-6 shadow-lg">
        <h1 className="text-3xl font-bold mb-6 text-center">Znajomi</h1>
        
        <div className="mb-6">
          <div className="flex space-x-1 border-b border-gray-600">
            <button
              className={`px-4 py-2 ${activeTab === 'friends' 
                ? 'bg-blue-600 text-white rounded-t' 
                : 'text-gray-300 hover:bg-gray-600 hover:text-white'}`}
              onClick={() => setActiveTab('friends')}
            >
              Znajomi
            </button>
            <button
              className={`px-4 py-2 ${activeTab === 'requests' 
                ? 'bg-blue-600 text-white rounded-t' 
                : 'text-gray-300 hover:bg-gray-600 hover:text-white'}`}
              onClick={() => setActiveTab('requests')}
            >
              Zaproszenia {receivedRequests.length > 0 && 
                <span className="ml-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 inline-flex items-center justify-center">
                  {receivedRequests.length}
                </span>}
            </button>
            <button
              className={`px-4 py-2 ${activeTab === 'search' 
                ? 'bg-blue-600 text-white rounded-t' 
                : 'text-gray-300 hover:bg-gray-600 hover:text-white'}`}
              onClick={() => setActiveTab('search')}
            >
              Szukaj
            </button>
          </div>
        </div>
        
        {error && (
          <div className="mb-4 p-2 bg-red-500 text-white rounded text-center">
            {error}
          </div>
        )}

        {/* Friends List */}
        {activeTab === 'friends' && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Twoi znajomi</h2>
            
            {isLoading ? (
              <div className="text-center py-4">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                <p className="mt-2">Ładowanie znajomych...</p>
              </div>
            ) : friends.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <p>Nie masz jeszcze żadnych znajomych.</p>
                <p className="mt-2">Wyszukaj użytkowników, aby dodać ich do znajomych!</p>
                <button 
                  onClick={() => setActiveTab('search')}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                >
                  Wyszukaj użytkowników
                </button>
              </div>
            ) : (
              <ul className="divide-y divide-gray-600">
                {friends.map(friendship => {
                  // Determine which user in the friendship is the friend (not current user)
                  const friend = friendship.ID_uzytkownik1 === Number(user?.id)
                    ? friendship.Uzytkownik2 
                    : friendship.Uzytkownik1;
                    
                  return (
                    <li key={friendship.ID_znajomych} className="py-3 flex justify-between items-center">
                      <div>
                        <p className="font-medium">{friend.nick}</p>
                        <p className="text-sm text-gray-400">{friend.email}</p>
                      </div>
                      <button
                        onClick={() => removeFriend(friendship.ID_znajomych)}
                        className="ml-4 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition text-sm"
                      >
                        Usuń
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {/* Friend Requests */}
        {activeTab === 'requests' && (
          <div>
            {receivedRequests.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4">Otrzymane zaproszenia</h2>
                <ul className="divide-y divide-gray-600">
                  {receivedRequests.map(request => (
                    <li key={request.ID_znajomych} className="py-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{request.Uzytkownik1.nick}</p>
                          <p className="text-sm text-gray-400">{request.Uzytkownik1.email}</p>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleFriendRequest(request.ID_znajomych, 'accept')}
                            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition text-sm"
                          >
                            Akceptuj
                          </button>
                          <button
                            onClick={() => handleFriendRequest(request.ID_znajomych, 'reject')}
                            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition text-sm"
                          >
                            Odrzuć
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {pendingRequests.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Wysłane zaproszenia</h2>
                <ul className="divide-y divide-gray-600">
                  {pendingRequests.map(request => (
                    <li key={request.ID_znajomych} className="py-3 flex justify-between items-center">
                      <div>
                        <p className="font-medium">{request.Uzytkownik2.nick}</p>
                        <p className="text-sm text-gray-400">{request.Uzytkownik2.email}</p>
                      </div>
                      <span className="text-gray-400 text-sm">Oczekujące</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {receivedRequests.length === 0 && pendingRequests.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <p>Nie masz żadnych oczekujących zaproszeń.</p>
                <button 
                  onClick={() => setActiveTab('search')}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                >
                  Wyszukaj użytkowników
                </button>
              </div>
            )}
          </div>
        )}

        {/* Search Users */}
        {activeTab === 'search' && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Wyszukaj użytkowników</h2>
            
            {searchError && (
              <div className="mb-4 p-2 bg-red-500 text-white rounded text-center">
                {searchError}
              </div>
            )}
            
            <div className="bg-gray-600 rounded-lg p-4">
              <div className="flex mb-4">
                <input
                  type="text"
                  placeholder="Wyszukaj użytkownika po nazwie lub email"
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
                {searchResults.length === 0 ? (
                  <p className="text-center text-gray-400 p-4">
                    {searchQuery ? "Nie znaleziono pasujących użytkowników" : "Wyszukaj użytkowników, aby zobaczyć wyniki"}
                  </p>
                ) : (
                  <ul className="divide-y divide-gray-700">
                    {searchResults.map((foundUser) => {
                      // Skip the current user
                      if (foundUser.ID_uzytkownik === Number(user?.id)) return null;
                      
                      const relationshipStatus = getRelationshipStatus(foundUser.ID_uzytkownik);
                      
                      return (
                        <li key={foundUser.ID_uzytkownik} className="py-3 flex justify-between items-center">
                          <div>
                            <p className="font-medium">{foundUser.nick}</p>
                            <p className="text-sm text-gray-400">{foundUser.email}</p>
                          </div>
                          {relationshipStatus === "none" && (
                            <button
                              onClick={() => sendFriendRequest(foundUser.ID_uzytkownik)}
                              className="ml-4 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm"
                            >
                              Dodaj do znajomych
                            </button>
                          )}
                          {relationshipStatus === "friends" && (
                            <span className="ml-4 px-3 py-1 bg-green-600 text-white rounded text-sm">
                              Znajomy
                            </span>
                          )}
                          {relationshipStatus === "pending-sent" && (
                            <span className="ml-4 px-3 py-1 bg-yellow-600 text-white rounded text-sm">
                              Zaproszenie wysłane
                            </span>
                          )}
                          {relationshipStatus === "pending-received" && (
                            <span className="ml-4 px-3 py-1 bg-yellow-600 text-white rounded text-sm">
                              Oczekuje na akceptację
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FriendsPage;