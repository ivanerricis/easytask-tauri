import { browser, expect } from "@wdio/globals"
import {
    addTaskToSection, byLabel, byText, createFromSidebar, createWorkspace, domClick, groupCard, newSectionInGroup, openWorkspace,
    sectionCard, sql, tr, treeRow, typeInto, waitForApp,
} from "../helpers"

/**
 * Width of a group: changed from the handle on its right edge, kept after an app restart, the completion bar hidden
 * when the group is narrow, double click to go back to the automatic width.
 */
const WORKSPACE = "Width Workspace"
const NOTE = "Width Note"
const GROUP = "Width Group"
const SECTION = "Width Section"
const TASK = "Width task"

/** Width saved for the group (null = automatic). */
const savedWidth = async (): Promise<number | null> => {
    const rows = await sql<{ width: number | null }[]>("select", "SELECT width FROM section_group WHERE name = ? AND deleted_at IS NULL", [GROUP])
    return rows[0]?.width ?? null
}

/** The completion bar of the group (the details panel on the right has one with the same label, so look inside the card). */
const groupBar = async () => groupCard(GROUP).$(`[aria-label="${await tr("groups.progress")}"]`)
/** Rendered width of the group: the handle is the last child of its root element. */
const renderedWidth = async (): Promise<number> => {
    const handle = await byLabel(await tr("groups.width.handle"))
    return browser.execute((el: HTMLElement) => el.parentElement!.getBoundingClientRect().width, handle as unknown as HTMLElement)
}

/**
 * Narrows the group by a large step of the keyboard (Shift + arrow, 64 px) from the focused handle. The pointer moves of the driver are not
 * exact to the pixel (the drag with the mouse is covered by the unit tests), the arrow key is.
 */
const narrowWithKeyboard = async () => {
    const handle = byLabel(await tr("groups.width.handle"))
    await handle.waitForDisplayed()
    const element = (await handle.getElement()) as unknown as HTMLElement
    await browser.execute((el: HTMLElement) => el.focus(), element)
    await browser.keys(["Shift", "ArrowLeft"])
}

describe("Group width", () => {
    before(async () => {
        await waitForApp()
        await createWorkspace(WORKSPACE)
        await openWorkspace(WORKSPACE)
        await createFromSidebar("sidebar.addNote", "dialogs.addNote.submit", NOTE)
        await treeRow(NOTE).click()
        await byLabel(await tr("notes.closeCurrent")).waitForDisplayed()

        await byLabel(await tr("menu.newGroup")).click()
        await typeInto(byLabel(await tr("groups.nameLabel")), GROUP)
        await browser.keys("Enter")
        await byText(GROUP).waitForDisplayed({ timeoutMsg: "the group was not created" })
        await newSectionInGroup(groupCard(GROUP), SECTION)
        await addTaskToSection(sectionCard(SECTION), TASK)
        await browser.waitUntil(async () => (await sql<unknown[]>("select", "SELECT id FROM task WHERE text = ?", [TASK])).length > 0, { timeoutMsg: "task not created" })
    })

    it("starts with the automatic width and the completion bar", async () => {
        expect(await savedWidth()).toBeNull()
        await (await groupBar()).waitForDisplayed({ timeoutMsg: "the completion bar is not shown" })
    })

    it("has a horizontal scrollbar taller than the global 6px one, so its thumb is visible", async () => {
        // With the 3px transparent border of the thumb a 6px track would leave no thumb at all
        const height = await browser.execute(() => {
            const scroller = document.querySelector('[data-testid="group-scroll"]')!
            return getComputedStyle(scroller, "::-webkit-scrollbar").height
        })
        expect(height).toBe("14px")
    })

    it("resizes by dragging the handle, hides the completion bar when narrow and saves the width", async () => {
        const before = await renderedWidth()
        // Narrower than the automatic width: under the threshold of the completion bar (320), which then goes away
        await narrowWithKeyboard()
        await browser.waitUntil(async () => (await renderedWidth()) < Math.min(before, 320), { timeoutMsg: "the group did not follow the handle" })
        await (await groupBar()).waitForDisplayed({ reverse: true, timeoutMsg: "the completion bar is still shown in a narrow group" })
        await browser.waitUntil(
            async () => {
                const saved = await savedWidth()
                return saved !== null && saved < 320 && Math.abs((await renderedWidth()) - saved) < 3
            },
            { timeoutMsg: "the width was not saved" },
        )
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
        expect(await (await groupBar()).isExisting()).toBe(false)
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
        await (await groupBar()).waitForDisplayed({ timeoutMsg: "the completion bar did not come back" })
    })
})
