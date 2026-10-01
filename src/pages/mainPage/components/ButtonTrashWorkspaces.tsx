import { useTranslation } from "react-i18next"
import { useState } from "react"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DialogTrashWorkspaces } from "@/components/dialogs/dialog-trash"

export const ButtonTrashWorkspaces = () => {
    const { t } = useTranslation()
    const [isOpen, setIsOpen] = useState(false)

    return (
        <>
            <Button variant="outline" onClick={() => setIsOpen(true)}>
                <Trash2 /> {t("trash.title")}
            </Button>
            <DialogTrashWorkspaces isOpen={isOpen} onOpenChange={setIsOpen} />
        </>
    )
}
