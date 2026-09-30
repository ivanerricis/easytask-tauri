import { TooltipCustom } from "@/components/tooltip-custom"
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { useWorkspaceState } from "@/contexts/workspace-data"
import { useTabsActions } from "@/contexts/use-tabs"
import type { Note } from "@/types/types"
import { SearchIcon } from "lucide-react"
import { useState } from "react"
import { useShortcut } from "@/hooks/use-shortcut"
import { useShortcutLabel } from "@/contexts/use-shortcuts"

export function CommandMenu() {
    const [open, setOpen] = useState(false)
    const { notes, folders } = useWorkspaceState()
    const { openNote } = useTabsActions()

    useShortcut("search-notes", () => setOpen(open => !open), { allowInInputs: true })
    const searchLabel = useShortcutLabel("search-notes")

    const allNotesMap = new Map<number, Note>()
    notes.forEach(note => allNotesMap.set(note.id, note))
    folders.forEach(folder => {
        folder.notes.forEach(note => allNotesMap.set(note.id, note))
    })
    const allNotes = Array.from(allNotesMap.values())

    return (
        <>
            <CommandDialog open={open} onOpenChange={setOpen} className="rounded-xs">
                <CommandInput placeholder="Cerca una nota..." />
                <CommandList>
                    <CommandEmpty>Nessun risultato.</CommandEmpty>
                    <CommandGroup heading="Suggerimenti">
                        {allNotes.map((note) => (
                            <CommandItem
                                className="!p-2"
                                key={note.id}
                                onSelect={() => {
                                    setOpen(prev => !prev)
                                    openNote(note.id)
                                }}
                            >
                                {note.name}
                            </CommandItem>))}
                    </CommandGroup>
                </CommandList>
            </CommandDialog>

            <TooltipCustom text="Cerca una nota" shortcut={searchLabel}>
                <button
                    type="button"
                    onClick={() => { setOpen(prev => !prev) }}
                    className="relative flex items-center justify-center w-full rounded-[4px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <SearchIcon className="absolute left-2 w-4 h-4 text-muted-foreground" />
                    <span className="flex items-center app-no-drag rounded-[4px] h-6 pl-7 pr-16 md:text-xs border w-full text-left text-muted-foreground cursor-default">Cerca...</span>
                </button>
            </TooltipCustom>
        </>
    )
}