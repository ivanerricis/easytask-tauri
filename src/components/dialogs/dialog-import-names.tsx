import { useId, useState, type FormEvent } from "react"
import { useTranslation } from "react-i18next"
import { Briefcase, Download, FileText, Folder, Loader2, type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { FormError } from "@/components/form-error"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useSubmitOnce } from "@/hooks/use-submit-once"
import { getErrorMessage } from "@/lib/utils"
import type { ImportName } from "@/lib/workspace-transfer"

const ICONS: Record<ImportName["type"], LucideIcon> = { workspace: Briefcase, folder: Folder, note: FileText }

type DialogImportNamesProps = {
    /** What the import creates at the top, with the proposed (free) names. */
    proposed: ImportName[]
    /** Imports with the chosen names; a rejection (e.g. a name already taken) is shown and the dialog stays open. */
    onSubmit: (names: string[]) => Promise<void>
    onCancel: () => void
}

/**
 * Shows the names an import is about to create, editable, before anything is written.
 * @category Dialogs
 */
export const DialogImportNames = ({ proposed, onSubmit, onCancel }: DialogImportNamesProps) => {
    const { t } = useTranslation()
    const baseId = useId()
    const [names, setNames] = useState(() => proposed.map(item => item.name))
    const [error, setError] = useState<string | null>(null)
    const { saving, run } = useSubmitOnce()
    const blank = names.some(name => !name.trim())

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault()
        if (blank) return
        void run(async () => {
            setError(null)
            try {
                await onSubmit(names)
            } catch (err) {
                setError(getErrorMessage(err))
            }
        })
    }

    return (
        <Dialog open onOpenChange={open => { if (!open && !saving) onCancel() }}>
            <DialogContent className="sm:max-w-md">
                <form onSubmit={handleSubmit} className="grid gap-4">
                    <DialogHeader>
                        <DialogTitle>{t("transfer.namesTitle")}</DialogTitle>
                        <DialogDescription>{t("transfer.namesDescription")}</DialogDescription>
                    </DialogHeader>
                    {/* A long list (many top items) scrolls inside the dialog */}
                    <div className="grid gap-3 max-h-[50vh] overflow-y-auto -mx-1 px-1 py-1">
                        {proposed.map((item, index) => {
                            const Icon = ICONS[item.type]
                            const id = `${baseId}-${index}`
                            return (
                                <div key={id} className="grid gap-1.5">
                                    <Label htmlFor={id} className="flex items-center gap-2">
                                        <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                                        {t(`transfer.names.${item.type}`)}
                                    </Label>
                                    <Input
                                        id={id}
                                        value={names[index]}
                                        autoFocus={index === 0}
                                        onFocus={e => { if (index === 0) e.currentTarget.select() }}
                                        readOnly={saving}
                                        aria-invalid={!names[index].trim() || undefined}
                                        onChange={e => {
                                            const value = e.target.value
                                            setError(null)
                                            setNames(current => current.map((name, i) => i === index ? value : name))
                                        }}
                                    />
                                </div>
                            )
                        })}
                    </div>
                    <FormError>{error ?? (blank ? t("errors.transfer.nameEmpty") : null)}</FormError>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>{t("common.cancel")}</Button>
                        <Button type="submit" disabled={saving || blank}>
                            {saving ? <Loader2 className="animate-spin" /> : <Download />}
                            {t("transfer.importAction")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
