import { useTranslation } from "react-i18next"
import { useWorkspace } from "@/contexts/use-workspace"
import { Button } from "../ui/button"
import { ArrowLeft, Copy, RotateCcw } from "lucide-react"
import { writeText } from "@tauri-apps/plugin-clipboard-manager"
import { toast } from "sonner"
import { reportError } from "@/lib/report-error"
import { useNavigate } from "react-router-dom"
import { useWorkspaceData } from "@/contexts/workspace-data"

type ErrorPageProps = {
    error: string | null
}

export const ErrorPage = ({ error }: ErrorPageProps) => {
    const { t } = useTranslation()
    const navigate = useNavigate()
    const { resetWorkspace } = useWorkspace()
    const { resetData } = useWorkspaceData()

    const handleClick = () => {
        resetWorkspace()
        resetData()
        navigate('/')
    }

    return (
        <div className="flex flex-col items-center justify-center h-full gap-4">
            <h1 className="font-bold text-lg">
                {t("errorPage.title")}
            </h1>
            <div className="flex flex-col rounded-xs border p-2 gap-1">
                <h2>
                    {t("errorPage.description")}
                </h2>
                <p className="text-destructive w-[300px] border rounded-xs p-2">{error}</p>
            </div>
            <Button variant="outline" onClick={handleClick}>
                <ArrowLeft />
                {t("errorPage.home")}
            </Button>
        </div>
    )
}

type CrashScreenProps = {
    error: Error
}

/** Router- and context-free error screen used by the ErrorBoundary (it may render outside every provider) */
export const CrashScreen = ({ error }: CrashScreenProps) => {
    const { t } = useTranslation()

    const handleCopy = async () => {
        const details = [`${error.name}: ${error.message}`, error.stack].filter(Boolean).join("\n")
        try {
            await writeText(details)
            toast.success(t("crash.copied"))
        } catch (e) {
            reportError(e, t("crash.copyFailed"))
        }
    }

    return (
        <div role="alert" className="flex flex-col items-center justify-center h-full w-full gap-4">
            <h1 className="font-bold text-lg">
                {t("errorPage.title")}
            </h1>
            <div className="flex flex-col rounded-xs border p-2 gap-1">
                <h2>
                    {t("errorPage.description")}
                </h2>
                <p className="text-destructive w-[300px] border rounded-xs p-2 break-words">{error.message}</p>
            </div>
            <div className="flex gap-2">
                <Button variant="outline" onClick={() => window.location.reload()}>
                    <RotateCcw />
                    {t("crash.reload")}
                </Button>
                <Button variant="outline" onClick={() => void handleCopy()}>
                    <Copy />
                    {t("crash.copyDetails")}
                </Button>
            </div>
        </div>
    )
}