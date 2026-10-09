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
            <DialogContent className="sm:max-w-3xl h-[min(720px,85vh)] gap-0 overflow-hidden p-0">
                <DialogDescription className="sr-only">
                    {t("settings.description")}
                </DialogDescription>
                {/* Two columns: title + categories on the left, whose right border is the separator and runs the whole height of the dialog */}
                <Tabs orientation="vertical" value={active.id} onValueChange={setActiveId} className="grid h-full min-h-0 gap-0 max-sm:grid-rows-[auto_minmax(0,1fr)] sm:grid-cols-[14rem_minmax(0,1fr)]">
                    <div className="flex flex-col gap-4 p-6 max-sm:border-b max-sm:pb-3 sm:overflow-y-auto sm:border-r">
                        <DialogHeader>
                            <DialogTitle>{t("settings.title")}</DialogTitle>
                        </DialogHeader>
                        <SettingsNav categories={SETTINGS_CATEGORIES} />
                    </div>
                    <TabsContent value={active.id} className="min-h-0 min-w-0 overflow-y-auto overflow-x-hidden p-6">
                        <Panel />
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    )
}
