import i18n from "@/i18n"
import { useTranslation } from "react-i18next"
import { useCallback, useEffect, useState } from "react"
import { useWorkspace } from "@/contexts/use-workspace"
import { useWorkspaceData } from "@/contexts/workspace-data"
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
import { ButtonNoteFromTemplate } from "./ButtonNoteFromTemplate"
import { ComboboxWorkspace } from "../combobox-workspace"
import { ButtonCloseNotes } from "../ButtonCloseNotes"
import { ButtonCollapseItems } from "./ButtonCollapseItems"
import { ButtonUpload } from "./ButtonUpload"
import { usePreferences } from "@/contexts/use-preferences"
import { useWorkspaceTransfer } from "@/hooks/use-workspace-transfer"
import { useShortcut } from "@/hooks/use-shortcut"
import { useCompactLayout } from "@/lib/sidebar-layout"

export const SideBarLeft = () => {
    const { t } = useTranslation()

    const { currentWorkspace } = useWorkspace()
    const { folders, getWorkspaceData } = useWorkspaceData()
    const { sidebarLeftOpen, setSideBarLeftOpen, sidebarLeftWidth, setSidebarLeftWidth } = usePreferences()
    // Compact window: the sidebar is an overlay, closed by default, whose state is not persisted
    const compact = useCompactLayout()
    const [overlayOpen, setOverlayOpen] = useState(false)
    const [prevCompact, setPrevCompact] = useState(compact)
    if (prevCompact !== compact) {
        setPrevCompact(compact)
        setOverlayOpen(false)
    }
    const open = compact ? overlayOpen : sidebarLeftOpen
    const setOpen = useCallback((value: boolean) => {
        if (compact) setOverlayOpen(value)
        else setSideBarLeftOpen(value)
    }, [compact, setSideBarLeftOpen])
    useShortcut("toggle-sidebar", () => setOpen(!open), { allowInInputs: true })
    const { exportWorkspace, isBusy: isTransferring } = useWorkspaceTransfer()

    useEffect(() => {
        if (currentWorkspace?.id) {
            getWorkspaceData(currentWorkspace.id).catch(error => reportError(error, i18n.t("errors.loadWorkspace")))
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
            open={open}
            onOpenChange={setOpen}
            width={sidebarLeftWidth}
            onWidthChange={setSidebarLeftWidth}
            overlay={compact}
            bottomContainer={<DialogSettings className="relative top-0 left-0" />}
        >
            <SideBarContainer
                header={<SideBarHeader className="border-b-2">
                    <DialogAddFolder />
                    <DialogAddNote />
                    <ButtonNoteFromTemplate />
                    <ButtonUpload />
                    <ButtonCollapseItems allCollapsed={allCollapsed} onToggle={toggleAll} disabled={folders.length === 0} />
                    <ButtonCloseNotes />
                </SideBarHeader>}
                footer={<div className="flex flex-col gap-1 border-t p-1 w-full">
                    <ButtonTemplates />
                    <ButtonTrash />
                    <ItemFooter
                        type="download"
                        text={t("sidebar.exportWorkspace")}
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