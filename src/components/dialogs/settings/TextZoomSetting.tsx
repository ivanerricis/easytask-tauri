import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Minus, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { usePreferences } from "@/contexts/use-preferences"
import { BASE_TEXT_PX, DEFAULT_TEXT_ZOOM, MAX_TEXT_PX, MIN_TEXT_PX, textPxFromZoom, textZoomFromPx } from "@/lib/store/preferences"
import { stepTextZoom } from "@/lib/text-zoom"
import { RowResetButton } from "./RowResetButton"
import { SettingsRow } from "./SettingsRow"

/** The size of the whole app (text, icons and spaces), set in px of text; also changed with Ctrl+Plus, Ctrl+Minus and Ctrl+0. */
export const TextZoomSetting = () => {
    const { t } = useTranslation()
    const { textZoom, setTextZoom } = usePreferences()
    const px = textPxFromZoom(textZoom)
    // While typing the field keeps the raw text; a valid size is applied at once, and the field shows the saved size again when it loses the focus
    const [draft, setDraft] = useState<string | null>(null)

    const change = (value: string) => {
        setDraft(value)
        const next = Number(value)
        if (value.trim() === "" || !Number.isFinite(next) || next < MIN_TEXT_PX || next > MAX_TEXT_PX) return
        setTextZoom(textZoomFromPx(next))
    }

    return (
        <SettingsRow
            label={t("settings.appearance.textZoom.label")}
            description={t("settings.appearance.textZoom.description")}
            reset={textZoom === DEFAULT_TEXT_ZOOM ? undefined : <RowResetButton label={t("settings.appearance.textZoom.reset")} onClick={() => setTextZoom(DEFAULT_TEXT_ZOOM)} />}
        >
            {({ id, descriptionId }) => (
                <div className="flex items-center gap-1">
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="size-8 [&_svg]:!h-4 [&_svg]:!w-4"
                        aria-label={t("settings.appearance.textZoom.decrease")}
                        disabled={px <= MIN_TEXT_PX}
                        onClick={() => { setDraft(null); setTextZoom(stepTextZoom(textZoom, -1)) }}
                    >
                        <Minus />
                    </Button>
                    <Input
                        id={id}
                        aria-describedby={descriptionId}
                        type="number"
                        className="h-8 w-16 text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        min={MIN_TEXT_PX}
                        max={MAX_TEXT_PX}
                        step={1}
                        placeholder={String(BASE_TEXT_PX)}
                        value={draft ?? String(px)}
                        onChange={event => change(event.target.value)}
                        onBlur={() => setDraft(null)}
                    />
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="size-8 [&_svg]:!h-4 [&_svg]:!w-4"
                        aria-label={t("settings.appearance.textZoom.increase")}
                        disabled={px >= MAX_TEXT_PX}
                        onClick={() => { setDraft(null); setTextZoom(stepTextZoom(textZoom, 1)) }}
                    >
                        <Plus />
                    </Button>
                    <span className="ml-1 text-xs text-muted-foreground">{t("settings.appearance.textZoom.unit")}</span>
                </div>
            )}
        </SettingsRow>
    )
}
