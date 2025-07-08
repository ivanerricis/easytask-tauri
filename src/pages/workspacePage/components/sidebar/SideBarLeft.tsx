import type { Folder, Note } from "@/types"
import { useEffect } from "react"
import { useWorkspace } from "@/contexts/workspace-context"
import { useWorkspaceData } from "@/contexts/workspace-data-context"
import { DialogSettings } from "@/components/dialog-settings"
import { SideBar } from "./SideBar"
import { SideBarContainer } from "./SideBarContainer"
import { SideBarHeader } from "./SideBarHeader"
import { ItemNote } from "../items/ItemNote"
import { ItemFolder } from "../items/ItemFolder"
import { ItemFooter } from "../items/ItemFooter"
import { DialogAddFolder } from "./DialogAddFolder"
import { DialogAddNote } from "./DialogAddNote"
import { ComboboxWorkspace } from "../combobox-workspace"
import { ButtonCloseNotes } from "../ButtonCloseNotes"
import { ButtonCollapseItems } from "./ButtonCollapseItems"
import { ButtonUpload } from "./ButtonUpload"

export const SideBarLeft = () => {

    const { currentWorkspace } = useWorkspace()
    const { folders, notes, getWorkspaceData } = useWorkspaceData()

    useEffect(() => {
        if (currentWorkspace?.id) {
            getWorkspaceData(currentWorkspace.id)
        }
    }, [currentWorkspace])

    const FileSystemItem = ({ item }: { item: Folder | Note }) => {
        if (!item) return null;

        if ("subfolders" in item) {
            return (
                <ItemFolder folder={item}>
                    {item.subfolders.map((child) => (
                        <FileSystemItem key={`folder-${child.id}`} item={child} />
                    ))}
                    {item.notes.map((note) => (
                        <ItemNote key={`note-${note.id}`} note={note} />
                    ))}
                </ItemFolder>
            );
        }

        return <ItemNote note={item} />;
    };

    return (
        <SideBar
            position="left"
            bottomContainer={<DialogSettings className="relative top-0 left-0" />}
        >
            <SideBarContainer
                header={<SideBarHeader className="border-b-2">
                    <DialogAddFolder />
                    <DialogAddNote />
                    <ButtonUpload />
                    <ButtonCollapseItems />
                    <ButtonCloseNotes />
                </SideBarHeader>}
                footer={<div className="flex flex-col gap-1 border-t p-1 w-full">
                    {/* <ItemFooter type="trash" text="Trash" /> */}
                    <ItemFooter type="download" text="Export Workspace" />
                    <ComboboxWorkspace />
                </div>}
            >
                <div
                    className="flex flex-col gap-1 p-1 w-full"
                >
                    {folders.length > 0 || notes.length > 0 ? (
                        <>
                            {folders.map((item) => (
                                <FileSystemItem key={`folder-${item.id}`} item={item} />
                            ))}
                            {notes.map((item) => (
                                <FileSystemItem key={`note-${item.id}`} item={item} />
                            ))}
                        </>
                    ) : (
                        <h1 className="text-muted-foreground text-sm w-full">
                            Nessuna cartella o file
                        </h1>
                    )}
                </div>
            </SideBarContainer>
        </SideBar>
    )
}