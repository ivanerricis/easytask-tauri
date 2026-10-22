import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { SettingsNav } from "./settings/SettingsNav"
import { SettingsSearchField } from "./settings/SettingsSearch"
import { SETTINGS_CATEGORIES } from "./settings/categories"
import { SettingsSearchContext, normalizeSearch } from "./settings/settings-search-context"

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
    const [search, setSearch] = useState("")
    const searchRef = useRef<HTMLInputElement>(null)
    const resultsRef = useRef<HTMLDivElement>(null)
    const [hasResults, setHasResults] = useState(true)
    const query = normalizeSearch(search)
    const searching = query !== ""

    // The rows are the only content kept while searching: tell when none is left (panels can fill in later)
    useEffect(() => {
        const results = resultsRef.current
        if (!searching || !results) return
        const update = () => setHasResults(results.querySelector("[data-settings-row]") !== null)
        update()
        const observer = new MutationObserver(update)
        observer.observe(results, { childList: true, subtree: true })
        return () => observer.disconnect()
    }, [searching, query])

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent
                className="sm:max-w-5xl h-[min(820px,90vh)] gap-0 overflow-hidden p-0"
                onEscapeKeyDown={event => {
                    // Escape in the search field first clears it; the dialog closes on the next one
                    if (search && document.activeElement === searchRef.current) {
                        event.preventDefault()
                        setSearch("")
                    }
                }}
            >
                <DialogDescription className="sr-only">
                    {t("settings.description")}
                </DialogDescription>
                {/* Two columns: title + categories on the left, whose right border is the separator and runs the whole height of the dialog */}
                <Tabs orientation="vertical" value={active.id} onValueChange={setActiveId} className="grid h-full min-h-0 gap-0 max-sm:grid-rows-[auto_minmax(0,1fr)] sm:grid-cols-[14rem_minmax(0,1fr)]">
                    <div className="flex flex-col gap-4 p-6 max-sm:border-b max-sm:pb-3 sm:overflow-y-auto sm:border-r sm:bg-muted/30">
                        <DialogHeader>
                            <DialogTitle>{t("settings.title")}</DialogTitle>
                        </DialogHeader>
                        <SettingsSearchField ref={searchRef} value={search} onChange={setSearch} />
                        <SettingsNav categories={SETTINGS_CATEGORIES} onSelect={() => setSearch("")} />
                    </div>
                    <TabsContent value={active.id} className="min-h-0 min-w-0 overflow-y-auto overflow-x-hidden p-6 sm:px-10">
                        {searching ? (
                            <SettingsSearchContext.Provider value={{ query, scopeMatches: false }}>
                                <div ref={resultsRef} className="flex flex-col gap-8">
                                    {SETTINGS_CATEGORIES.map(({ id, Panel: CategoryPanel }) => <CategoryPanel key={id} />)}
                                </div>
                                {!hasResults && (
                                    <p role="status" className="text-sm text-muted-foreground">{t("settings.search.noResults", { query: search.trim() })}</p>
                                )}
                            </SettingsSearchContext.Provider>
                        ) : (
                            <Panel />
                        )}
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    )
}
