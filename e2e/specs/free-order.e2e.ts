import { browser, expect } from "@wdio/globals"
import {
    addTaskToGroup, byLabel, byText, createFromSidebar, createWorkspace, directTasks, groupCard, newSectionInGroup, openContextMenu,
    openWorkspace, sectionCard, sql, tr, treeRow, typeInto, waitForApp,
} from "../helpers"

const WORKSPACE = "Free Order Workspace"
const NOTE = "Free Order Note"
const GROUP = "Free Order Group"
const FIRST = "Order First"
const SECOND = "Order Second"
const DIRECT_TASK = "Order direct task"

/** Top to bottom order of the direct tasks area ("tasks") and of the section cards (their titles) inside the group. */
const visibleOrder = async () =>
    browser.execute((group: HTMLElement) => {
        const items = Array.from(group.querySelectorAll<HTMLElement>("[data-direct-tasks], [data-section-card]"))
        return items.map(item => (item.hasAttribute("data-direct-tasks") ? "tasks" : item.querySelector<HTMLElement>("button[title]")?.title ?? ""))
    }, (await groupCard(GROUP).getElement()) as unknown as HTMLElement)

/** Same order as saved in the database: the hidden default section is the one with is_default = 1. */
const savedOrder = async () => {
    const rows = await sql<{ title: string | null; is_default: number }[]>(
        "select",
        `SELECT s.title AS title, s.is_default AS is_default FROM section s
         JOIN section_group g ON g.id = s.groupID
         WHERE g.name = ? AND s.deleted_at IS NULL ORDER BY s.position, s.id`,
        [GROUP],
    )
    return rows.map(row => (row.is_default ? "tasks" : row.title ?? ""))
}

const waitForOrder = async (expected: string[]) => {
    await browser.waitUntil(async () => JSON.stringify(await visibleOrder()) === JSON.stringify(expected), {
        timeoutMsg: `the group does not show ${expected.join(" > ")}`,
    })
    await browser.waitUntil(async () => JSON.stringify(await savedOrder()) === JSON.stringify(expected), {
        timeoutMsg: `the order ${expected.join(" > ")} was not saved`,
    })
}

/** Moves a section one step with "Sposta su" / "Sposta giù" in its context menu. */
const moveSection = async (title: string, key: "menu.moveUp" | "menu.moveDown") => {
    const menu = await openContextMenu(sectionCard(title).$("button[title]"))
    const item = byText(await tr(key), menu)
    expect(await item.getAttribute("aria-disabled")).not.toBe("true")
    await item.click()
}

describe("Free order of the tasks and the sections in a group", () => {
    before(async () => {
        await waitForApp()
    })

    it("creates a group with direct tasks and two sections", async () => {
        await createWorkspace(WORKSPACE)
        await openWorkspace(WORKSPACE)
        await createFromSidebar("sidebar.addNote", "dialogs.addNote.submit", NOTE)
        await treeRow(NOTE).click()
        await byLabel(await tr("notes.closeCurrent")).waitForDisplayed()

        await byText(await tr("menu.newGroup")).click()
        await typeInto(byLabel(await tr("groups.nameLabel")), GROUP)
        await browser.keys("Enter")
        await byText(GROUP).waitForDisplayed({ timeoutMsg: "the group was not created" })

        await addTaskToGroup(groupCard(GROUP), DIRECT_TASK)
        await newSectionInGroup(groupCard(GROUP), FIRST)
        await newSectionInGroup(groupCard(GROUP), SECOND)
        await waitForOrder(["tasks", FIRST, SECOND])
    })

    it("moves the first section above the direct tasks", async () => {
        await moveSection(FIRST, "menu.moveUp")
        await waitForOrder([FIRST, "tasks", SECOND])
        // The tasks stay where they were created, just lower in the group
        await expect(directTasks(groupCard(GROUP))).toBeDisplayed()
    })

    it("moves the second section above the direct tasks too and the order is kept", async () => {
        await moveSection(SECOND, "menu.moveUp")
        await moveSection(SECOND, "menu.moveUp")
        await waitForOrder([SECOND, FIRST, "tasks"])
    })

    it("moves a section back below the direct tasks", async () => {
        await moveSection(FIRST, "menu.moveDown")
        await waitForOrder([SECOND, "tasks", FIRST])
    })
})
