import { useContext, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import type { DBItemType } from "@/db/queries/shared_queries"
import type { AudioFile, NoteDataTree, Task } from "@/types/types"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Switch } from "@/components/ui/switch"
import { DialogAddColor } from "@/components/dialogs/dialog-add-color"
import { useActiveNote, useActiveNoteActions } from "@/contexts/use-active-note"
import { useActiveNoteId, useSelectedTask, useTabs } from "@/contexts/use-tabs"
import { useWorkspaceActions } from "@/contexts/workspace-data"
import { useUndoRecorder } from "@/contexts/undo/use-undo"
import { findTask } from "@/contexts/note-tree-ops"
import { formatDate, getErrorMessage } from "@/lib/utils"
import { reportError } from "@/lib/report-error"
import { useSubmitOnce } from "@/hooks/use-submit-once"
import { AudioContext, type AudioTrack } from "@/contexts/audio-context-object"
import { formatBitDepth, formatBitrate, formatChannels, formatDateTime, formatDuration, formatFileSize, formatPosition, formatSampleRate, getAudioMetadata, type AudioMetadata } from "@/lib/audio-metadata"
import { RightPanelContext } from "./right-panel-context-object"
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

type ColorFieldProps = {
    item: { id: number, color?: string | null }
    itemType: DBItemType
    addColorItem: (itemType: DBItemType, itemId: number, color?: string) => Promise<void>
    getItemId?: number
}

