import { usePreferences } from "@/contexts/preferences-context"
import { Grip, LayoutList, SquareCheckBig } from "lucide-react"
import { ButtonMenuGroup } from "./ButtonMenuGroup"
import { ItemMenuButton } from "@/components/item-menu"
import type { Group } from "@/types/types"
import type { DraggableProvidedDragHandleProps } from "@hello-pangea/dnd"
import { useEffect, useRef, useState } from "react"
import { useWorkspaceActions } from "@/contexts/workspace-data-context"
import { useActiveNoteActions } from "@/contexts/active-note-context"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/utils"
import { getGroupLabel } from "./group-label"

type GroupHeaderProps = {
    group: Group
    /** Position of the group in the note (0-based), used for the default label "Gruppo N". */
    index?: number
    dragHandleProps?: DraggableProvidedDragHandleProps | null
}

export const GroupHeader = ({ group, index = 0, dragHandleProps }: GroupHeaderProps) => {
    const { showSectionCount, showTaskCount } = usePreferences()
    const { renameItem } = useWorkspaceActions()
    const { refreshActiveNote } = useActiveNoteActions()
    const [isEditing, setEditing] = useState(false)
    const [text, setText] = useState(group.name ?? "")
    const inputRef = useRef<HTMLInputElement>(null)
    const done = useRef(false)

    const name = group.name?.trim() ?? ""
    const label = getGroupLabel(group, index)

    useEffect(() => {
        if (isEditing && inputRef.current) {
            const input = inputRef.current
            input.focus()
            input.setSelectionRange(input.value.length, input.value.length)
        }
    }, [isEditing])

    const startEditing = () => {
        done.current = false
        setText(name)
        setEditing(true)
    }

    // Enter and blur save (an empty text removes the name), Escape cancels
    const save = async () => {
        if (done.current) return
        done.current = true
        setEditing(false)
        if (text.trim() === name) return
        try {
            await renameItem("section_group", group.id, text.trim())
            await refreshActiveNote()
        } catch (err) {
            toast.error('Impossibile cambiare il nome del gruppo' + ' - ' + getErrorMessage(err))
        }
    }

    return (
        <ButtonMenuGroup group={group}>
            <div className="group flex items-center justify-between border px-2 py-1 bg-background hover:bg-secondary w-full rounded-xs">
                {dragHandleProps && <div className="group flex items-center justify-center" {...dragHandleProps}>
                    <Grip className="text-muted-foreground group-hover:text-foreground w-4 h-4 mr-3" />
                </div>}
                {!isEditing && <h2
                    onClick={startEditing}
                    title={name || undefined}
                    className={`text-xs mr-3 min-w-0 max-w-40 truncate cursor-text ${name ? "" : "text-muted-foreground"}`}>
                    {label}
                </h2>}
                {isEditing && <input
                    ref={inputRef}
                    type="text"
                    value={text}
                    placeholder={label}
                    aria-label="Nome del gruppo"
                    onChange={e => setText(e.target.value)}
                    onBlur={() => { void save() }}
                    onKeyDown={e => {
                        if (e.key === "Enter") {
                            e.preventDefault()
                            void save()
                        } else if (e.key === "Escape") {
                            e.preventDefault()
                            done.current = true
                            setEditing(false)
                        }
                    }}
                    className="min-w-0 w-32 mr-3 px-1 border border-primary text-xs rounded-xs"
                />}
                <div className="flex w-full gap-3">
                    {showSectionCount && <div className="flex items-center gap-1">
                        <LayoutList className="size-4" />
                        <h1 className="text-xs">
                            {group.sections.length}
                        </h1>
                    </div>}
                    {showTaskCount && <div className="flex items-center gap-1">
                        <SquareCheckBig className="size-4" />
                        <h1 className="text-xs">
                            {group.sections.reduce((sum, section) => sum + section.tasks.length, 0)}
                        </h1>
                    </div>}
                </div>
                <div className="opacity-0 group-hover:opacity-100">
                    <ItemMenuButton iconClassName="!h-4 !w-4" />
                </div>
            </div>
        </ButtonMenuGroup>
    )
}
