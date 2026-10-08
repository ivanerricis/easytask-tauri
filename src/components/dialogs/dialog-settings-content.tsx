import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent } from "@/components/ui/tabs"
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
            <DialogContent className="sm:max-w-3xl h-[min(720px,85vh)] grid-rows-[auto_1fr] overflow-hidden">
                <DialogDescription className="sr-only">
                    {t("settings.description")}
                </DialogDescription>
                <DialogHeader>
                    <DialogTitle>{t("settings.title")}</DialogTitle>
                </DialogHeader>
                <Tabs orientation="vertical" value={active.id} onValueChange={setActiveId} className="flex-col sm:flex-row gap-4 min-h-0">
                    <SettingsNav categories={SETTINGS_CATEGORIES} />
                    <TabsContent value={active.id} className="min-w-0 overflow-y-auto pr-1">
                        <Panel />
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    )
}
