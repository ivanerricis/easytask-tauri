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
import { Button } from "@/components/ui/button"
import { Toggle } from "@/components/ui/toggle"
import { focusRing } from "@/lib/a11y"
import { cn } from "@/lib/utils"
import { useInlineRename } from "@/hooks/use-inline-rename"
import { InlineNameInput } from "@/components/inline-name-input"

type NoteHeaderProps = {
    note: Note
}

/**
 * One tab of the bar of the open notes. The tab itself (role "tab") is the name; the toggle of the completed tasks and
 * the close button are its siblings inside the same box, never nested in it (a tab must not contain buttons).
 */
export const NoteHeader = React.memo(({ note }: NoteHeaderProps) => {
    const { t } = useTranslation()

    const activeId = useActiveNoteId()
    const { closeNote, activateNote } = useTabsActions()
    const isActive = activeId === note.id
    const closeLabel = useShortcutLabel("close-note")
    const hideLabel = useShortcutLabel("toggle-hide-completed")
    const { hideCompletedTasks, setHideCompletedTasks } = usePreferences()
    const { editing, error, start: startRename, inputProps } = useInlineRename({ itemType: "note", id: note.id, name: note.name })

    // Only the active tab registers the shortcut (a single handler, whatever the number of open notes)
    useShortcut("toggle-hide-completed", () => setHideCompletedTasks(!hideCompletedTasks), { enabled: isActive, allowInInputs: true })

    const handleCloseHeader = (e: React.MouseEvent) => {
        e.stopPropagation()
        closeNote(note.id)
    }

    return (
        <ButtonMenuNote note={note} onRename={startRename}>
            <div
                className={cn(
                    "relative flex items-stretch min-h-[42px] border-x border-b",
                    isActive ? "bg-background border-x-primary border-b-transparent" : "bg-secondary border-x-transparent border-b-primary hover:bg-background/40",
                )}
            >
                {/* Color container */}
                {note.color && <div
                    className="w-full h-1 absolute top-0"
                    style={{ backgroundColor: note.color }}
                >
                </div>}

                {/* Same height as the sidebar header (32px buttons + padding + border), the content centered in it */}
                {editing && <div className="flex min-w-0 flex-1 items-center py-1 pl-2 pr-1">
                    <InlineNameInput {...inputProps} error={error} aria-label={t("common.name")} className="max-w-56 text-sm" />
                </div>}
                {!editing && <button
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    tabIndex={isActive ? 0 : -1}
                    data-note-id={note.id}
                    title={note.name}
                    onClick={() => activateNote(note.id)}
                    className={cn(focusRing, "flex min-w-0 flex-1 cursor-pointer items-center py-1 pl-2 pr-1 text-left text-sm")}
                >
                    <span className={cn("block max-w-56 truncate", isActive ? "font-medium text-foreground" : "text-muted-foreground")}>
                        {note.name}
                    </span>
                </button>}
                <div className="flex shrink-0 items-center gap-1 py-1 pr-1">
                    {isActive &&
                        <TooltipCustom text={t("notes.hideCompleted")} shortcut={hideLabel}>
                            <Toggle
                                aria-label={t("notes.hideCompleted")}
                                pressed={hideCompletedTasks}
                                onPressedChange={setHideCompletedTasks}
                                className="size-6 min-w-6 p-0"
                            >
                                {hideCompletedTasks ? <EyeOff /> : <Eye />}
                            </Toggle>
                        </TooltipCustom>
                    }
                    <TooltipCustom text={isActive ? t("notes.closeCurrent") : t("notes.close")} shortcut={isActive ? closeLabel : undefined}>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={isActive ? t("notes.closeCurrent") : t("notes.close")}
                            onClick={handleCloseHeader}
                            className={cn("size-6", isActive ? "text-foreground" : "text-muted-foreground")}
                        >
                            <X />
                        </Button>
                    </TooltipCustom>
                </div>
            </div>
        </ButtonMenuNote>
    )
})
