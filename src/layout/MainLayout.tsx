import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Outlet } from "react-router-dom";
import LeftSidebar from "./components/LeftSidebar";
import TopBar from "@/components/ui/Topbar";

const MainLayout = () => {
  return (
    <div className="h-screen bg-black text-white flex flex-col">
      

      
      <div className="flex-1 flex flex-col">
        <ResizablePanelGroup direction="horizontal" className="flex-1 flex h-full overflow-hidden p-2">
          <ResizablePanel defaultSize={20} minSize={10} maxSize={30}>
            <LeftSidebar />
          </ResizablePanel>

          <ResizableHandle className="w-2 bg-black rounded-lg transition-colors" />

          <ResizablePanel defaultSize={80}>
            <Outlet />
          </ResizablePanel>

          <ResizableHandle className="w-2 bg-black rounded-lg transition-colors" />

          <ResizablePanel defaultSize={20} minSize={0} maxSize={25} collapsedSize={0}>
            <div>Right panel</div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
};

export default MainLayout;