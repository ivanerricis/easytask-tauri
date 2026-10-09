import { $, $$, browser, expect } from "@wdio/globals"
import {
    byLabel, byText, createFromSidebar, createWorkspace, cssColor, currentLang, domClick, openContextMenu, openWorkspace, sectionCard, tr, treeRow,
    typeInto, waitForApp,
    addTaskButton, menuButton, topDialog,
} from "../helpers"

const WORKSPACE = "Auto Workspace"
const NOTE = "Auto Note"
const GROUP = "Auto Group"
const TODO = "Auto Da fare"
const DONE = "Auto Fatto"
const TASK_1 = "Auto task uno"
const TASK_2 = "Auto task due"
const TASK_3 = "Auto task tre"
const COPY_TASK = "Auto task copia"
const GREEN = { r: 0x3c, g: 0xb4, b: 0x4b } // PALETTE_COLORS[1], "common.colors.c2"

const xpathString = (value: string) =>
    value.includes("'") ? `concat('${value.split("'").join(`', "'", '`)}')` : `'${value}'`

type Chainable = ReturnType<typeof $>

/** The sentence the app shows for the rule "task completed in TODO -> move to the bottom of DONE and set a color". */
const ruleDescription = async (from: string, to: string) =>
    tr("automations.describe.rule", {
        trigger: await tr("automations.describe.inSection", { trigger: await tr("automations.triggers.taskCompleted"), section: from }),
        actions: [await tr("automations.describe.moveBottom", { section: to }), await tr("automations.describe.setColor")].join(", "),
    })

/** Values of the task text areas of a section card. */
const taskValues = async (sectionTitle: string) => {
    const label = await tr("tasks.editText")
    const card = await sectionCard(sectionTitle)
    return browser.execute(
        (el: HTMLElement, aria: string) =>
            Array.from(el.querySelectorAll<HTMLTextAreaElement>(`[aria-label="${aria}"]`)).map((area) => area.value),
        card as unknown as HTMLElement,
        label,
    )
}

/** Where a task is right now: the id of its row and the title of its section (null when it is not on the page). */
const locate = async (text: string) => {
    const label = await tr("tasks.editText")
    return browser.execute((aria: string, value: string) => {
        const area = Array.from(document.querySelectorAll<HTMLTextAreaElement>(`textarea[aria-label="${aria}"]`)).find((el) => el.value === value)
        const row = area?.closest<HTMLElement>("[data-task-id]")
        if (!area || !row) return null
        const card = row.closest<HTMLElement>("[data-section-card]")
        return { id: row.dataset.taskId ?? "", section: card?.querySelector<HTMLElement>("button[title]")?.title ?? "" }
    }, label, text)
}

const waitForTaskIn = async (text: string, section: string) => {
    await browser.waitUntil(async () => (await locate(text))?.section === section, { timeoutMsg: `the task "${text}" is not in "${section}"` })
}

const checkbox = async (text: string) => {
    const found = await locate(text)
    if (!found) throw new Error(`task "${text}" not found`)
    return $(`[data-task-id="${found.id}"] [role="checkbox"]`)
}

const isCompleted = async (text: string) => (await (await checkbox(text)).getAttribute("aria-checked")) === "true"

const addTask = async (section: string, text: string) => {
    const before = (await taskValues(section)).length
    await (await addTaskButton(sectionCard(section))).click()
    await typeInto(sectionCard(section).$("input"), text)
    await sectionCard(section).$(`[aria-label="${await tr("common.add")}"]`).click()
    await browser.waitUntil(async () => (await taskValues(section)).length === before + 1, { timeoutMsg: `task "${text}" not created` })
}

/** Opens the "..." menu of a task (the button only shows on hover) and returns the open menu. */
const openTaskMenu = async (text: string) => {
    const found = await locate(text)
    if (!found) throw new Error(`task "${text}" not found`)
    const row = $(`[data-task-id="${found.id}"]`)
    await row.moveTo()
    await (await menuButton(row)).click()
    const menu = $('[role="menu"]')
    await menu.waitForDisplayed()
    return menu
}

/** Ctrl+<key> with the focus out of any text field (the app ignores undo/redo shortcuts inside them). */
const pressCtrl = async (key: string) => {
    await browser.execute(() => (document.activeElement as HTMLElement | null)?.blur())
    await browser.keys(["Control", key])
}

const dialogTitled = (title: string) => $(`//*[@role='dialog' or @role='alertdialog'][.//h2[normalize-space()=${xpathString(title)}]]`)

