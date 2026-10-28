import { useRef, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { Loader2, type LucideIcon } from "lucide-react"
import { useSubmitOnce } from "@/hooks/use-submit-once"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

/** An action of a confirmation: its label, an icon and what it does. */
export type ConfirmAction = {
    label: string
    icon?: LucideIcon
    onClick: () => void | Promise<void>
}

type ConfirmDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    title: ReactNode
    description?: ReactNode
    /** Extra content under the description (e.g. the path of a file). */
    children?: ReactNode
    /**
     * The action loses data (moves to the trash, deletes, overwrites, restores a backup): the title and the confirm
     * button are red. Leave it off for the resets of the settings.
     */
    destructive?: boolean
    /**
     * With `destructive`: the action cannot be undone (empty the trash, delete for good, restore a backup): the confirm
     * button is solid red instead of the soft red outline. Moving to the trash stays soft.
     */
    irreversible?: boolean
    /** The main action, on the right. */
    confirm: ConfirmAction
    /** A second action between "Annulla" and the main one (red when `secondaryDestructive`). */
    secondary?: ConfirmAction
    secondaryDestructive?: boolean
    /** Closes the dialog when an action is chosen (default). Turn it off when the action closes the dialog itself (e.g. after a write that can fail). */
    autoClose?: boolean
    /**
     * Where the focus goes when the dialog opens, so that Enter does what the user expects. The main action by default;
     * use "cancel" for what cannot be undone (permanent delete, restoring a backup, overwriting).
     */
    initialFocus?: "confirm" | "cancel"
    /** Id of an element (e.g. an inline error among the children) that the main button points to with aria-describedby. */
    confirmDescribedBy?: string
}

/**
 * The confirmation dialog of the app: a `Dialog` with its close button, "Annulla" (outline) on the left and the
 * main action on the right, with an icon. Enter confirms (the focus starts on the main action unless `initialFocus="cancel"`). Used for every "are you sure?" so they all look the same.
 * @category Dialogs
 */
export const ConfirmDialog = ({
    open, onOpenChange, title, description, children, destructive = false, irreversible = false, confirm, secondary, secondaryDestructive = false, autoClose = true, initialFocus = "confirm", confirmDescribedBy,
}: ConfirmDialogProps) => {
    const { t } = useTranslation()
    const confirmRef = useRef<HTMLButtonElement>(null)
    // A second Enter/click while the action is still running does nothing (a delete must not be sent twice)
    const { saving, run: runOnce } = useSubmitOnce()
    const [pending, setPending] = useState<ConfirmAction | null>(null)

    // The dialog is in a portal but React events still bubble to the parents (a row, a menu): keep them out
    const run = (action: ConfirmAction) => (e?: MouseEvent | KeyboardEvent) => {
        e?.stopPropagation()
        void runOnce(async () => {
            setPending(action)
            try {
                if (autoClose) onOpenChange(false)
                await action.onClick()
            } finally { setPending(null) }
        })
    }

    const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
        // Enter on a button presses that button; anywhere else it confirms (unless the focus started on "Annulla": a careless Enter must not confirm)
        if (e.key === "Enter" && initialFocus === "confirm" && !(e.target instanceof HTMLButtonElement)) {
            e.preventDefault()
            run(confirm)(e)
        }
    }

    const ConfirmIcon = confirm.icon
    const SecondaryIcon = secondary?.icon

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                onKeyDown={handleKeyDown}
                onOpenAutoFocus={e => {
                    if (initialFocus !== "confirm") return
                    e.preventDefault()
                    confirmRef.current?.focus()
                }}
            >
                <DialogHeader>
                    <DialogTitle className={destructive ? "text-destructive" : undefined}>{title}</DialogTitle>
                    {description && <DialogDescription>{description}</DialogDescription>}
                    {children}
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={e => { e.stopPropagation(); onOpenChange(false) }}>
                        {t("common.cancel")}
                    </Button>
                    {secondary && (
                        <Button variant={secondaryDestructive ? "destructive" : "outline"} onClick={run(secondary)} disabled={saving}>
                            {pending === secondary ? <Loader2 className="animate-spin motion-reduce:animate-none" /> : SecondaryIcon && <SecondaryIcon />}
                            {secondary.label}
                        </Button>
                    )}
                    <Button ref={confirmRef} variant={destructive ? (irreversible ? "destructiveSolid" : "destructive") : "default"} onClick={run(confirm)} disabled={saving} aria-describedby={confirmDescribedBy}>
                        {pending === confirm ? <Loader2 className="animate-spin motion-reduce:animate-none" /> : ConfirmIcon && <ConfirmIcon />}
                        {confirm.label}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
