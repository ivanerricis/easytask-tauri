import { $, browser, expect } from "@wdio/globals"
import {
    addTaskButton, byLabel, byText, closeAllDialogs, closeTaskInput, createFromSidebar, createWorkspace, domClick, groupCard, hoverInsertZone,
    insertFields, insertPlusOpacity, insertZoneAbove, insertZones, newSectionInGroup, openSettingsOn, openWorkspace, sectionCard, settingsSwitch,
    sql, taskTexts, tr, treeRow, typeInto, waitForApp,
} from "../helpers"

/**
 * The thin line with a "+" between two tasks: mouse only, it shows on hover, a click opens the field of a new task at that
 * point, Enter inserts it there, Esc closes it. Works for subtasks too, one field at a time, can be turned off in the
 * settings, and an insert is a single undo step.
 */
const WORKSPACE = "Insert Workspace"
const NOTE = "Insert Note"
const GROUP = "Insert Group"
const SECTION = "Insert Section"
const [A, B, C] = ["Insert A", "Insert B", "Insert C"]
const MIDDLE = "Insert between A and B"
const DISCARDED = "Insert discarded"
const SUB_1 = "Insert sub 1"
const SUB_2 = "Insert sub 2"
const SUB_MIDDLE = "Insert sub between"

const texts = () => taskTexts(sectionCard(SECTION))

const waitForTexts = (expected: string[]) =>
    browser.waitUntil(async () => JSON.stringify(await texts()) === JSON.stringify(expected), {
        timeoutMsg: `the section does not show ${expected.join(" > ")}`,
    })

/** Saved top-level order of the tasks of the section, as written in the database. */
const savedOrder = async () => {
    const rows = await sql<{ text: string }[]>(
        "select",
        "SELECT text FROM task WHERE text IN (?, ?, ?, ?) AND deleted_at IS NULL ORDER BY position, id",
        [A, B, C, MIDDLE],
    )
    return rows.map(row => row.text)
}

/** Ctrl+<key> with the focus out of any text field (the app ignores undo/redo shortcuts inside them). */
const pressCtrl = async (key: string) => {
    await browser.execute(() => (document.activeElement as HTMLElement | null)?.blur())
    await browser.keys(["Control", key])
}

/** Hovers the line above the task `before`, clicks its "+" and waits for the field. */
const openFieldAbove = async (before: string) => {
    const zone = await insertZoneAbove(before)
    await hoverInsertZone(zone)
    await zone.$("button").click()
    await browser.waitUntil(async () => (await insertFields()).length === 1, { timeoutMsg: `the field above "${before}" did not open` })
    return byLabel(await tr("tasks.insertLine.label"))
}

/** Whether the field of a new task sits in the DOM between the two tasks. */
const fieldBetween = async (first: string, second: string) => {
    const label = await tr("tasks.editText")
    const field = await tr("tasks.insertLine.label")
    return browser.execute((aria: string, fieldLabel: string, a: string, b: string) => {
        const area = (value: string) => Array.from(document.querySelectorAll<HTMLTextAreaElement>(`[aria-label="${aria}"]`)).find(el => el.value === value)
        const input = document.querySelector(`[aria-label="${fieldLabel}"]`)
        const one = area(a)
        const two = area(b)
        if (!input || !one || !two) return false
        return !!(one.compareDocumentPosition(input) & Node.DOCUMENT_POSITION_FOLLOWING) && !!(input.compareDocumentPosition(two) & Node.DOCUMENT_POSITION_FOLLOWING)
    }, label, field, first, second)
}

