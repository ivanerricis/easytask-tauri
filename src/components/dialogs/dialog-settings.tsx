import { lazy, useState } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Settings } from "lucide-react"
import { TooltipCustom } from "@/components/tooltip-custom"
import { LazyMount } from "@/components/lazy-mount"

const DialogSettingsContent = lazy(() => import("./dialog-settings-content").then(m => ({ default: m.DialogSettingsContent })))

type DialogSettingsProps = {
    className?: string
}

export const DialogSettings = ({ className }: DialogSettingsProps) => {
    const { t } = useTranslation()
    const [isOpen, setIsOpen] = useState(false)

    return (
        <>
            <LazyMount active={isOpen}>
                <DialogSettingsContent isOpen={isOpen} onOpenChange={setIsOpen} />
            </LazyMount>

            <TooltipCustom text={t("settings.title")}>
                <Button
                    onClick={() => setIsOpen(true)}
                    variant="buttonIcon"
                    size="icon"
                    aria-label={t("settings.title")}
                    className={`absolute left-1 bottom-1 !hover:bg-accent ${className}`}
                >
                    <Settings />
                </Button>
            </TooltipCustom>
        </>
    )
}
