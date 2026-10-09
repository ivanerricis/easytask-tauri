import { useTranslation } from "react-i18next"
import { Input } from "@/components/ui/input"
import { useWorkspaceActions } from "@/contexts/workspace-data"
import { useActiveNoteId } from "@/contexts/use-tabs"
import { useActiveNoteActions } from "@/contexts/use-active-note"
import { useUndoRecorder } from "@/contexts/undo/use-undo"
import { useState, useRef, useEffect, useCallback } from "react"
import type { FormEvent, KeyboardEvent } from "react"
import { toast } from "sonner"
import { reportError } from "@/lib/report-error"
import { getErrorMessage } from "@/lib/utils"
import { AddButton } from "./AddButton"
import { useShortcut } from "@/hooks/use-shortcut"
import { useSubmitOnce } from "@/hooks/use-submit-once"

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
    const { saving, run } = useSubmitOnce()

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

    // Escape closes the form and discards the text, like a click outside
    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key !== "Escape") return
        e.preventDefault()
        e.stopPropagation()
        setOpen(false)
        setName("")
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        await run(async () => {
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
                reportError(error, getErrorMessage(error) || (inGroup ? t("errors.createSection") : t("errors.createGroup")))
            }
        })
    }

    return !isOpen ? (
        <AddButton onClick={handleOpen} inGroup={inGroup} />
    ) : (
        <form
            ref={formRef}
            onSubmit={handleSubmit}
            className={`flex items-center bg-background border ${inGroup ? 'w-full' : 'w-fit'}`}
        >
            <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={inGroup ? t("sections.titlePlaceholder") : t("groups.namePlaceholder")}
                    aria-label={inGroup ? t("sections.titleLabel") : t("groups.nameLabel")}
                    autoFocus
                    readOnly={saving}
                    className={`rounded-none border-none text-sm ${inGroup ? 'flex-1' : 'w-fit'}`}
                />
        </form>
    )
}