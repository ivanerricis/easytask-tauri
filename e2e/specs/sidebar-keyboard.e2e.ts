import { browser, expect } from "@wdio/globals"
import { createFromSidebar, createWorkspace, openWorkspace, treeRow, waitForApp } from "../helpers"

/**
 * Keyboard navigation of the tree of the sidebar: a single tab stop (roving tabindex), Up / Down between the visible rows,
 * Right / Left to open and close a folder. No drag.
 */
const WORKSPACE = "Keyboard Workspace"
const FOLDER = "Kbd Folder"
const FIRST = "Kbd First"
const SECOND = "Kbd Second"

/** The name (aria-label) of the element that has the focus. */
const focusedName = () => browser.execute(() => document.activeElement?.getAttribute("aria-label") ?? "")

/** Puts the focus on a row without a pointer (the click would also open the note). */
const focusRow = async (name: string) => {
    const row = (await treeRow(name).getElement()) as unknown as HTMLElement
    await browser.execute((el: HTMLElement) => el.focus(), row)
    await browser.waitUntil(async () => (await focusedName()) === name, { timeoutMsg: `the row ${name} did not take the focus` })
}

const expectFocus = async (name: string) =>
    browser.waitUntil(async () => (await focusedName()) === name, { timeoutMsg: `the focus is not on ${name}, it is on ${await focusedName()}` })

describe("Sidebar tree keyboard", () => {
    before(async () => {
        await waitForApp()
        await createWorkspace(WORKSPACE)
        await openWorkspace(WORKSPACE)
        await createFromSidebar("sidebar.addFolder", "dialogs.addFolder.submit", FOLDER)
        await createFromSidebar("sidebar.addNote", "dialogs.addNote.submit", FIRST)
        await createFromSidebar("sidebar.addNote", "dialogs.addNote.submit", SECOND)
    })

    it("has one row in the tab order: the one that has the focus", async () => {
        await focusRow(FIRST)
        await browser.waitUntil(async () => (await treeRow(FIRST).getAttribute("tabindex")) === "0", { timeoutMsg: "the focused row is not the tab stop" })
        await expect(treeRow(FOLDER)).toHaveAttribute("tabindex", "-1")
        await expect(treeRow(SECOND)).toHaveAttribute("tabindex", "-1")
    })

    it("moves the focus to the next and the previous row with the arrows", async () => {
        await focusRow(FIRST)
        await browser.keys("ArrowDown")
        await expectFocus(SECOND)
        await expect(treeRow(SECOND)).toHaveAttribute("tabindex", "0")
        await expect(treeRow(FIRST)).toHaveAttribute("tabindex", "-1")
        await browser.keys("ArrowUp")
        await expectFocus(FIRST)
        await browser.keys("ArrowUp")
        await expectFocus(FOLDER)
    })

    it("closes and opens a folder with Left and Right", async () => {
        await focusRow(FOLDER)
        await expect(treeRow(FOLDER)).toHaveAttribute("aria-expanded", "true")
        await browser.keys("ArrowLeft")
        await browser.waitUntil(async () => (await treeRow(FOLDER).getAttribute("aria-expanded")) === "false", { timeoutMsg: "the folder did not close" })
        await browser.keys("ArrowRight")
        await browser.waitUntil(async () => (await treeRow(FOLDER).getAttribute("aria-expanded")) === "true", { timeoutMsg: "the folder did not open" })
        await expectFocus(FOLDER)
    })
})
