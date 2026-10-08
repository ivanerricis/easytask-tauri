import { useTranslation } from "react-i18next"
import { Fragment } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { KbdKeys } from "@/components/kbd"
import { Separator } from "@/components/ui/separator"
import { SHORTCUTS, SHORTCUT_CATEGORIES, categoryLabel, formatBinding, keyLabel, shortcutDescription, type Binding, type ShortcutKey } from "@/lib/shortcuts"
import { useShortcutsContext } from "@/contexts/use-shortcuts"

const shortcutKeys = (id: string, docKeys: ShortcutKey[] | undefined, getBinding: (id: string) => Binding | undefined) => {
    const binding = getBinding(id)
    return binding ? formatBinding(binding) : (docKeys ?? []).map(key => keyLabel(key))
}

type DialogShortcutsContentProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
}

/** The shortcuts dialog itself; loaded on demand by DialogShortcuts */
export const DialogShortcutsContent = ({ open, onOpenChange }: DialogShortcutsContentProps) => {
    const { t } = useTranslation()
    const { getBinding } = useShortcutsContext()

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[80vh] grid-rows-[auto_1fr] overflow-hidden">
                <DialogHeader>
                    <DialogTitle>{t("dialogs.shortcuts.title")}</DialogTitle>
                    <DialogDescription>{t("dialogs.shortcuts.description")}</DialogDescription>
                </DialogHeader>
                <div className="flex min-h-0 flex-col gap-4 overflow-y-auto pr-1">
                    {SHORTCUT_CATEGORIES.map((category, index) => (
                        <Fragment key={category}>
                            {index > 0 && <Separator />}
                            <section aria-label={categoryLabel(category)}>
                                <h3 className="mb-2 text-sm font-semibold">{categoryLabel(category)}</h3>
                                <ul className="flex flex-col gap-2">
                                    {SHORTCUTS.filter(s => s.category === category).map(s => (
                                        <li key={s.id} className="flex items-center justify-between gap-4 text-sm">
                                            <span>{shortcutDescription(s.id)}</span>
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
