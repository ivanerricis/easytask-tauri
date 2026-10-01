import { useTranslation } from "react-i18next"
import { Input } from "@/components/ui/input"
import { useWorkspaceActions } from "@/contexts/workspace-data"
import { useActiveNoteId } from "@/contexts/use-tabs"
import { useActiveNoteActions } from "@/contexts/use-active-note"
import { useUndoRecorder } from "@/contexts/undo/use-undo"
import { useState, useRef, useEffect, useCallback } from "react"
import type { FormEvent } from "react"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/utils"
import { CloseButton } from "./CloseButton"
import { PlusButton } from "./PlusButton"
import { AddButton } from "./AddButton"
import { useShortcut } from "@/hooks/use-shortcut"

type AddSectionFormProps = {
    inGroup?: boolean
    groupId?: number
}

export const AddSection = ({ inGroup, groupId }: AddSectionFormProps) => {
    const { t } = useTranslation()
    const [isOpen, setOpen] = useState(false)
    const [name, setName] = useState("")
    const { createGroup, createSectionInGroup } = useWorkspaceActions()
    const activeId = useActiveNoteId()
    const { appendGroup, appendSection } = useActiveNoteActions()
    const recorder = useUndoRecorder()
    const formRef = useRef<HTMLFormElement>(null)

    const handleOpen = useCallback(() => {
        setOpen(prev => !prev)
        setName("")
    }, [])

    useShortcut("new-group", handleOpen, { enabled: !inGroup, allowInInputs: true })

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (formRef.current && !formRef.current.contains(event.target as Node)) {
                setOpen(false)
                setName("")
            }
        }

        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        // A section needs a title, a group may stay unnamed ("Gruppo N")
        if (inGroup && !name.trim()) return

        try {
            if (activeId === null) return

            if (inGroup) {
                if (!groupId) {
                    toast.error(t("errors.missingGroupId"))
                    return
                }
                const id = await createSectionInGroup(groupId, name.trim())
                appendSection(id, groupId, name.trim())
                recorder.create("section", id, name.trim())
            } else {
                const id = await createGroup(activeId, name.trim())
                appendGroup(id, activeId, name.trim())
                recorder.create("section_group", id, name.trim())
            }

            handleOpen()
        } catch (error) {
            toast.error(getErrorMessage(error) || (inGroup ? t("errors.createSection") : t("errors.createGroup")))
        }
    }

    return !isOpen ? (
        <AddButton onClick={handleOpen} inGroup={inGroup} />
    ) : (
        <form
            ref={formRef}
            onSubmit={handleSubmit}
            className={`flex flex-col items-center justify-center border border-1 ${inGroup ? 'w-full' : 'w-fit'}`}
        >
            <div className="flex items-center justify-center w-full">
                <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={inGroup ? t("sections.titlePlaceholder") : t("groups.namePlaceholder")}
                    aria-label={inGroup ? t("sections.titleLabel") : t("groups.nameLabel")}
                    autoFocus
                    className={`rounded-none border-none !bg-background text-sm ${inGroup ? 'w-full' : 'w-fit'}`}
                />
            </div>
            <div className="flex items-center w-full border-t bg-secondary divide-x">
                <PlusButton disabled={!!inGroup && !name.trim()} />
                <CloseButton onClick={handleOpen} />
            </div>
        </form>
    )
}