import { useTranslation } from "react-i18next"
import i18n from "@/i18n"
import { useCallback, useEffect, useId, useMemo, useState } from "react"
import { Check, Loader2, Pencil, Plus, Trash2, TriangleAlert, X, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TooltipCustom } from "@/components/tooltip-custom"
import { ConfirmDialog } from "./dialog-confirm"
import { getDBNoteData } from "@/db/queries/note"
import { createDBAutomation, deleteDBAutomation, getDBAutomations, setDBAutomationEnabled, updateDBAutomation } from "@/db/queries/automation"
import { buildNoteTree } from "@/contexts/tree-builders"
import { PALETTE_COLORS } from "@/lib/colors"
import { actionLabel, automationName, describeAutomation, triggerLabel } from "@/lib/automations/describe"
import {
    ACTION_TYPES, TRIGGER_TYPES, referencedSections,
    type Automation, type AutomationAction, type AutomationActionType, type AutomationDraft, type AutomationTrigger, type AutomationTriggerType,
} from "@/lib/automations/types"
import { useSubmitOnce } from "@/hooks/use-submit-once"
import { cn, getErrorMessage } from "@/lib/utils"

type SectionOption = { id: number, title: string }
type GroupOption = { id: number, label: string, sections: SectionOption[] }

type DialogAutomationsProps = {
    noteId: number
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    /** Opened from a section: a new rule starts on it. */
    sectionId?: number
}

type DialogData = { rules: Automation[], groups: GroupOption[] }

/** The rules of a note and its sections, grouped by group. */
async function loadDialogData(noteId: number): Promise<DialogData> {
    const [rules, data] = await Promise.all([getDBAutomations(noteId), getDBNoteData(noteId)])
    const tree = buildNoteTree(data?.groups ?? [], data?.sections ?? [], data?.tasks ?? [])
    const groups = tree.groups.map((group, index) => ({
        id: group.id,
        label: group.name?.trim() || i18n.t("groups.defaultLabel", { index: index + 1 }),
        sections: group.sections.map(section => ({ id: section.id, title: section.title })),
    }))
    return { rules, groups }
}

/** The default action of a type (moves go to the first section other than the one of the trigger). */
function defaultAction(type: AutomationActionType, sections: SectionOption[], avoid: number | null): AutomationAction {
    switch (type) {
        case "moveTo": return { type, sectionId: (sections.find(s => s.id !== avoid) ?? sections[0]).id, at: "bottom" }
        case "setCompleted":
        case "setPriority": return { type, value: true }
        case "setColor": return { type, color: PALETTE_COLORS[0] }
        case "completeSubtasks": return { type }
    }
}

function defaultTrigger(type: AutomationTriggerType, sectionId: number | null, sections: SectionOption[]): AutomationTrigger {
    if (type === "task.movedInto") return { type, sectionId: sectionId ?? sections[0].id }
    return { type, sectionId }
}

/**
 * The automations of a note: list (on/off, edit, delete) and the "When … Then …" editor.
 * The rules are read and written directly in the database: the next task action of the note uses them.
 * @category Dialogs
 */
