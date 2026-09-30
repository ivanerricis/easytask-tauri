import { useCallback, useEffect, useState } from "react"
import { useWorkspace } from "@/contexts/workspace-context"
import { useWorkspaceData } from "@/contexts/workspace-data-context"
import { DialogSettings } from "@/components/dialogs/dialog-settings"
import { reportError } from "@/lib/report-error"
import { SideBar } from "./SideBar"
import { SideBarContainer } from "./SideBarContainer"
import { SideBarHeader } from "./SideBarHeader"
import { FileTree } from "./FileTree"
import { ItemFooter } from "../items/ItemFooter"
import { ButtonTrash } from "./ButtonTrash"
import { ButtonTemplates } from "./ButtonTemplates"
import { DialogAddFolder } from "./DialogAddFolder"
import { DialogAddNote } from "./DialogAddNote"
import { ComboboxWorkspace } from "../combobox-workspace"
import { ButtonCloseNotes } from "../ButtonCloseNotes"
import { ButtonCollapseItems } from "./ButtonCollapseItems"
import { ButtonUpload } from "./ButtonUpload"
import { usePreferences } from "@/contexts/preferences-context"
import { useWorkspaceTransfer } from "@/hooks/use-workspace-transfer"

export const SideBarLeft = () => {

    const { currentWorkspace } = useWorkspace()
    const { folders, getWorkspaceData } = useWorkspaceData()
    const { sidebarLeftOpen, setSideBarLeftOpen } = usePreferences()
    const { exportWorkspace, isBusy: isTransferring } = useWorkspaceTransfer()

    useEffect(() => {
        if (currentWorkspace?.id) {
            getWorkspaceData(currentWorkspace.id).catch(error => reportError(error, "Impossibile caricare il workspace. Riprova."))
        }
    }, [currentWorkspace, getWorkspaceData])

    // Folders are expanded by default; only the collapsed ones are tracked
    const [collapsedIds, setCollapsedIds] = useState<Set<number>>(() => new Set())

    const toggleFolder = useCallback((folderId: number) => {
        setCollapsedIds(prev => {
            const next = new Set(prev)
            if (!next.delete(folderId)) next.add(folderId)
            return next
        })
    }, [])

    const expandFolder = useCallback((folderId: number) => {
        setCollapsedIds(prev => {
            if (!prev.has(folderId)) return prev
            const next = new Set(prev)
            next.delete(folderId)
            return next
        })
    }, [])

    const allCollapsed = folders.length > 0 && folders.every(folder => collapsedIds.has(folder.id))
    const toggleAll = useCallback(() => {
        setCollapsedIds(allCollapsed ? new Set() : new Set(folders.map(folder => folder.id)))
    }, [allCollapsed, folders])

    return (
        <SideBar
            position="left"
            defaultOpen={sidebarLeftOpen}
            updateOpen={setSideBarLeftOpen}
            bottomContainer={<DialogSettings className="relative top-0 left-0" />}
        >
            <SideBarContainer
                header={<SideBarHeader className="border-b-2">
                    <DialogAddFolder />
                    <DialogAddNote />
                    <ButtonUpload />
                    <ButtonCollapseItems allCollapsed={allCollapsed} onToggle={toggleAll} disabled={folders.length === 0} />
                    <ButtonCloseNotes />
                </SideBarHeader>}
                footer={<div className="flex flex-col gap-1 border-t p-1 w-full">
                    <ButtonTemplates />
                    <ButtonTrash />
                    <ItemFooter
                        type="download"
                        text="Esporta Workspace"
                        disabled={!currentWorkspace || isTransferring}
                        onClick={() => { if (currentWorkspace) void exportWorkspace(currentWorkspace) }}
                    />
                    <ComboboxWorkspace />
                </div>}
            >
                <FileTree collapsedIds={collapsedIds} onToggleFolder={toggleFolder} onExpandFolder={expandFolder} />
            </SideBarContainer>
        </SideBar>
    )
}