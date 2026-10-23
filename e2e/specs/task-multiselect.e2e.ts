import { $, $$, browser } from "@wdio/globals"
import {
    byLabel, byText, createFromSidebar, createWorkspace, openContextMenu, openSubmenu, openWorkspace, sectionCard, sql, tr, treeRow, typeInto,
    waitForApp, addTaskButton,
    groupCard, newSectionInGroup,
} from "../helpers"

const WORKSPACE = "Multi Workspace"
const NOTE = "Multi Note"
const GROUP = "Multi Group"
const SECTION = "Multi S1"
const TASKS = ["Multi T1", "Multi T2", "Multi T3"]
const RED_HEX = "#e6194b" // PALETTE_COLORS[0], "common.colors.c1"

/** The row of the task with this text. */
const rowOf = async (text: string) => {
    const label = await tr("tasks.editText")
    const candidates = await $$(`[aria-label="${label}"]`)
    for (const candidate of candidates) {
        if ((await candidate.getValue()) === text) return candidate.$("./ancestor::div[@data-task-id][1]")
    }
    throw new Error(`task "${text}" not found`)
}

/** Ctrl+click on a row (a click event with the modifier, dispatched in the page: the driver cannot hold Ctrl across a click everywhere). */
const ctrlClick = async (text: string) => {
    const row = (await (await rowOf(text)).getElement()) as unknown as HTMLElement
    await browser.execute((el: HTMLElement) => {
        el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, ctrlKey: true }))
    }, row)
}

const colors = async () => {
    const rows = await sql<{ text: string, color: string | null }[]>(
        "select",
        `SELECT text, color FROM task WHERE deleted_at IS NULL AND text IN (${TASKS.map(() => "?").join(",")}) ORDER BY position`,
        TASKS,
    )
    return rows.map(row => [row.text, row.color?.toLowerCase() ?? null])
}

const waitForColors = (expected: (string | null)[]) =>
    browser.waitUntil(async () => JSON.stringify((await colors()).map(([, color]) => color)) === JSON.stringify(expected), {
        timeoutMsg: `the colors of the tasks are not ${expected.join(", ")}`,
    })

describe("Multi-selection of tasks", () => {
    before(async () => {
        await waitForApp()
    })

    it("creates a note with a group, a section and three tasks", async () => {
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

        for (const text of TASKS) {
            await (await addTaskButton(sectionCard(SECTION))).click()
            await typeInto(sectionCard(SECTION).$("input"), text)
            await sectionCard(SECTION).$(`[aria-label="${await tr("common.add")}"]`).click()
            await (await rowOf(text)).waitForDisplayed({ timeoutMsg: `task "${text}" not created` })
        }
    })

    it("colors two Ctrl+clicked tasks in one step and one Ctrl+Z brings both back", async () => {
        await ctrlClick(TASKS[0])
        await ctrlClick(TASKS[2])
        await browser.waitUntil(async () => (await $$("[data-multi-selected='true']").length) === 2, { timeoutMsg: "two tasks are not selected" })

        const first = (await rowOf(TASKS[0])) as unknown as ChainablePromiseElement
        const menu = await openContextMenu(first)
        await byText(await tr("tasks.selection.delete", { count: 2 }), menu).waitForDisplayed({ timeoutMsg: "the multi menu did not open" })
        const red = $(`[role="radio"][aria-label="${await tr("dialogs.color.swatch", { color: await tr("common.colors.c1") })}"]`)
        await openSubmenu(menu, await tr("tasks.selection.color"), red)
        await red.click()
        await waitForColors([RED_HEX, null, RED_HEX])

        // The focus must be out of any field for the shortcut
        await browser.execute(() => (document.activeElement as HTMLElement | null)?.blur())
        await browser.keys(["Control", "z"])
        await waitForColors([null, null, null])
    })
})
