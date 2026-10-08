import { useTranslation } from "react-i18next"
import { useWorkspace } from "@/contexts/use-workspace"
import { Button } from "../ui/button"
import { AlertCircle, ArrowLeft, Copy, RotateCcw } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "../ui/alert"
import { writeText } from "@tauri-apps/plugin-clipboard-manager"
import { toast } from "sonner"
import { reportError } from "@/lib/report-error"
import { useNavigate } from "react-router-dom"
import { useWorkspaceData } from "@/contexts/workspace-data"

type ErrorPageProps = {
    error: string | null
    /** When given, a "Try again" button is shown (e.g. to reload the data that failed to load). */
    onRetry?: () => void
}

export const ErrorPage = ({ error, onRetry }: ErrorPageProps) => {
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
        <div className="flex flex-col items-center justify-center h-full gap-4 p-4">
            <Alert variant="destructive" className="max-w-md w-full break-words">
                <AlertCircle />
                <AlertTitle className="line-clamp-none">{t("errorPage.title")}</AlertTitle>
                <AlertDescription>
                    <p>{t("errorPage.description")}</p>
                    <p className="text-destructive">{error}</p>
                </AlertDescription>
            </Alert>
            <div className="flex gap-2">
                {onRetry && (
                    <Button variant="outline" onClick={onRetry}>
                        <RotateCcw />
                        {t("errorPage.retry")}
                    </Button>
                )}
                <Button variant="outline" onClick={handleClick}>
                    <ArrowLeft />
                    {t("errorPage.home")}
                </Button>
            </div>
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
        <div className="flex flex-col items-center justify-center h-full w-full gap-4 p-4">
            <Alert variant="destructive" className="max-w-md w-full break-words">
                <AlertCircle />
                <AlertTitle className="line-clamp-none">{t("errorPage.title")}</AlertTitle>
                <AlertDescription>
                    <p>{t("errorPage.description")}</p>
                    <p className="text-destructive">{error.message}</p>
                </AlertDescription>
            </Alert>
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