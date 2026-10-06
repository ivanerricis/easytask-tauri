import { useId } from "react"
import { useTranslation } from "react-i18next"
import { Palette, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

/** The color proposed when the user chooses to add one. */
export const DEFAULT_NEW_COLOR = "#ffb375"

type OptionalColorFieldProps = {
    /** The chosen color; undefined while no color is wanted. */
    value: string | undefined
    onChange: (color: string | undefined) => void
}

/** "Add color" button that turns into a color picker with a remove button (creation dialogs). */
export const OptionalColorField = ({ value, onChange }: OptionalColorFieldProps) => {
    const { t } = useTranslation()
    const colorId = useId()

    if (value === undefined) {
        return (
            <Button
                type="button"
                variant={"outline"}
                onClick={(e) => {
                    e.preventDefault()
                    onChange(DEFAULT_NEW_COLOR)
                }}
                className="h-full">
                <Palette />
                {t("common.addColor")}
            </Button>
        )
    }

    return (
        <div className="flex items-center justify-between gap-1">
            <div
                className="flex items-center justify-center h-full w-full border rounded-xs"
                style={{ backgroundColor: value }}
            >
                <Input
                    id={colorId}
                    name="color"
                    type="color"
                    className="opacity-0 cursor-pointer"
                    value={value}
                    onChange={e => onChange(e.target.value)}
                />
            </div>
            <Button
                type="button"
                onClick={(e) => {
                    e.preventDefault()
                    onChange(undefined)
                }}
                variant={"buttonIcon"}
                aria-label={t("common.closePalette")}
                className="h-full"
            >
                <X />
            </Button>
        </div>
    )
}
