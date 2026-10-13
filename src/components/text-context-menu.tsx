import { useTranslation } from "react-i18next"
import { useCallback, useEffect, useRef, useState } from "react"
import { readText, writeText } from "@tauri-apps/plugin-clipboard-manager"
import { ClipboardPaste, Copy, Redo2, Scissors, TextSelect, Undo2 } from "lucide-react"
import { toast } from "sonner"

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuShortcut,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getEditableTarget } from "@/lib/editable-target"

type Field = HTMLInputElement | HTMLTextAreaElement

const isField = (element: HTMLElement): element is Field =>
    element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement

interface Session {
    element: HTMLElement
    // Null when the field has no selection API (number, email): the selection is neither saved nor restored
    start: number | null
    end: number | null
    range: Range | null
    text: string
    readOnly: boolean
}

// Runs a document command on the focused field; false when unsupported (jsdom) or refused.
const exec = (command: string, value?: string) =>
    typeof document.execCommand === "function" && document.execCommand(command, false, value)

/** Custom localized context menu (Taglia/Copia/Incolla/Seleziona tutto) for editable text fields. */
export function TextContextMenu() {
    const { t } = useTranslation()
    const [open, setOpen] = useState(false)
    const [position, setPosition] = useState({ x: 0, y: 0 })
    const [canPaste, setCanPaste] = useState(true)
    const [readOnly, setReadOnly] = useState(false)
    const [hasSelection, setHasSelection] = useState(false)
    const session = useRef<Session | null>(null)

    useEffect(() => {
        let frame = 0
        const handler = (event: MouseEvent) => {
            const element = getEditableTarget(event.target)
            if (!element) return
            event.preventDefault()

            let start: number | null = null
            let end: number | null = null
            let range: Range | null = null
            let text = ""
            if (isField(element)) {
                // Null on number/email inputs, where the selection cannot be read
                start = element.selectionStart
                end = element.selectionEnd
                if (start !== null && end !== null) text = element.value.slice(start, end)
            } else {
                const selection = window.getSelection()
                if (selection && selection.rangeCount > 0 && element.contains(selection.anchorNode)) {
                    range = selection.getRangeAt(0).cloneRange()
                    text = selection.toString()
                }
            }
            const isReadOnly = isField(element) && element.readOnly
            session.current = { element, start, end, range, text, readOnly: isReadOnly }
            setHasSelection(text.length > 0)
            setReadOnly(isReadOnly)
            setPosition({ x: event.clientX, y: event.clientY })
            // Paste stays enabled while the clipboard is read (no flicker); only an empty clipboard disables it
            setCanPaste(true)
            // The anchor must have its new left/top before the menu is placed, so the menu opens one frame later
            cancelAnimationFrame(frame)
            frame = requestAnimationFrame(() => setOpen(true))
            if (!isReadOnly) readText().then((clip) => setCanPaste(Boolean(clip)), () => {})
        }
        window.addEventListener("contextmenu", handler)
        return () => {
            cancelAnimationFrame(frame)
            window.removeEventListener("contextmenu", handler)
        }
    }, [])

    const restoreFocus = useCallback(() => {
        const current = session.current
        if (!current) return
        current.element.focus()
        if (isField(current.element)) {
            if (current.start === null || current.end === null) return
            try {
                current.element.setSelectionRange(current.start, current.end)
            } catch {
                // Some input types refuse a selection
            }
        } else if (current.range) {
            const selection = window.getSelection()
            selection?.removeAllRanges()
            selection?.addRange(current.range)
        }
    }, [])

    // Replaces the saved selection with `text` and notifies React (controlled inputs listen to `input`).
    const replaceSelection = (text: string) => {
        const current = session.current
        if (!current) return
        restoreFocus()
        // execCommand keeps the native undo stack (Ctrl+Z undoes a menu cut/paste) and fires the input event
        if (text ? exec("insertText", text) : exec("delete")) return
        const element = current.element
        if (isField(element) && current.start !== null && current.end !== null) {
            element.setRangeText(text, current.start, current.end, "end")
            element.dispatchEvent(new Event("input", { bubbles: true }))
        }
    }

    const history = (command: "undo" | "redo") => {
        restoreFocus()
        exec(command)
    }

    const copy = async () => {
        const text = session.current?.text
        if (text) await writeText(text)
    }

    const cut = async () => {
        await copy()
        replaceSelection("")
    }

    const paste = async () => {
        try {
            const text = await readText()
            if (text) replaceSelection(text)
        } catch {
            toast.error(t("textMenu.clipboardError"))
        }
    }

    const selectAll = () => {
        const current = session.current
        if (!current) return
        current.element.focus()
        if (isField(current.element)) {
            current.element.select()
        } else {
            const selection = window.getSelection()
            const range = document.createRange()
            range.selectNodeContents(current.element)
            selection?.removeAllRanges()
            selection?.addRange(range)
        }
    }

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
                <span
                    aria-hidden
                    className="pointer-events-none fixed size-0"
                    style={{ left: position.x, top: position.y }}
                />
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="start"
                sideOffset={0}
                className="w-52"
                onCloseAutoFocus={(event) => {
                    event.preventDefault()
                    restoreFocus()
                }}
            >
                {!readOnly && (
                    <>
                        <DropdownMenuItem onSelect={() => history("undo")}>
                            <Undo2 /> {t("textMenu.undo")} <DropdownMenuShortcut>Ctrl+Z</DropdownMenuShortcut>
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => history("redo")}>
                            <Redo2 /> {t("textMenu.redo")} <DropdownMenuShortcut>Ctrl+Y</DropdownMenuShortcut>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem disabled={!hasSelection} onSelect={() => void cut()}>
                            <Scissors /> {t("textMenu.cut")} <DropdownMenuShortcut>Ctrl+X</DropdownMenuShortcut>
                        </DropdownMenuItem>
                    </>
                )}
                <DropdownMenuItem disabled={!hasSelection} onSelect={() => void copy()}>
                    <Copy /> {t("textMenu.copy")} <DropdownMenuShortcut>Ctrl+C</DropdownMenuShortcut>
                </DropdownMenuItem>
                {!readOnly && (
                    <DropdownMenuItem disabled={!canPaste} onSelect={() => void paste()}>
                        <ClipboardPaste /> {t("textMenu.paste")} <DropdownMenuShortcut>Ctrl+V</DropdownMenuShortcut>
                    </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={selectAll}>
                    <TextSelect /> {t("textMenu.selectAll")} <DropdownMenuShortcut>Ctrl+A</DropdownMenuShortcut>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
