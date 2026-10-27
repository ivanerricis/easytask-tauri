import { $, $$, browser, expect } from "@wdio/globals"
import {
    addTaskButton, byLabel, byText, closeTaskInput, createFromSidebar, createWorkspace, domClick, groupCard, menuButton, menuButtonPredicate,
    newSectionInGroup, openMenuWithButton, openWorkspace, sectionCard, sql, tr, treeRow, typeInto, waitForApp,
} from "../helpers"

/**
 * The open/closed state of groups, sections and the subtasks of a task: saved in the database (column `collapsed`), kept
 * across a restart, and not a change of the workspace (its edit date stays as it was).
 * No drag: the menus are opened with the helpers that also work on the WebKitGTK driver of the Linux CI.
 */
const WORKSPACE = "Collapsed Workspace"
const NOTE = "Collapsed Note"
const GROUP = "Collapsed Group"
const SECTION = "Collapsed Section"
const PARENT = "Parent task"
const CHILD = "Child task"

// A date nobody can have now: the edit date of the workspace is set to it, so that "unchanged" does not depend on the clock
const SENTINEL = { date: "2000-01-01", time: "00:00" }

type Scope = WebdriverIO.Element | ReturnType<typeof $>

/** Values of the task text areas inside `scope`, read in a single page-side call. */
const valuesIn = async (scope: Scope) => {
    const label = await tr("tasks.editText")
    const el = (await scope.getElement()) as unknown as HTMLElement
    return browser.execute(
        (root: HTMLElement, aria: string) => Array.from(root.querySelectorAll<HTMLTextAreaElement>(`[aria-label="${aria}"]`)).map(area => area.value),
        el,
        label,
    )
}

/** Opens the "..." menu of the task with this text (the button only shows on hover). */
const openTaskMenu = async (text: string) => {
    let target: WebdriverIO.Element | undefined
    for (const candidate of await $$(`[aria-label="${await tr("tasks.editText")}"]`)) {
        if ((await candidate.getValue()) === text) target = candidate
    }
    if (!target) throw new Error(`task "${text}" not found`)
    const row = await target.$(`./ancestor::div[.//button[${await menuButtonPredicate()}]][1]`)
    await row.moveTo()
    return openMenuWithButton(await menuButton(row))
}

const collapsedOf = async (table: "section_group" | "section" | "task", column: "name" | "title" | "text", value: string): Promise<number> => {
    const rows = await sql<{ collapsed: number }[]>("select", `SELECT collapsed FROM ${table} WHERE ${column} = ? AND deleted_at IS NULL`, [value])
    expect(rows).toHaveLength(1)
    return Number(rows[0].collapsed)
}

const workspaceEdit = async () => {
    const rows = await sql<{ id: number, edit_date: string, edit_time: string }[]>("select", "SELECT id, edit_date, edit_time FROM workspace WHERE name = ?", [WORKSPACE])
    return rows[0]
}

const count = () => $('[data-testid="subtask-count"]')
const groupChevron = async (key: "groups.collapse" | "groups.expand") => groupCard(GROUP).$(`button[aria-label="${await tr(key)}"]`)
const sectionChevron = async (key: "sections.collapse" | "sections.expand") => sectionCard(SECTION).$(`button[aria-label="${await tr(key)}"]`)

