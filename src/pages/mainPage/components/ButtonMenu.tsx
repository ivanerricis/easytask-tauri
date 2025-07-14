import { EllipsisVertical } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DialogEditWorkspace } from "./DialogEditWorkspace";
import { DialogDeleteWorkspace } from "./DialogDeleteWorkspace";
import type { Workspace } from "@/types";

type ButtonMenuProps = {
    workspace: Workspace
}

export const ButtonMenu = ({ workspace }: ButtonMenuProps) => {

    return (
        <Popover>
            <PopoverTrigger asChild>
                <div className="flex items-center justify-center right-5 top-1 absolute opacity-0 cursor-pointer group-hover:opacity-100 hover:bg-background rounded-xs p-1 transition-all">
                    <EllipsisVertical className="flex items-center justify-center w-5 h-5" />
                </div>
            </PopoverTrigger>
            <PopoverContent className="flex flex-col w-auto p-1 rounded-xs">
                <DialogEditWorkspace workspace={workspace} />
                <DialogDeleteWorkspace workspaceId={workspace.id} />
            </PopoverContent>
        </Popover >
    );
}
