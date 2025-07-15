import { Input } from "@/components/ui/input"
import { useWorkspaceData } from "@/contexts/workspace-data-context"
import { Palette, Plus, X } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import type { FormEvent } from "react"
import { toast } from "sonner"

const defaultSection = {
    name: "",
    color: "#FFFFFF"
}

export const AddSection = () => {
    const [isOpen, setOpen] = useState(false)
    const [paletteIsOpen, setPaletteOpen] = useState(false)
    const [section, setSection] = useState(defaultSection)
    const { createSection, currentNote, getNoteData } = useWorkspaceData()
    const formRef = useRef<HTMLFormElement>(null)

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'N') {
                event.preventDefault()
                handleOpen()
            }
        }

        const handleClickOutside = (event: MouseEvent) => {
            if (formRef.current && !formRef.current.contains(event.target as Node)) {
                setOpen(false)
                setSection(defaultSection)
            }
        }

        document.addEventListener("mousedown", handleClickOutside)
        document.addEventListener('keydown', handleKeyDown)

        return () => {
            document.removeEventListener("mousedown", handleClickOutside)
            document.removeEventListener('keydown', handleKeyDown)
        }
    }, [])

    const handleOpen = () => {
        setOpen(prev => !prev)
        setSection(defaultSection)
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        if (section.name.trim()) {
            try {
                if (!currentNote) return
                await createSection(currentNote.id, section.name.trim(), 1, paletteIsOpen ? section.color : undefined)
                setOpen(false)
                setSection(defaultSection)
                if (!currentNote) return
                await getNoteData(currentNote.id)
            } catch (error: any) {
                toast.error(error || 'Errore nella creazione della sezione')
            } finally {
                setPaletteOpen(false)
            }
        }
    }

    return (
        !isOpen ? (
            <div
                role="button"
                onClick={handleOpen}
                className="group cursor-pointer flex items-center justify-center border gap-1 p-2"
            >
                <Plus size={20} className="group-hover:text-foreground text-muted-foreground" />
                <h1 className="text-muted-foreground group-hover:text-foreground w-full text-nowrap">
                    Aggiungi una sezione
                </h1>
            </div>
        ) : (
            <form
                ref={formRef}
                onSubmit={handleSubmit}
                className="flex flex-col items-center justify-center border"
            >
                <div className="flex items-center justify-center w-full border-b">
                    <Input
                        value={section.name}
                        onChange={(e) => setSection({ ...section, name: e.target.value })}
                        placeholder="Scrivi qualcosa..."
                        autoFocus
                        className="rounded-none border-none !bg-background"
                    />
                </div>
                {!paletteIsOpen
                    ? <div
                        role="button"
                        onClick={() => { setPaletteOpen(true) }}
                        className="group/color cursor-pointer flex items-center justify-center w-full h-8 bg-secondary"
                    >
                        <Palette size={20} className="group-hover/color:text-foreground text-muted-foreground" />
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
                            onClick={(e) => { e.preventDefault(); setPaletteOpen(false); setSection({ ...section, color: defaultSection.color }); }}
                            className="group/close cursor-pointer flex items-center justify-center w-full h-8 bg-secondary"
                        >
                            <X size={20} className="group-hover:text-foreground group-hover/close:text-foreground text-muted-foreground" />
                        </div>
                    </div>}
                <div className="flex items-center w-full border-t bg-secondary">
                    <div
                        role="button"
                        onClick={handleSubmit}
                        className="group/add cursor-pointer flex items-center justify-center w-full h-8 border-r"
                    >
                        <Plus size={20} className="group-hover/add:text-foreground text-muted-foreground" />
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