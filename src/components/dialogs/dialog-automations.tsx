import { useTranslation } from "react-i18next"
import i18n from "@/i18n"
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react"
import { Check, ChevronLeft, ChevronRight, Loader2, Pencil, Plus, Trash2, TriangleAlert, X, Zap } from "lucide-react"
import { toast } from "sonner"
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
import { actionLabel, automationName, colorName, describeAutomation, triggerLabel } from "@/lib/automations/describe"
import {
    TRIGGER_TYPES, actionsForTrigger, isGroupTrigger, isStateTrigger, isValidRule, referencedGroups, referencedSections, triggerSubject,
    type Automation, type AutomationAction, type AutomationActionType, type AutomationDraft, type AutomationTrigger, type AutomationTriggerType,
} from "@/lib/automations/types"
import { useSubmitOnce } from "@/hooks/use-submit-once"
import { useAutomations } from "@/hooks/use-automations"
import { reportError } from "@/lib/report-error"
import { cn, getErrorMessage } from "@/lib/utils"

type SectionOption = { id: number, title: string }
type GroupOption = { id: number, label: string, sections: SectionOption[] }

type DialogAutomationsProps = {
    noteId: number
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    /** Opened from a section: a new rule starts on it. */
    sectionId?: number
    /** Opened from a group: a new rule starts on it ("all its tasks are completed, archive it"). */
    groupId?: number
}

type DialogData = { rules: Automation[], groups: GroupOption[] }

/** The steps of the editor: when (trigger), then (actions), summary (sentence, name, on/off). */
const STEPS = ["when", "then", "summary"] as const
type Step = 0 | 1 | 2
const LAST_STEP: Step = 2

/** Whether the data of a step is complete (only the actions can be wrong: the trigger always has a valid section or group). */
const stepValid = (step: number, draft: AutomationDraft) =>
    step !== 1 || (draft.actions.length > 0 && isValidRule(draft.trigger, draft.actions))
/** A step can be reached when all the steps before it are valid. */
const stepReachable = (step: number, draft: AutomationDraft) => STEPS.slice(0, step).every((_, index) => stepValid(index, draft))

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
        case "completeSubtasks":
        case "archiveGroup": return { type }
        case "moveGroup": return { type, at: "bottom" }
    }
}

/** The actions a new rule of this trigger starts with (a state trigger only has the color). */
const defaultActions = (type: AutomationTriggerType, sections: SectionOption[], avoid: number | null): AutomationAction[] => {
    if (isStateTrigger(type)) return [defaultAction("setColor", sections, avoid)]
    return [triggerSubject(type) === "group" ? { type: "archiveGroup" } : defaultAction("moveTo", sections, avoid)]
}

/** Two triggers share their actions when they have the same subject and are both events or both states. */
const sameActions = (a: AutomationTriggerType, b: AutomationTriggerType) =>
    triggerSubject(a) === triggerSubject(b) && isStateTrigger(a) === isStateTrigger(b)

/** The trigger of a type, keeping the section of the previous trigger; a group trigger starts on `groupId` (null = any group). */
function defaultTrigger(type: AutomationTriggerType, sectionId: number | null, sections: SectionOption[], groupId: number | null = null): AutomationTrigger {
    if (isGroupTrigger(type)) return { type, groupId } as AutomationTrigger
    if (type === "task.movedInto") return { type, sectionId: sectionId ?? sections[0].id }
    return { type, sectionId } as AutomationTrigger
}

/**
 * The automations of a note: list (on/off, edit, delete) and the "When … Then …" editor.
 * The rules are read and written directly in the database: the next task action of the note uses them.
 * @category Dialogs
 */
