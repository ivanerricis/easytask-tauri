import { Input } from "@/components/ui/input"
import { useWorkspaceData } from "@/contexts/workspace-data-context"
import { useState, useRef, useEffect } from "react"
import type { FormEvent } from "react"
import { toast } from "sonner"
import { CloseButton } from "./CloseButton"
import { PlusButton } from "./PlusButton"
import { AddButton } from "./AddButton"

export const AddSection = () => {
    const [isOpen, setOpen] = useState(false)
    const [name, setName] = useState("")
    const { createSection, currentNote, getNoteData } = useWorkspaceData()
    const formRef = useRef<HTMLFormElement>(null)

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.altKey && event.key.toLowerCase() === 'n') {
                event.preventDefault()
                handleOpen()
            }
        }

        const handleClickOutside = (event: MouseEvent) => {
            if (formRef.current && !formRef.current.contains(event.target as Node)) {
                setOpen(false)
                setName("")
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
        setName("")
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        if (name.trim()) {
            try {
                if (!currentNote) return
                await createSection(currentNote.id, name.trim(), 1)
                handleOpen()
                if (!currentNote) return
                await getNoteData(currentNote.id)
            } catch (error: any) {
                toast.error(error || 'Errore nella creazione della sezione')
            }
        }
    }

    return (
        !isOpen ? (
            <AddButton onClick={handleOpen} />
        ) : (
            <form
                ref={formRef}
                onSubmit={handleSubmit}
                className="flex flex-col items-center justify-center border"
            >
                <div className="flex items-center justify-center w-full border-b">
                    <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Scrivi qualcosa..."
                        autoFocus
                        className="rounded-none border-none !bg-background"
                    />
                </div>
                <div className="flex items-center w-full border-t bg-secondary">
                    <PlusButton disabled={!name.trim()} onClick={() => handleSubmit} />
                    <CloseButton onClick={handleOpen} />
                </div>
            </form>
        )
    )
}