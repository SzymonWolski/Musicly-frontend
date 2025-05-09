import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import LeftSidebar from "./components/LeftSidebar";
import RightSideBar from "./components/RightSideBar";
import TopBar from "@/components/ui/Topbar";
import { Outlet, useLocation } from "react-router-dom";
import Dashboard from ".././pages/Dashboard";

const MainLayout = () => {
  const location = useLocation();
  const isDashboard = location.pathname === "/dashboard";

  return (
    <div className="h-screen bg-black text-white flex flex-col">
      <TopBar />
      
      <div className="flex-1 flex flex-col">
        <ResizablePanelGroup 
          direction="horizontal" 
          className="flex-1 flex h-full overflow-hidden p-2"
        >
          {/* Warunkowe renderowanie LeftSidebar */}
          {!isDashboard && (
            <>
              <ResizablePanel defaultSize={20} minSize={10} maxSize={30}>
                <LeftSidebar />
              </ResizablePanel>
              <ResizableHandle className="w-2 bg-black rounded-lg transition-colors" />
            </>
          )}

          <ResizablePanel defaultSize={isDashboard ? 100 : 60}>
            <ResizablePanelGroup direction="vertical" className="flex-1">
              <ResizablePanel defaultSize={50} minSize={20}>
                {/* Dynamiczne ładowanie zawartości w zależności od ścieżki */}
                {isDashboard ? <Dashboard /> : <Outlet />}
              </ResizablePanel>
              
              <ResizableHandle className="h-2 bg-black rounded-lg transition-colors" />
              
            </ResizablePanelGroup>
          </ResizablePanel>

        </ResizablePanelGroup>
      </div>
    </div>
  );
};

export default MainLayout;