import { useTranslation } from "react-i18next"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger
} from "./ui/alert-dialog"
import { buttonVariants } from "./ui/button-variants"

type AlertDialogCustomProps = {
    onDelete: () => void
    children: React.ReactNode
}

export const AlertDialogCustom = ({ onDelete, children }: AlertDialogCustomProps) => {
    const { t } = useTranslation()
    return (
        <>
            <AlertDialog>
                <AlertDialogTrigger>
                    {children}
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("dialogs.confirm.title")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("dialogs.confirm.description")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                        <AlertDialogAction className={buttonVariants({ variant: "destructive" })} onClick={onDelete}>
                            {t("common.delete")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}