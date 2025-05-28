import { ScrollArea } from "@/components/ui/scroll-area"
import { MessageCircle, X } from "lucide-react"
import { useEffect, useState, useRef } from "react"
import axios from "axios"
import { useAuth } from "@/context/AuthContext"

interface PinnedChat {
  friendId: number;
  friendName: string;
}

interface ChatMessage {
  id: number;
  sender: number;
  recipient: number;
  content: string;
  timestamp: string;
  read: boolean;
}

interface RightSideBarProps {
  initialChat: PinnedChat;
}

const RightSideBar = ({ initialChat }: RightSideBarProps) => {
  const [pinnedChat, setPinnedChat] = useState<PinnedChat>(initialChat);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user, token } = useAuth();
  const userId = user ? Number(user.id) : -1;

  // Initialize with props and listen for future chat changes
  useEffect(() => {
    // Set the initial chat from props
    setPinnedChat(initialChat);
    setIsLoading(true);
    
    // Load message history when chat is opened or changed
    fetchMessageHistory(initialChat.friendId);
    
    // Still listen for events for future changes
    const handlePinChat = (event: CustomEvent<PinnedChat>) => {
      setPinnedChat(event.detail);
      setIsLoading(true);
      fetchMessageHistory(event.detail.friendId);
    };

    window.addEventListener('pinChat', handlePinChat as EventListener);

    return () => {
      window.removeEventListener('pinChat', handlePinChat as EventListener);
    };
  }, [initialChat]);

  // Scroll to bottom when new messages are added
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Poll for new messages every 5 seconds
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (pinnedChat) {
        checkForNewMessages(pinnedChat.friendId);
      }
    }, 5000);

    return () => clearInterval(intervalId);
  }, [pinnedChat, messages]);

  const fetchMessageHistory = async (friendId: number) => {
    setError("");
    
    try {
      const response = await axios.get(`http://localhost:5000/messages/${friendId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.data && response.data.messages) {
        setMessages(response.data.messages);
      } else {
        setMessages([]);
      }
    } catch (error) {
      console.error("Error fetching message history:", error);
      setError("Nie udało się pobrać historii wiadomości.");
    } finally {
      setIsLoading(false);
    }
  };

  const checkForNewMessages = async (friendId: number) => {
    try {
      // This would typically check for messages newer than the latest we have
      const latestMessageId = messages.length > 0 ? 
        Math.max(...messages.map(msg => msg.id)) : 0;
        
      const response = await axios.get(
        `http://localhost:5000/messages/${friendId}/new?after=${latestMessageId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (response.data && response.data.messages && response.data.messages.length > 0) {
        // Append new messages to our list
        setMessages(prevMessages => [...prevMessages, ...response.data.messages]);
      }
    } catch (error) {
      console.error("Error checking for new messages:", error);
      // Don't show error UI for background polling failures
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !pinnedChat) return;

    try {
      // Send the message to the backend
      const response = await axios.post(
        "http://localhost:5000/messages/send",
        {
          recipientId: pinnedChat.friendId,
          content: message
        }, 
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.data && response.data.message) {
        // Add the sent message to our local state
        setMessages([...messages, response.data.message]);
      } else {
        // If backend doesn't return the message object, create a temporary one
        const tempMessage: ChatMessage = {
          id: Date.now(),
          sender: userId,
          recipient: pinnedChat.friendId,
          content: message,
          timestamp: new Date().toISOString(),
          read: false
        };
        setMessages([...messages, tempMessage]);
      }
      
      setMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Nie udało się wysłać wiadomości. Spróbuj ponownie.");
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleCloseChat = () => {
    window.dispatchEvent(new Event('unpinChat'));
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };

  return (
    <div className="h-full flex flex-col">
      {/* Chat Window */}
      <div className="flex-1 bg-zinc-900 flex flex-col h-full rounded-lg overflow-hidden relative">
        {/* Close Button (X) in top-right corner */}
        <button 
          onClick={handleCloseChat}
          className="absolute top-2 right-2 text-gray-400 hover:text-white z-10 bg-zinc-800 rounded-full p-1"
          title="Zamknij czat"
        >
          <X className="size-5" />
        </button>

        {/* Chat Header */}
        <div className="bg-zinc-800 p-4 flex items-center border-b border-zinc-700">
          <MessageCircle className="size-5 mr-2 text-blue-400" />
          <span className="font-medium text-white">{pinnedChat.friendName}</span>
        </div>

        {/* Chat Messages */}
        <ScrollArea className="flex-1 px-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-400">
              <p>{error}</p>
              <button 
                onClick={() => fetchMessageHistory(pinnedChat.friendId)}
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              >
                Spróbuj ponownie
              </button>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p>Rozpocznij czat z {pinnedChat.friendName}</p>
            </div>
          ) : (
            <div className="space-y-3 py-4">
              {messages.map((msg) => (
                <div 
                  key={msg.id}
                  className={`max-w-[80%] p-3 rounded-lg ${
                    msg.sender === userId 
                      ? "bg-blue-600 text-white ml-auto" 
                      : "bg-zinc-700 text-white"
                  }`}
                >
                  <p>{msg.content}</p>
                  <p className="text-xs text-gray-300 mt-1">
                    {formatMessageTime(msg.timestamp)}
                    {msg.sender === userId && (
                      <span className="ml-2">{msg.read ? "✓✓" : "✓"}</span>
                    )}
                  </p>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Message Input */}
        <div className="p-3 border-t border-zinc-700 bg-zinc-800">
          <div className="flex">
            <input 
              type="text" 
              placeholder="Napisz wiadomość..." 
              value={message}
              onChange={handleMessageChange}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              className="flex-1 p-2 rounded-l bg-zinc-700 text-white border-r-0 border-zinc-600 focus:outline-none disabled:opacity-50"
            />
            <button 
              onClick={handleSendMessage}
              disabled={isLoading || !message.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-r hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Wyślij
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RightSideBar;