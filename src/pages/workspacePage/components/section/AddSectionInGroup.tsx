import { Input } from "@/components/ui/input"
import { useWorkspaceData } from "@/contexts/workspace-data-context"
import { Palette, Plus, X } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import type { FormEvent } from "react"
import { toast } from "sonner"

type AddSectionInGroupProps = {
    groupId: number
}

export const AddSectionInGroup = ({ groupId }: AddSectionInGroupProps) => {
    const [isOpen, setOpen] = useState(false)
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
                toast.error(error.message || 'Errore durante la creazioen della sezione')
            }
        }
    }

    return (
        !isOpen ? (
            <div
                role="button"
                onClick={handleOpen}
                className="group cursor-pointer flex items-center justify-center border border-t-0 gap-1 p-2 bg-secondary"
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
                className="flex flex-col items-center justify-center border bg-background"
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
                        className="group/close cursor-pointer flex items-center justify-center w-full h-8 border-r"
                    >
                        <X size={20} className="group-hover/close:text-foreground text-muted-foreground transition-all" />
                    </div>
                    <div
                        role="button"
                        className="group/color cursor-pointer flex items-center justify-center w-full"
                    >
                        <Palette size={20} className="group-hover/color:text-foreground text-muted-foreground transition-all" />
                    </div>
                </div>
            </form>
        )
    )
}