import { createError, handleDBError } from "@/types/error"
import { getDB } from "../dbManager"
import { Transaction, type TxRef } from "../transaction"

const SECTION_UNIQUE_MESSAGE = "Esiste già una sezione con questo nome nel gruppo di destinazione."

/**
 * Clamps a caller supplied index to the valid range [0, length].
 * @category Database Queries
 */
const clampIndex = (index: number, length: number) => Math.max(0, Math.min(Math.trunc(index) || 0, length))

/**
 * Builds the single UPDATE that assigns sequential positions to an ordered list of rows.
 * @param table Table to update (fixed by the callers, never user input).
 * @param ids Row ids in their final order.
 * @returns The SQL and its parameters.
 * @category Database Queries
 */
function buildPositionUpdate(table: "section" | "task" | "section_group", ids: (number | TxRef)[]) {
    const cases = ids.map(() => "WHEN ? THEN ?").join(" ")
    const placeholders = ids.map(() => "?").join(",")
    const params: unknown[] = []
    ids.forEach((id, index) => params.push(id, index))
    params.push(...ids)
    return {
        sql: `UPDATE ${table} SET position = CASE id ${cases} END WHERE id IN (${placeholders})`,
        params,
    }
}

/**
 * Rethrows createError objects (already user facing) and wraps anything else.
 * @category Database Queries
 */
function rethrow(error: unknown, prefix: string, messages: { UNIQUE?: string } = {}): never {
    if (typeof error === "object" && error !== null && "code" in error && "message" in error)
        throw error
    handleDBError(error, prefix, messages)
    throw error
}

/**
 * Moves a section to a group of the same note, at a given index among the sections of that group.
 * The section keeps everything it owns (tasks, subtasks and trashed tasks reference it by id, so they follow it).
 * Destination siblings are renumbered with one UPDATE, and so are the source siblings when the group changes
 * (all the writes run in one transaction).
 * A source group left without sections stays in the note (groups are removed only explicitly).
 * The caller is responsible for reloading the note data.
 * @param sectionId ID of the section to move.
 * @param targetGroupId ID of the destination group (same note, not deleted).
 * @param targetIndex Position among the destination sections (0 based, clamped).
 * @throws SECTION_MOVE_INVALID when the section or the destination group is not valid.
 * @throws SECTION_EXISTS when the destination group already has a section with the same title.
 * @category Database Queries
 */
export async function moveDBSection(sectionId: number, targetGroupId: number, targetIndex: number) {
    const db = await getDB()

    try {
        const sections = await db.select<{ id: number, groupID: number, noteID: number }[]>(
            `SELECT s.id, s.groupID, g.noteID FROM section s
             INNER JOIN section_group g ON g.id = s.groupID
             WHERE s.id = ? AND s.deleted_at IS NULL`, [sectionId])
        const section = sections[0]
        if (!section)
            throw createError("SECTION_MOVE_INVALID", "La sezione da spostare non esiste.")

        const targets = await db.select<{ id: number, noteID: number }[]>(
            'SELECT id, noteID FROM section_group WHERE id = ? AND deleted_at IS NULL', [targetGroupId])
        if (!targets[0] || targets[0].noteID !== section.noteID)
            throw createError("SECTION_MOVE_INVALID", "Il gruppo di destinazione non è valido.")

        const siblings = await db.select<{ id: number }[]>(
            `SELECT id FROM section WHERE groupID = ? AND deleted_at IS NULL AND id <> ? ORDER BY position, id`,
            [targetGroupId, sectionId])
        const order = siblings.map(row => row.id)
        order.splice(clampIndex(targetIndex, order.length), 0, sectionId)

        const cases = order.map(() => "WHEN ? THEN ?").join(" ")
        const params: number[] = [targetGroupId]
        order.forEach((id, index) => params.push(id, index))
        params.push(...order)
        const tx = new Transaction()
        tx.add(
            `UPDATE section SET groupID = ?, position = CASE id ${cases} END WHERE id IN (${order.map(() => "?").join(",")})`,
            params)

        if (section.groupID !== targetGroupId) {
            // The moved section is excluded: it is already in the destination
            const remaining = await db.select<{ id: number }[]>(
                'SELECT id FROM section WHERE groupID = ? AND deleted_at IS NULL AND id <> ? ORDER BY position, id',
                [section.groupID, sectionId])
            if (remaining.length > 0) {
                const update = buildPositionUpdate("section", remaining.map(row => row.id))
                tx.add(update.sql, update.params)
            }
        }
        await tx.run()
    } catch (error: unknown) {
        rethrow(error, "SECTION", { UNIQUE: SECTION_UNIQUE_MESSAGE })
    }
}

