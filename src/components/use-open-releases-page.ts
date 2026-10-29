import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { openReleasesPage } from "@/lib/updater"
import { getErrorMessage } from "@/lib/utils"

/** Returns the function that opens the Releases page in the browser; if it cannot be opened an error toast says why. */
export function useOpenReleasesPage() {
    const { t } = useTranslation()
    return async () => {
        try {
            await openReleasesPage()
        } catch (error) {
            toast.error(t("settings.about.openError", { message: getErrorMessage(error) }))
        }
    }
}
