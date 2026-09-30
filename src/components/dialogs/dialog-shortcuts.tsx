import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { KbdKeys } from "@/components/kbd"
import { SHORTCUTS, SHORTCUT_CATEGORIES } from "@/lib/shortcuts"

const isEditable = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return false
    return target.closest("input, textarea, select, [contenteditable]:not([contenteditable='false'])") !== null
}

export const DialogShortcuts = () => {
    const [open, setOpen] = useState(false)

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key !== "?" || e.ctrlKey || e.metaKey || e.altKey) return
            if (isEditable(e.target)) return
            e.preventDefault()
            setOpen(true)
        }
        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
    }, [])

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Scorciatoie da tastiera</DialogTitle>
                    <DialogDescription>Le scorciatoie disponibili nell'app.</DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-4">
                    {SHORTCUT_CATEGORIES.map(category => (
                        <section key={category} aria-label={category}>
                            <h3 className="mb-2 text-sm font-semibold">{category}</h3>
                            <ul className="flex flex-col gap-1.5">
                                {SHORTCUTS.filter(s => s.category === category).map(s => (
                                    <li key={s.id} className="flex items-center justify-between gap-4 text-sm">
                                        <span>{s.description}</span>
                                        <KbdKeys keys={s.keys} className="shrink-0" />
                                    </li>
                                ))}
                            </ul>
                        </section>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    )
}
