import { useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import type { DBItemType } from "@/db/queries/shared_queries"
import type { NoteDataTree, Task } from "@/types/types"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Switch } from "@/components/ui/switch"
import { DialogAddColor } from "@/components/dialogs/dialog-add-color"
import { useActiveNote, useActiveNoteActions } from "@/contexts/use-active-note"
import { useActiveNoteId, useSelectedTask, useTabs } from "@/contexts/use-tabs"
import { useWorkspaceActions } from "@/contexts/workspace-data"
import { useUndoRecorder } from "@/contexts/undo/use-undo"
import { findTask } from "@/contexts/note-tree-ops"
import { focusRing } from "@/lib/a11y"
import { formatDate, getErrorMessage } from "@/lib/utils"
import { getGroupLabel } from "../groups/group-label"
import { countTasks } from "../groups/group-progress"

const sectionTitle = "text-xs font-semibold uppercase tracking-wide text-muted-foreground"

const Field = ({ label, children }: { label: string, children: React.ReactNode }) => (
    <div className="flex flex-col gap-1">
        <h3 className={sectionTitle}>{label}</h3>
        <div className="text-sm break-words">{children}</div>
    </div>
)

const ColorSwatch = ({ color }: { color?: string | null }) => color
    ? <span className="inline-block size-4 rounded-full border" style={{ backgroundColor: color }} aria-hidden />
    : null

type DatesProps = { creationDate: string, creationTime: string, editDate: string, editTime: string }

const Dates = ({ creationDate, creationTime, editDate, editTime }: DatesProps) => {
    const { t } = useTranslation()
    return (
        <Field label={t("details.dates")}>
            <p>{t("common.creationDate", { date: formatDate(creationDate), time: creationTime })}</p>
            <p>{t("common.editDate", { date: formatDate(editDate), time: editTime })}</p>
        </Field>
    )
}

const containsTask = (tasks: Task[], taskId: number): boolean =>
    tasks.some(task => task.id === taskId || containsTask(task.subtasks, taskId))

/** "Group › Section" of a task, found in the tree of its note. */
const findTaskPlace = (tree: NoteDataTree, taskId: number): { group: string, section: string } | null => {
    for (const [groupIndex, group] of tree.groups.entries())
        for (const section of group.sections)
            if (containsTask(section.tasks, taskId))
                return { group: getGroupLabel(group, groupIndex), section: section.title }
    return null
}

const ProgressBar = ({ done, total, label }: { done: number, total: number, label: string }) => {
    const percent = total === 0 ? 0 : Math.round((done / total) * 100)
    return (
        <div className="flex flex-col gap-1">
            <Progress value={percent} aria-label={label} />
            <p className="text-xs text-muted-foreground">{label} ({percent}%)</p>
        </div>
    )
}

/** Editable description: the text is saved only with "Save" (same flow as the description dialog). */
const TaskDescription = ({ task }: { task: Task }) => {
    const { t } = useTranslation()
    const { updateTaskDescription } = useWorkspaceActions()
    const { patchTask } = useActiveNoteActions()
    const recorder = useUndoRecorder()
    // null = not being edited: the field follows the task (so an undo shows up at once)
    const [draft, setDraft] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)
    const value = draft ?? task.description ?? ""
    const dirty = draft !== null && draft !== (task.description ?? "")

    const save = async () => {
        if (draft === null) return
        setSaving(true)
        // Optimistic: the cached tree is updated at once and restored if the write fails
        const rollback = patchTask(task.id, { description: draft })
        try {
            await updateTaskDescription(task.id, draft !== "" ? draft : undefined)
            if (draft !== (task.description ?? "")) recorder.taskDescription(task.id, task.text, task.description ?? "", draft)
            setDraft(null)
        } catch (err) {
            rollback()
            toast.error(getErrorMessage(err))
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="flex flex-col gap-1">
            <label htmlFor="details-description" className={sectionTitle}>{t("sidebar.info.description")}</label>
            <textarea
                id="details-description"
                rows={4}
                value={value}
                placeholder={t("sidebar.info.placeholder")}
                onChange={e => setDraft(e.target.value)}
                className={`${focusRing} min-h-24 w-full resize-y rounded-xs border bg-background px-2 py-1 text-sm`}
            />
            {dirty && (
                <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" disabled={saving} onClick={() => setDraft(null)}>{t("common.cancel")}</Button>
                    <Button size="sm" disabled={saving} onClick={() => { void save() }}>{t("common.save")}</Button>
                </div>
            )}
        </div>
    )
}