describe("Insert line between tasks", () => {
    before(async () => {
        await waitForApp()
    })

    it("creates a note with a section and three tasks", async () => {
        await createWorkspace(WORKSPACE)
        await openWorkspace(WORKSPACE)
        await createFromSidebar("sidebar.addNote", "dialogs.addNote.submit", NOTE)
        await treeRow(NOTE).click()
        await byLabel(await tr("notes.closeCurrent")).waitForDisplayed()

        await byText(await tr("menu.newGroup")).click()
        await typeInto(byLabel(await tr("groups.nameLabel")), GROUP)
        await browser.keys("Enter")
        await byText(GROUP).waitForDisplayed({ timeoutMsg: "the group was not created" })
        await newSectionInGroup(groupCard(GROUP), SECTION)

        for (const text of [A, B, C]) {
            await (await addTaskButton(sectionCard(SECTION))).click()
            await typeInto(sectionCard(SECTION).$("input"), text)
            await sectionCard(SECTION).$(`[aria-label="${await tr("common.add")}"]`).click()
            await closeTaskInput()
            await browser.waitUntil(async () => (await texts()).includes(text), { timeoutMsg: `task ${text} not created` })
        }
        await waitForTexts([A, B, C])
    })

    it("has one line above each task and shows the + only on hover", async () => {
        expect((await insertZones(sectionCard(SECTION))).length).toBe(3)
        const zone = await insertZoneAbove(B)
        // The pointer is parked on the title of the note: the + is hidden
        await byLabel(await tr("notes.closeCurrent")).moveTo()
        expect(await insertPlusOpacity(zone)).toBe(0)
        await hoverInsertZone(zone)
        expect(await insertPlusOpacity(zone)).toBeGreaterThan(0.9)
    })

    it("opens the field with a click, inserts the task in that place with Enter and saves it", async () => {
        const input = await openFieldAbove(B)
        expect(await fieldBetween(A, B)).toBe(true)
        await typeInto(input, MIDDLE)
        await browser.keys("Enter")
        await waitForTexts([A, MIDDLE, B, C])
        await browser.waitUntil(async () => JSON.stringify(await savedOrder()) === JSON.stringify([A, MIDDLE, B, C]), {
            timeoutMsg: "the new order was not saved",
        })
        // "Keep adding tasks" is on by default: the empty field moved under the new task and has the focus
        await browser.waitUntil(async () => fieldBetween(MIDDLE, B), { timeoutMsg: "the field did not move under the new task" })
        await closeTaskInput()
        await browser.waitUntil(async () => (await insertFields()).length === 0, { timeoutMsg: "the field is still open after Esc" })
    })

    it("closes the field with Esc and discards what was typed", async () => {
        const input = await openFieldAbove(C)
        await typeInto(input, DISCARDED)
        await browser.keys("Escape")
        await browser.waitUntil(async () => (await insertFields()).length === 0, { timeoutMsg: "Esc did not close the field" })
        await waitForTexts([A, MIDDLE, B, C])
        expect(await texts()).not.toContain(DISCARDED)
    })

    it("keeps one field open at a time", async () => {
        await openFieldAbove(B)
        expect(await fieldBetween(MIDDLE, B)).toBe(true)
        // The second click opens a field in another place and the first one goes away
        const zone = await insertZoneAbove(C)
        await hoverInsertZone(zone)
        await zone.$("button").click()
        await browser.waitUntil(async () => (await insertFields()).length === 1 && (await fieldBetween(B, C)), {
            timeoutMsg: "the first field was not replaced by the second one",
        })
        await browser.keys("Escape")
        await browser.waitUntil(async () => (await insertFields()).length === 0, { timeoutMsg: "Esc did not close the field" })
    })

    it("inserts between two subtasks", async () => {
        const rows = await sql<{ id: number }[]>("select", "SELECT id FROM task WHERE text = ? AND deleted_at IS NULL", [A])
        await domClick($(`[data-task-id="${rows[0].id}"] [aria-label="${await tr("tasks.addSubtask")}"]`))
        await typeInto(byLabel(await tr("tasks.newSubtask")), SUB_1)
        await browser.keys("Enter")
        await browser.waitUntil(async () => (await texts()).includes(SUB_1), { timeoutMsg: "subtask 1 not created" })
        await typeInto(byLabel(await tr("tasks.newSubtask")), SUB_2)
        await browser.keys("Enter")
        await browser.waitUntil(async () => (await texts()).includes(SUB_2), { timeoutMsg: "subtask 2 not created" })
        await browser.keys("Escape")
        await waitForTexts([A, SUB_1, SUB_2, MIDDLE, B, C])

        const input = await openFieldAbove(SUB_2)
        expect(await fieldBetween(SUB_1, SUB_2)).toBe(true)
        await typeInto(input, SUB_MIDDLE)
        await browser.keys("Enter")
        await waitForTexts([A, SUB_1, SUB_MIDDLE, SUB_2, MIDDLE, B, C])
        await closeTaskInput()
        await browser.waitUntil(async () => (await insertFields()).length === 0, { timeoutMsg: "the field is still open after Esc" })
    })

    it("undoes an insert in a single step with Ctrl+Z", async () => {
        // The last insert is the subtask: one undo removes it and leaves everything else as it was
        await pressCtrl("z")
        await waitForTexts([A, SUB_1, SUB_2, MIDDLE, B, C])
        const rows = await sql<{ n: number }[]>("select", "SELECT COUNT(*) AS n FROM task WHERE text = ? AND deleted_at IS NULL", [SUB_MIDDLE])
        expect(Number(rows[0].n)).toBe(0)
    })

    it("hides the lines when the setting is off and shows them again when it is on", async () => {
        const toggle = async (expected: "true" | "false") => {
            await openSettingsOn("notes")
            const switchEl = await settingsSwitch("settings.notes.showTaskInsertLine.label")
            await switchEl.click()
            await expect(switchEl).toHaveAttribute("aria-checked", expected)
            await closeAllDialogs()
        }
        await toggle("false")
        await browser.waitUntil(async () => (await insertZones(sectionCard(SECTION))).length === 0, { timeoutMsg: "the lines are still there with the setting off" })
        await toggle("true")
        await browser.waitUntil(async () => (await insertZones(sectionCard(SECTION))).length > 0, { timeoutMsg: "the lines did not come back with the setting on" })
    })
})