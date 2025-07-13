import { Input } from "@/components/ui/input"
import { useWorkspaceData } from "@/contexts/workspace-data-context"
import { Palette, Plus, X } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import type { FormEvent } from "react"
import { toast } from "sonner"

type AddSectionInGroupProps = {
    groupId: number
}
const defaultSection = {
    name: "",
    color: ""
}

export const AddSectionInGroup = ({ groupId }: AddSectionInGroupProps) => {
    const [isOpen, setOpen] = useState(false)
    const [paletteIsOpen, setPaletteOpen] = useState(false)
    const [section, setSection] = useState(defaultSection)
    const [inputValue, setInputValue] = useState("")
    const { createSectionInGroup, currentNote, getNoteData } = useWorkspaceData()
    const formRef = useRef<HTMLFormElement>(null)

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (formRef.current && !formRef.current.contains(event.target as Node)) {
                setOpen(false)
                setInputValue("")
            }
        }

        document.addEventListener("mousedown", handleClickOutside)

        return () => {
            document.removeEventListener("mousedown", handleClickOutside)
        }
    }, [])

    const handleOpen = () => {
        setOpen(prev => !prev)
        setInputValue("")
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        if (inputValue.trim()) {
            try {
                await createSectionInGroup(groupId, inputValue.trim())
                handleOpen()
                if (!currentNote) return
                await getNoteData(currentNote.id)
            } catch (error: any) {
                toast.error(error.message || 'Errore durante la creazione della sezione')
            }
        }
    }

    return (
        !isOpen ? (
            <div
                role="button"
                onClick={handleOpen}
                className="group cursor-pointer flex items-center justify-center border gap-1 p-2 bg-background"
            >
                <Plus size={20} className="group-hover:text-foreground text-muted-foreground transition-all" />
                <h1 className="text-muted-foreground group-hover:text-foreground w-full transition-all">
                    Aggiungi una sezione
                </h1>
            </div>
        ) : (
            <form
                ref={formRef}
                onSubmit={handleSubmit}
                className="flex flex-col items-center justify-center border bg-secondary"
            >
                <div className="flex items-center justify-center w-full">
                    <Input
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Scrivi qualcosa..."
                        autoFocus
                        className="rounded-none border-none"
                    />
                </div>
                {!paletteIsOpen
                    ? <div
                        role="button"
                        onClick={() => { setPaletteOpen(true) }}
                        className="group/color cursor-pointer flex items-center justify-center w-full h-8  border-t"
                    >
                        <Palette size={20} className="group-hover/color:text-foreground text-muted-foreground transition-all" />
                    </div>
                    : <div className="flex items-center justify-center w-full">
                        <div
                            className="flex items-center justify-center h-8 w-full bg-primary"
                            style={{ backgroundColor: section.color }}
                        >
                            <Input
                                id="color-1"
                                name="color"
                                type="color"
                                className="opacity-0 cursor-pointer"
                                value={section.color}
                                onChange={e => setSection({
                                    ...section,
                                    color: e.target.value
                                })}
                            />
                        </div>
                        <div
                            role="button"
                            onClick={(e) => { e.preventDefault(), setPaletteOpen(false) }}
                            className="group/close cursor-pointer flex items-center justify-center w-full h-8"
                        >
                            <X size={20} className="group-hover:text-foreground transition-all group-hover/close:text-foreground text-muted-foreground" />
                        </div>
                    </div>}
                <div className="flex items-center w-full border-t">
                    <div
                        role="button"
                        onClick={handleSubmit}
                        className="group/add cursor-pointer flex items-center justify-center w-full h-8 border-r"
                    >
                        <Plus size={20} className="group-hover/add:text-foreground text-muted-foreground transition-all" />
                    </div>
                    <div
                        role="button"
                        onClick={handleOpen}
                        className="group/close cursor-pointer flex items-center justify-center w-full h-8"
                    >
                        <X size={20} className="group-hover/close:text-foreground text-muted-foreground transition-all" />
                    </div>
                </div>
            </form>
        )
    )
}