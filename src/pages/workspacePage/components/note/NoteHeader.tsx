import { useTranslation } from "react-i18next"
import { TooltipCustom } from "@/components/tooltip-custom"
import { useActiveNoteId, useTabsActions } from "@/contexts/use-tabs"
import type { Note } from "@/types/types"
import { useShortcutLabel } from "@/contexts/use-shortcuts"
import { usePreferences } from "@/contexts/use-preferences"
import { useShortcut } from "@/hooks/use-shortcut"
import { Eye, EyeOff, X } from "lucide-react"
import React from "react"
import { ButtonMenuNote } from "./ButtonMenuNote"
import { focusRing, onActivateKey } from "@/lib/a11y"

type NoteHeaderProps = {
    note: Note
}

export const NoteHeader = React.memo(({ note }: NoteHeaderProps) => {
    const { t } = useTranslation()

    const activeId = useActiveNoteId()
    const { closeNote, activateNote } = useTabsActions()
    const isActive = activeId === note.id
    const closeLabel = useShortcutLabel("close-note")
    const hideLabel = useShortcutLabel("toggle-hide-completed")
    const { hideCompletedTasks, setHideCompletedTasks } = usePreferences()

    // Only the active tab registers the shortcut (a single handler, whatever the number of open notes)
    useShortcut("toggle-hide-completed", () => setHideCompletedTasks(!hideCompletedTasks), { enabled: isActive, allowInInputs: true })

    const handleCloseHeader = (e: React.MouseEvent) => {
        e.stopPropagation()
        closeNote(note.id)
    }

    const handleToggleCompleted = (e: React.MouseEvent) => {
        e.stopPropagation()
        setHideCompletedTasks(!hideCompletedTasks)
    }

    const setCurrent = (e: React.MouseEvent) => {
        e.stopPropagation()
        activateNote(note.id)
    }

    return (
        <ButtonMenuNote note={note}>
            <div
                role="button"
                tabIndex={0}
                onClick={setCurrent}
                onKeyDown={onActivateKey(() => activateNote(note.id))}
                aria-current={isActive ? "true" : undefined}
                className={`${focusRing} relative flex flex-col items-center cursor-pointer border-x border-b min-h-[42px]
                    ${isActive ? 'bg-background border-x-primary border-b-transparent' : 'bg-secondary border-x-transparent border-b-primary hover:bg-background/40'}`}
            >
                {/* Color container */}
                {note.color && <div
                    className="w-full h-0.5 absolute top-0"
                    style={{ backgroundColor: note.color }}
                >
                </div>}

                {/* Text + Close button */}
                {/* Same height as the sidebar header (32px buttons + padding + border), the content centered in it */}
                <div className="flex flex-1 items-center justify-between py-1 pl-2 pr-1 gap-2">
                    <span className={`w-full text-left text-sm text-nowrap ${isActive ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                        {note.name}
                    </span>
                    {isActive &&
                        <TooltipCustom text={t("notes.hideCompleted")} shortcut={hideLabel}>
                            <button
                                type="button"
                                aria-label={t("notes.hideCompleted")}
                                aria-pressed={hideCompletedTasks}
                                onClick={handleToggleCompleted}
                                className={`${focusRing} flex items-center justify-center cursor-pointer p-0.5 hover:bg-accent rounded-xs ${hideCompletedTasks ? "text-primary" : "text-foreground"}`}
                            >
                                {hideCompletedTasks ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </TooltipCustom>
                    }
                    {isActive ?
                        <TooltipCustom text={t("notes.closeCurrent")} shortcut={closeLabel}>
                            <button type="button" aria-label={t("notes.closeCurrent")} onClick={handleCloseHeader} className={`${focusRing} flex items-center justify-center cursor-pointer p-0.5 hover:bg-accent rounded-xs text-foreground`}>
                                <X className="h-4 w-4" />
                            </button>
                        </TooltipCustom>
                        :
                        <TooltipCustom text={t("notes.close")}>
                            <button type="button" aria-label={t("notes.close")} onClick={handleCloseHeader} className={`${focusRing} flex items-center justify-center cursor-pointer p-0.5 hover:bg-accent rounded-xs text-muted-foreground`}>
                                <X className="h-4 w-4" />
                            </button>
                        </TooltipCustom>
                    }
                </div>
            </div>
        </ButtonMenuNote>
    )
})
