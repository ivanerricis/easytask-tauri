import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { SettingsNav } from "./settings/SettingsNav"
import { SETTINGS_CATEGORIES } from "./settings/categories"

type DialogSettingsContentProps = {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    /** Category to show when the dialog is opened on request (e.g. "about") */
    requestedCategory?: string
}

/** The settings dialog itself; loaded on demand by DialogSettings */
export const DialogSettingsContent = ({ isOpen, onOpenChange, requestedCategory }: DialogSettingsContentProps) => {
    const { t } = useTranslation()
    const [activeId, setActiveId] = useState(requestedCategory ?? SETTINGS_CATEGORIES[0].id)
    const [seenRequest, setSeenRequest] = useState(requestedCategory)
    if (requestedCategory !== seenRequest) {
        setSeenRequest(requestedCategory)
        if (requestedCategory) setActiveId(requestedCategory)
    }
    const active = SETTINGS_CATEGORIES.find(c => c.id === activeId) ?? SETTINGS_CATEGORIES[0]
    const Panel = active.Panel

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-3xl h-[min(560px,80vh)] grid-rows-[auto_1fr] overflow-hidden">
                <DialogDescription className="sr-only">
                    {t("settings.description")}
                </DialogDescription>
                <DialogHeader>
                    <DialogTitle>{t("settings.title")}</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col sm:flex-row gap-4 min-h-0">
                    <SettingsNav
                        categories={SETTINGS_CATEGORIES}
                        activeId={active.id}
                        onSelect={setActiveId}
                    />
                    <div className="flex-1 min-w-0 overflow-y-auto pr-1">
                        <Panel />
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
