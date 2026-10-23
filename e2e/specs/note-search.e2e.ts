import { $, $$, browser, expect } from "@wdio/globals"
import {
    addTaskButton, byLabel, byText, closeTaskInput, createFromSidebar, createWorkspace, groupCard, newSectionInGroup, openWorkspace,
    sectionCard, tr, treeRow, typeInto, waitForApp,
} from "../helpers"

const WORKSPACE = "Search Workspace"
const NOTE = "Search Note"
const GROUP = "Search Group"
const SECTION = "Search S1"
const TASKS = ["Compra il latte", "Il Latte di soia"]

/** The "N di M" counter of the search field (a plain text, not a button: `byText` only finds the clickable ones). */
const counter = async (current: number, total: number) =>
    $(`//*[normalize-space()=${JSON.stringify(await tr("notes.noteSearch.counter", { current, total }))}]`)

/** The text of the marks that are on the screen. */
const markTexts = (): Promise<string[]> =>
    browser.execute(() => [...document.querySelectorAll("mark")].map(mark => mark.textContent ?? ""))

describe("Search in a note", () => {
    before(async () => {
        await waitForApp()
    })

    it("creates a note with a group, a section and two tasks", async () => {
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
            // The field stays open for the next task (preference "keep adding tasks"): wait for the saved task, then Esc closes it
            await closeTaskInput()
            await browser.waitUntil(async () => (await $$("[data-task-id]").length) >= TASKS.indexOf(text) + 1, { timeoutMsg: `task "${text}" not created` })
        }
    })

    it("highlights the matches, counts them and moves between them with Enter", async () => {
        await byLabel(await tr("notes.noteSearch.inNote")).click()
        const field = byLabel(await tr("notes.noteSearch.inNote"))
        await field.waitForDisplayed({ timeoutMsg: "the search field did not open" })
        await typeInto(field, "latte")

        await browser.waitUntil(async () => (await markTexts()).length === 2, { timeoutMsg: "the matches are not highlighted" })
        expect((await markTexts()).map(text => text.toLowerCase())).toEqual(["latte", "latte"])
        await expect(await counter(1, 2)).toBeDisplayed()
        await expect($$("mark[data-active]")).toBeElementsArrayOfSize(1)

        await browser.keys("Enter")
        await expect(await counter(2, 2)).toBeDisplayed()
        await browser.keys(["Shift", "Enter"])
        await expect(await counter(1, 2)).toBeDisplayed()
    })

    it("closes with Esc and clears the highlights", async () => {
        await browser.keys("Escape")
        await browser.waitUntil(async () => (await $$("mark").length) === 0, { timeoutMsg: "the highlights are still there" })
        await expect(byLabel(await tr("notes.noteSearch.inNote"))).toBeDisplayed()
    })
})
