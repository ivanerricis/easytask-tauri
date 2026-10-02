import { useTranslation } from "react-i18next"
import { useMemo } from "react"
import { ButtonInPopover } from "@/components/button-in-popover"
import { useActiveNote } from "@/contexts/use-active-note"
import { usePreferences } from "@/contexts/use-preferences"
import { useGroupMoves, useNoteMoves } from "./note-dnd-state"
import { getGroupStep, getSectionStep, getTaskStep, type Step } from "./note-steps"

type StepButtonsProps = {
    /** Vertical lists (tasks, sections) or the horizontal row of the groups. */
    direction?: "vertical" | "horizontal"
    canMoveUp: boolean
    canMoveDown: boolean
    onMove: (step: Step) => void
}

/** The "Sposta su" / "Sposta giù" items ("a sinistra" / "a destra" for the groups); disabled when the item is already first / last. */
const StepButtons = ({ direction = "vertical", canMoveUp, canMoveDown, onMove }: StepButtonsProps) => {
    const { t } = useTranslation()
    const horizontal = direction === "horizontal"
    return (
        <>
            <ButtonInPopover text={t(horizontal ? "menu.moveLeft" : "menu.moveUp")} type={horizontal ? "moveLeft" : "moveUp"} disabled={!canMoveUp} onClick={() => onMove(-1)} />
            <ButtonInPopover text={t(horizontal ? "menu.moveRight" : "menu.moveDown")} type={horizontal ? "moveRight" : "moveDown"} disabled={!canMoveDown} onClick={() => onMove(1)} />
        </>
    )
}

type StepMovesProps = {
    /** Called when a move is chosen (typically closes the parent menu). */
    onDone?: () => void
}

/**
 * "Sposta su / giù" of a task or subtask: one step among its siblings (accessible alternative to drag & drop,
 * next to "Sposta in…"). Completed siblings that are hidden are jumped over.
 * @category Note DnD
 */
export const TaskStepMoves = ({ taskId, onDone }: StepMovesProps & { taskId: number }) => {
    const { noteDataTree } = useActiveNote()
    const { hideCompletedTasks } = usePreferences()
    const { moveTaskTo } = useNoteMoves()

    const steps = useMemo(() => noteDataTree
        ? { up: getTaskStep(noteDataTree, taskId, -1, hideCompletedTasks), down: getTaskStep(noteDataTree, taskId, 1, hideCompletedTasks) }
        : { up: null, down: null }, [noteDataTree, taskId, hideCompletedTasks])

    return (
        <StepButtons
            canMoveUp={steps.up !== null}
            canMoveDown={steps.down !== null}
            onMove={step => {
                const target = step < 0 ? steps.up : steps.down
                if (!target) return
                onDone?.()
                void moveTaskTo(taskId, target)
            }}
        />
    )
}

/** "Sposta su / giù" of a section: one step among the sections of its group. */
export const SectionStepMoves = ({ sectionId, onDone }: StepMovesProps & { sectionId: number }) => {
    const { noteDataTree } = useActiveNote()
    const { moveSectionTo } = useNoteMoves()

    const steps = useMemo(() => noteDataTree
        ? { up: getSectionStep(noteDataTree, sectionId, -1), down: getSectionStep(noteDataTree, sectionId, 1) }
        : { up: null, down: null }, [noteDataTree, sectionId])

    return (
        <StepButtons
            canMoveUp={steps.up !== null}
            canMoveDown={steps.down !== null}
            onMove={step => {
                const target = step < 0 ? steps.up : steps.down
                if (!target) return
                onDone?.()
                void moveSectionTo(sectionId, target)
            }}
        />
    )
}

/** "Sposta a sinistra / destra" of a group: one step among the groups of the note (they are laid out in a row). */
export const GroupStepMoves = ({ groupId, onDone }: StepMovesProps & { groupId: number }) => {
    const { noteDataTree } = useActiveNote()
    const { moveGroupTo } = useGroupMoves()

    const steps = useMemo(() => noteDataTree
        ? { up: getGroupStep(noteDataTree, groupId, -1), down: getGroupStep(noteDataTree, groupId, 1) }
        : { up: null, down: null }, [noteDataTree, groupId])

    return (
        <StepButtons
            direction="horizontal"
            canMoveUp={steps.up !== null}
            canMoveDown={steps.down !== null}
            onMove={step => {
                const index = step < 0 ? steps.up : steps.down
                if (index === null) return
                onDone?.()
                void moveGroupTo(groupId, index)
            }}
        />
    )
}
