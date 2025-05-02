import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Outlet } from "react-router-dom";
import LeftSidebar from "./components/LeftSidebar";
import RightSideBar from "./components/RightSideBar";
import TopBar from "@/components/ui/Topbar";
import MiddleScreen from "./components/MiddleScreen";

const MainLayout = () => {
  return (
    <div className="h-screen bg-black text-white flex flex-col">
      <TopBar />
      
      <div className="flex-1 flex flex-col">
        <ResizablePanelGroup direction="horizontal" className="flex-1 flex h-full overflow-hidden p-2">
          <ResizablePanel defaultSize={20} minSize={10} maxSize={30}>
            <LeftSidebar />
          </ResizablePanel>

          <ResizableHandle className="w-2 bg-black rounded-lg transition-colors" />

          <ResizablePanel defaultSize={60}>
            <ResizablePanelGroup direction="vertical" className="flex-1">
              <ResizablePanel defaultSize={50} minSize={20}>
                <MiddleScreen/>
              </ResizablePanel>
              
              <ResizableHandle className="h-2 bg-black rounded-lg transition-colors" />
              
            </ResizablePanelGroup>
          </ResizablePanel>

          <ResizableHandle className="w-2 bg-black rounded-lg transition-colors" />

          <ResizablePanel defaultSize={20} minSize={0} maxSize={25} collapsedSize={0}>
            <RightSideBar />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
};

export default MainLayout;