export const DialogAutomations = ({ noteId, isOpen, onOpenChange, sectionId }: DialogAutomationsProps) => {
    const { t } = useTranslation()
    const [rules, setRules] = useState<Automation[]>([])
    const [groups, setGroups] = useState<GroupOption[]>([])
    const [loaded, setLoaded] = useState(false)
    const [error, setError] = useState<string | null>(null)
    // The rule being edited (id null = a new one), null while the list is shown; `initial` is the draft as the editor opened
    const [editing, setEditing] = useState<{ id: number | null, draft: AutomationDraft, initial: string } | null>(null)
    const [deleting, setDeleting] = useState<Automation | null>(null)
    // Closing or cancelling an edited draft asks first: which of the two is waiting for the answer
    const [discarding, setDiscarding] = useState<"close" | "cancel" | null>(null)
    const { saving, run } = useSubmitOnce()

    const sections = useMemo(() => groups.flatMap(group => group.sections), [groups])
    const titleOf = useCallback((id: number) => sections.find(section => section.id === id)?.title, [sections])

    const apply = useCallback((data: DialogData) => {
        setRules(data.rules)
        setGroups(data.groups)
        setError(null)
    }, [])
    const fail = useCallback((err: unknown) => setError(getErrorMessage(err)), [])
    const reload = () => loadDialogData(noteId).then(apply, fail)

    // Closing resets the editor (handleOpenChange): every opening shows the list, reloaded
    useEffect(() => {
        if (!isOpen) return
        loadDialogData(noteId).then(apply, fail).finally(() => setLoaded(true))
        return () => setLoaded(false)
    }, [isOpen, noteId, apply, fail])

    const openEditor = (id: number | null, draft: AutomationDraft) => {
        setError(null)
        setEditing({ id, draft, initial: JSON.stringify(draft) })
    }
    const dirty = editing !== null && JSON.stringify(editing.draft) !== editing.initial

    const startNew = () => {
        const trigger: AutomationTrigger = { type: "task.completed", sectionId: sectionId ?? null }
        openEditor(null, { name: null, enabled: true, trigger, actions: [defaultAction("moveTo", sections, trigger.sectionId)] })
    }

    const save = () => run(async () => {
        if (!editing) return
        if (editing.draft.actions.length === 0) {
            setError(t("automations.errors.noActions"))
            return
        }
        try {
            if (editing.id === null) await createDBAutomation(noteId, editing.draft)
            else await updateDBAutomation(editing.id, editing.draft)
            setEditing(null)
            await reload()
        } catch (err) {
            setError(getErrorMessage(err))
        }
    })

    const toggle = (rule: Automation, enabled: boolean) => run(async () => {
        setRules(list => list.map(item => item.id === rule.id ? { ...item, enabled } : item))
        try {
            await setDBAutomationEnabled(rule.id, enabled)
        } catch (err) {
            setRules(list => list.map(item => item.id === rule.id ? { ...item, enabled: rule.enabled } : item))
            setError(getErrorMessage(err))
        }
    })

    const remove = async (rule: Automation) => {
        try {
            await deleteDBAutomation(rule.id)
            await reload()
        } catch (err) {
            setError(getErrorMessage(err))
        }
    }

    const handleOpenChange = (open: boolean) => {
        if (!open && dirty) {
            setDiscarding("close")
            return
        }
        if (!open) {
            setEditing(null)
            setError(null)
        }
        onOpenChange(open)
    }

    const cancelEditing = () => {
        if (dirty) setDiscarding("cancel")
        else { setEditing(null); setError(null) }
    }

    const discard = () => {
        const wasClosing = discarding === "close"
        setEditing(null)
        setError(null)
        if (wasClosing) onOpenChange(false)
    }

    return (
        <>
            <Dialog open={isOpen} onOpenChange={handleOpenChange}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Zap className="size-4" />
                            {editing ? t(editing.id === null ? "automations.newTitle" : "automations.editTitle") : t("automations.title")}
                        </DialogTitle>
                        <DialogDescription>{t("automations.description")}</DialogDescription>
                    </DialogHeader>

                    {!loaded ? (
                        <div role="status" className="flex items-center justify-center gap-2 py-6 text-muted-foreground text-sm">
                            <Loader2 className="size-4 animate-spin" /> {t("common.loading")}
                        </div>
                    ) : editing ? (
                        <AutomationEditor
                            draft={editing.draft}
                            groups={groups}
                            sections={sections}
                            onChange={draft => { setError(null); setEditing({ ...editing, draft }) }}
                        />
                    ) : sections.length === 0 ? (
                        <p className="py-6 text-center text-muted-foreground text-sm">{t("automations.noSections")}</p>
                    ) : rules.length === 0 ? (
                        <p className="py-6 text-center text-muted-foreground text-sm">{t("automations.empty")}</p>
                    ) : (
                        <ul className="flex flex-col divide-y border rounded-xs max-h-[50vh] overflow-y-auto">
                            {rules.map(rule => {
                                const paused = referencedSections(rule).some(id => titleOf(id) === undefined)
                                return (
                                    <li key={rule.id} className="flex items-center gap-3 px-3 py-2">
                                        <Switch
                                            checked={rule.enabled}
                                            onCheckedChange={checked => void toggle(rule, checked)}
                                            aria-label={t("automations.enabledAria", { name: automationName(rule, titleOf) })}
                                        />
                                        <div className="flex flex-col min-w-0 flex-1">
                                            {rule.name && <span className="text-sm font-medium truncate">{rule.name}</span>}
                                            <span className={cn("break-words", rule.name ? "text-xs text-muted-foreground" : "text-sm")}>
                                                {describeAutomation(rule, titleOf)}
                                            </span>
                                            {paused && (
                                                <span className="flex items-start gap-1 text-xs text-destructive break-words">
                                                    <TriangleAlert className="size-3.5 shrink-0" aria-hidden />
                                                    {t("automations.paused")}
                                                </span>
                                            )}
                                        </div>
                                        <TooltipCustom text={t("automations.edit")}>
                                            <Button variant="ghost" size="icon" aria-label={t("automations.editAria", { name: automationName(rule, titleOf) })}
                                                onClick={() => openEditor(rule.id, { name: rule.name, enabled: rule.enabled, trigger: rule.trigger, actions: rule.actions })}>
                                                <Pencil />
                                            </Button>
                                        </TooltipCustom>
                                        <TooltipCustom text={t("automations.delete")}>
                                            <Button variant="ghost" size="icon" aria-label={t("automations.deleteAria", { name: automationName(rule, titleOf) })} className="text-destructive hover:text-destructive"
                                                onClick={() => setDeleting(rule)}>
                                                <Trash2 />
                                            </Button>
                                        </TooltipCustom>
                                    </li>
                                )
                            })}
                        </ul>
                    )}

                    {error && <p role="alert" className="text-sm text-destructive break-words">{error}</p>}

                    <DialogFooter>
                        {editing ? (
                            <>
                                <Button variant="outline" type="button" onClick={cancelEditing}>
                                    {t("common.cancel")}
                                </Button>
                                <Button type="button" onClick={() => void save()} disabled={saving || editing.draft.actions.length === 0}>
                                    {saving ? <Loader2 className="animate-spin" /> : <Check />}
                                    {t("common.save")}
                                </Button>
                            </>
                        ) : (
                            <Button type="button" onClick={startNew} disabled={!loaded || sections.length === 0}>
                                <Plus />
                                {t("automations.add")}
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <ConfirmDialog
                open={discarding !== null}
                onOpenChange={open => { if (!open) setDiscarding(null) }}
                title={t("automations.discardConfirm.title")}
                description={t("automations.discardConfirm.description")}
                destructive
                confirm={{ label: t("automations.discardConfirm.confirm"), icon: Trash2, onClick: discard }}
            />
            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={open => { if (!open) setDeleting(null) }}
                title={t("automations.deleteConfirm.title")}
                description={deleting ? automationName(deleting, titleOf) : undefined}
                destructive
                confirm={{ label: t("common.delete"), icon: Trash2, onClick: () => { if (deleting) return remove(deleting) } }}
            />
        </>
    )
}

type AutomationEditorProps = {
    draft: AutomationDraft
    groups: GroupOption[]
    sections: SectionOption[]
    onChange: (draft: AutomationDraft) => void
}

// Radix Select items cannot have an empty value: these stand for "any section" and "no color"
const ANY = "any"
const NO_COLOR = "none"

/** A select whose value is a section id (grouped by group); a missing section is shown as such instead of silently picking another one. */
const SectionSelect = ({ value, groups, sections, onChange, allowAny, label, className }: {
    value: number | null, groups: GroupOption[], sections: SectionOption[], onChange: (id: number | null) => void,
    allowAny?: boolean, label: string, className?: string,
}) => {
    const { t } = useTranslation()
    const missing = value !== null && !sections.some(section => section.id === value)
    return (
        <Select value={value === null ? ANY : String(value)} onValueChange={next => onChange(next === ANY ? null : Number(next))}>
            <SelectTrigger aria-label={label} className={cn("w-full", className)}><SelectValue /></SelectTrigger>
            <SelectContent>
                {allowAny && <SelectItem value={ANY}>{t("automations.anySection")}</SelectItem>}
                {missing && <SelectItem value={String(value)}>{t("automations.describe.missingSection")}</SelectItem>}
                {groups.filter(group => group.sections.length > 0).map(group => (
                    <SelectGroup key={group.id}>
                        <SelectLabel>{group.label}</SelectLabel>
                        {group.sections.map(section => <SelectItem key={section.id} value={String(section.id)}>{section.title}</SelectItem>)}
                    </SelectGroup>
                ))}
            </SelectContent>
        </Select>
    )
}

/** A select of fixed choices (label = translated text). */
function ChoiceSelect<T extends string>({ value, options, onChange, label, className }: {
    value: T, options: readonly { value: T, label: string }[], onChange: (value: T) => void, label: string, className?: string,
}) {
    return (
        <Select value={value} onValueChange={next => onChange(next as T)}>
            <SelectTrigger aria-label={label} className={cn("w-full", className)}><SelectValue /></SelectTrigger>
            <SelectContent>
                {options.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
            </SelectContent>
        </Select>
    )
}

const ColorDot = ({ color }: { color: string | null }) => (
    // Inline so the trigger can truncate its value; inside the list the item already spaces it with a gap
    <span aria-hidden className="inline-block size-3.5 shrink-0 rounded-full align-[-0.2em] ring-1 ring-inset ring-foreground/20 in-data-[slot=select-value]:me-2" style={color ? { backgroundColor: color } : undefined} />
)

/** The translated name of a color: the palette ones have their own, any other is "custom color". */
function colorName(color: string): string {
    const index = (PALETTE_COLORS as readonly string[]).indexOf(color.toLowerCase())
    return i18n.t(index >= 0 ? (`automations.colors.c${index + 1}` as "automations.colors.c1") : "automations.colors.custom")
}

const AutomationEditor = ({ draft, groups, sections, onChange }: AutomationEditorProps) => {
    const { t } = useTranslation()
    const nameId = useId()
    const { trigger, actions } = draft

    const setAction = (index: number, action: AutomationAction) =>
        onChange({ ...draft, actions: actions.map((item, i) => i === index ? action : item) })

    return (
        <div className="flex flex-col gap-4">
            <div className="grid gap-2">
                <Label htmlFor={nameId}>{t("automations.name")}</Label>
                <Input id={nameId} value={draft.name ?? ""}
                    onChange={e => onChange({ ...draft, name: e.target.value || null })} />
            </div>

            <fieldset className="grid gap-2">
                <legend className="text-sm font-medium">{t("automations.when")}</legend>
                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                    <ChoiceSelect label={t("automations.when")} value={trigger.type}
                        options={TRIGGER_TYPES.map(type => ({ value: type, label: triggerLabel(type) }))}
                        onChange={type => onChange({ ...draft, trigger: defaultTrigger(type, trigger.sectionId, sections) })} />
                    <SectionSelect
                        label={t("automations.where")}
                        value={trigger.sectionId}
                        groups={groups}
                        sections={sections}
                        allowAny={trigger.type !== "task.movedInto"}
                        onChange={id => onChange({ ...draft, trigger: defaultTrigger(trigger.type, id, sections) })}
                    />
                </div>
            </fieldset>

            <fieldset className="grid gap-2">
                <legend className="text-sm font-medium">{t("automations.then")}</legend>
                {actions.map((action, index) => (
                    // One block per action: the type on the first line, its parameters on the second, so the layout never
                    // depends on the chosen action or on the length of the section names
                    <div key={index} className="grid gap-2 rounded-xs border p-2">
                        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                            <ChoiceSelect label={t("automations.actionType")} value={action.type}
                                options={ACTION_TYPES.map(type => ({ value: type, label: actionLabel(type) }))}
                                onChange={type => setAction(index, defaultAction(type, sections, trigger.sectionId))} />
                            <TooltipCustom text={t("automations.removeAction")}>
                                <Button variant="ghost" size="icon" aria-label={t("automations.removeAction")}
                                    onClick={() => onChange({ ...draft, actions: actions.filter((_, i) => i !== index) })}>
                                    <X />
                                </Button>
                            </TooltipCustom>
                        </div>
                        <ActionParams action={action} groups={groups} sections={sections} onChange={next => setAction(index, next)} />
                    </div>
                ))}
                <Button variant="outline" size="sm" type="button" className="self-start"
                    onClick={() => onChange({ ...draft, actions: [...actions, defaultAction("setPriority", sections, trigger.sectionId)] })}>
                    <Plus />
                    {t("automations.addAction")}
                </Button>
            </fieldset>
        </div>
    )
}

const ActionParams = ({ action, groups, sections, onChange }: {
    action: AutomationAction, groups: GroupOption[], sections: SectionOption[], onChange: (action: AutomationAction) => void,
}) => {
    const { t } = useTranslation()
    const label = actionLabel(action.type)
    switch (action.type) {
        case "moveTo":
            return (
                <div className="grid grid-cols-[minmax(0,1fr)_8rem] gap-2">
                    <SectionSelect label={label} value={action.sectionId} groups={groups} sections={sections}
                        onChange={id => { if (id !== null) onChange({ ...action, sectionId: id }) }} />
                    <ChoiceSelect label={t("automations.position")} value={action.at}
                        options={[{ value: "top", label: t("automations.values.top") }, { value: "bottom", label: t("automations.values.bottom") }]}
                        onChange={at => onChange({ ...action, at })} />
                </div>
            )
        case "setCompleted":
            return (
                <ChoiceSelect label={label} className="w-full" value={String(action.value)}
                    options={[{ value: "true", label: t("automations.values.completed") }, { value: "false", label: t("automations.values.open") }]}
                    onChange={value => onChange({ ...action, value: value === "true" })} />
            )
        case "setPriority":
            return (
                <ChoiceSelect label={label} className="w-full" value={String(action.value)}
                    options={[{ value: "true", label: t("automations.values.add") }, { value: "false", label: t("automations.values.remove") }]}
                    onChange={value => onChange({ ...action, value: value === "true" })} />
            )
        case "setColor": {
            // A color picked elsewhere (not in the palette) stays selectable
            const colors: string[] = [...PALETTE_COLORS]
            if (action.color && !colors.includes(action.color)) colors.unshift(action.color)
            return (
                <Select value={action.color ?? NO_COLOR} onValueChange={color => onChange({ ...action, color: color === NO_COLOR ? null : color })}>
                    <SelectTrigger aria-label={label} className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value={NO_COLOR}><ColorDot color={null} />{t("automations.values.noColor")}</SelectItem>
                        {colors.map(color => <SelectItem key={color} value={color}><ColorDot color={color} />{colorName(color)}</SelectItem>)}
                    </SelectContent>
                </Select>
            )
        }
        case "completeSubtasks":
            return null
    }
}