const toastWith = (text: string) => $(`//*[@data-sonner-toast][contains(normalize-space(), ${xpathString(text)})]`)

const noToasts = () => browser.execute(() => document.querySelectorAll("[data-sonner-toast]").length === 0)

/** Opens the automations dialog of a note from the menu of its sidebar row. */
const openAutomations = async (note: string) => {
    const menu = await openContextMenu(treeRow(note))
    await byText(await tr("automations.menu"), menu).click()
    const dialog = dialogTitled(await tr("automations.title"))
    await dialog.waitForDisplayed({ timeoutMsg: "the automations dialog did not open" })
    await dialog.$("[role='status']").waitForExist({ reverse: true, timeoutMsg: "the automations are still loading" })
    return dialog
}

/** Picks an option of a Radix select (the `index`-th select with that accessible name inside the dialog). */
const choose = async (dialog: Chainable, label: string, option: string, index = 0) => {
    const trigger = (await dialog.$$(`[aria-label=${JSON.stringify(label)}]`))[index]
    await domClick(trigger as unknown as Chainable)
    const item = $(`//*[@role='option'][normalize-space()=${xpathString(option)}]`)
    await item.waitForDisplayed({ timeoutMsg: `the option "${option}" of "${label}" is not shown` })
    await domClick(item)
    await item.waitForExist({ reverse: true })
}

/** The button of the footer with that label (the dialog buttons of the wizard: Next, Back, Save, Cancel). */
const footerButton = (dialog: Chainable, label: string) => dialog.$(`.//*[@data-slot='dialog-footer']//button[normalize-space()=${xpathString(label)}]`)

/** Goes to the next step of the editor and checks the indicator follows (`step` = the index of the step shown, 0-based). */
const next = async (dialog: Chainable, step: number) => {
    await domClick(footerButton(dialog, await tr("automations.next")))
    await currentStep(dialog, step)
}

/** Waits for the indicator to mark the `step` (0-based) as the current one. */
const currentStep = async (_dialog: Chainable, step: number) => {
    await browser.waitUntil(
        () => browser.execute(() => {
            const dialogs = Array.from(document.querySelectorAll('[role="dialog"]'))
            const items = Array.from(dialogs[dialogs.length - 1]?.querySelectorAll("nav li") ?? [])
            return items.findIndex((li) => li.querySelector('[aria-current="step"]') !== null)
        }).then((index) => index === step),
        { timeoutMsg: `the editor is not on the step ${step + 1}` },
    )
}

/** Jumps to a step through the indicator. */
const gotoStep = async (dialog: Chainable, step: number) => {
    await domClick((await dialog.$$("nav li button"))[step] as unknown as Chainable)
    await currentStep(dialog, step)
}

const closeAllDialogs = async () => {
    const open = () => browser.execute(() => document.querySelectorAll('[role="dialog"], [role="alertdialog"]').length)
    for (let i = 0; i < 3 && (await open()) > 0; i++) {
        await browser.keys("Escape")
        await browser.waitUntil(async () => (await open()) === 0, { timeout: 1_500 }).catch(() => undefined)
    }
}

