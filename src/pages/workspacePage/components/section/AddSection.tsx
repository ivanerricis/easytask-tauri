import { Input } from "@/components/ui/input"
import { useWorkspaceData } from "@/contexts/workspace-data-context"
import { useState, useRef, useEffect } from "react"
import type { FormEvent } from "react"
import { toast } from "sonner"
import { CloseButton } from "./CloseButton"
import { PlusButton } from "./PlusButton"
import { AddButton } from "./AddButton"

type AddSectionFormProps = {
    inGroup?: boolean
    groupId?: number
}

export const AddSection = ({ inGroup, groupId }: AddSectionFormProps) => {
    const [isOpen, setOpen] = useState(false)
    const [name, setName] = useState("")
    const { createSection, createSectionInGroup, currentNote, getNoteData } = useWorkspaceData()
    const formRef = useRef<HTMLFormElement>(null)

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (!inGroup && event.altKey && event.key.toLowerCase() === 'n') {
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
        if (!inGroup) {
            document.addEventListener("keydown", handleKeyDown)
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside)
            if (!inGroup) {
                document.removeEventListener("keydown", handleKeyDown)
            }
        }
    }, [inGroup])

    const handleOpen = () => {
        setOpen(prev => !prev)
        setName("")
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        if (!name.trim()) return

        try {
            if (!currentNote) return

            if (inGroup) {
                if (!groupId) {
                    toast.error("ID gruppo mancante")
                    return
                }
                await createSectionInGroup(groupId, name.trim())
            } else {
                await createSection(currentNote.id, name.trim(), 1)
            }

            handleOpen()
            await getNoteData(currentNote.id)
        } catch (error: any) {
            toast.error(error?.message || "Errore nella creazione della sezione")
        }
    }

    return !isOpen ? (
        <AddButton onClick={handleOpen} />
    ) : (
        <form
            ref={formRef}
            onSubmit={handleSubmit}
            className="flex flex-col items-center justify-center border"
        >
            <div className="flex items-center justify-center w-full">
                <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Scrivi qualcosa..."
                    autoFocus
                    className="rounded-none border-none !bg-background"
                />
            </div>
            <div className="flex items-center w-full border-t bg-secondary divide-x">
                <PlusButton disabled={!name.trim()} onClick={() => handleSubmit} />
                <CloseButton onClick={handleOpen} />
            </div>
        </form>
    )
}