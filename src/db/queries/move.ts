import { createError, handleDBError } from "@/types/error"
import { getDB } from "../dbManager"

const SECTION_UNIQUE_MESSAGE = "Esiste già una sezione con questo nome nel gruppo di destinazione."

type Db = Awaited<ReturnType<typeof getDB>>

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
function buildPositionUpdate(table: "section" | "task" | "section_group", ids: number[]) {
    const cases = ids.map(() => "WHEN ? THEN ?").join(" ")
    const placeholders = ids.map(() => "?").join(",")
    const params: number[] = []
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
 * Renumbers (0..n) the non deleted groups of a note following the given order, ignoring the ids
 * that are no longer visible (e.g. the source group that was just removed).
 * @category Database Queries
 */
async function renumberGroups(db: Db, noteId: number, order: number[]) {
    const rows = await db.select<{ id: number }[]>(
        'SELECT id FROM section_group WHERE noteID = ? AND deleted_at IS NULL', [noteId])
    const alive = new Set(rows.map(row => row.id))
    const final = order.filter(id => alive.has(id))
    if (final.length === 0) return
    const update = buildPositionUpdate("section_group", final)
    await db.execute(update.sql, update.params)
}

/**
 * Removes a group left without visible sections after a move. A group that never contained anything else
 * (no section row at all, no audio file) is deleted for good; otherwise it is moved to the trash, so its
 * trashed sections (and their tasks) can still be restored instead of being lost by the cascade.
 * @returns true when the group was removed (hard or soft) from the note.
 * @category Database Queries
 */
async function removeGroupIfEmpty(db: Db, groupId: number) {
    const visible = await db.select<{ c: number }[]>(
        'SELECT COUNT(*) AS c FROM section WHERE groupID = ? AND deleted_at IS NULL', [groupId])
    if ((visible[0]?.c ?? 0) > 0) return false

    await db.execute(
        `DELETE FROM section_group WHERE id = ?
         AND NOT EXISTS (SELECT 1 FROM section WHERE groupID = ?)
         AND NOT EXISTS (SELECT 1 FROM audio_file WHERE section_groupID = ?)`,
        [groupId, groupId, groupId])
    await db.execute(
        "UPDATE section_group SET deleted_at = datetime('now','localtime') WHERE id = ? AND deleted_at IS NULL",
        [groupId])
    return true
}

/**
 * Moves a section to a group of the same note, at a given index among the sections of that group.
 * The section keeps everything it owns (tasks, subtasks and trashed tasks reference it by id, so they follow it).
 * Destination siblings are renumbered with one UPDATE, and so are the source siblings when the group changes.
 * When the source group is left without sections it is removed and the remaining groups are renumbered.
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
        try {
            await db.execute(
                `UPDATE section SET groupID = ?, position = CASE id ${cases} END WHERE id IN (${order.map(() => "?").join(",")})`,
                params)
        } catch (error: unknown) {
            handleDBError(error, "SECTION", { UNIQUE: SECTION_UNIQUE_MESSAGE })
        }

        if (section.groupID !== targetGroupId) {
            const remaining = await db.select<{ id: number }[]>(
                'SELECT id FROM section WHERE groupID = ? AND deleted_at IS NULL ORDER BY position, id', [section.groupID])
            if (remaining.length > 0) {
                const update = buildPositionUpdate("section", remaining.map(row => row.id))
                await db.execute(update.sql, update.params)
            } else if (await removeGroupIfEmpty(db, section.groupID)) {
                const groups = await db.select<{ id: number }[]>(
                    'SELECT id FROM section_group WHERE noteID = ? AND deleted_at IS NULL ORDER BY position, id', [section.noteID])
                await renumberGroups(db, section.noteID, groups.map(row => row.id))
            }
        }
    } catch (error: unknown) {
        rethrow(error, "SECTION", { UNIQUE: SECTION_UNIQUE_MESSAGE })
    }
}

/**
 * Moves a section into a brand new group created at the given index among the groups of the note
 * (the section is pulled out into its own column). The index refers to the groups as they are before the move
 * (the source group included); the other groups shift and, when the source group ends up empty, it is removed.
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

        const created = await db.execute('INSERT INTO section_group (noteID, position) VALUES (?, ?)', [section.noteID, index])
        const newGroupId = created.lastInsertId as number
        order.splice(index, 0, newGroupId)

        try {
            await db.execute('UPDATE section SET groupID = ?, position = 0 WHERE id = ?', [newGroupId, sectionId])
        } catch (error: unknown) {
            // Remove the orphan group, transactions are unreliable with the connection pool
            await db.execute('DELETE FROM section_group WHERE id = ?', [newGroupId]).catch(() => undefined)
            throw error
        }

        const remaining = await db.select<{ id: number }[]>(
            'SELECT id FROM section WHERE groupID = ? AND deleted_at IS NULL ORDER BY position, id', [section.groupID])
        if (remaining.length > 0) {
            const update = buildPositionUpdate("section", remaining.map(row => row.id))
            await db.execute(update.sql, update.params)
        } else {
            await removeGroupIfEmpty(db, section.groupID)
        }
        await renumberGroups(db, section.noteID, order)
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
 * descendant (invariant: every task carries the section of its root task); the old siblings are then renumbered.
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
        await db.execute(
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
            const remaining = task.taskID == null
                ? await db.select<{ id: number }[]>(
                    `SELECT id FROM task WHERE sectionID = ? AND taskID IS NULL AND deleted_at IS NULL ORDER BY position, id`,
                    [task.sectionID])
                : await db.select<{ id: number }[]>(
                    `SELECT id FROM task WHERE taskID = ? AND deleted_at IS NULL ORDER BY position, id`, [task.taskID])
            if (remaining.length > 0) {
                const update = buildPositionUpdate("task", remaining.map(row => row.id))
                await db.execute(update.sql, update.params)
            }
        }
    } catch (error: unknown) {
        rethrow(error, "TASK")
    }
}
