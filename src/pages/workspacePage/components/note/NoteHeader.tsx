import { useTranslation } from "react-i18next"
import { TooltipCustom } from "@/components/tooltip-custom"
import { useActiveNoteId, useTabsActions } from "@/contexts/use-tabs"
import type { Note } from "@/types/types"
import { X } from "lucide-react"
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

    const handleCloseHeader = (e: React.MouseEvent) => {
        e.stopPropagation()
        closeNote(note.id)
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
                className={`${focusRing} relative flex flex-col items-center cursor-pointer
                    ${isActive ? 'bg-background' : 'bg-secondary hover:bg-background/40'}`}
            >
                {/* Color container */}
                {note.color && <div
                    className="w-full h-0.5 absolute top-0"
                    style={{ backgroundColor: note.color }}
                >
                </div>}

                {/* Text + Close button */}
                <div className="flex items-center justify-between pb-1 pt-1.5 pl-2 pr-1 gap-2 h-full">
                    <span className={`w-full text-left text-sm text-nowrap ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                        {note.name}
                    </span>
                    {isActive ?
                        <TooltipCustom text={t("notes.closeCurrent")} shortcut="(Ctrl + L)">
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
