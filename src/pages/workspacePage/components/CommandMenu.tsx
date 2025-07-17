import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { useWorkspaceData } from "@/contexts/workspace-data-context"
import type { Note } from "@/types/types"
import { SearchIcon } from "lucide-react"
import { useEffect, useState } from "react"

export function CommandMenu() {
    const [open, setOpen] = useState(false)
    const { notes, setCurrentNote, getNoteData, setCurrentNotes, folders } = useWorkspaceData()

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "o" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                setOpen((open) => !open)
            }
        }
        document.addEventListener("keydown", down)
        return () => document.removeEventListener("keydown", down)
    }, [])

    const allNotesMap = new Map<number, Note>()
    notes.forEach(note => allNotesMap.set(note.id, note))
    folders.forEach(folder => {
        folder.notes.forEach(note => allNotesMap.set(note.id, note))
    })
    const allNotes = Array.from(allNotesMap.values())

    return (
        <>
            <div role="button" onClick={() => { setOpen(prev => !prev) }} className="flex relative w-full items-center justify-center">
                <div className="relative flex items-center justify-center w-full transition-all">
                    <SearchIcon className="absolute left-2 w-4 h-4 text-muted-foreground" />
                    <h1 className="flex items-center app-no-drag rounded-[4px] h-6 pl-7 pr-16 md:text-xs border w-full text-left text-muted-foreground cursor-default">Cerca...</h1>
                </div>
            </div>
            <CommandDialog open={open} onOpenChange={setOpen} className="rounded-xs">
                <CommandInput placeholder="Cerca una nota..." />
                <CommandList>
                    <CommandEmpty>Nessun risultato.</CommandEmpty>
                    <CommandGroup heading="Suggerimenti">
                        {allNotes.map((note) => (
                            <CommandItem
                                className="!p-2"
                                key={note.id}
                                onSelect={async () => {
                                    setOpen(prev => !prev)
                                    setCurrentNotes((prev: Note[]) => {
                                        const alreadyExists = prev.some(n => n.id === note.id)
                                        return alreadyExists ? prev : [...prev, note]
                                    })
                                    setCurrentNote(note)
                                    await getNoteData(note.id)
                                }}
                            >
                                {note.name}
                            </CommandItem>))}
                    </CommandGroup>
                </CommandList>
            </CommandDialog>
        </>
    )
}