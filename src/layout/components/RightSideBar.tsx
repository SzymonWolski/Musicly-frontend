import { ScrollArea } from "@/components/ui/scroll-area"
import { MessageCircle, X } from "lucide-react"
import { useEffect, useState } from "react"
import axios from "axios"

interface PinnedChat {
  friendId: number;
  friendName: string;
}

interface ChatMessage {
  id: number;
  sender: number;
  content: string;
  timestamp: string;
}

interface RightSideBarProps {
  initialChat: PinnedChat;
}

const RightSideBar = ({ initialChat }: RightSideBarProps) => {
  const [pinnedChat, setPinnedChat] = useState<PinnedChat>(initialChat);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize with props and listen for future chat changes
  useEffect(() => {
    // Set the initial chat from props
    setPinnedChat(initialChat);
    setMessages([]);
    
    // Still listen for events for future changes
    const handlePinChat = (event: CustomEvent<PinnedChat>) => {
      setPinnedChat(event.detail);
      setMessages([]);
    };

    window.addEventListener('pinChat', handlePinChat as EventListener);

    return () => {
      window.removeEventListener('pinChat', handlePinChat as EventListener);
    };
  }, [initialChat]);

  const handleSendMessage = async () => {
    if (!message.trim() || !pinnedChat) return;

    try {
      // For now, just add the message locally
      const newMessage: ChatMessage = {
        id: Date.now(),
        sender: -1, // Current user
        content: message,
        timestamp: new Date().toISOString()
      };

      setMessages([...messages, newMessage]);
      setMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
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
        <ScrollArea className="flex-1 p-4">
          {messages.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p>Rozpocznij czat z {pinnedChat.friendName}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((msg) => (
                <div 
                  key={msg.id}
                  className={`max-w-[80%] p-3 rounded-lg ${
                    msg.sender === -1 
                      ? "bg-blue-600 text-white ml-auto" 
                      : "bg-zinc-700 text-white"
                  }`}
                >
                  <p>{msg.content}</p>
                  <p className="text-xs text-gray-300 mt-1">
                    {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </p>
                </div>
              ))}
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
              className="flex-1 p-2 rounded-l bg-zinc-700 text-white border-r-0 border-zinc-600 focus:outline-none"
            />
            <button 
              onClick={handleSendMessage}
              className="px-4 py-2 bg-blue-600 text-white rounded-r hover:bg-blue-700 transition"
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