import { browser, expect } from "@wdio/globals"
import {
    addTaskButton, byLabel, byText, createFromSidebar, createWorkspace, domClick, openWorkspace, sectionCard, sql, tr, treeRow, typeInto,
    waitForApp,
} from "../helpers"

/**
 * Width of a group: dragged from the handle on its right edge, kept after an app restart, the completion bar hidden
 * when the group is narrow, double click to go back to the automatic width.
 */
const WORKSPACE = "Width Workspace"
const NOTE = "Width Note"
const GROUP = "Width Group"
const SECTION = "Width Section"
const TASK = "Width task"
const NARROW = 280

/** Width saved for the group (null = automatic). */
const savedWidth = async (): Promise<number | null> => {
    const rows = await sql<{ width: number | null }[]>("select", "SELECT width FROM section_group WHERE name = ? AND deleted_at IS NULL", [GROUP])
    return rows[0]?.width ?? null
}

/** Rendered width of the group: the handle is the last child of its root element. */
const renderedWidth = async (): Promise<number> => {
    const handle = await byLabel(await tr("groups.width.handle"))
    return browser.execute((el: HTMLElement) => el.parentElement!.getBoundingClientRect().width, handle as unknown as HTMLElement)
}

/** Drags the handle by `delta` pixels (negative = narrower). */
const dragHandle = async (delta: number) => {
    const handle = byLabel(await tr("groups.width.handle"))
    await handle.waitForDisplayed()
    await handle.scrollIntoView({ block: "center", inline: "center" })
    const steps = 10
    let action = browser.action("pointer").move({ origin: handle }).down()
    for (let i = 1; i <= steps; i++) action = action.move({ origin: "pointer", x: Math.round(delta / steps), y: 0 })
    await action.up().perform()
}

describe("Group width", () => {
    before(async () => {
        await waitForApp()
        await createWorkspace(WORKSPACE)
        await openWorkspace(WORKSPACE)
        await createFromSidebar("sidebar.addNote", "dialogs.addNote.submit", NOTE)
        await treeRow(NOTE).click()
        await byLabel(await tr("notes.closeCurrent")).waitForDisplayed()

        await byText(await tr("menu.newGroup")).click()
        await typeInto(byLabel(await tr("groups.nameLabel")), GROUP)
        await browser.keys("Enter")
        await byText(GROUP).waitForDisplayed({ timeoutMsg: "the group was not created" })
        await byText(await tr("sections.new")).click()
        await typeInto(byLabel(await tr("sections.titleLabel")), SECTION)
        await browser.keys("Enter")
        await sectionCard(SECTION).waitForDisplayed()
        await (await addTaskButton(sectionCard(SECTION))).click()
        await typeInto(sectionCard(SECTION).$("input"), TASK)
        await sectionCard(SECTION).$(`[aria-label="${await tr("common.add")}"]`).click()
        await browser.waitUntil(async () => (await sql<unknown[]>("select", "SELECT id FROM task WHERE text = ?", [TASK])).length > 0, { timeoutMsg: "task not created" })
    })

    it("starts with the automatic width and the completion bar", async () => {
        expect(await savedWidth()).toBeNull()
        await byLabel(await tr("groups.progress")).waitForDisplayed({ timeoutMsg: "the completion bar is not shown" })
        expect(await renderedWidth()).toBeGreaterThan(320)
    })

    it("resizes by dragging the handle, hides the completion bar when narrow and saves the width", async () => {
        const before = await renderedWidth()
        await dragHandle(NARROW - before)
        await browser.waitUntil(async () => Math.abs((await renderedWidth()) - NARROW) < 3, { timeoutMsg: "the group did not follow the handle" })
        await byLabel(await tr("groups.progress")).waitForDisplayed({ reverse: true, timeoutMsg: "the completion bar is still shown in a narrow group" })
        await browser.waitUntil(async () => Math.abs(((await savedWidth()) ?? 0) - NARROW) < 3, { timeoutMsg: "the width was not saved" })
    })

    it("keeps the width after restarting the app", async () => {
        const saved = await savedWidth()
        await browser.reloadSession()
        await waitForApp()
        await openWorkspace(WORKSPACE)
        const close = byLabel(await tr("notes.closeCurrent"))
        if (!(await close.waitForDisplayed({ timeout: 4_000 }).then(() => true, () => false))) {
            await treeRow(NOTE).click()
            await close.waitForDisplayed()
        }
        await byText(GROUP).waitForDisplayed({ timeoutMsg: "the group was lost" })
        await browser.waitUntil(async () => Math.abs((await renderedWidth()) - saved!) < 1.5, { timeoutMsg: "the width was not restored" })
        expect(await byLabel(await tr("groups.progress")).isExisting()).toBe(false)
    })

    it("keeps the width when the group is collapsed", async () => {
        const before = await renderedWidth()
        await domClick(byLabel(await tr("groups.collapse")))
        await byLabel(await tr("groups.expand")).waitForDisplayed()
        expect(Math.abs((await renderedWidth()) - before)).toBeLessThan(1.5)
        await domClick(byLabel(await tr("groups.expand")))
        await byLabel(await tr("groups.collapse")).waitForDisplayed()
    })

    it("goes back to the automatic width on double click", async () => {
        const handle = byLabel(await tr("groups.width.handle"))
        await handle.doubleClick()
        await browser.waitUntil(async () => (await savedWidth()) === null, { timeoutMsg: "the width was not cleared" })
        await byLabel(await tr("groups.progress")).waitForDisplayed({ timeoutMsg: "the completion bar did not come back" })
        expect(await renderedWidth()).toBeGreaterThan(320)
    })
})
