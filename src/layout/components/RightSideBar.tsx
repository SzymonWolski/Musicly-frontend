import PlaylistSzkielet from "@/components/szkielety/PlaylistSzkielet"
import { buttonVariants } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { HomeIcon, Smile } from "lucide-react"
import { Link } from "react-router-dom"

const RightSideBar = () => {
  const isLoading = true;

  return (
    <div className="h-full flex flex-col gap-2">
      <div className=" flex-1 rounded-lg bg-zinc-900 p-4">
        <div className="flex iteam-center justify-between mb-4">
            <div className="flex items-center text-white px-2">
              <Smile className="size-5 mr-2" />
              <span className="hiddem md:inline">Znajomi</span>
            </div>
        </div>
        <ScrollArea className="h-[calc(100vh-300px)]">
            <div className="space-y-2">
                {isLoading ? (
                  <PlaylistSzkielet />
                ) : (
                  "jakaś muzyczka"
                )}
            </div>
        </ScrollArea>
      </div>
    </div>

  )
}

export default RightSideBar