import PlaylistSzkielet from "@/components/szkielety/PlaylistSzkielet"
import { buttonVariants } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { HomeIcon, Library } from "lucide-react"
import { Link } from "react-router-dom"

const LeftSidebar = () => {
  const isLoading = true;

  return (
    <div className="h-full flex flex-col gap-2">
      <div className="rounded-lg bg-zinc-900 p-4 ">
        <div className="space-y-2">
          <Link to={"/"}
          className={cn(buttonVariants(
            { 
            variant: "ghost", 
            className: "w-full justify-start text-white hover:bg-zinc-600"
            }
          ))}>
              
            <HomeIcon className="mr-2 size-5 " />
            <span className="hidden md:inline">Home</span>
          </Link>

        </div>
      </div>
      <div className=" flex-1 roubded-lg bg-zinc-900 p-4">
          <div className="flex iteam-center justify-between mb-4">
            <div className="flex items-center text-white px-2">
              <Library className="size-5 mr-2" />
              <span className="hiddem md:inline">Playlisty</span>
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

export default LeftSidebar