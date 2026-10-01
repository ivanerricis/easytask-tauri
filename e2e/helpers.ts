import { $, $$, browser } from "@wdio/globals"
import { en } from "../src/i18n/locales/en"
import { it as itLocale } from "../src/i18n/locales/it"

type Vars = Record<string, string | number>

/**
 * The app follows the language of the system (default), so the specs read the language the UI is
 * currently using (<html lang>) and look the labels up in the very same locale files the app ships.
 */
export const currentLang = async (): Promise<"it" | "en"> =>
    (await browser.execute(() => document.documentElement.lang)) === "it" ? "it" : "en"

export const trIn = (lang: "it" | "en", key: string, vars: Vars = {}): string => {
    let node: unknown = lang === "it" ? itLocale : en
    for (const part of key.split(".")) node = (node as Record<string, unknown>)?.[part]
    if (typeof node !== "string") throw new Error(`Missing translation "${key}" (${lang})`)
    return node.replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(vars[name] ?? ""))
}

/** Translates a key in the language currently shown by the UI. */
export const tr = async (key: string, vars: Vars = {}): Promise<string> => trIn(await currentLang(), key, vars)

const cssString = (value: string) => `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`
const xpathString = (value: string) =>
    value.includes("'") ? `concat('${value.split("'").join(`', "'", '`)}')` : `'${value}'`

/** Element by its accessible name (aria-label). */
export const byLabel = (label: string) => $(`[aria-label=${cssString(label)}]`)
export const allByLabel = (label: string) => $$(`[aria-label=${cssString(label)}]`)

/** Button (or any element) whose visible text is exactly `text`, optionally inside `scope`. */
export const byText = (text: string, scope?: ChainablePromiseElement | WebdriverIO.Element) =>
    (scope ?? $("body")).$(`.//*[self::button or @role='button' or @role='radio'][normalize-space()=${xpathString(text)}]`)

export const topDialog = async () => {
    const dialogs = Array.from(await $$('[role="dialog"], [role="alertdialog"]'))
    return dialogs[dialogs.length - 1]
}

export const waitForApp = async () => {
    await browser.waitUntil(
        async () => (await browser.execute(() => document.getElementById("root")?.childElementCount ?? 0)) > 0,
        { timeout: 60_000, timeoutMsg: "the app UI did not render" },
    )
}

/** Fills a text input and waits until the value is the one typed. */
export const typeInto = async (input: ChainablePromiseElement, value: string) => {
    await input.waitForDisplayed()
    await input.click()
    await input.setValue(value)
}

/** Creates a workspace from the home page and checks that it shows up in the list. */
export const createWorkspace = async (name: string) => {
    await byText(await tr("home.createWorkspace.open")).click()
    const dialog = $('[role="dialog"]')
    await dialog.waitForDisplayed()
    await typeInto(dialog.$('input[name="name"]'), name)
    await byText(await tr("home.createWorkspace.title"), dialog).click()
    await dialog.waitForExist({ reverse: true })
    await byLabel(await tr("home.workspace.open", { name })).waitForDisplayed()
}

export const openWorkspace = async (name: string) => {
    await byLabel(await tr("home.workspace.open", { name })).click()
    await byLabel(await tr("sidebar.addNote")).waitForDisplayed({ timeout: 20_000 })
}

/** Creates an item from a sidebar dialog (folder or note): the button opens a dialog with a "name" field. */
export const createFromSidebar = async (buttonKey: string, submitKey: string, name: string) => {
    await byLabel(await tr(buttonKey)).click()
    const dialog = $('[role="dialog"]')
    await dialog.waitForDisplayed()
    await typeInto(dialog.$('input[name="name"]'), name)
    await byText(await tr(submitKey), dialog).click()
    await dialog.waitForExist({ reverse: true })
}

/** Sidebar tree row (folder or note) with the given name. */
export const treeRow = (name: string) =>
    $(`//div[@role='button'][.//span[normalize-space()=${xpathString(name)}]]`)

/** The card of a section, found through the title of its header. */
export const sectionCard = (title: string) =>
    $(`//div[contains(@class,'min-w-[250px]')][.//button[@title=${xpathString(title)}]]`)

/** Right click on an element and return the (last) open menu. */
export const openContextMenu = async (target: ChainablePromiseElement) => {
    await target.scrollIntoView()
    await target.click({ button: "right" })
    const menu = $('[role="menu"]')
    await menu.waitForDisplayed({ timeoutMsg: "the context menu did not open" })
    return menu
}

/**
 * Opens a Radix submenu in a way that works on every WebDriver backend: the hover that normally opens it is not
 * reliably dispatched by WebKitGTK, so click the trigger and, if the item is still not there, focus it and press
 * ArrowRight. Resolves when `item` is displayed.
 */
export const openSubmenu = async (
    menu: ChainablePromiseElement | WebdriverIO.Element,
    triggerText: string,
    item: ChainablePromiseElement,
) => {
    const text = xpathString(triggerText)
    const trigger = menu.$(`.//*[@role='menuitem' and @aria-haspopup='menu'][normalize-space()=${text}]`)
    await trigger.waitForDisplayed({ timeoutMsg: `the submenu trigger "${triggerText}" is not shown` })
    await trigger.click()
    if (await item.waitForDisplayed({ timeout: 2_000 }).then(() => true, () => false)) return
    await browser.execute((el: HTMLElement) => el.focus(), trigger as unknown as HTMLElement)
    await browser.keys("ArrowRight")
    await item.waitForDisplayed({ timeoutMsg: `the submenu "${triggerText}" did not open` })
}
