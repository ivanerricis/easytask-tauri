import i18n from "@/i18n"
import { createError } from "@/types/error"
import { getErrorMessage } from "@/lib/utils"
import { isAutomationAction, isAutomationTrigger, type Automation, type AutomationDraft } from "@/lib/automations/types"
import { buildSectionIndex, sectionOffsets, toPortable, type PortableAutomation } from "@/lib/automations/portable"
import type { NoteTemplateContent } from "@/types/template"
import { getDB } from "../dbManager"
import { runTransaction, type Transaction, type TxRef, type TxStatement } from "../transaction"

type AutomationRow = {
    id: number
    noteID: number
    name: string | null
    enabled: number | boolean
    trigger: string
    actions: string
    position: number
}

const parse = (text: string): unknown => {
    try {
        return JSON.parse(text)
    } catch {
        return null
    }
}

/** A row as a rule, or null when its JSON is not valid (such a row is ignored, never run). */
function toAutomation(row: AutomationRow): Automation | null {
    const trigger = parse(row.trigger)
    const actions = parse(row.actions)
    if (!isAutomationTrigger(trigger) || !Array.isArray(actions) || !actions.every(isAutomationAction)) return null
    return {
        id: row.id, noteId: row.noteID, name: row.name?.trim() || null, enabled: !!row.enabled,
        trigger, actions, position: row.position,
    }
}

const fail = (key: "load" | "save" | "delete", error: unknown): never => {
    throw createError(`AUTOMATION_${key.toUpperCase()}_FAILED`, i18n.t(`automations.errors.${key}`, { message: getErrorMessage(error) }))
}

/**
 * The rules of a note, in their order. Rows with an invalid content are left out.
 * @param noteId The note.
 * @category Database Queries
 */
export async function getDBAutomations(noteId: number): Promise<Automation[]> {
    try {
        const db = await getDB()
        const rows = await db.select<AutomationRow[]>(
            "SELECT id, noteID, name, enabled, trigger, actions, position FROM automation WHERE noteID = ? ORDER BY position, id", [noteId])
        return rows.map(toAutomation).filter(rule => rule !== null)
    } catch (error: unknown) {
        return fail("load", error)
    }
}

/**
 * The rules of a note in their portable form (sections by position in `content`), for a copy or an export. A rule that
 * refers to a section that is not in the content is left out.
 * @param noteId The note.
 * @param content The content that will be copied or exported.
 * @param sectionIds The ids of the sections of `content`, in content order (see buildContentWithSectionIds).
 * @category Database Queries
 */
export async function getDBPortableAutomations(noteId: number, content: NoteTemplateContent, sectionIds: readonly number[]): Promise<PortableAutomation[]> {
    const index = buildSectionIndex(content, sectionIds)
    return (await getDBAutomations(noteId))
        .map(rule => toPortable(rule, index))
        .filter(rule => rule !== null)
}

/**
 * Adds to a transaction the statements that insert portable rules into a note, with their sections remapped to the
 * sections created in the same transaction (the section ids are written by SQLite with json_set, so they are known
 * only when the transaction runs). The rules keep their order.
 * @param tx The transaction collecting the statements.
 * @param noteRef The note: its id or a reference to the statement that creates it.
 * @param rules The rules, valid for `content` (see isPortableAutomation).
 * @param content The content inserted in the note.
 * @param sectionRefs References to the created sections in content order (see addNoteContent).
 * @category Database Queries
 */
export function addNoteAutomations(
    tx: Transaction, noteRef: number | TxRef, rules: readonly PortableAutomation[],
    content: NoteTemplateContent, sectionRefs: readonly TxRef[],
) {
    const offsets = sectionOffsets(content)
    const refOf = ({ group, section }: { group: number, section: number }) => sectionRefs[offsets[group] + section]
    // Placeholder written in the JSON until json_set replaces it with the id of the new section
    const PLACEHOLDER = 0

    rules.forEach((rule, position) => {
        const params: unknown[] = [noteRef, rule.name?.trim() || null, rule.enabled ? 1 : 0]

        let triggerSql = "?"
        if (rule.trigger.sectionId === null) {
            params.push(JSON.stringify(rule.trigger))
        } else {
            params.push(JSON.stringify({ ...rule.trigger, sectionId: PLACEHOLDER }), refOf(rule.trigger.sectionId))
            triggerSql = "json_set(?, '$.sectionId', CAST(? AS INTEGER))"
        }

        const moves: [number, TxRef][] = []
        const actions = rule.actions.map((action, i) => {
            if (action.type !== "moveTo") return action
            moves.push([i, refOf(action.sectionId)])
            return { ...action, sectionId: PLACEHOLDER }
        })
        params.push(JSON.stringify(actions))
        let actionsSql = "?"
        if (moves.length > 0) {
            actionsSql = `json_set(?, ${moves.map(([i]) => `'$[${i}].sectionId', CAST(? AS INTEGER)`).join(", ")})`
            params.push(...moves.map(([, ref]) => ref))
        }

        params.push(position)
        tx.add(`INSERT INTO automation (noteID, name, enabled, trigger, actions, position) VALUES (?, ?, ?, ${triggerSql}, ${actionsSql}, ?)`, params)
    })
}

/**
 * Creates a rule, after the other rules of the note.
 * @returns The id of the new rule.
 * @category Database Queries
 */
export async function createDBAutomation(noteId: number, draft: AutomationDraft): Promise<number> {
    try {
        const db = await getDB()
        const result = await db.execute(
            `INSERT INTO automation (noteID, name, enabled, trigger, actions, position)
             SELECT ?, ?, ?, ?, ?, COALESCE(MAX(position) + 1, 0) FROM automation WHERE noteID = ?`,
            [noteId, draft.name?.trim() || null, draft.enabled ? 1 : 0, JSON.stringify(draft.trigger), JSON.stringify(draft.actions), noteId])
        return result.lastInsertId as number
    } catch (error: unknown) {
        return fail("save", error)
    }
}

/**
 * Replaces the content of a rule (its note and position do not change).
 * @category Database Queries
 */
export async function updateDBAutomation(id: number, draft: AutomationDraft): Promise<void> {
    try {
        const db = await getDB()
        await db.execute("UPDATE automation SET name = ?, enabled = ?, trigger = ?, actions = ? WHERE id = ?",
            [draft.name?.trim() || null, draft.enabled ? 1 : 0, JSON.stringify(draft.trigger), JSON.stringify(draft.actions), id])
    } catch (error: unknown) {
        fail("save", error)
    }
}

/**
 * Turns a rule on or off.
 * @category Database Queries
 */
export async function setDBAutomationEnabled(id: number, enabled: boolean): Promise<void> {
    try {
        const db = await getDB()
        await db.execute("UPDATE automation SET enabled = ? WHERE id = ?", [enabled ? 1 : 0, id])
    } catch (error: unknown) {
        fail("save", error)
    }
}

/**
 * Deletes a rule for good (rules have no trash).
 * @category Database Queries
 */
export async function deleteDBAutomation(id: number): Promise<void> {
    try {
        const db = await getDB()
        await db.execute("DELETE FROM automation WHERE id = ?", [id])
    } catch (error: unknown) {
        fail("delete", error)
    }
}

/**
 * Writes the task changes computed for an automation (see diffTaskStatements) in one transaction.
 * @category Database Queries
 */
export async function applyDBTaskChanges(statements: TxStatement[]): Promise<void> {
    try {
        await runTransaction(statements)
    } catch (error: unknown) {
        fail("save", error)
    }
}
