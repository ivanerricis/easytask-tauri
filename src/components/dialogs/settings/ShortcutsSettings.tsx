import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { KbdKeys } from "@/components/kbd"
import { useShortcutsContext } from "@/contexts/use-shortcuts"
import { SHORTCUTS, SHORTCUT_CATEGORIES, bindingFromEvent, findConflictsFor, formatBinding, getShortcut, isValidBinding } from "@/lib/shortcuts"
import { SettingsPanel, SettingsRow } from "./SettingsRow"

export const ShortcutsSettings = () => {
    const { bindings, overrides, setBinding, resetBinding, resetAll, setRecording } = useShortcutsContext()
    const [recordingId, setRecordingId] = useState<string | null>(null)
    const [error, setError] = useState<{ id: string, message: string } | null>(null)

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
                setError({ id: recordingId, message: "Usa una combinazione con Ctrl o Alt." })
                return
            }
            const conflicts = findConflictsFor(recordingId, binding, bindings)
            if (conflicts.length > 0) {
                setError({ id: recordingId, message: `Già usata da: ${conflicts.map(id => getShortcut(id).description).join(", ")}.` })
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
    }, [recordingId, bindings, setBinding, setRecording])

    const startRecording = (id: string) => {
        setError(null)
        setRecordingId(id)
    }

    return (
        <SettingsPanel title="Scorciatoie">
            <div className="flex items-center justify-between gap-4">
                <p className="text-xs text-muted-foreground">Premi "Modifica" e poi la nuova combinazione di tasti. Esc annulla.</p>
                <Button variant="outline" size="sm" onClick={resetAll} disabled={Object.keys(overrides).length === 0}>
                    Ripristina tutte
                </Button>
            </div>
            {SHORTCUT_CATEGORIES.map(category => {
                const items = SHORTCUTS.filter(s => s.category === category && s.editable && s.defaultBinding)
                if (items.length === 0) return null
                return (
                    <section key={category} aria-label={category} className="flex flex-col gap-3">
                        <h4 className="text-sm font-semibold">{category}</h4>
                        {items.map(s => {
                            const isRecording = recordingId === s.id
                            return (
                                <SettingsRow key={s.id} label={s.description}>
                                    <div className="flex flex-col items-end gap-1">
                                        <div className="flex items-center gap-2">
                                            {isRecording
                                                ? <span className="text-xs text-muted-foreground">Premi i tasti...</span>
                                                : <KbdKeys keys={formatBinding(bindings[s.id])} />}
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                aria-label={`Modifica: ${s.description}`}
                                                onClick={() => isRecording ? setRecordingId(null) : startRecording(s.id)}
                                            >
                                                {isRecording ? "Annulla" : "Modifica"}
                                            </Button>
                                            {s.id in overrides && !isRecording && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    aria-label={`Ripristina: ${s.description}`}
                                                    onClick={() => { resetBinding(s.id); setError(null) }}
                                                >
                                                    Ripristina
                                                </Button>
                                            )}
                                        </div>
                                        {error?.id === s.id && (
                                            <p role="alert" className="text-xs text-destructive">{error.message}</p>
                                        )}
                                    </div>
                                </SettingsRow>
                            )
                        })}
                    </section>
                )
            })}
        </SettingsPanel>
    )
}