describe("Open and closed state of groups, sections and subtasks", () => {
    before(async () => {
        await waitForApp()
    })

    it("creates a note with a group, a section, a task and a subtask", async () => {
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

        await (await addTaskButton(sectionCard(SECTION))).click()
        await typeInto(sectionCard(SECTION).$("input"), PARENT)
        await sectionCard(SECTION).$(`[aria-label="${await tr("common.add")}"]`).click()
        await closeTaskInput()
        await browser.waitUntil(async () => (await valuesIn(sectionCard(SECTION))).includes(PARENT), { timeoutMsg: "task not created" })

        const menu = await openTaskMenu(PARENT)
        // No subtasks yet: no entry to collapse them
        await expect(byText(await tr("tasks.menu.collapseSubtasks"), menu)).not.toBeDisplayed()
        await byText(await tr("tasks.addSubtask"), menu).click()
        await typeInto(sectionCard(SECTION).$("input"), CHILD)
        await sectionCard(SECTION).$(`[aria-label="${await tr("common.add")}"]`).click()
        await closeTaskInput()
        await browser.waitUntil(async () => (await valuesIn(sectionCard(SECTION))).includes(CHILD), { timeoutMsg: "subtask not created" })
    })

    it("closes the subtasks with the menu of the task: they are hidden, the count stays and the state is saved", async () => {
        const menu = await openTaskMenu(PARENT)
        await byText(await tr("tasks.menu.collapseSubtasks"), menu).click()
        await browser.waitUntil(async () => !(await valuesIn(sectionCard(SECTION))).includes(CHILD), { timeoutMsg: "the subtask is still shown" })
        await expect(count()).toHaveAttribute("data-subtasks-hidden", "true")
        await expect(count()).toHaveText("0/1")
        await browser.waitUntil(async () => (await collapsedOf("task", "text", PARENT)) === 1, { timeoutMsg: "collapsed was not saved on the task" })
        expect(await collapsedOf("task", "text", CHILD)).toBe(0)
    })

    it("closes a section and a group with their chevrons, and saves both", async () => {
        await domClick(await sectionChevron("sections.collapse"))
        await (await sectionChevron("sections.expand")).waitForDisplayed()
        await browser.waitUntil(async () => (await collapsedOf("section", "title", SECTION)) === 1, { timeoutMsg: "collapsed was not saved on the section" })

        await domClick(await groupChevron("groups.collapse"))
        await (await groupChevron("groups.expand")).waitForDisplayed()
        await browser.waitUntil(async () => (await collapsedOf("section_group", "name", GROUP)) === 1, { timeoutMsg: "collapsed was not saved on the group" })
    })

    it("opening and closing does not change the edit date of the workspace, a real change does", async () => {
        const { id } = await workspaceEdit()
        await sql("execute", "UPDATE workspace SET edit_date = ?, edit_time = ? WHERE id = ?", [SENTINEL.date, SENTINEL.time, id])
        expect(await workspaceEdit()).toMatchObject({ edit_date: SENTINEL.date, edit_time: SENTINEL.time })

        // Open the group, close it again, then open and close the section
        await domClick(await groupChevron("groups.expand"))
        await (await groupChevron("groups.collapse")).waitForDisplayed()
        await browser.waitUntil(async () => (await collapsedOf("section_group", "name", GROUP)) === 0, { timeoutMsg: "the group was not saved as open" })
        await domClick(await sectionChevron("sections.expand"))
        await browser.waitUntil(async () => (await collapsedOf("section", "title", SECTION)) === 0, { timeoutMsg: "the section was not saved as open" })
        await domClick(await sectionChevron("sections.collapse"))
        await browser.waitUntil(async () => (await collapsedOf("section", "title", SECTION)) === 1, { timeoutMsg: "the section was not saved as closed" })
        await domClick(await groupChevron("groups.collapse"))
        await browser.waitUntil(async () => (await collapsedOf("section_group", "name", GROUP)) === 1, { timeoutMsg: "the group was not saved as closed" })

        expect(await workspaceEdit()).toMatchObject({ edit_date: SENTINEL.date, edit_time: SENTINEL.time })

        // The control: an update of a content column does refresh it (the trigger runs at once)
        await sql("execute", "UPDATE task SET priority = priority WHERE text = ?", [PARENT])
        const after = await workspaceEdit()
        expect(`${after.edit_date} ${after.edit_time}`).not.toBe(`${SENTINEL.date} ${SENTINEL.time}`)
    })

    it("restarts the app", async () => {
        await browser.reloadSession()
        await waitForApp()
        await byLabel(await tr("home.workspace.open", { name: WORKSPACE })).waitForDisplayed({ timeout: 30_000 })
        await openWorkspace(WORKSPACE)
        // The open notes may be restored; if not, open it
        const close = byLabel(await tr("notes.closeCurrent"))
        if (!(await close.waitForDisplayed({ timeout: 4_000 }).then(() => true, () => false))) {
            await treeRow(NOTE).click()
            await close.waitForDisplayed()
        }
    })

    it("remembers what was closed: the group, the section and the subtasks", async () => {
        // The group is closed: only its header is there
        await (await groupChevron("groups.expand")).waitForDisplayed({ timeoutMsg: "the group was not restored closed" })
        await expect(sectionCard(SECTION)).not.toBeDisplayed()
        await domClick(await groupChevron("groups.expand"))

        await (await sectionChevron("sections.expand")).waitForDisplayed({ timeoutMsg: "the section was not restored closed" })
        await domClick(await sectionChevron("sections.expand"))
        await browser.waitUntil(async () => (await valuesIn(sectionCard(SECTION))).includes(PARENT), { timeoutMsg: "the task is not shown" })

        expect(await valuesIn(sectionCard(SECTION))).not.toContain(CHILD)
        await expect(count()).toHaveAttribute("data-subtasks-hidden", "true")
    })

    it("opens the subtasks again from the menu, and adding a subtask to a closed task opens it", async () => {
        let menu = await openTaskMenu(PARENT)
        await byText(await tr("tasks.menu.expandSubtasks"), menu).click()
        await browser.waitUntil(async () => (await valuesIn(sectionCard(SECTION))).includes(CHILD), { timeoutMsg: "the subtask is not shown again" })
        await browser.waitUntil(async () => (await collapsedOf("task", "text", PARENT)) === 0, { timeoutMsg: "the task was not saved as open" })

        menu = await openTaskMenu(PARENT)
        await byText(await tr("tasks.menu.collapseSubtasks"), menu).click()
        await browser.waitUntil(async () => !(await valuesIn(sectionCard(SECTION))).includes(CHILD), { timeoutMsg: "the subtask is still shown" })

        menu = await openTaskMenu(PARENT)
        await byText(await tr("tasks.addSubtask"), menu).click()
        await typeInto(sectionCard(SECTION).$("input"), "Second child")
        await sectionCard(SECTION).$(`[aria-label="${await tr("common.add")}"]`).click()
        await closeTaskInput()
        await browser.waitUntil(async () => (await valuesIn(sectionCard(SECTION))).includes("Second child"), { timeoutMsg: "the new subtask is not shown" })
        expect(await valuesIn(sectionCard(SECTION))).toContain(CHILD)
        expect(await collapsedOf("task", "text", PARENT)).toBe(0)
    })
})
