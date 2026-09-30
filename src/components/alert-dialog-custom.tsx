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
import { buttonVariants } from "./ui/button"

type AlertDialogCustomProps = {
    onDelete: () => void
    children: React.ReactNode
}

export const AlertDialogCustom = ({ onDelete, children }: AlertDialogCustomProps) => {
    return (
        <>
            <AlertDialog>
                <AlertDialogTrigger>
                    {children}
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Sei sicuro di voler procedere?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Questa azione non può essere annullata.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annulla</AlertDialogCancel>
                        <AlertDialogAction className={buttonVariants({ variant: "destructive" })} onClick={onDelete}>
                            Elimina
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}