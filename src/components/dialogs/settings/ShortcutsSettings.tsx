import { useTranslation } from "react-i18next"
import { useEffect, useState } from "react"
import { Pencil, RotateCcw, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TooltipCustom } from "@/components/tooltip-custom"
import { KbdKeys } from "@/components/kbd"
import { useShortcutsContext } from "@/contexts/use-shortcuts"
import { SHORTCUTS, SHORTCUT_CATEGORIES, bindingFromEvent, categoryLabel, findConflictsFor, formatBinding, isValidBinding, shortcutDescription } from "@/lib/shortcuts"
import { SettingsPanel, SettingsRow, SettingsSubsection } from "./SettingsRow"
import { SectionResetButton } from "./SectionResetButton"
import { RowResetButton } from "./RowResetButton"
import { ConfirmDialog } from "../dialog-confirm"

export const ShortcutsSettings = () => {
    const { t } = useTranslation()
    const { bindings, overrides, setBinding, resetBinding, resetAll, setRecording } = useShortcutsContext()
    const [recordingId, setRecordingId] = useState<string | null>(null)
    const [error, setError] = useState<{ id: string, message: string } | null>(null)
    const [confirmResetAll, setConfirmResetAll] = useState(false)

    useEffect(() => {
        if (!recordingId) return
        setRecording(true)

        const handleKeyDown = (e: KeyboardEvent) => {
            e.preventDefault()
            e.stopPropagation()
            if (e.key === "Escape") {
                setRecordingId(null)
                setError(null)
                return
            }
            const binding = bindingFromEvent(e)
            if (!binding) return
            if (!isValidBinding(binding)) {
                setError({ id: recordingId, message: t("settings.shortcuts.needsModifier") })
                return
            }
            const conflicts = findConflictsFor(recordingId, binding, bindings)
            if (conflicts.length > 0) {
                setError({ id: recordingId, message: t("settings.shortcuts.conflict", { names: conflicts.map(id => shortcutDescription(id)).join(", ") }) })
                return
            }
            setBinding(recordingId, binding)
            setRecordingId(null)
            setError(null)
        }

        window.addEventListener("keydown", handleKeyDown, true)
        return () => {
            window.removeEventListener("keydown", handleKeyDown, true)
            setRecording(false)
        }
    }, [recordingId, bindings, setBinding, setRecording, t])

    const startRecording = (id: string) => {
        setError(null)
        setRecordingId(id)
    }

    return (
        <SettingsPanel
            title={t("settings.shortcuts.title")}
            action={<SectionResetButton onClick={() => setConfirmResetAll(true)} disabled={Object.keys(overrides).length === 0} />}
        >
            <p className="text-xs text-muted-foreground">{t("settings.shortcuts.hint")}</p>
            {SHORTCUT_CATEGORIES.map(category => ({ category, items: SHORTCUTS.filter(s => s.category === category && s.editable && s.defaultBinding) }))
                .filter(({ items }) => items.length > 0)
                .map(({ category, items }) => (
                <SettingsSubsection key={category} title={categoryLabel(category)}>
                    {items.map(s => {
                        const isRecording = recordingId === s.id
                        return (
                            <SettingsRow
                                key={s.id}
                                label={shortcutDescription(s.id)}
                                reset={s.id in overrides && !isRecording
                                    ? <RowResetButton label={t("settings.shortcuts.resetAria", { name: shortcutDescription(s.id) })} onClick={() => { resetBinding(s.id); setError(null) }} />
                                    : undefined}
                            >
                                <div className="flex flex-col items-end gap-1">
                                    <div className="flex items-center gap-2">
                                        {isRecording
                                            ? <span role="status" className="text-xs text-muted-foreground">{t("settings.pressKeysEsc")}</span>
                                            : <KbdKeys keys={formatBinding(bindings[s.id])} />}
                                        <TooltipCustom text={isRecording ? t("common.cancel") : t("settings.shortcuts.edit")}>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                aria-label={t("settings.shortcuts.editAria", { name: shortcutDescription(s.id) })}
                                                onClick={() => isRecording ? setRecordingId(null) : startRecording(s.id)}
                                            >
                                                {isRecording ? <X /> : <Pencil />}
                                            </Button>
                                        </TooltipCustom>
                                    </div>
                                    {error?.id === s.id && (
                                        <p role="alert" className="text-xs text-destructive">{error.message}</p>
                                    )}
                                </div>
                            </SettingsRow>
                        )
                    })}
                </SettingsSubsection>
            ))}
            <ConfirmDialog
                open={confirmResetAll}
                onOpenChange={setConfirmResetAll}
                title={t("settings.shortcuts.resetAllTitle")}
                description={t("settings.shortcuts.resetAllDescription")}
                confirm={{ label: t("settings.resetAll"), icon: RotateCcw, onClick: () => { resetAll(); setError(null) } }}
            />
        </SettingsPanel>
    )
}
