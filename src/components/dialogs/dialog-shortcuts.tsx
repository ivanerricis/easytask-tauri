import { Fragment, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { KbdKeys } from "@/components/kbd"
import { Separator } from "@/components/ui/separator"
import { SHORTCUTS, SHORTCUT_CATEGORIES, formatBinding, type Binding } from "@/lib/shortcuts"
import { useShortcut } from "@/hooks/use-shortcut"
import { useShortcutsContext } from "@/contexts/use-shortcuts"

const shortcutKeys = (id: string, docKeys: string[] | undefined, getBinding: (id: string) => Binding | undefined) => {
    const binding = getBinding(id)
    return binding ? formatBinding(binding) : docKeys ?? []
}

export const DialogShortcuts = () => {
    const [open, setOpen] = useState(false)

    const { getBinding } = useShortcutsContext()

    useShortcut("show-shortcuts", () => setOpen(true))

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Scorciatoie da tastiera</DialogTitle>
                    <DialogDescription>Le scorciatoie disponibili nell'app.</DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-4">
                    {SHORTCUT_CATEGORIES.map((category, index) => (
                        <Fragment key={category}>
                            {index > 0 && <Separator />}
                            <section aria-label={category}>
                                <h3 className="mb-2 text-sm font-semibold">{category}</h3>
                                <ul className="flex flex-col divide-y">
                                    {SHORTCUTS.filter(s => s.category === category).map(s => (
                                        <li key={s.id} className="flex items-center justify-between gap-4 py-1.5 text-sm first:pt-0 last:pb-0">
                                            <span>{s.description}</span>
                                            <KbdKeys keys={shortcutKeys(s.id, s.keys, getBinding)} className="shrink-0" />
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        </Fragment>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    )
}
