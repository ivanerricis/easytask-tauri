import { Input } from "@/components/ui/input"
import { useWorkspaceData } from "@/contexts/workspace-data-context"
import { Palette, Plus, X } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import type { FormEvent } from "react"
import { toast } from "sonner"

export const AddSection = () => {
    const [isOpen, setOpen] = useState(false)
    const [inputValue, setInputValue] = useState("")
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
                setInputValue("")
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
        setInputValue("")
    }

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault()
        if (inputValue.trim()) {
            try {
                if (!currentNote) return
                createSection(currentNote.id, inputValue.trim(), "1")
                handleOpen()
                if (!currentNote) return
                getNoteData(currentNote.id)
            } catch (error: any) {
                toast.error(error || 'Errore nella creazione della sezione')
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
                <Plus size={20} className="group-hover:text-foreground text-muted-foreground transition-all" />
                <h1 className="text-muted-foreground group-hover:text-foreground w-full transition-all text-nowrap">
                    Aggiungi una sezione
                </h1>
            </div>
        ) : (
            <form
                ref={formRef}
                onSubmit={handleSubmit}
                className="flex flex-col items-center justify-center border bg-background"
            >
                <div className="flex items-center justify-center w-full border-b">
                    <Input
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Scrivi qualcosa..."
                        autoFocus
                        className="rounded-none border-none"
                    />
                </div>
                <div className="flex items-center w-full">
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