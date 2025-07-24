import { Input } from "@/components/ui/input"
import { useWorkspaceData } from "@/contexts/workspace-data-context"
import { useState, useRef, useEffect } from "react"
import type { FormEvent } from "react"
import { toast } from "sonner"
import { PlusButton } from "./PlusButton"
import { CloseButton } from "./CloseButton"
import { AddButton } from "./AddButton"

type AddSectionInGroupProps = {
    groupId: number
}

export const AddSectionInGroup = ({ groupId }: AddSectionInGroupProps) => {
    const [isOpen, setOpen] = useState(false)
    const [name, setName] = useState("")
    const { createSectionInGroup, currentNote, getNoteData } = useWorkspaceData()
    const formRef = useRef<HTMLFormElement>(null)

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (formRef.current && !formRef.current.contains(event.target as Node)) {
                setOpen(false)
                setName("")
            }
        }

        document.addEventListener("mousedown", handleClickOutside)

        return () => {
            document.removeEventListener("mousedown", handleClickOutside)
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
                await createSectionInGroup(groupId, name.trim())
                handleOpen()
                if (!currentNote) return
                await getNoteData(currentNote.id)
            } catch (error: any) {
                toast.error(error.message || 'Errore durante la creazione della sezione')
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