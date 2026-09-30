import { Input } from "@/components/ui/input"
import { TooltipCustom } from "@/components/tooltip-custom"
import { useWorkspaceActions } from "@/contexts/workspace-data-context"
import { useActiveNoteActions } from "@/contexts/active-note-context"
import { cn, getErrorMessage } from "@/lib/utils"
import { Check, Loader2, Plus, X } from "lucide-react"
import { toast } from "sonner"
import { useState, useRef, useEffect } from "react"
import type { FormEvent } from "react"
import { PlusButton } from "../section/PlusButton"
import { CloseButton } from "../section/CloseButton"

type AddTaskProps = {
    /** Section of the new task; ignored for subtasks, which inherit the section of their parent. */
    sectionId: number | null
    /** When set, the input creates a subtask of this task and starts open (no "+" placeholder). */
    parentTaskId?: number
    /** Called when the input is dismissed (only meaningful with parentTaskId). */
    onClose?: () => void
}

/**
 * Inline "new subtask" row, laid out like a subtask row of Task.tsx (same padding, indent and font size).
 * - Enter adds and keeps the input open and focused for the next one.
 * - Escape or the X button closes it (discarding the text).
 * - Blur / click outside closes it only when empty: typed text is never lost silently.
 * While saving the input is read-only (not disabled, so it keeps focus) and further submits are ignored.
 */
const SubtaskInput = ({ parentTaskId, onClose }: { parentTaskId: number, onClose?: () => void }) => {
    const [text, setText] = useState("")
    const [saving, setSaving] = useState(false)
    const [focused, setFocused] = useState(true)
    const { createSubTask } = useWorkspaceActions()
    const { refreshActiveNote } = useActiveNoteActions()
    const inputRef = useRef<HTMLInputElement>(null)
    const savingRef = useRef(false)

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        const value = text.trim()
        if (!value || savingRef.current) return
        savingRef.current = true
        setSaving(true)
        try {
            await createSubTask(parentTaskId, value)
            setText("")
            await refreshActiveNote()
        } catch (error: unknown) {
            toast.error(getErrorMessage(error) || "Errore nella creazione del sottotask")
        } finally {
            savingRef.current = false
            setSaving(false)
            inputRef.current?.focus()
        }
    }

    return (
        <form onSubmit={handleSubmit} className="w-full border-b">
            <div className="flex items-start w-full px-1 py-1.5">
                <div className="flex items-start gap-2 ml-4 w-full">
                    {/* Inert placeholder in the exact spot (and look) of a real subtask checkbox */}
                    <span aria-hidden className="mt-0.5 size-4 shrink-0 rounded-[2px] border border-input opacity-50" />
                    <input
                        ref={inputRef}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Nuovo sottotask…"
                        aria-label="Nuovo sottotask"
                        autoFocus
                        autoComplete="off"
                        readOnly={saving}
                        aria-busy={saving}
                        onFocus={() => setFocused(true)}
                        onKeyDown={(e) => {
                            if (e.key === "Escape") { e.preventDefault(); onClose?.() }
                            else if (e.key === "Enter" && e.nativeEvent.isComposing) e.preventDefault()
                        }}
                        onBlur={() => {
                            setFocused(false)
                            if (!text.trim() && !savingRef.current) onClose?.()
                        }}
                        className={cn(
                            "flex-1 min-w-0 h-5 bg-transparent text-sm outline-none border-b border-transparent transition-colors",
                            "placeholder:text-muted-foreground focus:border-primary",
                            saving && "opacity-60"
                        )}
                    />
                    <div className="flex items-center gap-0.5 shrink-0">
                        <TooltipCustom text="Aggiungi" shortcut="Invio">
                            <button
                                type="submit"
                                aria-label="Aggiungi sottotask"
                                disabled={!text.trim() || saving}
                                className="p-0.5 rounded-xs cursor-pointer text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-40 disabled:pointer-events-none"
                            >
                                {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                            </button>
                        </TooltipCustom>
                        <TooltipCustom text="Chiudi" shortcut="Esc">
                            <button
                                type="button"
                                aria-label="Chiudi"
                                onClick={() => onClose?.()}
                                className="p-0.5 rounded-xs cursor-pointer text-muted-foreground hover:text-foreground hover:bg-accent"
                            >
                                <X className="size-4" />
                            </button>
                        </TooltipCustom>
                    </div>
                </div>
            </div>
            {focused && !text && (
                <p className="px-1 pb-1 ml-10 text-[11px] leading-none text-muted-foreground">
                    Invio per aggiungere · Esc per chiudere
                </p>
            )}
        </form>
    )
}

const TopLevelAddTask = ({ sectionId }: { sectionId: number | null }) => {
    const [isOpen, setOpen] = useState(false)
    const [text, setText] = useState("")
    const { createTask } = useWorkspaceActions()
    const { refreshActiveNote } = useActiveNoteActions()
    const formRef = useRef<HTMLFormElement>(null)

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (formRef.current && !formRef.current.contains(event.target as Node)) {
                setOpen(false)
                setText("")
            }
        }

        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const handleOpen = () => {
        setOpen(prev => !prev)
        setText("")
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        if (text.trim() && sectionId !== null) {
            try {
                await createTask(sectionId, text.trim())
                handleOpen()
                await refreshActiveNote()
            } catch (error: unknown) {
                toast.error(getErrorMessage(error) || "Errore nella creazione del task")
            }
        }
    }

    return (
        !isOpen ? (
            <div
                role="button"
                onClick={handleOpen}
                className="cursor-pointer group/add flex items-center justify-center w-full h-9"
            >
                <Plus className="group-hover/add:text-foreground text-muted-foreground size-5" />
            </div>
        ) : (
            <form
                ref={formRef}
                onSubmit={handleSubmit}
                className="flex flex-col items-center justify-center w-full"
            >
                <div className="flex items-center justify-center w-full bg-background">
                    <Input
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Scrivi qualcosa..."
                        autoFocus
                        className="rounded-none border-none text-sm"
                    />
                </div>
                <div className="flex items-center w-full border-t divide-x">
                    <PlusButton disabled={!text.trim()} />
                    <CloseButton onClick={handleOpen} />
                </div>
            </form>
        )
    )
}

export const AddTask = ({ sectionId, parentTaskId, onClose }: AddTaskProps) =>
    parentTaskId !== undefined
        ? <SubtaskInput parentTaskId={parentTaskId} onClose={onClose} />
        : <TopLevelAddTask sectionId={sectionId} />