/**
 * Moves a section into a brand new group created at the given index among the groups of the note
 * (the section is pulled out into its own column; all the writes run in one transaction). The index refers to the groups as they are before the move
 * (the source group included); the other groups shift and the source group stays even when it ends up empty.
 * The caller is responsible for reloading the note data.
 * @param sectionId ID of the section to move.
 * @param groupPosition Index of the new group among the groups of the note (0 based, clamped).
 * @throws SECTION_MOVE_INVALID when the section does not exist.
 * @category Database Queries
 */
export async function moveDBSectionToNewGroup(sectionId: number, groupPosition: number) {
    const db = await getDB()

    try {
        const sections = await db.select<{ id: number, groupID: number, noteID: number }[]>(
            `SELECT s.id, s.groupID, g.noteID FROM section s
             INNER JOIN section_group g ON g.id = s.groupID
             WHERE s.id = ? AND s.deleted_at IS NULL`, [sectionId])
        const section = sections[0]
        if (!section)
            throw createError("SECTION_MOVE_INVALID", "La sezione da spostare non esiste.")

        const groups = await db.select<{ id: number }[]>(
            'SELECT id FROM section_group WHERE noteID = ? AND deleted_at IS NULL ORDER BY position, id', [section.noteID])
        const order = groups.map(row => row.id)
        const index = clampIndex(groupPosition, order.length)

        // The source group is renumbered without the moved section (it is about to leave)
        const remaining = await db.select<{ id: number }[]>(
            'SELECT id FROM section WHERE groupID = ? AND deleted_at IS NULL AND id <> ? ORDER BY position, id',
            [section.groupID, sectionId])

        const tx = new Transaction()
        const created = tx.add('INSERT INTO section_group (noteID, position) VALUES (?, ?)', [section.noteID, index])
        const newGroup = tx.idOf(created)
        const groupOrder: (number | TxRef)[] = [...order]
        groupOrder.splice(index, 0, newGroup)

        tx.add('UPDATE section SET groupID = ?, position = 0 WHERE id = ?', [newGroup, sectionId])
        if (remaining.length > 0) {
            const update = buildPositionUpdate("section", remaining.map(row => row.id))
            tx.add(update.sql, update.params)
        }
        const groupUpdate = buildPositionUpdate("section_group", groupOrder)
        tx.add(groupUpdate.sql, groupUpdate.params)
        await tx.run()
    } catch (error: unknown) {
        rethrow(error, "SECTION", { UNIQUE: SECTION_UNIQUE_MESSAGE })
    }
}

/**
 * Destination of a task: a section (top level) or a parent task inside that section.
 * @category Database Queries
 */
export type TaskMoveTarget = {
    sectionId: number
    /** null = top level task of the section, otherwise the new parent task (must belong to `sectionId`). */
    parentTaskId: number | null
}

/**
 * Moves a task (with its whole subtree, trashed descendants included) to a section of the same note,
 * either at the top level or under another task, at a given index among its new siblings.
 * One UPDATE sets the new section/parent/positions of the destination siblings and the sectionID of every
 * descendant (invariant: every task carries the section of its root task); the old siblings are then renumbered
 * (all the writes run in one transaction).
 * The caller is responsible for reloading the note data.
 * @param taskId ID of the task to move.
 * @param target Destination section and optional parent task.
 * @param targetIndex Position among the destination siblings (0 based, clamped).
 * @throws TASK_MOVE_INVALID when the task/target does not exist, belongs to another note, the parent is not in
 * the target section, or the parent is the task itself or one of its descendants.
 * @category Database Queries
 */
