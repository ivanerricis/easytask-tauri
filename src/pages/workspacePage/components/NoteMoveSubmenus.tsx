import { useTranslation } from "react-i18next"
import { useMemo } from "react"
import { FolderInput } from "lucide-react"
import { MenuItem, MenuSeparator, MenuSub, MenuSubContent, MenuSubTrigger } from "@/components/menu-kind"
import { useActiveNote } from "@/contexts/use-active-note"
import { END_INDEX, getSectionMoveDestinations, getTaskMoveDestinations } from "./note-dnd"
import { useNoteMoves } from "./note-dnd-state"

type SectionMoveSubmenuProps = {
    sectionId: number
    /** Called when a destination is chosen (typically closes the parent menu). */
    onDone?: () => void
}

/**
 * "Sposta in…" submenu of a section: accessible alternative to drag & drop.
 * Lists the other groups of the note (name or "Gruppo N", with the titles of their sections as hint) and a new group.
 * The section is appended at the end of the chosen group.
 * @category Note DnD
 */
export const SectionMoveSubmenu = ({ sectionId, onDone }: SectionMoveSubmenuProps) => {
    const { t } = useTranslation()
    const { noteDataTree } = useActiveNote()
    const { moveSectionTo } = useNoteMoves()

    const destinations = useMemo(
        () => noteDataTree ? getSectionMoveDestinations(noteDataTree, sectionId) : null,
        [noteDataTree, sectionId],
    )

    if (!destinations || (destinations.groups.length === 0 && !destinations.canCreateGroup)) return null

    return (
        <MenuSub>
            <MenuSubTrigger>
                <FolderInput className="size-4" />
                {t("menu.moveTo")}
            </MenuSubTrigger>
            <MenuSubContent className="max-h-64 min-w-40 overflow-y-auto">
                {destinations.groups.map(group => (
                    <MenuItem
                        key={group.id}
                        className="text-xs"
                        onSelect={() => { onDone?.(); void moveSectionTo(sectionId, { type: "group", groupId: group.id, index: END_INDEX }) }}
                    >
                        <span className="shrink-0">{group.label}</span>
                        <span className="max-w-48 truncate text-muted-foreground">{group.hint}</span>
                    </MenuItem>
                ))}
                {destinations.canCreateGroup && <>
                    {destinations.groups.length > 0 && <MenuSeparator />}
                    <MenuItem
                        className="text-xs"
                        onSelect={() => { onDone?.(); void moveSectionTo(sectionId, { type: "new-group", index: destinations.newGroupIndex }) }}
                    >
                        {t("menu.newGroup")}
                    </MenuItem>
                </>}
            </MenuSubContent>
        </MenuSub>
    )
}

type TaskMoveSubmenuProps = {
    taskId: number
    /** Called when a destination is chosen (typically closes the parent menu). */
    onDone?: () => void
}

/**
 * "Sposta in…" submenu of a task or subtask: accessible alternative to drag & drop.
 * Lists every section of the note (the task becomes its last top level task) and, indented under each section,
 * its tasks and subtasks (the task becomes their last subtask). Invalid targets (itself, its own subtree,
 * its current parent) are not listed.
 * @category Note DnD
 */
export const TaskMoveSubmenu = ({ taskId, onDone }: TaskMoveSubmenuProps) => {
    const { t } = useTranslation()
    const { noteDataTree } = useActiveNote()
    const { moveTaskTo } = useNoteMoves()

    const destinations = useMemo(
        () => noteDataTree ? getTaskMoveDestinations(noteDataTree, taskId) : [],
        [noteDataTree, taskId],
    )

    if (destinations.length === 0) return null

    return (
        <MenuSub>
            <MenuSubTrigger>
                <FolderInput className="size-4" />
                {t("menu.moveTo")}
            </MenuSubTrigger>
            <MenuSubContent className="max-h-72 min-w-48 max-w-80 overflow-y-auto">
                {destinations.map(destination => (
                    <MenuItem
                        key={destination.key}
                        className="text-xs"
                        style={{ paddingLeft: `${0.5 + destination.depth * 0.75}rem` }}
                        onSelect={() => {
                            onDone?.()
                            void moveTaskTo(taskId, {
                                sectionId: destination.sectionId,
                                parentTaskId: destination.parentTaskId,
                                index: END_INDEX,
                            })
                        }}
                    >
                        {destination.type === "section"
                            ? <>
                                <span className="truncate font-medium">{t("menu.sectionLabel", { label: destination.label })}</span>
                                {destination.hint && <span className="ml-auto shrink-0 text-muted-foreground">{destination.hint}</span>}
                            </>
                            : <span className="truncate" title={t("menu.underTask", { label: destination.label })}>↳ {destination.label}</span>}
                    </MenuItem>
                ))}
            </MenuSubContent>
        </MenuSub>
    )
}
