import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import LeftSidebar from "./components/LeftSidebar";
import RightSideBar from "./components/RightSideBar";
import TopBar from "@/components/ui/Topbar";
import { Outlet, useLocation } from "react-router-dom";
import Dashboard from ".././pages/Dashboard";
import { useEffect, useState } from "react";

interface ChatInfo {
  friendId: number;
  friendName: string;
}

const MainLayout = () => {
  const location = useLocation();
  const isDashboard = location.pathname === "/dashboard";
  const [isChatPinned, setIsChatPinned] = useState(false);
  const [currentChat, setCurrentChat] = useState<ChatInfo | null>(null);

  // Listen for pin/unpin events from FriendsPage
  useEffect(() => {
    const handlePinChat = (event: CustomEvent<ChatInfo>) => {
      // Store the chat details and show the sidebar in one update
      setCurrentChat(event.detail);
      setIsChatPinned(true);
    };

    const handleUnpinChat = () => {
      setIsChatPinned(false);
      setCurrentChat(null);
    };

    // Add event listeners
    window.addEventListener('pinChat', handlePinChat as EventListener);
    window.addEventListener('unpinChat', handleUnpinChat);

    // Cleanup on unmount
    return () => {
      window.removeEventListener('pinChat', handlePinChat as EventListener);
      window.removeEventListener('unpinChat', handleUnpinChat);
    };
  }, []);

  return (
    <div className="h-screen bg-black text-white flex flex-col">
      <TopBar />
      
      <div className="flex-1 flex flex-col">
        <ResizablePanelGroup 
          direction="horizontal" 
          className="flex-1 flex h-full overflow-hidden p-2"
        >
          {/* Always render LeftSidebar, but with size 0 for dashboard */}
          <ResizablePanel 
            defaultSize={isDashboard ? 0 : 20} 
            minSize={isDashboard ? 0 : 10} 
            maxSize={isDashboard ? 0 : 30}
            collapsible={isDashboard}
            collapsedSize={0}
          >
            {!isDashboard && <LeftSidebar />}
          </ResizablePanel>
          
          {!isDashboard && (
            <ResizableHandle className="w-2 bg-black rounded-lg transition-colors" />
          )}

          <ResizablePanel defaultSize={isDashboard ? 100 : isChatPinned ? 60 : 80}>
            <ResizablePanelGroup direction="vertical" className="flex-1">
              <ResizablePanel defaultSize={50} minSize={20}>
                {/* Dynamiczne ładowanie zawartości w zależności od ścieżki */}
                {isDashboard ? <Dashboard /> : <Outlet />}
              </ResizablePanel>
              
              <ResizableHandle className="h-2 bg-black rounded-lg transition-colors" />
              
            </ResizablePanelGroup>
          </ResizablePanel>

          {/* Chat sidebar - only show when pinned */}
          {isChatPinned && !isDashboard && currentChat && (
            <>
              <ResizableHandle className="w-2 bg-black rounded-lg transition-colors" />
              <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
                {/* Pass chat details directly as props */}
                <RightSideBar initialChat={currentChat} />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>
    </div>
  );
};

export default MainLayout;