export async function moveDBTask(taskId: number, target: TaskMoveTarget, targetIndex: number) {
    const db = await getDB()

    try {
        const tasks = await db.select<{ id: number, sectionID: number, taskID: number | null, noteID: number }[]>(
            `SELECT t.id, t.sectionID, t.taskID, g.noteID FROM task t
             INNER JOIN section s ON s.id = t.sectionID
             INNER JOIN section_group g ON g.id = s.groupID
             WHERE t.id = ? AND t.deleted_at IS NULL`, [taskId])
        const task = tasks[0]
        if (!task)
            throw createError("TASK_MOVE_INVALID", "Il task da spostare non esiste.")

        const sectionsFound = await db.select<{ id: number, noteID: number }[]>(
            `SELECT s.id, g.noteID FROM section s
             INNER JOIN section_group g ON g.id = s.groupID
             WHERE s.id = ? AND s.deleted_at IS NULL AND g.deleted_at IS NULL`, [target.sectionId])
        if (!sectionsFound[0] || sectionsFound[0].noteID !== task.noteID)
            throw createError("TASK_MOVE_INVALID", "La sezione di destinazione non è valida.")

        const parentId = target.parentTaskId ?? null
        if (parentId != null) {
            const parents = await db.select<{ id: number, sectionID: number }[]>(
                'SELECT id, sectionID FROM task WHERE id = ? AND deleted_at IS NULL', [parentId])
            if (!parents[0] || parents[0].sectionID !== target.sectionId)
                throw createError("TASK_MOVE_INVALID", "Il task di destinazione non è valido.")

            // Walk up from the new parent: the moved task is among its ancestors (or is the parent itself)
            // exactly when the parent lies in the moved subtree
            const ancestors = await db.select<{ found: number }[]>(
                `WITH RECURSIVE anc(id, parent) AS (
                    SELECT id, taskID FROM task WHERE id = ?
                    UNION
                    SELECT t.id, t.taskID FROM task t INNER JOIN anc ON t.id = anc.parent
                )
                SELECT EXISTS (SELECT 1 FROM anc WHERE id = ?) AS found`, [parentId, taskId])
            if (ancestors[0]?.found)
                throw createError("TASK_MOVE_INVALID", "Non puoi spostare un task dentro sé stesso o un suo sottotask.")
        }

        const siblings = parentId == null
            ? await db.select<{ id: number }[]>(
                `SELECT id FROM task WHERE sectionID = ? AND taskID IS NULL AND deleted_at IS NULL AND id <> ?
                 ORDER BY position, id`, [target.sectionId, taskId])
            : await db.select<{ id: number }[]>(
                `SELECT id FROM task WHERE taskID = ? AND deleted_at IS NULL AND id <> ? ORDER BY position, id`,
                [parentId, taskId])
        const order = siblings.map(row => row.id)
        order.splice(clampIndex(targetIndex, order.length), 0, taskId)

        // Siblings only get their position renumbered; the moved task changes parent, every row of its
        // subtree (ELSE branch keeps their position) gets the new sectionID.
        const cases = order.map(() => "WHEN ? THEN ?").join(" ")
        const params: (number | null)[] = [target.sectionId, taskId, parentId]
        order.forEach((id, index) => params.push(id, index))
        params.push(taskId, ...order)
        const tx = new Transaction()
        tx.add(
            `WITH RECURSIVE subtree AS (
                SELECT id FROM task WHERE taskID = ?
                UNION
                SELECT t.id FROM task t INNER JOIN subtree s ON t.taskID = s.id
            )
            UPDATE task SET
                sectionID = ?,
                taskID = CASE WHEN id = ? THEN ? ELSE taskID END,
                position = CASE id ${cases} ELSE position END
            WHERE id IN (SELECT id FROM subtree) OR id = ? OR id IN (${order.map(() => "?").join(",")})`,
            [taskId, ...params])

        const sameParent = task.sectionID === target.sectionId && (task.taskID ?? null) === parentId
        if (!sameParent) {
            // The moved task is excluded: it already belongs to the destination
            const remaining = task.taskID == null
                ? await db.select<{ id: number }[]>(
                    `SELECT id FROM task WHERE sectionID = ? AND taskID IS NULL AND deleted_at IS NULL AND id <> ? ORDER BY position, id`,
                    [task.sectionID, taskId])
                : await db.select<{ id: number }[]>(
                    `SELECT id FROM task WHERE taskID = ? AND deleted_at IS NULL AND id <> ? ORDER BY position, id`, [task.taskID, taskId])
            if (remaining.length > 0) {
                const update = buildPositionUpdate("task", remaining.map(row => row.id))
                tx.add(update.sql, update.params)
            }
        }
        await tx.run()
    } catch (error: unknown) {
        rethrow(error, "TASK")
    }
}