describe("Automations", () => {
    afterEach(async () => {
        await closeAllDialogs()
    })

    before(async () => {
        await waitForApp()
    })

    it("creates a workspace, a note with two sections and a task", async () => {
        await createWorkspace(WORKSPACE)
        await openWorkspace(WORKSPACE)
        await createFromSidebar("sidebar.addNote", "dialogs.addNote.submit", NOTE)
        await treeRow(NOTE).click()
        await byLabel(await tr("notes.closeCurrent")).waitForDisplayed()

        await byText(await tr("menu.newGroup")).click()
        await typeInto(byLabel(await tr("groups.nameLabel")), GROUP)
        await byLabel(await tr("common.add")).click()
        await byText(GROUP).waitForDisplayed({ timeoutMsg: "the group was not created" })

        for (const title of [TODO, DONE]) {
            await byText(await tr("sections.new")).click()
            await typeInto(byLabel(await tr("sections.titleLabel")), title)
            await byLabel(await tr("common.add")).click()
            await sectionCard(title).waitForDisplayed()
        }
        await addTask(TODO, TASK_1)
    })

    it("shows the empty state, creates a rule with two actions (a color picked by name) and lists it", async () => {
        const dialog = await openAutomations(NOTE)
        await expect(dialog.$(`p=${await tr("automations.empty")}`)).toBeDisplayed()

        await byText(await tr("automations.add"), dialog).click()
        await expect(dialog.$(`h2=${await tr("automations.newTitle")}`)).toBeDisplayed()

        // "Italian: sottotask" is checked on the real options of the trigger and of the action selects
        const lang = await currentLang()
        const optionTexts = async () => browser.execute(() => Array.from(document.querySelectorAll('[role="option"]')).map((o) => (o.textContent ?? "").trim()))
        await domClick((await dialog.$$(`[aria-label=${JSON.stringify(await tr("automations.when"))}]`))[0] as unknown as Chainable)
        await $("[role='option']").waitForDisplayed()
        const triggers = await optionTexts()
        expect(triggers).toContain(await tr("automations.triggers.subtasksCompleted"))
        // In Italian the subtasks are "sottotask", never the English word (in English "subtasks" is the right word)
        if (lang === "it") {
            expect(triggers.join(" ")).toContain("sottotask")
            expect(triggers.join(" ")).not.toContain("subtask")
        }
        await browser.keys("Escape")
        await $("[role='option']").waitForExist({ reverse: true })

        // When a task is completed in TODO -> move to the bottom of DONE
        await currentStep(dialog, 0)
        await choose(dialog, await tr("automations.where"), TODO)
        await next(dialog, 1)
        await choose(dialog, await tr("automations.actions.moveTo"), DONE)

        // Second action: set a color, picked by its name
        await byText(await tr("automations.addAction"), dialog).click()
        await choose(dialog, await tr("automations.actionType"), await tr("automations.actions.setColor"), 1)
        await domClick((await dialog.$$(`[aria-label=${JSON.stringify(await tr("automations.actions.setColor"))}]`))[0] as unknown as Chainable)
        await $("[role='option']").waitForDisplayed()
        const actions = await optionTexts()
        expect(actions.join(" ")).not.toContain("...")
        await browser.keys("Escape")
        await $("[role='option']").waitForExist({ reverse: true })
        await choose(dialog, await tr("automations.actions.setColor"), await tr("common.colors.c2"))

        // Summary: the sentence of the rule, then save
        await next(dialog, 2)
        await expect(dialog.$(`.//p[normalize-space()=${xpathString(await ruleDescription(TODO, DONE))}]`)).toBeDisplayed()
        await footerButton(dialog, await tr("common.save")).click()
        await dialog.$(`h2=${await tr("automations.title")}`).waitForDisplayed({ timeoutMsg: "the editor did not close after saving" })
        const description = await ruleDescription(TODO, DONE)
        await browser.waitUntil(async () => (await dialog.$("ul").getText()).includes(description), {
            timeoutMsg: `the list does not show "${description}"`,
        })
        expect(await dialog.getText()).not.toContain("...")
    })

    it("asks for a confirmation before throwing away an edited rule", async () => {
        // Lowercase: WebKitWebDriver (Linux) drops the Shift of the first typed key, so "Auto…" would arrive as "auto…"
        const UNSAVED_NAME = "auto rule name"
        const description = await ruleDescription(TODO, DONE)
        const dialog = await openAutomations(NOTE)
        const confirmTitle = await tr("automations.discardConfirm.title")

        // Cancel button: "Cancel" in the confirmation keeps the editor, "Discard" goes back to the list
        await byLabel(await tr("automations.editAria", { name: description })).click()
        await expect(dialog.$(`h2=${await tr("automations.editTitle")}`)).toBeDisplayed()
        // An existing rule opens on the summary
        await currentStep(dialog, 2)
        await typeInto(dialog.$("input"), UNSAVED_NAME)
        await footerButton(dialog, await tr("common.cancel")).click()
        const confirm = dialogTitled(confirmTitle)
        await confirm.waitForDisplayed({ timeoutMsg: "no confirmation for the unsaved rule" })
        await byText(await tr("common.cancel"), confirm).click()
        await confirm.waitForExist({ reverse: true })
        await expect(dialog.$(`h2=${await tr("automations.editTitle")}`)).toBeDisplayed()
        await expect(dialog.$("input")).toHaveValue(UNSAVED_NAME)

        await footerButton(dialog, await tr("common.cancel")).click()
        await confirm.waitForDisplayed()
        await byText(await tr("automations.discardConfirm.confirm"), confirm).click()
        await confirm.waitForExist({ reverse: true })
        await expect(dialog.$(`h2=${await tr("automations.title")}`)).toBeDisplayed()
        await expect(dialog.$("ul")).toBeDisplayed()
        expect(await dialog.$("ul").getText()).not.toContain(UNSAVED_NAME)

        // Closing the dialog with unsaved changes asks too; confirming closes everything
        await byLabel(await tr("automations.editAria", { name: description })).click()
        await typeInto(dialog.$("input"), UNSAVED_NAME)
        await domClick(byText(await tr("common.close"), dialog))
        await confirm.waitForDisplayed({ timeoutMsg: "closing the dialog with unsaved changes did not ask" })
        await byText(await tr("automations.discardConfirm.confirm"), confirm).click()
        await dialog.waitForExist({ reverse: true })

        // Nothing was saved: the rule has no name
        const again = await openAutomations(NOTE)
        expect(await again.$("ul").getText()).not.toContain(UNSAVED_NAME)
    })

    it("runs the rule when a task is completed, and undoes it step by step with Ctrl+Z", async () => {
        await expect(sectionCard(TODO)).toBeDisplayed()
        await domClick(await checkbox(TASK_1))

        await waitForTaskIn(TASK_1, DONE)
        expect(await isCompleted(TASK_1)).toBe(true)
        const name = await ruleDescription(TODO, DONE)
        await toastWith(await tr("automations.ran", { name })).waitForDisplayed({ timeoutMsg: "the automation toast did not show up" })

        // The color of the second action
        const found = await locate(TASK_1)
        const stripe = $(`[data-task-id="${found?.id}"] div.absolute.w-1`)
        await stripe.waitForExist({ timeoutMsg: "the task has no color" })
        const color = await cssColor(stripe, "background-color")
        expect(Math.abs(color.r - GREEN.r) + Math.abs(color.g - GREEN.g) + Math.abs(color.b - GREEN.b)).toBeLessThan(6)

        // First undo: the automation (back to TODO, still completed, no color); second: the user action
        await pressCtrl("z")
        await waitForTaskIn(TASK_1, TODO)
        expect(await isCompleted(TASK_1)).toBe(true)
        await $(`[data-task-id="${found?.id}"] div.absolute.w-1`).waitForExist({ reverse: true, timeoutMsg: "the color was not undone" })
        await pressCtrl("z")
        await browser.waitUntil(async () => !(await isCompleted(TASK_1)), { timeoutMsg: "the task is still completed after the second undo" })
        expect((await locate(TASK_1))?.section).toBe(TODO)
    })

    it("does not undo the automation from its toast when it is no longer the latest action", async () => {
        await browser.waitUntil(noToasts, { timeout: 15_000, timeoutMsg: "old toasts are still on screen" })
        await addTask(TODO, TASK_2)
        await addTask(TODO, TASK_3)
        await browser.waitUntil(noToasts, { timeout: 15_000 })

        await domClick(await checkbox(TASK_2))
        await waitForTaskIn(TASK_2, DONE)
        const ran = toastWith(await tr("automations.ran", { name: await ruleDescription(TODO, DONE) }))
        await ran.waitForDisplayed({ timeoutMsg: "the automation toast did not show up" })

        // Another undoable action right after: priority on another task
        const menu = await openTaskMenu(TASK_3)
        await byText(await tr("tasks.menu.addPriority"), menu).click()
        await menu.waitForExist({ reverse: true })

        // The toast is still there (or the Undo is not reachable: see the report)
        const action = ran.$("button[data-button]")
        await action.waitForDisplayed({ timeout: 3_000, timeoutMsg: "the Undo button of the toast is gone (toast timing)" })
        await domClick(action)
        await toastWith(await tr("automations.undoUnavailable")).waitForDisplayed({ timeoutMsg: "no 'undo unavailable' toast" })

        // The automation was not undone
        expect((await locate(TASK_2))?.section).toBe(DONE)
        expect(await isCompleted(TASK_2)).toBe(true)
    })

    it("keeps the rule in a duplicated note, pointing to the copy's own sections", async () => {
        const copy = `${NOTE} (${await tr("duplicate.suffix")})`
        const menu = await openContextMenu(treeRow(NOTE))
        await byText(await tr("menu.duplicate"), menu).click()
        await treeRow(copy).waitForDisplayed({ timeoutMsg: "the copy is not in the sidebar" })
        await sectionCard(TODO).waitForDisplayed({ timeoutMsg: "the copy was not opened" })

        const dialog = await openAutomations(copy)
        const description = await ruleDescription(TODO, DONE)
        await browser.waitUntil(async () => (await dialog.$("ul").getText()).includes(description), {
            timeoutMsg: `the copy does not have the rule "${description}"`,
        })
        await browser.keys("Escape")
        await dialog.waitForExist({ reverse: true })

        // Completing a task in the copy moves it inside the copy
        await addTask(TODO, COPY_TASK)
        await domClick(await checkbox(COPY_TASK))
        await waitForTaskIn(COPY_TASK, DONE)
        expect(await isCompleted(COPY_TASK)).toBe(true)

        // ...and nothing happened to the original
        await treeRow(NOTE).click()
        await browser.waitUntil(async () => (await taskValues(TODO)).includes(TASK_3), { timeoutMsg: "the original note was not shown" })
        expect(await locate(COPY_TASK)).toBeNull()
        expect(await taskValues(DONE)).not.toContain(COPY_TASK)
        expect(await taskValues(TODO)).not.toContain(COPY_TASK)
    })

    describe("dialog layout with very long section titles at 800px", () => {
        const LONG_NOTE = "Auto Layout Note"
        const LONG_A = "Auto layout section alpha with an extremely long title that keeps going on and on and on"
        const LONG_B = "Auto layout section bravo with an extremely long title that keeps going on and on and on"
        let previousSize: { width: number, height: number } | undefined

        // Below 900px the sidebar is a modal overlay, closed by default: open it to reach the notes, close it to reach the page
        const sidebarOpen = () => browser.execute(() => document.querySelector('[data-testid="sidebar-panel"]') !== null)
        const showSidebar = async () => {
            if (await sidebarOpen()) return
            await byLabel(await tr("sidebar.toggle")).click()
            await browser.waitUntil(sidebarOpen, { timeoutMsg: "the sidebar did not open" })
        }
        const hideSidebar = async () => {
            if (!(await sidebarOpen())) return
            await browser.keys("Escape")
            await browser.waitUntil(async () => !(await sidebarOpen()), { timeoutMsg: "the sidebar did not close" })
        }

        before(async () => {
            previousSize = await browser.getWindowSize()
            // The minimum window size of the app
            await browser.setWindowSize(800, 600)
        })

        after(async () => {
            await closeAllDialogs()
            if (previousSize) await browser.setWindowSize(previousSize.width, previousSize.height)
        })

        /**
         * Everything that sticks out: horizontal overflow of the content and of the fieldsets, select triggers outside the
         * dialog, a dialog taller than the window, and a title or footer button (Cancel/Back/Next/Save) outside the window.
         */
        const overflows = () =>
            browser.execute(() => {
                const dialogs = Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"]'))
                const dialog = dialogs[dialogs.length - 1]
                if (!dialog) return ["no dialog"]
                const problems: string[] = []
                const fits = (el: HTMLElement, name: string) => {
                    if (el.scrollWidth > el.clientWidth + 1) problems.push(`${name}: scrollWidth ${el.scrollWidth} > clientWidth ${el.clientWidth}`)
                }
                fits(dialog, "dialog content")
                dialog.querySelectorAll<HTMLElement>("nav, nav li").forEach((el, index) => fits(el, `step indicator ${index}`))
                dialog.querySelectorAll<HTMLElement>("fieldset").forEach((el, index) => fits(el, `fieldset ${index}`))
                const box = dialog.getBoundingClientRect()
                dialog.querySelectorAll<HTMLElement>('[data-slot="select-trigger"]').forEach((el, index) => {
                    const rect = el.getBoundingClientRect()
                    if (rect.left < box.left - 1 || rect.right > box.right + 1)
                        problems.push(`select ${index} (${el.getAttribute("aria-label")}): ${Math.round(rect.left)}-${Math.round(rect.right)} outside ${Math.round(box.left)}-${Math.round(box.right)}`)
                })
                const inWindow = (el: Element | null, name: string) => {
                    if (!el) return
                    const rect = el.getBoundingClientRect()
                    if (rect.top < -1 || rect.bottom > window.innerHeight + 1 || rect.left < -1 || rect.right > window.innerWidth + 1)
                        problems.push(`${name}: ${Math.round(rect.top)}-${Math.round(rect.bottom)} outside the window 0-${window.innerHeight}`)
                }
                inWindow(dialog, "dialog")
                inWindow(dialog.querySelector("h2"), "title")
                dialog.querySelectorAll('[data-slot="dialog-footer"] button').forEach((el, index) => inWindow(el, `footer button ${index}`))
                return problems
            })

        it("creates a note with two sections whose titles are very long", async () => {
            await showSidebar()
            // The sidebar is itself a dialog here: the new note's dialog is the one on top of it
            await byLabel(await tr("sidebar.addNote")).click()
            await browser.waitUntil(async () => Array.from(await $$('[role="dialog"]')).length > 1, { timeoutMsg: "the new note dialog did not open" })
            const noteDialog = await topDialog()
            await typeInto(noteDialog.$('input[name="name"]'), LONG_NOTE)
            await byText(await tr("dialogs.addNote.submit"), noteDialog).click()
            await browser.waitUntil(async () => Array.from(await $$('[role="dialog"]')).length === 1, { timeoutMsg: "the new note dialog did not close" })
            await treeRow(LONG_NOTE).click()
            await hideSidebar()
            await byLabel(await tr("notes.closeCurrent")).waitForDisplayed()
            await byText(await tr("menu.newGroup")).click()
            await typeInto(byLabel(await tr("groups.nameLabel")), "Auto Layout Group")
            await byLabel(await tr("common.add")).click()
            for (const title of [LONG_A, LONG_B]) {
                await byText(await tr("sections.new")).click()
                await typeInto(byLabel(await tr("sections.titleLabel")), title)
                await byLabel(await tr("common.add")).click()
                await sectionCard(title).waitForDisplayed()
            }
        })

        it("keeps every trigger and action inside the dialog", async () => {
            await showSidebar()
            const dialog = await openAutomations(LONG_NOTE)
            await byText(await tr("automations.add"), dialog).click()
            await expect(dialog.$(`h2=${await tr("automations.newTitle")}`)).toBeDisplayed()
            expect(await overflows()).toEqual([])

            // Step 1: every trigger type, with the long section chosen
            await currentStep(dialog, 0)
            for (const type of ["taskCompleted", "taskReopened", "taskCreated", "taskMovedInto", "subtasksCompleted"]) {
                await choose(dialog, await tr("automations.when"), await tr(`automations.triggers.${type}`))
                await choose(dialog, await tr("automations.where"), LONG_A)
                expect({ trigger: type, problems: await overflows() }).toEqual({ trigger: type, problems: [] })
            }
            await next(dialog, 1)

            // Step 2: every action type on the first action, a long move target for moveTo
            expect(await overflows()).toEqual([])
            const typeLabel = await tr("automations.actionType")
            for (const type of ["setCompleted", "setPriority", "setColor", "completeSubtasks", "moveTo"]) {
                await choose(dialog, typeLabel, await tr(`automations.actions.${type}`), 0)
                if (type === "moveTo") await choose(dialog, await tr("automations.actions.moveTo"), LONG_B)
                expect({ action: type, problems: await overflows() }).toEqual({ action: type, problems: [] })
            }

            // A second action, switched through every type as well and finally a second move
            await byText(await tr("automations.addAction"), dialog).click()
            for (const type of ["setCompleted", "setPriority", "setColor", "completeSubtasks", "moveTo"]) {
                await choose(dialog, typeLabel, await tr(`automations.actions.${type}`), 1)
                if (type === "moveTo") await choose(dialog, await tr("automations.actions.moveTo"), LONG_B, 1)
                expect({ action: `second ${type}`, problems: await overflows() }).toEqual({ action: `second ${type}`, problems: [] })
            }

            // Many actions make the rule taller than the window: the editor scrolls, the title and the footer stay reachable
            for (let i = 0; i < 5; i++) await byText(await tr("automations.addAction"), dialog).click()
            expect({ actions: 7, problems: await overflows() }).toEqual({ actions: 7, problems: [] })
            await expect(footerButton(dialog, await tr("automations.next"))).toBeDisplayedInViewport()
            await expect(footerButton(dialog, await tr("automations.back"))).toBeDisplayedInViewport()
            await expect(footerButton(dialog, await tr("common.cancel"))).toBeDisplayedInViewport()

            // Step 3: the long sentence wraps, Save stays reachable
            await next(dialog, 2)
            expect({ step: "summary", problems: await overflows() }).toEqual({ step: "summary", problems: [] })
            await expect(footerButton(dialog, await tr("common.save"))).toBeDisplayedInViewport()
            await expect(footerButton(dialog, await tr("automations.back"))).toBeDisplayedInViewport()

            // The indicator goes back to any step
            await gotoStep(dialog, 0)
            expect(await overflows()).toEqual([])
        })
    })
})
