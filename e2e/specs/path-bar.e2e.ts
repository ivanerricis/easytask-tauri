import { $, browser, expect } from "@wdio/globals"
import {
    byLabel, byText, createFromSidebar, createWorkspace, openContextMenu, openWorkspace, tr, treeRow, typeInto, waitForApp,
} from "../helpers"

const WORKSPACE = "Path Workspace"
const OUTER = "Path Outer"
const INNER = "Path Inner"
const NOTE = "Path Note"

/** Creates an item from the context menu of a folder (the dialog creates it inside that folder). */
const createInside = async (folder: string, menuKey: string, submitKey: string, name: string) => {
    const menu = await openContextMenu(treeRow(folder))
    await byText(await tr(menuKey), menu).click()
    const dialog = $('[role="dialog"]')
    await dialog.waitForDisplayed()
    await typeInto(dialog.$('input[name="name"]'), name)
    await byText(await tr(submitKey), dialog).click()
    await dialog.waitForExist({ reverse: true })
}

describe("Path bar", () => {
    before(async () => {
        await waitForApp()
    })

    it("creates a note inside a nested folder and opens it", async () => {
        await createWorkspace(WORKSPACE)
        await openWorkspace(WORKSPACE)
        await createFromSidebar("sidebar.addFolder", "dialogs.addFolder.submit", OUTER)
        await createInside(OUTER, "menu.newFolder", "dialogs.addFolder.submit", INNER)
        await createInside(INNER, "menu.newNote", "dialogs.addNote.submit", NOTE)
        await treeRow(NOTE).click()
        await byLabel(await tr("notes.closeCurrent")).waitForDisplayed()
    })

    it("shows the path of the open note", async () => {
        const bar = $(`nav[aria-label=${JSON.stringify(await tr("notes.path.label"))}]`)
        await bar.waitForDisplayed({ timeoutMsg: "the path bar is not shown" })
        for (const name of [OUTER, INNER, NOTE]) {
            await expect(byLabel(await tr("notes.path.reveal", { name }))).toBeDisplayed()
        }
        await expect(byLabel(await tr("notes.path.reveal", { name: NOTE }))).toHaveAttribute("aria-current", "page")
    })

    it("shows the note in the sidebar when its crumb is clicked, expanding the collapsed folders", async () => {
        await treeRow(OUTER).click()
        await treeRow(NOTE).waitForDisplayed({ reverse: true, timeoutMsg: "the folder did not collapse" })

        await byLabel(await tr("notes.path.reveal", { name: NOTE })).click()
        await treeRow(NOTE).waitForDisplayed({ timeoutMsg: "the note was not revealed in the sidebar" })
        await expect(treeRow(NOTE)).toHaveAttribute("aria-selected", "true")
        await expect(treeRow(OUTER)).toHaveAttribute("aria-expanded", "true")
    })

    it("selects a folder from its crumb without collapsing it", async () => {
        await byLabel(await tr("notes.path.reveal", { name: INNER })).click()
        await browser.waitUntil(async () => (await treeRow(INNER).getAttribute("aria-selected")) === "true", {
            timeoutMsg: "the folder was not selected",
        })
        await expect(treeRow(INNER)).toHaveAttribute("aria-expanded", "true")
        await expect(treeRow(NOTE)).toBeDisplayed()
    })
})
