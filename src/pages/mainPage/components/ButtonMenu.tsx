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
                <button className="flex items-center justify-center cursor-pointer w-full h-full">
                    <EllipsisVertical className="flex items-center justify-center w-5 h-5" />
                </button>
            </PopoverTrigger>
            <PopoverContent className="flex flex-col w-auto p-1 rounded-xs">
                <DialogEditWorkspace workspace={workspace} />
                <DialogDeleteWorkspace workspaceId={workspace.id} />
            </PopoverContent>
        </Popover>
    );
}