const TaskDetails = ({ task, tree, noteName }: { task: Task, tree: NoteDataTree, noteName: string }) => {
    const { t } = useTranslation()
    const activeId = useActiveNoteId()
    const { updateTaskPriority, updateItemColor } = useWorkspaceActions()
    const { patchTask } = useActiveNoteActions()
    const recorder = useUndoRecorder()
    const place = findTaskPlace(tree, task.id)
    const subtasks = countTasks(task.subtasks)
    const path = [noteName, place?.group, place?.section].filter(Boolean).join(t("details.pathSeparator"))

    const togglePriority = async () => {
        // Optimistic: the cached tree is updated at once and restored if the write fails
        const rollback = patchTask(task.id, { priority: !task.priority })
        try {
            await updateTaskPriority(task.id, !task.priority)
            recorder.taskPriority(task.id, task.text, !!task.priority, !task.priority)
        } catch {
            rollback()
            toast.error(t("tasks.errors.priority"))
        }
    }

    // The color is applied to the cached tree at once and restored if the write fails
    const addColorItem = async (itemType: DBItemType, itemId: number, color?: string) => {
        const rollback = patchTask(itemId, { color: color ?? null })
        try {
            await updateItemColor(itemType, itemId, color)
        } catch (error) {
            rollback()
            throw error
        }
    }
    const noReload = async () => { }

    return (
        <div className="flex flex-col gap-4">
            <h2 className="text-base font-semibold break-words" aria-label={t("details.taskTitle")}>{task.text}</h2>
            <Field label={t("details.path")}>{path}</Field>
            <Field label={t("details.status")}>{task.completed ? t("details.completed") : t("details.pending")}</Field>
            <div className="flex items-center justify-between gap-2">
                <label htmlFor="details-priority" className={sectionTitle}>{t("details.priority")}</label>
                <Switch id="details-priority" checked={!!task.priority} onCheckedChange={() => { void togglePriority() }} />
            </div>
            <div className="flex items-center justify-between gap-2">
                <h3 className={sectionTitle}>{t("details.color")}</h3>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" aria-label={t("menu.changeColor")}>
                            {task.color ? <ColorSwatch color={task.color} /> : <span className="text-xs">{t("details.noColor")}</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-1">
                        <DialogAddColor
                            item={task}
                            itemType="task"
                            addColorItem={addColorItem}
                            getItemId={activeId ?? undefined}
                            getItemData={noReload}
                        />
                    </PopoverContent>
                </Popover>
            </div>
            <TaskDescription key={task.id} task={task} />
            <Field label={t("details.subtasks")}>
                {subtasks.total === 0
                    ? <span className="text-muted-foreground">{t("details.noSubtasks")}</span>
                    : <ProgressBar done={subtasks.done} total={subtasks.total} label={t("details.subtasksProgress", { done: subtasks.done, total: subtasks.total })} />}
            </Field>
            <Dates creationDate={task.creation_date} creationTime={task.creation_time} editDate={task.edit_date} editTime={task.edit_time} />
        </div>
    )
}

/**
 * The details of the selected task of the active note or, without selection, of the note itself.
 * @category RightPanel
 */
export function DetailsPanel() {
    const { t } = useTranslation()
    const { currentNote } = useTabs()
    const { noteDataTree } = useActiveNote()
    const [selectedId] = useSelectedTask(currentNote?.id ?? null)

    if (!currentNote) return <p className="p-3 text-sm text-muted-foreground">{t("details.emptyNote")}</p>
    if (!noteDataTree) return <p className="p-3 text-sm text-muted-foreground">{t("details.loading")}</p>

    const task = selectedId !== null ? findTask(noteDataTree, selectedId)?.task : undefined
    if (task) {
        return (
            <div className="p-3">
                <TaskDetails task={task} tree={noteDataTree} noteName={currentNote.name} />
            </div>
        )
    }

    const sections = noteDataTree.groups.flatMap(group => group.sections)
    const counts = countTasks(sections.flatMap(section => section.tasks))
    return (
        <div className="flex flex-col gap-4 p-3">
            <h2 className="text-base font-semibold break-words" aria-label={t("details.noteTitle")}>{currentNote.name}</h2>
            <Field label={t("details.stats")}>
                <ul className="flex flex-col gap-0.5">
                    <li>{t("common.counts.group", { count: noteDataTree.groups.length })}</li>
                    <li>{t("common.counts.section", { count: sections.length })}</li>
                    <li>{t("common.counts.task", { count: counts.total })}</li>
                </ul>
            </Field>
            <Field label={t("details.progress")}>
                {counts.total === 0
                    ? <span className="text-muted-foreground">{t("details.noTasks")}</span>
                    : <ProgressBar done={counts.done} total={counts.total} label={t("details.tasksProgress", { done: counts.done, total: counts.total })} />}
            </Field>
            {currentNote.color && <Field label={t("details.color")}><ColorSwatch color={currentNote.color} /></Field>}
            <Dates creationDate={currentNote.creation_date} creationTime={currentNote.creation_time} editDate={currentNote.edit_date} editTime={currentNote.edit_time} />
        </div>
    )
}
