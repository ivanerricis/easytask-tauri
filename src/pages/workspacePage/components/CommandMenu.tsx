import { useTranslation } from "react-i18next"
import { TooltipCustom } from "@/components/tooltip-custom"
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { useAllNotes } from "@/hooks/use-all-notes"
import { NoteSearchLabel } from "@/components/note-search-label"
import { useTabsActions } from "@/contexts/use-tabs"
import { SearchIcon } from "lucide-react"
import { useState } from "react"
import { useShortcut } from "@/hooks/use-shortcut"
import { useShortcutLabel } from "@/contexts/use-shortcuts"
import { useOptionalUndo } from "@/contexts/undo/use-undo"
import { Redo2, Undo2 } from "lucide-react"

export function CommandMenu() {
    const { t } = useTranslation()
    const [open, setOpen] = useState(false)
    const { openNote } = useTabsActions()
    const undo = useOptionalUndo()
    const undoShortcut = useShortcutLabel("undo")
    const redoShortcut = useShortcutLabel("redo")

    useShortcut("search-notes", () => setOpen(open => !open), { allowInInputs: true })
    const searchLabel = useShortcutLabel("search-notes")

    // Every note once, with the path of its folder (shown in full, workspace included, under the name)
    const allNotes = useAllNotes()

    return (
        <>
            <CommandDialog open={open} onOpenChange={setOpen} className="rounded-xs">
                <CommandInput placeholder={t("notes.search.placeholder")} />
                <CommandList>
                    <CommandEmpty>{t("notes.search.empty")}</CommandEmpty>
                    {undo && (undo.canUndo || undo.canRedo) && (
                        <CommandGroup heading={t("undo.actions")}>
                            {undo.canUndo && (
                                <CommandItem className="!p-2" onSelect={() => { setOpen(false); void undo.undo() }}>
                                    <Undo2 className="size-4" />
                                    {t("undo.undoWithLabel", { label: undo.undoLabel })}
                                    {undoShortcut && <span className="ml-auto text-xs text-muted-foreground">{undoShortcut}</span>}
                                </CommandItem>
                            )}
                            {undo.canRedo && (
                                <CommandItem className="!p-2" onSelect={() => { setOpen(false); void undo.redo() }}>
                                    <Redo2 className="size-4" />
                                    {t("undo.redoWithLabel", { label: undo.redoLabel })}
                                    {redoShortcut && <span className="ml-auto text-xs text-muted-foreground">{redoShortcut}</span>}
                                </CommandItem>
                            )}
                        </CommandGroup>
                    )}
                    <CommandGroup heading={t("notes.search.suggestions")}>
                        {allNotes.map(({ note, path }) => (
                            <CommandItem
                                className="!p-2"
                                key={note.id}
                                value={`${note.name} ${note.id}`}
                                keywords={path ? [path] : undefined}
                                onSelect={() => {
                                    setOpen(prev => !prev)
                                    openNote(note.id)
                                }}
                            >
                                <NoteSearchLabel name={note.name} path={path} />
                            </CommandItem>))}
                    </CommandGroup>
                </CommandList>
            </CommandDialog>

            <TooltipCustom text={t("notes.hints.search")} shortcut={searchLabel}>
                <button
                    type="button"
                    onClick={() => { setOpen(prev => !prev) }}
                    className="relative flex items-center justify-center w-full rounded-[4px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <SearchIcon className="absolute left-2 w-4 h-4 text-muted-foreground" />
                    <span className="flex items-center app-no-drag rounded-[4px] h-6 pl-7 pr-16 md:text-xs border w-full text-left text-muted-foreground cursor-default">{t("notes.search.short")}</span>
                </button>
            </TooltipCustom>
        </>
    )
}