import { useTranslation } from "react-i18next"
import { lazy, useState } from "react"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LazyMount } from "@/components/lazy-mount"

const DialogTrashWorkspaces = lazy(() => import("@/components/dialogs/dialog-trash").then(m => ({ default: m.DialogTrashWorkspaces })))

export const ButtonTrashWorkspaces = () => {
    const { t } = useTranslation()
    const [isOpen, setIsOpen] = useState(false)

    return (
        <>
            <Button variant="outline" onClick={() => setIsOpen(true)}>
                <Trash2 /> {t("trash.title")}
            </Button>
            <LazyMount active={isOpen}>
                <DialogTrashWorkspaces isOpen={isOpen} onOpenChange={setIsOpen} />
            </LazyMount>
        </>
    )
}
