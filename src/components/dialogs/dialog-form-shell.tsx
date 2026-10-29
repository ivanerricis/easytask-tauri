import type { ReactNode } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

type DialogFormShellProps = {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    title: ReactNode
    description: ReactNode
    /** The form; mounted only while the dialog is open, so its fields always start from their defaults. */
    children: ReactNode
}

/**
 * Dialog with title, description and a form, opened from a menu or a list: clicks inside do not reach the element that
 * contains the dialog in the React tree (e.g. the row that opened it).
 */
export const DialogFormShell = ({ isOpen, onOpenChange, title, description, children }: DialogFormShellProps) => (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent onClick={e => e.stopPropagation()}>
            <DialogHeader>
                <DialogTitle>{title}</DialogTitle>
                <DialogDescription>{description}</DialogDescription>
            </DialogHeader>
            {children}
        </DialogContent>
    </Dialog>
)
