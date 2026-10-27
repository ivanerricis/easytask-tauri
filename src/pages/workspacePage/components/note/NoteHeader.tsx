import { useTranslation } from "react-i18next"
import { TooltipCustom } from "@/components/tooltip-custom"
import { useActiveNoteId, useTabsActions } from "@/contexts/use-tabs"
import type { Note } from "@/types/types"
import { useShortcutLabel } from "@/contexts/use-shortcuts"
import { X } from "lucide-react"
import React from "react"
import { ButtonMenuNote } from "./ButtonMenuNote"
import { Button } from "@/components/ui/button"
import { focusRing } from "@/lib/a11y"
import { cn } from "@/lib/utils"
import { useInlineRename } from "@/hooks/use-inline-rename"
import { InlineNameInput } from "@/components/inline-name-input"

type NoteHeaderProps = {
    note: Note
}

/**
 * One tab of the bar of the open notes. The tab itself (role "tab") is the name; the close button is its sibling inside the same box,
 * never nested in it (a tab must not contain buttons).
 */
export const NoteHeader = React.memo(({ note }: NoteHeaderProps) => {
    const { t } = useTranslation()

    const activeId = useActiveNoteId()
    const { closeNote, activateNote } = useTabsActions()
    const isActive = activeId === note.id
    const closeLabel = useShortcutLabel("close-note")
    const { editing, error, start: startRename, inputProps } = useInlineRename({ itemType: "note", id: note.id, name: note.name })

    const handleCloseHeader = (e: React.MouseEvent) => {
        e.stopPropagation()
        closeNote(note.id)
    }

    return (
        <ButtonMenuNote note={note} onRename={startRename}>
            <div
                className={cn(
                    "group/tab relative flex items-stretch min-h-[42px] border-x border-b",
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
                    <span className={cn("block max-w-44 truncate", isActive ? "font-medium text-foreground" : "text-muted-foreground")}>
                        {note.name}
                    </span>
                </button>}
                <div className="flex shrink-0 items-center gap-1 py-1 pr-1">
                    <TooltipCustom text={isActive ? t("notes.closeCurrent") : t("notes.close")} shortcut={isActive ? closeLabel : undefined}>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={isActive ? t("notes.closeCurrent") : t("notes.close")}
                            onClick={handleCloseHeader}
                            className={cn("relative size-7 after:absolute after:-inset-0.5 after:content-['']", isActive ? "text-foreground" : "text-muted-foreground opacity-0 group-hover/tab:opacity-100 focus-visible:opacity-100")}
                        >
                            <X />
                        </Button>
                    </TooltipCustom>
                </div>
            </div>
        </ButtonMenuNote>
    )
})
