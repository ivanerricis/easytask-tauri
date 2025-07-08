import { Loader2 } from "lucide-react"

export const LoadingPage = () => {
    return (
        <div className="flex flex-col w-full h-full items-center justify-center gap-2">
            <p className="text-lg font-semibold">
                Caricamento del Workspace...
            </p>
            <Loader2 className="animate-spin" />
        </div>
    )
}