/** The color of an item: a button showing it (or "no color") that opens the palette. */
const ColorField = ({ item, itemType, addColorItem, getItemId }: ColorFieldProps) => {
    const { t } = useTranslation()
    const noReload = async () => { }
    return (
        <div className="flex items-center justify-between gap-2">
            <h3 className={sectionTitle}>{t("details.color")}</h3>
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" aria-label={t("menu.changeColor")}>
                        {item.color ? <ColorSwatch color={item.color} /> : <span className="text-xs">{t("details.noColor")}</span>}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-1">
                    <DialogAddColor
                        item={item}
                        itemType={itemType}
                        addColorItem={addColorItem}
                        getItemId={getItemId}
                        getItemData={noReload}
                    />
                </PopoverContent>
            </Popover>
        </div>
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
    const { saving, run } = useSubmitOnce()
    const value = draft ?? task.description ?? ""
    const dirty = draft !== null && draft !== (task.description ?? "")

    const save = async () => {
        if (draft === null) return
        await run(async () => {
            // Optimistic: the cached tree is updated at once and restored if the write fails
            const rollback = patchTask(task.id, { description: draft })
            try {
                await updateTaskDescription(task.id, draft !== "" ? draft : undefined)
                if (draft !== (task.description ?? "")) recorder.taskDescription(task.id, task.text, task.description ?? "", draft)
                setDraft(null)
            } catch (err) {
                rollback()
                reportError(err, getErrorMessage(err))
            }
        })
    }

    return (
        <div className="flex flex-col gap-1">
            <Label htmlFor="details-description" className={sectionTitle}>{t("sidebar.info.description")}</Label>
            <Textarea
                id="details-description"
                rows={4}
                value={value}
                placeholder={t("sidebar.info.placeholder")}
                onChange={e => setDraft(e.target.value)}
                className="min-h-24 resize-y bg-background px-2 py-1 text-sm md:text-sm"
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

    return (
        <div className="flex flex-col gap-4">
            <h2 className="text-base font-semibold break-words"><span className="sr-only">{t("details.taskTitle")} </span>{task.text}</h2>
            <Field label={t("details.path")}>{path}</Field>
            <Field label={t("details.status")}>{task.completed ? t("details.completed") : t("details.pending")}</Field>
            <div className="flex items-center justify-between gap-2">
                <Label htmlFor="details-priority" className={sectionTitle}>{t("details.priority")}</Label>
                <Switch id="details-priority" checked={!!task.priority} onCheckedChange={() => { void togglePriority() }} />
            </div>
            <ColorField
                item={task}
                itemType="task"
                addColorItem={addColorItem}
                getItemId={activeId ?? undefined}
            />
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
 * The details of the selected task of the active note or, without selection, of the note itself (top half of the panel).
 * @category RightPanel
 */
function NoteOrTaskDetails() {
    const { t } = useTranslation()
    const { currentNote } = useTabs()
    const { noteDataTree } = useActiveNote()
    const { updateItemColor } = useWorkspaceActions()
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
            <h2 className="text-base font-semibold break-words"><span className="sr-only">{t("details.noteTitle")} </span>{currentNote.name}</h2>
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
            {/* The cached sidebar tree is patched by updateItemColor, and the open note reads its color from it */}
            <ColorField item={currentNote} itemType="note" addColorItem={updateItemColor} getItemId={currentNote.id} />
            <Dates creationDate={currentNote.creation_date} creationTime={currentNote.creation_time} editDate={currentNote.edit_date} editTime={currentNote.edit_time} />
        </div>
    )
}

type AudioInfoState = { path: string, metadata: AudioMetadata | null, failed: boolean }

/** The path of the loaded track: from the lists already loaded, otherwise decoded from its asset URL. */
const trackPath = (track: AudioTrack, filesCache: Map<number, AudioFile[]>): string | null => {
    for (const files of filesCache.values()) {
        const file = files.find(candidate => candidate.id === track.audioId)
        if (file) return file.path
    }
    try {
        // convertFileSrc: <scheme>://<host>/<encoded path>
        const encoded = new URL(track.src).pathname.slice(1)
        return encoded ? decodeURIComponent(encoded) : null
    } catch {
        return null
    }
}

const AudioFields = ({ name, path, metadata }: { name: string, path: string, metadata: AudioMetadata }) => {
    const { t } = useTranslation()
    const channelLabels = {
        mono: t("details.audio.mono"),
        stereo: t("details.audio.stereo"),
        many: (count: number) => t("details.audio.channelsCount", { count }),
    }
    const present = (value: number | null | undefined): value is number => value !== null && value !== undefined && value > 0
    const rows: [string, string | null][] = [
        [t("details.audio.format"), metadata.format ?? null],
        [t("details.audio.codec"), metadata.codec ?? null],
        [t("details.audio.duration"), present(metadata.durationMs) ? formatDuration(metadata.durationMs) : null],
        [t("details.audio.size"), formatFileSize(metadata.sizeBytes)],
        [t("details.audio.modified"), present(metadata.modifiedMs) ? formatDateTime(metadata.modifiedMs) : null],
        [t("details.audio.audioBitrate"), present(metadata.audioBitrate) ? formatBitrate(metadata.audioBitrate) : null],
        [t("details.audio.overallBitrate"), present(metadata.overallBitrate) ? formatBitrate(metadata.overallBitrate) : null],
        [t("details.audio.sampleRate"), present(metadata.sampleRate) ? formatSampleRate(metadata.sampleRate) : null],
        [t("details.audio.bitDepth"), present(metadata.bitDepth) ? formatBitDepth(metadata.bitDepth) : null],
        [t("details.audio.channels"), present(metadata.channels) ? formatChannels(metadata.channels, channelLabels) : null],
        [t("details.audio.albumArtist"), metadata.albumArtist ?? null],
        [t("details.audio.date"), metadata.date ?? null],
        [t("details.audio.track"), present(metadata.track) ? formatPosition(metadata.track, metadata.trackTotal) : null],
        [t("details.audio.disc"), present(metadata.disc) ? formatPosition(metadata.disc) : null],
        [t("details.audio.genre"), metadata.genre ?? null],
        [t("details.audio.composer"), metadata.composer ?? null],
        [t("details.audio.comment"), metadata.comment ?? null],
    ]
    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
                {metadata.cover && (
                    <img src={metadata.cover} alt={t("details.audio.cover")} className="mb-2 aspect-square w-full max-w-48 self-center rounded-xs border object-cover" />
                )}
                <h2 className="text-base font-semibold break-words"><span className="sr-only">{t("details.audio.fileTitle")} </span>{metadata.title ?? name}</h2>
                {metadata.artist && <p className="text-sm break-words">{metadata.artist}</p>}
                {metadata.album && <p className="text-sm text-muted-foreground break-words">{metadata.album}</p>}
            </div>
            <Field label={t("details.audio.file")}><span className="break-all">{path}</span></Field>
            {rows.map(([label, value]) => value && <Field key={label} label={label}>{value}</Field>)}
        </div>
    )
}

/**
 * The information of an audio file (bottom half of the panel): the file chosen with "Information" in its menu,
 * otherwise the one loaded in the player. The data is read when the file changes.
 * @category RightPanel
 */
const AudioDetails = () => {
    const { t } = useTranslation()
    const chosen = useContext(RightPanelContext)?.audioInfoFile ?? null
    const audio = useContext(AudioContext)
    const track = audio?.track ?? null
    const filesCache = audio?.filesCache
    const file = chosen
        ? { name: chosen.name, path: chosen.path }
        : track && filesCache ? { name: track.name, path: trackPath(track, filesCache) } : null
    const path = file?.path ?? null
    const [state, setState] = useState<AudioInfoState | null>(null)

    useEffect(() => {
        if (!path) return
        let cancelled = false
        getAudioMetadata(path)
            .then(metadata => { if (!cancelled) setState({ path, metadata, failed: false }) })
            .catch(() => { if (!cancelled) setState({ path, metadata: null, failed: true }) })
        return () => { cancelled = true }
    }, [path])

    let content: React.ReactNode
    if (!file || !path) content = <p className="text-sm text-muted-foreground">{t("details.audio.empty")}</p>
    else if (state?.path !== path) content = <p className="text-sm text-muted-foreground">{t("details.audio.loading")}</p>
    else if (state.failed || !state.metadata) content = <p role="alert" className="text-sm text-destructive">{t("details.audio.error")}</p>
    else content = <AudioFields name={file.name} path={path} metadata={state.metadata} />

    return (
        <section aria-label={t("details.audio.title")} className="flex min-h-0 flex-1 flex-col border-t">
            <h2 className={`${sectionTitle} shrink-0 px-3 pt-3`}>{t("details.audio.title")}</h2>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">{content}</div>
        </section>
    )
}

/**
 * The Details tab, split in two halves with their own scroll: the selected task (or the active note) on top, the
 * information of the audio file below.
 * @category RightPanel
 */
export function DetailsPanel() {
    return (
        <div className="flex h-full flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto"><NoteOrTaskDetails /></div>
            <AudioDetails />
        </div>
    )
}
