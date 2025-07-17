import { Input } from "@/components/ui/input"
import { useWorkspaceData } from "@/contexts/workspace-data-context"
import { Palette, X } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import type { FormEvent } from "react"
import { toast } from "sonner"
import { PlusButton } from "./PlusButton"
import { CloseButton } from "./CloseButton"
import { AddButton } from "./AddButton"

type AddSectionInGroupProps = {
    groupId: number
}
const defaultSection = {
    name: "",
    color: "#FFFFFF"
}

export const AddSectionInGroup = ({ groupId }: AddSectionInGroupProps) => {
    const [isOpen, setOpen] = useState(false)
    const [paletteIsOpen, setPaletteOpen] = useState(false)
    const [section, setSection] = useState(defaultSection)
    const { createSectionInGroup, currentNote, getNoteData } = useWorkspaceData()
    const formRef = useRef<HTMLFormElement>(null)

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (formRef.current && !formRef.current.contains(event.target as Node)) {
                setOpen(false)
                setSection(defaultSection)
            }
        }

        document.addEventListener("mousedown", handleClickOutside)

        return () => {
            document.removeEventListener("mousedown", handleClickOutside)
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
                await createSectionInGroup(groupId, section.name.trim(), paletteIsOpen ? section.color : undefined)
                handleOpen()
                if (!currentNote) return
                await getNoteData(currentNote.id)
            } catch (error: any) {
                toast.error(error.message || 'Errore durante la creazione della sezione')
            } finally {
                setPaletteOpen(false)
            }
        }
    }

    return (
        !isOpen ?
            (<AddButton onClick={handleOpen} />)
            : (
                <form
                    ref={formRef}
                    onSubmit={handleSubmit}
                    className="flex flex-col items-center justify-center border"
                >
                    <div className="flex items-center justify-center w-full">
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
                                onClick={(e) => { e.preventDefault(); setPaletteOpen(false); setSection({ ...section, color: defaultSection.color }) }}
                                className="group/close cursor-pointer flex items-center justify-center w-full h-8 bg-secondary"
                            >
                                <X size={20} className="group-hover:text-foreground group-hover/close:text-foreground text-muted-foreground" />
                            </div>
                        </div>}
                    <div className="flex items-center w-full border-t bg-secondary">
                        <PlusButton disabled={!section.name.trim()} onClick={() => handleSubmit} />
                        <CloseButton onClick={handleOpen} />
                    </div>
                </form>
            )
    )
}