import { execSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { $, $$, browser, expect } from "@wdio/globals"
import {
    byLabel, byText, createFromSidebar, createWorkspace, currentLang, dataDir, domClick, openWorkspace, sectionCard, topDialog, tr, trIn,
    treeRow, typeInto, waitForApp,
} from "../helpers"

/**
 * Persistence across an app restart.
 *
 * Restart: `browser.reloadSession()` was tried against tauri-driver (WebView2 / msedgedriver, Windows): it ends the
 * session, which closes the app, runs afterSession / beforeSession of wdio.conf.ts (the old tauri-driver is stopped, a
 * new one listens on :4444 again) and starts a NEW EasyTask process on the same EASYTASK_DATA_DIR: the PID changes and
 * the page starts again from the home (a JS marker set on window is gone). So it is a real restart, and wdio.conf.ts
 * needed no change. The test below also checks that the PID changed.
 *
 * Limit found by the same experiment: the webview profile is NOT shared between sessions (a localStorage key written
 * before reloadSession is gone after it). The preferences kept by the app in settings.dat (language, accent color, hide
 * completed...) and the database do survive; the theme lives in the localStorage of the webview, so it cannot be
 * checked through the driver (see the skipped test).
 */
const WORKSPACE = "Persist Workspace"
const NOTE = "Persist Note"
const GROUP = "Persist Group"
const SECTION = "Persist Section"
const TASK = "Persist task"
const ACCENT = "#3366cc"

/** Ids of the running app processes (a restart gives the app a new one). */
const appPids = (): string[] => {
    try {
        if (process.platform === "win32") {
            const out = execSync('tasklist /FI "IMAGENAME eq EasyTask.exe" /FO CSV /NH', { encoding: "utf8" })
            return out.split(/\r?\n/).map((line) => /^"EasyTask\.exe","(\d+)"/.exec(line)?.[1]).filter((pid): pid is string => !!pid)
        }
        return execSync("pgrep -x EasyTask", { encoding: "utf8" }).split(/\s+/).filter(Boolean)
    } catch {
        return [] // pgrep exits with 1 when nothing matches
    }
}

/** The preferences file of the app (the store plugin writes it with a debounce: the specs wait for it). */
const settingsFile = async () => path.join(await dataDir(), "settings.dat")

const languageRadio = (label: string) => $(`//*[@role='radiogroup']//*[@role='radio'][normalize-space()='${label}']`)

/** Opens the settings on a category and returns the dialog. */
const openSettings = async (category: "appearance" | "notes") => {
    await domClick(byLabel(await tr("settings.title")))
    const dialog = $('[role="dialog"]')
    await dialog.waitForDisplayed()
    await domClick(byText(await tr(`settings.categories.${category}`), dialog))
    return dialog
}

const closeSettings = async () => {
    // One Escape per open dialog (a confirmation may still be closing over the settings)
    await browser.waitUntil(
        async () => {
            if (Array.from(await $$('[role="dialog"]')).length === 0) return true
            await browser.keys("Escape")
            return false
        },
        { timeoutMsg: "the settings dialog did not close", interval: 500 },
    )
}

// The note header has a button with the same label: the switch is the one in the dialog
const hideCompletedSwitch = async () => $(`[role="dialog"] [role="switch"][aria-label=${JSON.stringify(await tr("settings.notes.hideCompleted.label"))}]`)
const accentInput = async () => $(`[role="dialog"] input[type="color"]`)

/** Values of the task text areas of a section card, read in one page-side call. */
const taskValues = async (title: string) => {
    const label = await tr("tasks.editText")
    const card = await sectionCard(title)
    return browser.execute(
        (el: HTMLElement, aria: string) =>
            Array.from(el.querySelectorAll<HTMLTextAreaElement>(`[aria-label="${aria}"]`)).map((area) => area.value),
        card as unknown as HTMLElement,
        label,
    )
}

let languageBefore: "it" | "en" = "en"
let languageChosen: "it" | "en" = "it"

describe("Settings and data survive an app restart", () => {
    before(async () => {
        await waitForApp()
        await byLabel(await tr("settings.title")).waitForDisplayed({ timeout: 30_000 })
        languageBefore = await currentLang()
        languageChosen = languageBefore === "en" ? "it" : "en"
    })

    after(async () => {
        // Back to the defaults (system language, theme and accent, completed tasks shown): the other specs start from there
        try {
            await waitForApp()
            if (Array.from(await $$('[role="dialog"]')).length > 0) await closeSettings()
            const dialog = await openSettings("notes")
            const hide = await hideCompletedSwitch()
            if ((await hide.getAttribute("aria-checked")) === "true") await domClick(hide)
            await domClick(byText(await tr("settings.categories.appearance"), dialog))
            const reset = $(`[title=${JSON.stringify(await tr("settings.appearance.reset.description"))}]`)
            if (await reset.isEnabled()) {
                await domClick(reset)
                const confirm = await topDialog()
                await domClick(byText(await tr("settings.appearance.reset.confirm"), confirm))
            }
            const system = languageRadio(trIn(await currentLang(), "common.system"))
            await expect(system).toHaveAttribute("aria-checked", "true")
            await closeSettings()
        } catch (error) {
            console.log("[e2e] could not restore the default settings:", error)
        }
    })

    it("sets language, accent color and hide completed, and creates a workspace with a note, group, section and task", async () => {
        await createWorkspace(WORKSPACE)
        await openWorkspace(WORKSPACE)
        await createFromSidebar("sidebar.addNote", "dialogs.addNote.submit", NOTE)
        await treeRow(NOTE).click()
        await byLabel(await tr("notes.closeCurrent")).waitForDisplayed()

        await byText(await tr("menu.newGroup")).click()
        await typeInto(byLabel(await tr("groups.nameLabel")), GROUP)
        await byLabel(await tr("common.add")).click()
        await byText(GROUP).waitForDisplayed({ timeoutMsg: "the group was not created" })
        await byText(await tr("sections.new")).click()
        await typeInto(byLabel(await tr("sections.titleLabel")), SECTION)
        await byLabel(await tr("common.add")).click()
        await sectionCard(SECTION).waitForDisplayed()
        await sectionCard(SECTION).$(`[aria-label="${await tr("tasks.add")}"]`).click()
        await typeInto(sectionCard(SECTION).$("input"), TASK)
        await sectionCard(SECTION).$(`[aria-label="${await tr("common.add")}"]`).click()
        await browser.waitUntil(async () => (await taskValues(SECTION)).includes(TASK), { timeoutMsg: "task not created" })
        await domClick(sectionCard(SECTION).$('[role="checkbox"]'))
        await expect(sectionCard(SECTION).$('[role="checkbox"]')).toHaveAttribute("aria-checked", "true")

        // Hide completed tasks (from the settings), the accent color, and last the language
        const dialog = await openSettings("notes")
        const hide = await hideCompletedSwitch()
        await domClick(hide)
        await expect(hide).toHaveAttribute("aria-checked", "true")

        await domClick(byText(await tr("settings.categories.appearance"), dialog))
        const accent = await accentInput()
        await accent.waitForExist()
        const element = (await accent.getElement()) as unknown as HTMLInputElement
        await browser.execute((el: HTMLInputElement, value: string) => {
            // React listens to the input event, and reads the value through its own tracker: use the native setter
            Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(el, value)
            el.dispatchEvent(new Event("input", { bubbles: true }))
        }, element, ACCENT)
        await browser.waitUntil(async () => (await accent.getValue()) === ACCENT, { timeoutMsg: "the accent color was not set" })

        await languageRadio(languageChosen === "it" ? "Italiano" : "English").click()
        await browser.waitUntil(async () => (await currentLang()) === languageChosen, { timeoutMsg: "the language did not change" })
        await closeSettings()

        // The store plugin saves with a debounce: wait until the file really has the values before restarting
        const file = await settingsFile()
        await browser.waitUntil(
            () => {
                try {
                    const content = fs.readFileSync(file, "utf8")
                    return content.includes(ACCENT) && content.includes(`"${languageChosen}"`) && /hideCompletedTasks"\s*:\s*true/.test(content)
                } catch {
                    return false
                }
            },
            { timeout: 15_000, timeoutMsg: `settings.dat does not contain the new preferences (${file})` },
        )
    })

    it("restarts the app (new process, back to the home)", async () => {
        const before = appPids()
        expect(before.length).toBeGreaterThan(0)
        await browser.reloadSession()
        await waitForApp()
        await browser.waitUntil(() => appPids().some((pid) => !before.includes(pid)), { timeoutMsg: "the app was not started again (same process)" })
        // The page started over: the home with the list of workspaces
        await byLabel(await tr("home.workspace.open", { name: WORKSPACE })).waitForDisplayed({ timeout: 30_000 })
    })

    it("keeps the language, the accent color and hide completed", async () => {
        expect(await currentLang()).toBe(languageChosen)

        const dialog = await openSettings("appearance")
        await expect(languageRadio(languageChosen === "it" ? "Italiano" : "English")).toHaveAttribute("aria-checked", "true")
        const accent = await accentInput()
        await accent.waitForExist()
        expect(await accent.getValue()).toBe(ACCENT)

        await domClick(byText(await tr("settings.categories.notes"), dialog))
        await expect(await hideCompletedSwitch()).toHaveAttribute("aria-checked", "true")
        await closeSettings()
    })

    it("keeps the workspace, note, group, section and the completed task, which is still hidden", async () => {
        await openWorkspace(WORKSPACE)
        // The open notes may be restored; if not, open it
        const close = byLabel(await tr("notes.closeCurrent"))
        if (!(await close.waitForDisplayed({ timeout: 4_000 }).then(() => true, () => false))) {
            await treeRow(NOTE).click()
            await close.waitForDisplayed()
        }
        await byText(GROUP).waitForDisplayed({ timeoutMsg: "the group was lost" })
        await sectionCard(SECTION).waitForDisplayed({ timeoutMsg: "the section was lost" })

        await expect(byLabel(await tr("notes.hideCompleted"))).toHaveAttribute("aria-pressed", "true")
        await expect(sectionCard(SECTION).$('[data-testid="hidden-completed"]')).toHaveText(await tr("tasks.hiddenCompleted_one", { count: 1 }))
        expect(await taskValues(SECTION)).not.toContain(TASK)

        // Showing the completed tasks again: the task is there, still completed
        await domClick(byLabel(await tr("notes.hideCompleted")))
        await browser.waitUntil(async () => (await taskValues(SECTION)).includes(TASK), { timeoutMsg: "the task was lost" })
        await expect(sectionCard(SECTION).$('[role="checkbox"]')).toHaveAttribute("aria-checked", "true")
    })

    // The theme is kept in the localStorage of the webview, which tauri-driver does not share between sessions (see the
    // notes at the top): it cannot be checked after a restart through the driver.
    it.skip("keeps the theme", () => undefined)
})
