import { useTranslation } from "react-i18next"
import i18n from "@/i18n"
import { useCallback, useEffect, useId, useMemo, useState } from "react"
import { Check, Loader2, Pencil, Plus, Trash2, X, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { NativeSelect } from "@/components/native-select"
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
import { getErrorMessage } from "@/lib/utils"

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
    // The rule being edited (id null = a new one), null while the list is shown
    const [editing, setEditing] = useState<{ id: number | null, draft: AutomationDraft } | null>(null)
    const [deleting, setDeleting] = useState<Automation | null>(null)
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

    const startNew = () => {
        const trigger: AutomationTrigger = { type: "task.completed", sectionId: sectionId ?? null }
        setError(null)
        setEditing({ id: null, draft: { name: null, enabled: true, trigger, actions: [defaultAction("moveTo", sections, trigger.sectionId)] } })
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
        if (!open) {
            setEditing(null)
            setError(null)
        }
        onOpenChange(open)
    }

    return (
        <>
            <Dialog open={isOpen} onOpenChange={handleOpenChange}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Zap className="size-4" />
                            {editing ? t(editing.id === null ? "automations.newTitle" : "automations.editTitle") : t("automations.title")}
                        </DialogTitle>
                        <DialogDescription>{t("automations.description")}</DialogDescription>
                    </DialogHeader>

                    {!loaded ? (
                        <div className="flex justify-center py-6"><Loader2 className="size-5 animate-spin" /></div>
                    ) : editing ? (
                        <AutomationEditor
                            draft={editing.draft}
                            groups={groups}
                            sections={sections}
                            onChange={draft => { setError(null); setEditing({ ...editing, draft }) }}
                        />
                    ) : sections.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4">{t("automations.noSections")}</p>
                    ) : rules.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4">{t("automations.empty")}</p>
                    ) : (
                        <ul className="flex flex-col divide-y border rounded-xs max-h-[50vh] overflow-y-auto">
                            {rules.map(rule => {
                                const paused = referencedSections(rule).some(id => titleOf(id) === undefined)
                                return (
                                    <li key={rule.id} className="flex items-center gap-3 px-3 py-2">
                                        <Switch
                                            checked={rule.enabled}
                                            onCheckedChange={checked => void toggle(rule, checked)}
                                            aria-label={t("automations.enabled")}
                                        />
                                        <div className="flex flex-col min-w-0 flex-1">
                                            {rule.name && <span className="text-sm font-medium truncate">{rule.name}</span>}
                                            <span className={rule.name ? "text-xs text-muted-foreground" : "text-sm"}>
                                                {describeAutomation(rule, titleOf)}
                                            </span>
                                            {paused && <span className="text-xs text-destructive">{t("automations.paused")}</span>}
                                        </div>
                                        <TooltipCustom text={t("automations.edit")}>
                                            <Button variant="ghost" size="icon" aria-label={t("automations.edit")}
                                                onClick={() => { setError(null); setEditing({ id: rule.id, draft: { name: rule.name, enabled: rule.enabled, trigger: rule.trigger, actions: rule.actions } }) }}>
                                                <Pencil />
                                            </Button>
                                        </TooltipCustom>
                                        <TooltipCustom text={t("automations.delete")}>
                                            <Button variant="ghost" size="icon" aria-label={t("automations.delete")} className="text-destructive hover:text-destructive"
                                                onClick={() => setDeleting(rule)}>
                                                <Trash2 />
                                            </Button>
                                        </TooltipCustom>
                                    </li>
                                )
                            })}
                        </ul>
                    )}

                    {error && <p className="text-sm text-destructive">{error}</p>}

                    <DialogFooter>
                        {editing ? (
                            <>
                                <Button variant="outline" type="button" onClick={() => { setEditing(null); setError(null) }}>
                                    {t("common.cancel")}
                                </Button>
                                <Button type="button" onClick={() => void save()} disabled={saving}>
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

/** The options of a section select, grouped by group. */
const SectionOptions = ({ groups }: { groups: GroupOption[] }) => (
    <>
        {groups.filter(group => group.sections.length > 0).map(group => (
            <optgroup key={group.id} label={group.label}>
                {group.sections.map(section => <option key={section.id} value={section.id}>{section.title}</option>)}
            </optgroup>
        ))}
    </>
)

/** A select whose value is a section id; a missing section is shown as such instead of silently picking another one. */
const SectionSelect = ({ value, groups, sections, onChange, allowAny, label }: {
    value: number | null, groups: GroupOption[], sections: SectionOption[], onChange: (id: number | null) => void, allowAny?: boolean, label: string,
}) => {
    const { t } = useTranslation()
    const missing = value !== null && !sections.some(section => section.id === value)
    return (
        <NativeSelect aria-label={label} value={value ?? ""} onChange={e => onChange(e.target.value === "" ? null : Number(e.target.value))}>
            {allowAny && <option value="">{t("automations.anySection")}</option>}
            {missing && <option value={value}>{t("automations.describe.missingSection")}</option>}
            <SectionOptions groups={groups} />
        </NativeSelect>
    )
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
                <Input id={nameId} value={draft.name ?? ""} placeholder={t("automations.namePlaceholder")}
                    onChange={e => onChange({ ...draft, name: e.target.value || null })} />
            </div>

            <fieldset className="grid gap-2">
                <legend className="text-sm font-medium mb-2">{t("automations.when")}</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                    <NativeSelect aria-label={t("automations.when")} value={trigger.type}
                        onChange={e => onChange({ ...draft, trigger: defaultTrigger(e.target.value as AutomationTriggerType, trigger.sectionId, sections) })}>
                        {TRIGGER_TYPES.map(type => <option key={type} value={type}>{triggerLabel(type)}</option>)}
                    </NativeSelect>
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
                <legend className="text-sm font-medium mb-2">{t("automations.then")}</legend>
                {actions.map((action, index) => (
                    <div key={index} className="flex items-center gap-2">
                        <NativeSelect aria-label={t("automations.then")} className="sm:w-56 shrink-0" value={action.type}
                            onChange={e => setAction(index, defaultAction(e.target.value as AutomationActionType, sections, trigger.sectionId))}>
                            {ACTION_TYPES.map(type => <option key={type} value={type}>{actionLabel(type)}</option>)}
                        </NativeSelect>
                        <ActionParams action={action} groups={groups} sections={sections} onChange={next => setAction(index, next)} />
                        <TooltipCustom text={t("automations.removeAction")}>
                            <Button variant="ghost" size="icon" aria-label={t("automations.removeAction")} className="shrink-0"
                                onClick={() => onChange({ ...draft, actions: actions.filter((_, i) => i !== index) })}>
                                <X />
                            </Button>
                        </TooltipCustom>
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
    switch (action.type) {
        case "moveTo":
            return (
                <div className="flex flex-1 gap-2 min-w-0">
                    <SectionSelect label={actionLabel("moveTo")} value={action.sectionId} groups={groups} sections={sections}
                        onChange={id => { if (id !== null) onChange({ ...action, sectionId: id }) }} />
                    <NativeSelect aria-label={actionLabel("moveTo")} className="w-36 shrink-0" value={action.at}
                        onChange={e => onChange({ ...action, at: e.target.value as "top" | "bottom" })}>
                        <option value="top">{t("automations.values.top")}</option>
                        <option value="bottom">{t("automations.values.bottom")}</option>
                    </NativeSelect>
                </div>
            )
        case "setCompleted":
            return (
                <NativeSelect aria-label={actionLabel(action.type)} value={String(action.value)} onChange={e => onChange({ ...action, value: e.target.value === "true" })}>
                    <option value="true">{t("automations.values.completed")}</option>
                    <option value="false">{t("automations.values.open")}</option>
                </NativeSelect>
            )
        case "setPriority":
            return (
                <NativeSelect aria-label={actionLabel(action.type)} value={String(action.value)} onChange={e => onChange({ ...action, value: e.target.value === "true" })}>
                    <option value="true">{t("automations.values.add")}</option>
                    <option value="false">{t("automations.values.remove")}</option>
                </NativeSelect>
            )
        case "setColor":
            return (
                <div className="flex flex-1 items-center gap-2 min-w-0">
                    <span aria-hidden className="size-5 shrink-0 rounded-xs border" style={{ backgroundColor: action.color ?? "transparent" }} />
                    <NativeSelect aria-label={actionLabel(action.type)} value={action.color ?? ""} onChange={e => onChange({ ...action, color: e.target.value || null })}>
                        <option value="">{t("automations.values.noColor")}</option>
                        {/* A color picked elsewhere (not in the palette) stays selectable */}
                        {action.color && !(PALETTE_COLORS as readonly string[]).includes(action.color) && <option value={action.color}>{action.color}</option>}
                        {PALETTE_COLORS.map(color => <option key={color} value={color}>{color}</option>)}
                    </NativeSelect>
                </div>
            )
        case "completeSubtasks":
            return <div className="flex-1" />
    }
}