export const DialogAutomations = ({ noteId, isOpen, onOpenChange, sectionId, groupId }: DialogAutomationsProps) => {
    const { t } = useTranslation()
    const [rules, setRules] = useState<Automation[]>([])
    const [groups, setGroups] = useState<GroupOption[]>([])
    const [loaded, setLoaded] = useState(false)
    const [error, setError] = useState<string | null>(null)
    // The rule being edited (id null = a new one), null while the list is shown; `initial` is the draft as the editor opened
    const [editing, setEditing] = useState<{ id: number | null, draft: AutomationDraft, initial: string, step: Step } | null>(null)
    const [deleting, setDeleting] = useState<Automation | null>(null)
    // Closing or cancelling an edited draft asks first: which of the two is waiting for the answer
    const [discarding, setDiscarding] = useState<"close" | "cancel" | null>(null)
    const { saving, run } = useSubmitOnce()
    const { sync } = useAutomations()
    // The state rules (colors by open tasks) align the open note right away; not awaited, the list does not wait for it
    const resync = () => { sync().catch(err => reportError(err, getErrorMessage(err))) }

    const sections = useMemo(() => groups.flatMap(group => group.sections), [groups])
    const titleOf = useCallback((id: number) => sections.find(section => section.id === id)?.title, [sections])
    const groupLabelOf = useCallback((id: number) => groups.find(group => group.id === id)?.label, [groups])

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
        // A new rule starts from the trigger, an existing one from its summary
        setEditing({ id, draft, initial: JSON.stringify(draft), step: id === null ? 0 : LAST_STEP })
    }
    const dirty = editing !== null && JSON.stringify(editing.draft) !== editing.initial

    const startNew = () => {
        const trigger: AutomationTrigger = groupId !== undefined
            ? { type: "group.completed", groupId }
            : { type: "task.completed", sectionId: sectionId ?? null }
        const avoid = "sectionId" in trigger ? trigger.sectionId : null
        openEditor(null, { name: null, enabled: true, trigger, actions: defaultActions(trigger.type, sections, avoid) })
    }

    const goTo = (step: Step) => {
        if (!editing || !stepReachable(step, editing.draft)) return
        setError(null)
        setEditing({ ...editing, step })
    }

    const save = () => run(async () => {
        if (!editing) return
        if (editing.draft.actions.length === 0) {
            setError(t("automations.errors.noActions"))
            return
        }
        if (!stepValid(1, editing.draft)) return
        try {
            if (editing.id === null) await createDBAutomation(noteId, editing.draft)
            else await updateDBAutomation(editing.id, editing.draft)
            toast.success(t("automations.saved"))
            setEditing(null)
            resync()
            await reload()
        } catch (err) {
            setError(getErrorMessage(err))
        }
    })

    const toggle = (rule: Automation, enabled: boolean) => run(async () => {
        setRules(list => list.map(item => item.id === rule.id ? { ...item, enabled } : item))
        try {
            await setDBAutomationEnabled(rule.id, enabled)
            resync()
        } catch (err) {
            setRules(list => list.map(item => item.id === rule.id ? { ...item, enabled: rule.enabled } : item))
            setError(getErrorMessage(err))
        }
    })

    const remove = async (rule: Automation) => {
        try {
            await deleteDBAutomation(rule.id)
            toast.success(t("automations.deletedToast"))
            resync()
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
                {/* The header and the footer stay visible: only the editor scrolls when the rule is taller than the window */}
                <DialogContent className="sm:max-w-xl flex flex-col max-h-[min(640px,85vh)] min-h-[min(480px,85vh)] overflow-hidden">
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
                        <>
                            <StepIndicator step={editing.step} draft={editing.draft} onSelect={goTo} />
                            {/* Enter in the name field (the only text input) saves on the last step, goes on otherwise */}
                            <form className="min-h-0 flex-1 overflow-y-auto -mx-1 px-1 py-1"
                                onSubmit={event => {
                                    event.preventDefault()
                                    if (editing.step === LAST_STEP) void save()
                                    else goTo((editing.step + 1) as Step)
                                }}>
                                <AutomationEditor
                                    step={editing.step}
                                    draft={editing.draft}
                                    groups={groups}
                                    sections={sections}
                                    titleOf={titleOf}
                                    groupLabelOf={groupLabelOf}
                                    openedSectionId={sectionId ?? null}
                                    openedGroupId={groupId ?? null}
                                    onChange={draft => { setError(null); setEditing({ ...editing, draft }) }}
                                />
                            </form>
                            {!stepValid(editing.step, editing.draft) && (
                                <p className="text-xs text-muted-foreground">
                                    {t(editing.draft.actions.length === 0 ? "automations.errors.noActions" : "automations.errors.invalidActions")}
                                </p>
                            )}
                        </>
                    ) : sections.length === 0 ? (
                        <p className="py-6 text-center text-muted-foreground text-sm">{t("automations.noSections")}</p>
                    ) : rules.length === 0 ? (
                        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-center">
                            <Zap className="size-8 text-muted-foreground" aria-hidden />
                            <p className="text-muted-foreground text-sm">{t("automations.empty")}</p>
                            <p className="max-w-xs text-xs text-muted-foreground">{t("automations.emptyExample")}</p>
                            <Button type="button" className="mt-1" onClick={startNew}>
                                <Plus />
                                {t("automations.add")}
                            </Button>
                        </div>
                    ) : (
                        <ul className="flex min-h-0 flex-1 flex-col divide-y border rounded-xs overflow-y-auto">
                            {rules.map(rule => {
                                const pausedKey = referencedGroups(rule).some(id => groupLabelOf(id) === undefined) ? "automations.pausedGroup"
                                    : referencedSections(rule).some(id => titleOf(id) === undefined) ? "automations.paused" : null
                                return (
                                    <li key={rule.id} className="flex items-center gap-3 px-3 py-2">
                                        <Switch
                                            checked={rule.enabled}
                                            onCheckedChange={checked => void toggle(rule, checked)}
                                            aria-label={t("automations.enabledAria", { name: automationName(rule, titleOf, groupLabelOf) })}
                                        />
                                        <div className={cn("flex flex-col min-w-0 flex-1", !rule.enabled && "opacity-60")}>
                                            {rule.name && <span className="text-sm font-medium truncate">{rule.name}</span>}
                                            <span className={cn("break-words", rule.name ? "text-xs text-muted-foreground" : "text-sm")}>
                                                {describeAutomation(rule, titleOf, groupLabelOf)}
                                            </span>
                                            {pausedKey && (
                                                <span className="flex items-start gap-1 text-xs text-destructive break-words">
                                                    <TriangleAlert className="size-3.5 shrink-0" aria-hidden />
                                                    {t(pausedKey)}
                                                </span>
                                            )}
                                        </div>
                                        <TooltipCustom text={t("automations.edit")}>
                                            <Button variant="ghost" size="icon" aria-label={t("automations.editAria", { name: automationName(rule, titleOf, groupLabelOf) })}
                                                onClick={() => openEditor(rule.id, { name: rule.name, enabled: rule.enabled, trigger: rule.trigger, actions: rule.actions })}>
                                                <Pencil />
                                            </Button>
                                        </TooltipCustom>
                                        <TooltipCustom text={t("automations.delete")}>
                                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" aria-label={t("automations.deleteAria", { name: automationName(rule, titleOf, groupLabelOf) })}
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

                    {/* mt-auto: with few or no rules the buttons stay at the bottom of the (minimum height) dialog */}
                    <DialogFooter className={editing ? "mt-auto sm:justify-between" : "mt-auto"}>
                        {editing ? (
                            <>
                                <Button variant="outline" type="button" onClick={cancelEditing}>
                                    {t("common.cancel")}
                                </Button>
                                <div className="flex flex-col-reverse gap-2 sm:flex-row">
                                    {editing.step > 0 && (
                                        <Button variant="outline" type="button" onClick={() => goTo((editing.step - 1) as Step)}>
                                            <ChevronLeft />
                                            {t("automations.back")}
                                        </Button>
                                    )}
                                    {editing.step < LAST_STEP ? (
                                        <Button type="button" onClick={() => goTo((editing.step + 1) as Step)} disabled={!stepValid(editing.step, editing.draft)}>
                                            {t("automations.next")}
                                            <ChevronRight />
                                        </Button>
                                    ) : (
                                        <Button type="button" onClick={() => void save()} disabled={saving || !stepValid(1, editing.draft)}>
                                            {saving ? <Loader2 className="animate-spin" /> : <Check />}
                                            {t("common.save")}
                                        </Button>
                                    )}
                                </div>
                            </>
                        ) : (
                            <>
                                <Button variant="outline" type="button" onClick={() => handleOpenChange(false)}>
                                    {t("common.close")}
                                </Button>
                                {/* The empty state has its own "new" button */}
                                {loaded && (rules.length > 0 || sections.length === 0) && (
                                    <Button type="button" onClick={startNew} disabled={!loaded || sections.length === 0}>
                                        <Plus />
                                        {t("automations.add")}
                                    </Button>
                                )}
                            </>
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
                irreversible
                confirm={{ label: t("automations.discardConfirm.confirm"), icon: Trash2, onClick: discard }}
            />
            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={open => { if (!open) setDeleting(null) }}
                title={t("automations.deleteConfirm.title")}
                description={deleting ? automationName(deleting, titleOf, groupLabelOf) : undefined}
                destructive
                irreversible
                confirm={{ label: t("common.delete"), icon: Trash2, onClick: () => { if (deleting) return remove(deleting) } }}
            />
        </>
    )
}

/** The progress of the editor: "1 When - 2 Then - 3 Summary"; the steps already reachable are buttons. */
const StepIndicator = ({ step, draft, onSelect }: { step: Step, draft: AutomationDraft, onSelect: (step: Step) => void }) => {
    const { t } = useTranslation()
    return (
        <nav aria-label={t("automations.stepsAria")}>
            <ol className="flex items-center gap-2">
                {STEPS.map((name, index) => {
                    const current = index === step
                    const done = index < step && stepValid(index, draft)
                    return (
                        <li key={name} className={cn("flex items-center gap-2 min-w-0", index < LAST_STEP && "flex-1")}>
                            <Button variant="ghost" size="sm" type="button" className="shrink-0 px-2"
                                aria-current={current ? "step" : undefined}
                                disabled={!stepReachable(index, draft)}
                                onClick={() => onSelect(index as Step)}>
                                <span aria-hidden className={cn(
                                    "flex size-5 items-center justify-center rounded-full border text-xs",
                                    current && "border-primary bg-primary text-primary-foreground",
                                    done && "border-primary text-primary",
                                )}>{done ? <Check className="size-3" /> : index + 1}</span>
                                <span className={cn(!current && "text-muted-foreground")}>{t(`automations.steps.${name}`)}</span>
                            </Button>
                            {index < LAST_STEP && <span aria-hidden className="h-px min-w-2 flex-1 bg-border" />}
                        </li>
                    )
                })}
            </ol>
        </nav>
    )
}

type AutomationEditorProps = {
    step: Step
    draft: AutomationDraft
    groups: GroupOption[]
    sections: SectionOption[]
    titleOf: (id: number) => string | undefined
    groupLabelOf: (id: number) => string | undefined
    /** The section / group the dialog was opened for: where a new state trigger starts. */
    openedSectionId: number | null
    openedGroupId: number | null
    onChange: (draft: AutomationDraft) => void
}

// Radix Select items cannot have an empty value: these stand for "any section" and "no color"
const ANY = "any"
const NO_COLOR = "none"

/** A select whose value is a section id (grouped by group); a missing section is shown as such instead of silently picking another one. */
const SectionSelect = ({ value, groups, sections, onChange, allowAny, label, className, id }: {
    value: number | null, groups: GroupOption[], sections: SectionOption[], onChange: (id: number | null) => void,
    allowAny?: boolean, label: string, className?: string, id?: string,
}) => {
    const { t } = useTranslation()
    const missing = value !== null && !sections.some(section => section.id === value)
    return (
        <Select value={value === null ? ANY : String(value)} onValueChange={next => onChange(next === ANY ? null : Number(next))}>
            <SelectTrigger id={id} aria-label={label} className={cn("w-full", className)}><SelectValue /></SelectTrigger>
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

/** A select whose value is a group of the note ("any group" = null); a missing group is shown as such. */
const GroupSelect = ({ value, groups, onChange, label, id }: {
    value: number | null, groups: GroupOption[], onChange: (id: number | null) => void, label: string, id?: string,
}) => {
    const { t } = useTranslation()
    const missing = value !== null && !groups.some(group => group.id === value)
    return (
        <Select value={value === null ? ANY : String(value)} onValueChange={next => onChange(next === ANY ? null : Number(next))}>
            <SelectTrigger id={id} aria-label={label} className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
                <SelectItem value={ANY}>{t("automations.anyGroup")}</SelectItem>
                {missing && <SelectItem value={String(value)}>{t("automations.describe.missingGroup")}</SelectItem>}
                {groups.map(group => <SelectItem key={group.id} value={String(group.id)}>{group.label}</SelectItem>)}
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

const AutomationEditor = ({ step, draft, groups, sections, titleOf, groupLabelOf, openedSectionId, openedGroupId, onChange }: AutomationEditorProps) => {
    const { t } = useTranslation()
    const nameId = useId()
    const enabledId = useId()
    const whereId = useId()
    const container = useRef<HTMLDivElement>(null)
    const { trigger, actions } = draft
    const groupTrigger = isGroupTrigger(trigger.type)
    const allowedActions = actionsForTrigger(trigger.type)
    // The section of the trigger: a group trigger has none
    const triggerSection = "sectionId" in trigger ? trigger.sectionId : null
    // A state trigger only has the color: the "add action" button goes away once it is used
    const canAddAction = !isStateTrigger(trigger.type) || allowedActions.some(type => !actions.some(action => action.type === type))

    // Every step starts with the focus on its first control
    useEffect(() => {
        container.current?.querySelector<HTMLElement>("input, [role='combobox'], button:not(:disabled)")?.focus()
    }, [step])

    const setAction = (index: number, action: AutomationAction) =>
        onChange({ ...draft, actions: actions.map((item, i) => i === index ? action : item) })

    return (
        <div ref={container} className="flex flex-col gap-4">
            {step === 0 && (
                <div className="grid gap-2">
                    <p className="text-sm text-muted-foreground">{t("automations.whenHint")}</p>
                    <div className="grid gap-3">
                        <ChoiceSelect label={t("automations.when")} value={trigger.type}
                            options={TRIGGER_TYPES.map(type => ({ value: type, label: triggerLabel(type) }))}
                            onChange={type => {
                                // A state trigger starts on the section / group the dialog was opened for
                                const next = defaultTrigger(type, triggerSection ?? openedSectionId, sections, openedGroupId)
                                // Other subject or kind: the actions of the old trigger no longer apply
                                if (sameActions(type, trigger.type)) onChange({ ...draft, trigger: next })
                                else onChange({ ...draft, trigger: next, actions: defaultActions(type, sections, null) })
                            }} />
                        <div className="grid gap-1.5">
                        <Label htmlFor={whereId}>{t(groupTrigger ? "automations.group" : "automations.where")}</Label>
                        {"groupId" in trigger ? (
                            <GroupSelect
                                id={whereId}
                                label={t("automations.group")}
                                value={trigger.groupId}
                                groups={groups}
                                onChange={id => onChange({ ...draft, trigger: { type: trigger.type, groupId: id } as AutomationTrigger })}
                            />
                        ) : (
                            <SectionSelect
                                id={whereId}
                                label={t("automations.where")}
                                value={trigger.sectionId}
                                groups={groups}
                                sections={sections}
                                allowAny={trigger.type !== "task.movedInto"}
                                onChange={id => onChange({ ...draft, trigger: defaultTrigger(trigger.type, id, sections) })}
                            />
                        )}
                        </div>
                    </div>
                </div>
            )}

            {step === 1 && (
                <div className="grid gap-2">
                    <p className="text-sm text-muted-foreground">{t("automations.thenHint")}</p>
                    {actions.map((action, index) => (
                        // One block per action: the type on the first line, its parameters on the second, so the layout never
                        // depends on the chosen action or on the length of the section names
                        <div key={index} className="grid gap-2 rounded-xs border p-2">
                            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                                <ChoiceSelect label={t("automations.actionType")} value={action.type}
                                    options={allowedActions.map(type => ({ value: type, label: actionLabel(type) }))}
                                    onChange={type => setAction(index, defaultAction(type, sections, triggerSection))} />
                                <TooltipCustom text={t("automations.removeAction")}>
                                    <Button variant="ghost" size="icon" type="button" aria-label={t("automations.removeAction")}
                                        onClick={() => onChange({ ...draft, actions: actions.filter((_, i) => i !== index) })}>
                                        <X />
                                    </Button>
                                </TooltipCustom>
                            </div>
                            <ActionParams action={action} groups={groups} sections={sections} onChange={next => setAction(index, next)} />
                        </div>
                    ))}
                    {canAddAction && (
                        <Button variant="outline" size="sm" type="button" className="justify-self-start"
                            onClick={() => {
                                const type = isStateTrigger(trigger.type)
                                    ? allowedActions.find(candidate => !actions.some(action => action.type === candidate)) ?? "setColor"
                                    : triggerSubject(trigger.type) === "group" ? "setColor" : "setPriority"
                                onChange({ ...draft, actions: [...actions, defaultAction(type, sections, triggerSection)] })
                            }}>
                            <Plus />
                            {t("automations.addAction")}
                        </Button>
                    )}
                </div>
            )}

            {step === 2 && (
                <>
                    <div className="grid gap-2">
                        <span className="text-sm font-medium">{t("automations.summaryTitle")}</span>
                        <p className="rounded-xs border bg-muted/40 p-3 text-sm break-words">{describeAutomation(draft, titleOf, groupLabelOf)}</p>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor={nameId}>{t("automations.name")}</Label>
                        <Input id={nameId} value={draft.name ?? ""}
                            onChange={e => onChange({ ...draft, name: e.target.value || null })} />
                    </div>
                    <div className="flex items-center gap-2 min-h-6">
                        <Switch id={enabledId} checked={draft.enabled} onCheckedChange={enabled => onChange({ ...draft, enabled })} />
                        <Label htmlFor={enabledId}>{t("automations.enabled")}</Label>
                    </div>
                </>
            )}
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
        case "moveGroup":
            return (
                <ChoiceSelect label={label} value={action.at}
                    options={[{ value: "top", label: t("automations.values.top") }, { value: "bottom", label: t("automations.values.bottom") }]}
                    onChange={at => onChange({ ...action, at })} />
            )
        case "completeSubtasks":
        case "archiveGroup":
            return null
    }
}
