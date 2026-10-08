import { $, $$, browser } from "@wdio/globals"
import type { ChainablePromiseElement } from "webdriverio"
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
    $(`//div[@role='treeitem'][.//span[normalize-space()=${xpathString(name)}]]`)

/** The card of a section, found through the title of its header. */
export const sectionCard = (title: string) =>
    $(`//div[@data-section-card][.//button[@title=${xpathString(title)}]]`)

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
    if (await item.waitForDisplayed({ timeout: 4_000 }).then(() => true, () => false)) return
    // Resolve the element first: WebKitGTK does not serialise an unresolved chainable promise as a DOM node
    const element = (await trigger.getElement()) as unknown as HTMLElement
    await browser.execute((el: HTMLElement) => el.focus(), element)
    await browser.keys("ArrowRight")
    await item.waitForDisplayed({ timeoutMsg: `the submenu "${triggerText}" did not open` })
}

/**
 * Clicks through the DOM: on WebKitGTK a tooltip left open by the previous step can cover the target and make a
 * WebDriver click fail with "element click intercepted".
 */
export const domClick = async (element: ChainablePromiseElement) => {
    const resolved = (await element.getElement()) as unknown as HTMLElement
    await browser.execute((el: HTMLElement) => el.click(), resolved)
}

export type Rgba = { r: number; g: number; b: number; a: number }

/**
 * A computed CSS color of an element (any syntax the webview returns: rgb, oklch, color-mix...) as sRGB, resolved
 * by painting it on a 1x1 canvas. `property` is a CSS property name such as "color" or "border-top-color".
 */
export const cssColor = async (element: ChainablePromiseElement, property: string): Promise<Rgba> => {
    const resolved = (await element.getElement()) as unknown as HTMLElement
    return browser.execute((el: HTMLElement, prop: string) => {
        const value = getComputedStyle(el).getPropertyValue(prop)
        const canvas = document.createElement("canvas")
        canvas.width = canvas.height = 1
        const ctx = canvas.getContext("2d", { willReadFrequently: true })!
        ctx.clearRect(0, 0, 1, 1)
        ctx.fillStyle = value
        ctx.fillRect(0, 0, 1, 1)
        const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data
        return { r, g, b, a: a / 255 }
    }, resolved, property)
}

/** `top` painted over `bottom` (alpha compositing); `bottom` is taken as opaque. */
export const compose = (top: Rgba, bottom: Rgba): Rgba => ({
    r: top.r * top.a + bottom.r * (1 - top.a),
    g: top.g * top.a + bottom.g * (1 - top.a),
    b: top.b * top.a + bottom.b * (1 - top.a),
    a: 1,
})

const luminance = ({ r, g, b }: Rgba) => {
    const channel = (value: number) => {
        const v = value / 255
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
    }
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

/** WCAG 2.x contrast ratio (1-21) between two opaque colors. */
export const contrastRatio = (a: Rgba, b: Rgba): number => {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
    return (hi + 0.05) / (lo + 0.05)
}

/**
 * The opaque background an element is really painted on: the first non-transparent computed background walking up
 * the ancestors (translucent layers are composed over what is below them), white if nothing is opaque.
 */
export const backgroundOf = async (element: ChainablePromiseElement): Promise<Rgba> => {
    const resolved = (await element.getElement()) as unknown as HTMLElement
    const layers = await browser.execute((el: HTMLElement) => {
        const canvas = document.createElement("canvas")
        canvas.width = canvas.height = 1
        const ctx = canvas.getContext("2d", { willReadFrequently: true })!
        const out: { r: number; g: number; b: number; a: number }[] = []
        for (let node: HTMLElement | null = el; node; node = node.parentElement) {
            ctx.clearRect(0, 0, 1, 1)
            ctx.fillStyle = getComputedStyle(node).backgroundColor
            ctx.fillRect(0, 0, 1, 1)
            const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data
            if (a > 0) out.push({ r, g, b, a: a / 255 })
            if (a === 255) break
        }
        return out
    }, resolved)
    return layers.reduceRight<Rgba>((below, layer) => compose(layer, below), { r: 255, g: 255, b: 255, a: 1 })
}

/** Runs `fn` with the app in the given theme (class `dark` on <html>) and restores the previous state. */
export const inTheme = async <T>(theme: "light" | "dark", fn: () => Promise<T>): Promise<T> => {
    const was = await browser.execute(() => document.documentElement.classList.contains("dark"))
    await browser.execute((dark: boolean) => document.documentElement.classList.toggle("dark", dark), theme === "dark")
    try {
        return await fn()
    } finally {
        await browser.execute((dark: boolean) => document.documentElement.classList.toggle("dark", dark), was)
    }
}

/** Folder of the app data (database, backups), as the Rust command `data_dir` reports it. */
export const dataDir = (): Promise<string> =>
    browser.executeAsync((done: (value: string) => void) => {
        const internals = (window as unknown as { __TAURI_INTERNALS__: { invoke: (cmd: string, args?: unknown) => Promise<string> } }).__TAURI_INTERNALS__
        void internals.invoke("data_dir").then(done)
    })

/** Path of the SQLite database for the sql plugin ("sqlite:<dir>/easytask.db"). */
export const dbUrl = async (): Promise<string> => {
    const dir = await dataDir()
    return `sqlite:${dir}${dir.includes("\\") ? "\\" : "/"}easytask.db`
}

/** Runs a statement through the sql plugin of the page (`select` returns rows, otherwise the result of execute). */
export const sql = async <T = unknown>(kind: "select" | "execute", query: string, values: unknown[] = []): Promise<T> =>
    browser.executeAsync(
        (db: string, action: string, text: string, params: unknown[], done: (value: unknown) => void) => {
            const internals = (window as unknown as { __TAURI_INTERNALS__: { invoke: (cmd: string, args?: unknown) => Promise<unknown> } }).__TAURI_INTERNALS__
            void internals.invoke("plugin:sql|load", { db })
                .then(() => internals.invoke(`plugin:sql|${action}`, { db, query: text, values: params }))
                .then(done, (error: unknown) => done({ error: String(error) }))
        },
        await dbUrl(), kind, query, values,
    ) as Promise<T>
