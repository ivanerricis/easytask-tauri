import { useTranslation } from "react-i18next"

/**
 * Visual state of a selected row: a tint over the row (so it works with any item color and size) and a dashed outline, so
 * the state does not rest on color alone; the screen readers get a text instead. The parent must be `relative`.
 */
export const SelectionMark = ({ selected }: { selected: boolean }) => {
    const { t } = useTranslation()
    if (!selected) return null
    return (
        <>
            <span aria-hidden="true" data-testid="selection-mark" className="pointer-events-none absolute inset-0 border border-dashed border-primary bg-primary/25" />
            <span className="sr-only">{t("common.selected")}</span>
        </>
    )
}
