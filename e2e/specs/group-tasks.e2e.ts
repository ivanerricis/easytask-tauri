import { $, $$, browser, expect } from "@wdio/globals"
import {
    addTaskToSection, addTaskToGroup, byLabel, byText, createFromSidebar, createWorkspace, directTasks, groupAddTaskButton, groupCard,
    menuButton, menuButtonPredicate, newSectionInGroup, openMenuWithButton, openSubmenu, openWorkspace, sectionCard, tr, treeRow, typeInto, waitForApp,
} from "../helpers"

const WORKSPACE = "Direct Tasks Workspace"
const NOTE = "Direct Tasks Note"
const GROUP = "Direct Group"
const SECTION = "Direct Section"
const DIRECT_TASK = "Task in the group"
const SECTION_TASK = "Task in the section"

type Scope = WebdriverIO.Element | ReturnType<typeof $>

/** Values of the task text areas inside `scope`, read in a single page-side call (no stale element references). */
const valuesIn = async (scope: Scope) => {
    const label = await tr("tasks.editText")
    const el = (await scope.getElement()) as unknown as HTMLElement
    return browser.execute(
        (root: HTMLElement, aria: string) => Array.from(root.querySelectorAll<HTMLTextAreaElement>(`[aria-label="${aria}"]`)).map(area => area.value),
        el,
        label,
    )
}

/** Opens the "..." menu of the task with this text (the button only shows on hover) and returns the open menu. */
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

describe("Tasks directly in a group", () => {
    before(async () => {
        await waitForApp()
    })

    it("creates a workspace, a note and a group", async () => {
        await createWorkspace(WORKSPACE)
        await openWorkspace(WORKSPACE)
        await createFromSidebar("sidebar.addNote", "dialogs.addNote.submit", NOTE)
        await treeRow(NOTE).click()
        await byLabel(await tr("notes.closeCurrent")).waitForDisplayed()

        await byLabel(await tr("menu.newGroup")).click()
        await typeInto(byLabel(await tr("groups.nameLabel")), GROUP)
        await browser.keys("Enter")
        await byText(GROUP).waitForDisplayed({ timeoutMsg: "the group was not created" })
    })

    it("shows the 'Nuovo task' button in the empty group and no section button", async () => {
        await expect(await groupAddTaskButton(groupCard(GROUP))).toBeDisplayed()
        await expect(byText(await tr("sections.new"), groupCard(GROUP))).not.toBeDisplayed()
    })

    it("creates a task directly in the group with its button", async () => {
        await addTaskToGroup(groupCard(GROUP), DIRECT_TASK)
        await browser.waitUntil(async () => (await valuesIn(directTasks(groupCard(GROUP)))).includes(DIRECT_TASK), { timeoutMsg: "the direct task was not created" })
    })

    it("opens the new task field without a horizontal scrollbar, the add and cancel buttons sharing the width of the form", async () => {
        await (await groupAddTaskButton(groupCard(GROUP))).click()
        await directTasks(groupCard(GROUP)).$("input").waitForDisplayed()
        const size = await browser.execute((group: HTMLElement) => {
            const direct = group.querySelector<HTMLElement>("[data-direct-tasks]")!
            // The area that scrolls with the direct tasks and the sections
            const scroller = direct.parentElement!
            const form = direct.querySelector("form")!
            const buttons = Array.from(form.querySelectorAll("button")).map(button => button.getBoundingClientRect().width)
            return { scrollWidth: scroller.scrollWidth, clientWidth: scroller.clientWidth, form: form.getBoundingClientRect().width, buttons }
        }, (await groupCard(GROUP).getElement()) as unknown as HTMLElement)
        expect(size.scrollWidth).toBeLessThanOrEqual(size.clientWidth + 1)
        expect(size.buttons.reduce((sum, width) => sum + width, 0)).toBeLessThanOrEqual(size.form + 1)
        await browser.keys("Escape")
        await expect(await groupAddTaskButton(groupCard(GROUP))).toBeDisplayed()
    })

    it("creates a section from the menu of the group, below the direct tasks", async () => {
        await newSectionInGroup(groupCard(GROUP), SECTION)
        await expect(sectionCard(SECTION)).toBeDisplayed()
        // The direct tasks stay out of the section
        expect(await valuesIn(sectionCard(SECTION))).not.toContain(DIRECT_TASK)
        // The button stays right under the direct tasks, above the section
        const order = await browser.execute((group: HTMLElement) => {
            const direct = group.querySelector("[data-direct-tasks]")
            const card = group.querySelector("[data-section-card]")
            return !!direct && !!card && !!(direct.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING)
        }, (await groupCard(GROUP).getElement()) as unknown as HTMLElement)
        expect(order).toBe(true)
    })

    it("creates a task in the section", async () => {
        await addTaskToSection(sectionCard(SECTION), SECTION_TASK)
        await browser.waitUntil(async () => (await valuesIn(sectionCard(SECTION))).includes(SECTION_TASK), { timeoutMsg: "the section task was not created" })
    })

    it("moves a task from the direct area to the section and back", async () => {
        let menu = await openTaskMenu(DIRECT_TASK)
        let destination = $(`//*[@role='menuitem'][.//span[contains(normalize-space(), ${JSON.stringify(SECTION)})]]`)
        await openSubmenu(menu, await tr("menu.moveTo"), destination)
        await destination.click()
        await browser.waitUntil(async () => (await valuesIn(sectionCard(SECTION))).includes(DIRECT_TASK), { timeoutMsg: "task not moved to the section" })
        expect(await valuesIn(directTasks(groupCard(GROUP)))).not.toContain(DIRECT_TASK)

        menu = await openTaskMenu(DIRECT_TASK)
        // The entry of the direct area carries the hint "Task del gruppo"
        destination = $(`//*[@role='menuitem'][.//span[normalize-space()=${JSON.stringify(await tr("groups.directTasks"))}]]`)
        await openSubmenu(menu, await tr("menu.moveTo"), destination)
        await destination.click()
        await browser.waitUntil(async () => (await valuesIn(directTasks(groupCard(GROUP)))).includes(DIRECT_TASK), { timeoutMsg: "task not moved back to the group" })
        expect(await valuesIn(sectionCard(SECTION))).not.toContain(DIRECT_TASK)
    })
})
