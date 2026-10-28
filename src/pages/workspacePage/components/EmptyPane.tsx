import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { useLayoutActions } from "@/contexts/use-layout"
import type { PaneIndex } from "@/contexts/layout-reducer"
import { focusRing } from "@/lib/a11y"
import { cn } from "@/lib/utils"

/**
 * The placeholder of a pane of the split workspace that has no tabs: a hint on how to fill it and, for the right pane,
 * the button that closes the split.
 */
export const EmptyPane = ({ pane }: { pane: PaneIndex }) => {
    const { t } = useTranslation()
    const { unsplit } = useLayoutActions()
    return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-6 text-center">
            <h2 className="text-xl">{t("notes.split.emptyTitle")}</h2>
            <p className="max-w-sm text-sm text-muted-foreground">{t("notes.split.emptyHint")}</p>
            {pane === 1 && (
                <Button type="button" variant="outline" size="sm" className={cn(focusRing)} onClick={unsplit}>
                    {t("notes.split.close")}
                </Button>
            )}
        </div>
    )
}
