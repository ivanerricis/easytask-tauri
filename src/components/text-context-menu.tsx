import { useCallback, useEffect, useRef, useState } from "react"
import { readText, writeText } from "@tauri-apps/plugin-clipboard-manager"
import { ClipboardPaste, Copy, Scissors, TextSelect } from "lucide-react"

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
    start: number
    end: number
    range: Range | null
    text: string
}

/** Custom Italian context menu (Taglia/Copia/Incolla/Seleziona tutto) for editable text fields. */
export function TextContextMenu() {
    const [open, setOpen] = useState(false)
    const [position, setPosition] = useState({ x: 0, y: 0 })
    const [canPaste, setCanPaste] = useState(false)
    const [hasSelection, setHasSelection] = useState(false)
    const session = useRef<Session | null>(null)

    useEffect(() => {
        const handler = (event: MouseEvent) => {
            const element = getEditableTarget(event.target)
            if (!element) return
            event.preventDefault()

            let start = 0
            let end = 0
            let range: Range | null = null
            let text = ""
            if (isField(element)) {
                start = element.selectionStart ?? 0
                end = element.selectionEnd ?? 0
                text = element.value.slice(start, end)
            } else {
                const selection = window.getSelection()
                if (selection && selection.rangeCount > 0 && element.contains(selection.anchorNode)) {
                    range = selection.getRangeAt(0).cloneRange()
                    text = selection.toString()
                }
            }
            session.current = { element, start, end, range, text }
            setHasSelection(text.length > 0)
            setPosition({ x: event.clientX, y: event.clientY })
            setCanPaste(false)
            setOpen(true)
            readText().then((clip) => setCanPaste(Boolean(clip)), () => setCanPaste(false))
        }
        window.addEventListener("contextmenu", handler)
        return () => window.removeEventListener("contextmenu", handler)
    }, [])

    const restoreFocus = useCallback(() => {
        const current = session.current
        if (!current) return
        current.element.focus()
        if (isField(current.element)) {
            current.element.setSelectionRange(current.start, current.end)
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
        if (isField(current.element)) {
            current.element.setRangeText(text, current.start, current.end, "end")
            current.element.dispatchEvent(new Event("input", { bubbles: true }))
        } else if (text) {
            document.execCommand("insertText", false, text)
        } else {
            document.execCommand("delete")
        }
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
        const text = await readText().catch(() => "")
        if (text) replaceSelection(text)
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
                <DropdownMenuItem disabled={!hasSelection} onSelect={() => void cut()}>
                    <Scissors /> Taglia <DropdownMenuShortcut>Ctrl+X</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem disabled={!hasSelection} onSelect={() => void copy()}>
                    <Copy /> Copia <DropdownMenuShortcut>Ctrl+C</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem disabled={!canPaste} onSelect={() => void paste()}>
                    <ClipboardPaste /> Incolla <DropdownMenuShortcut>Ctrl+V</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={selectAll}>
                    <TextSelect /> Seleziona tutto <DropdownMenuShortcut>Ctrl+A</DropdownMenuShortcut>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
