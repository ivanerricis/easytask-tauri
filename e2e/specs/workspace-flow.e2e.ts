import { $, $$, browser, expect } from "@wdio/globals"
import {
    byLabel, byText, createFromSidebar, createWorkspace, openWorkspace, sectionCard, topDialog, tr, treeRow, typeInto,
    waitForApp,
} from "../helpers"

const WORKSPACE = "E2E Workspace"
const FOLDER = "E2E Folder"
const NOTE = "E2E Note"
const GROUP = "E2E Group"
const SECTION_A = "Section A"
const SECTION_B = "Section B"
const TASK = "Write the e2e tests"

/** Values of the task text areas inside a section card. */
const taskValues = async (sectionTitle: string) => {
    const areas = await sectionCard(sectionTitle).$$(`[aria-label="${await tr("tasks.editText")}"]`)
    const values: string[] = []
    for (const area of areas) values.push(await area.getValue())
    return values
}

/** Opens the "..." menu of a task (the button only shows on hover) and returns the open menu. */
const openTaskMenu = async (text: string) => {
    const candidates = await $$(`[aria-label="${await tr("tasks.editText")}"]`)
    let target: WebdriverIO.Element | undefined
    for (const candidate of candidates) {
        if ((await candidate.getValue()) === text) target = candidate
    }
    if (!target) throw new Error(`task "${text}" not found`)
    const row = await target.$(`./ancestor::div[.//button[@aria-label="${await tr("common.openMenu")}"]][1]`)
    await row.moveTo()
    await row.$(`button[aria-label="${await tr("common.openMenu")}"]`).click()
    const menu = $('[role="menu"]')
    await menu.waitForDisplayed()
    return menu
}

describe("Workspace, folders, notes, groups, sections and tasks", () => {
    before(async () => {
        await waitForApp()
    })

    it("creates a workspace and opens it", async () => {
        await createWorkspace(WORKSPACE)
        await openWorkspace(WORKSPACE)
    })

    it("creates a folder and a note and opens the note", async () => {
        await createFromSidebar("sidebar.addFolder", "dialogs.addFolder.submit", FOLDER)
        await expect(treeRow(FOLDER)).toBeDisplayed()

        await createFromSidebar("sidebar.addNote", "dialogs.addNote.submit", NOTE)
        await treeRow(NOTE).click()
        await byLabel(await tr("notes.closeCurrent")).waitForDisplayed()
    })

    it("creates a group, two sections and a task", async () => {
        await byText(await tr("menu.newGroup")).click()
        await typeInto(byLabel(await tr("groups.nameLabel")), GROUP)
        await byLabel(await tr("common.add")).click()
        await expect(byLabel(await tr("groups.nameLabel"))).toHaveValue(GROUP)

        for (const title of [SECTION_A, SECTION_B]) {
            await byText(await tr("sections.new")).click()
            await typeInto(byLabel(await tr("sections.titleLabel")), title)
            await byLabel(await tr("common.add")).click()
            await sectionCard(title).waitForDisplayed()
        }

        await sectionCard(SECTION_A).$(`[aria-label="${await tr("tasks.add")}"]`).click()
        await typeInto(sectionCard(SECTION_A).$("input"), TASK)
        await sectionCard(SECTION_A).$(`[aria-label="${await tr("common.add")}"]`).click()
        await browser.waitUntil(async () => (await taskValues(SECTION_A)).includes(TASK), { timeoutMsg: "task not created" })
    })

    it("completes the task", async () => {
        const checkbox = sectionCard(SECTION_A).$('[role="checkbox"]')
        await checkbox.click()
        await expect(checkbox).toHaveAttribute("aria-checked", "true")
        await checkbox.click()
        await expect(checkbox).toHaveAttribute("aria-checked", "false")
    })

    it("moves the task to the other section", async () => {
        const menu = await openTaskMenu(TASK)
        await byText(await tr("menu.moveTo"), menu).click()
        const destination = $(`//div[@role='menu']//button[.//span[contains(normalize-space(), '${SECTION_B}')]]`)
        await destination.waitForDisplayed()
        await destination.click()

        await browser.waitUntil(async () => (await taskValues(SECTION_B)).includes(TASK), { timeoutMsg: "task not moved" })
        expect(await taskValues(SECTION_A)).not.toContain(TASK)
    })

    it("deletes the task to the trash and restores it", async () => {
        const menu = await openTaskMenu(TASK)
        await byText(await tr("common.delete"), menu).click()
        const confirm = await topDialog()
        await byText(await tr("dialogs.delete.confirm"), confirm).click()
        await browser.waitUntil(async () => !(await taskValues(SECTION_B)).includes(TASK), { timeoutMsg: "task not deleted" })

        await $(`//button[.//span[normalize-space()='${await tr("trash.title")}']]`).click()
        const trash = $('[role="dialog"]')
        await trash.waitForDisplayed()
        await trash.$(`[aria-label=${JSON.stringify(await tr("trash.restoreAria", { name: TASK }))}]`).click()
        await expect(trash.$(`p=${await tr("trash.isEmpty")}`)).toBeDisplayed()
        await browser.keys("Escape")
        await trash.waitForExist({ reverse: true })

        await browser.waitUntil(async () => (await taskValues(SECTION_B)).includes(TASK), {
            timeoutMsg: "restored task is not shown again",
        })
    })
})
