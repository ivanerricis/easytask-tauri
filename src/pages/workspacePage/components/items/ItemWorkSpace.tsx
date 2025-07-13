import { Box } from "lucide-react"
import type { Workspace } from "@/types"

type ItemWorkSpaceProps = {
    workspace: Workspace
    className?: string
}

export const ItemWorkSpace = ({ workspace, className }: ItemWorkSpaceProps) => {
    return (
        <div role="button" className={`group cursor-pointer relative w-full flex items-center rounded-xs border opacity-50 hover:opacity-100 bg-background transition-all overflow-x-hidden ${className}`}>
            {/* Text + Icon */}
            <div className={`flex items-center py-1 px-2 gap-2 w-full`}>
                <Box className="w-5 h-5 shrink-0 text-foreground transition-all" />
                <h1 className="text-left text-sm text-foreground transition-all w-full truncate pr-6">
                    {workspace.name}
                </h1>
            </div>
            <div className="flex items-center justify-center absolute right-1 gap-1">
                {/* <ButtonMenuFolder /> */}
            </div>
        </div>
    )
}