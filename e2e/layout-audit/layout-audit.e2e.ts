import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { $, $$, browser } from "@wdio/globals"
import { byLabel, byText, menuButton, openContextMenu, sql, topDialog, tr, treeRow, waitForApp } from "../helpers"

/**
 * Runtime layout audit. Seeds stressful data through the sql plugin, then visits screens/dialogs/menus at three window sizes
 * and in both themes, running layout/checker.js in the page for each state. Output: e2e/layout-audit/output (PNG + results.json).
 * Env: AUDIT_ONLY=<regex of state ids>, AUDIT_SIZES=800x600,1280x800 (subset).
 */
const here = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(here, "output")
const checkerSrc = fs.readFileSync(path.join(here, "checker.js"), "utf8")
const checkerCall = "return (\n" + checkerSrc.split("\n").filter((l) => !l.startsWith("//")).join("\n") + "\n)"
const ONLY = process.env.AUDIT_ONLY ? new RegExp(process.env.AUDIT_ONLY) : null
const SIZES = (process.env.AUDIT_SIZES ?? "800x600,1280x800,1920x1080").split(",").map((s) => s.split("x").map(Number) as [number, number])

type Result = { id: string; size: string; theme: string; file: string; viewport: string; overlays: string[]; issues: { kind: string; el: string; info?: string; rect?: unknown }[] }
const results: Result[] = []
const skipped: string[] = []
let size = "0x0"
let compact = false
const settle = (ms = 350) => browser.pause(ms)
const xp = (v: string) => (v.includes("'") ? `concat('${v.split("'").join(`', "'", '`)}')` : `'${v}'`)

/* ------------------------------------------------------------------ names used by the seed */
const pad = (s: string, n = 80) => (s + " " + "lorem ipsum dolor sit amet consectetur ".repeat(8)).slice(0, n).trim()
const WS_LONG = pad("Workspace with a really very long name used to stress the layout of every screen")
const UNBROKEN = "Supercalifragilisticexpialidocious_unbroken_identifier_without_any_space_0123456789"
const NOTE_MAIN = pad("Main note with a very long name to check the tabs and the header")
const FOLDER_LONG = pad("Folder with an extremely long name that should be truncated in the tree")
const FOLDER_SUB = pad("Nested folder level two with another long name for the sidebar tree")
const FOLDER_DEEP = pad("Level three folder with a long name too")
const FOLDER_DEEP4 = pad("Level four folder deeply nested and long")
const GROUP_LONG = pad("Group name that is very long and keeps on going for a while")
const SEC_LONG = pad("Section title that is eighty characters long to check the card header and menus")
const SEC_LONG2 = pad("Another section with a long title: design, development, review, release and retro")
const SEC_UNB = UNBROKEN
const AUDIO_NAME = pad("Audio file with a really long file name - artist - album - track 01.mp3")
const TEMPLATE_LONG = pad("Template with a very long name for the weekly planning of the whole team")
const TASK_LONG = "Task with a long text that goes over several lines so that the row has to wrap and the controls stay aligned: " + "word ".repeat(30)

/* ------------------------------------------------------------------ seed */
const ex = async (query: string, values: unknown[] = []): Promise<number> => {
    const res = await sql<unknown>("execute", query, values)
    if (res && typeof res === "object" && "error" in (res as object)) throw new Error(`sql: ${(res as { error: string }).error} :: ${query}`)
    return Array.isArray(res) ? Number(res[1]) : Number((res as { lastInsertId?: number }).lastInsertId)
}
const NOW = "2025-06-01 10:00:00"
const COLORS = ["#e6194b", "#3cb44b", "#ffe119", "#4363d8", "#f58231", "#911eb4", "#46f0f0", "#f032e6"]

const seed = async () => {
    // Home: many workspaces
    const names = [WS_LONG, "Personal", "Work"]
    for (let i = 1; i <= 17; i++) names.push(`Workspace ${String(i).padStart(2, "0")} ${i % 3 === 0 ? pad("with a longer descriptive name number " + i, 50) : ""}`.trim())
    const wsIds: number[] = []
    for (let i = 0; i < names.length; i++) {
        wsIds.push(await ex("INSERT INTO workspace (name, color, edit_date, edit_time) VALUES (?, ?, ?, ?)", [names[i], i % 2 ? COLORS[i % COLORS.length] : null, `2025-05-${String(10 + (i % 18)).padStart(2, "0")}`, "09:00"]))
    }
    await ex("INSERT INTO workspace (name, deleted_at) VALUES (?, ?)", [pad("Deleted workspace with a long name that sits in the home trash"), NOW])
    await ex("INSERT INTO workspace (name, deleted_at) VALUES (?, ?)", ["Deleted short", NOW])
    const ws = wsIds[0]
    // Second workspace with some content so that the combobox shows several
    // Folders
    const folder = (name: string, parent: number | null, pos: number, color: string | null = null, extra = "") =>
        ex(`INSERT INTO folder (workspaceID, folderID, name, color, position${extra ? ", " + extra.split("=")[0] : ""}) VALUES (?, ?, ?, ?, ?${extra ? ", ?" : ""})`, extra ? [ws, parent, name, color, pos, extra.split("=")[1]] : [ws, parent, name, color, pos])
    const f1 = await folder(FOLDER_LONG, null, 0, COLORS[3])
    const f1a = await folder(FOLDER_SUB, f1, 0)
    const f1b = await folder(FOLDER_DEEP, f1a, 0, COLORS[1])
    const f1c = await folder(FOLDER_DEEP4, f1b, 0)
    const f2 = await folder("Research", null, 1)
    await folder(pad("Third root folder with a long name and a color"), null, 2, COLORS[4])
    await folder(pad("Archived folder with a long name for the archive dialog"), null, 3, null, "archived_at=" + NOW)
    await folder(pad("Deleted folder with a long name for the trash dialog"), null, 4, null, "deleted_at=" + NOW)
    const note = (name: string, parent: number | null, pos: number, color: string | null = null, extra = "") =>
        ex(`INSERT INTO note (workspaceID, folderID, name, color, position${extra ? ", " + extra.split("=")[0] : ""}) VALUES (?, ?, ?, ?, ?${extra ? ", ?" : ""})`, extra ? [ws, parent, name, color, pos, extra.split("=")[1]] : [ws, parent, name, color, pos])
    const main = await note(NOTE_MAIN, null, 0, COLORS[0])
    const tabNotes: number[] = []
    for (let i = 1; i <= 9; i++) tabNotes.push(await note(i % 2 ? pad(`Meeting notes number ${i} with a long title`, 60) : `Note ${i}`, null, i, i % 3 === 0 ? COLORS[i % 8] : null))
    await note(pad("Note inside the first folder with a long name too"), f1, 0)
    await note(pad("Note inside the deepest folder with a long name"), f1c, 0)
    await note("Research notes", f2, 0)
    await note(pad("Archived note with a long name for the archive dialog tabs"), null, 20, null, "archived_at=" + NOW)
    await note(pad("Deleted note with a long name for the trash dialog tabs"), null, 21, null, "deleted_at=" + NOW)
    // Main note content
    const group = (name: string | null, pos: number, color: string | null = null, extra = "") =>
        ex(`INSERT INTO section_group (noteID, name, position, color${extra ? ", " + extra.split("=")[0] : ""}) VALUES (?, ?, ?, ?${extra ? ", ?" : ""})`, extra ? [main, name, pos, color, extra.split("=")[1]] : [main, name, pos, color])
    const g1 = await group(GROUP_LONG, 0, COLORS[5])
    const g2 = await group(null, 1)
    const g3 = await group("Empty group", 2)
    const g4 = await group("Colored", 3, COLORS[2])
    await group(pad("Archived group with a long name"), 4, null, "archived_at=" + NOW)
    await group(pad("Deleted group with a long name"), 5, null, "deleted_at=" + NOW)
    void g3
    const section = (g: number, title: string, pos: number, color: string | null = null, extra = "") =>
        ex(`INSERT INTO section (groupID, title, color, position${extra ? ", " + extra.split("=")[0] : ""}) VALUES (?, ?, ?, ?${extra ? ", ?" : ""})`, extra ? [g, title, color, pos, extra.split("=")[1]] : [g, title, color, pos])
    const s1 = await section(g1, SEC_LONG, 0, COLORS[3])
    const s2 = await section(g1, "Doing", 1)
    const s3 = await section(g1, SEC_UNB, 2, COLORS[1])
    const s4 = await section(g1, SEC_LONG2, 3)
    const s5 = await section(g2, "A", 0)
    await section(g2, "B", 1, COLORS[4])
    await section(g2, "Empty section", 2)
    const s8 = await section(g4, pad("Colored group section with a long title for the layout"), 0)
    await section(g4, "S2", 1)
    await section(g4, "S3", 2)
    await section(g1, pad("Archived section with a long title for the archive tabs"), 9, null, "archived_at=" + NOW)
    await section(g1, pad("Deleted section with a long title for the trash tabs"), 10, null, "deleted_at=" + NOW)
    const task = (sec: number, parent: number | null, text: string, pos: number, o: { desc?: string; done?: boolean; prio?: boolean; color?: string; deleted?: boolean } = {}) =>
        ex("INSERT INTO task (sectionID, taskID, text, description, completed, priority, color, position, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [sec, parent, text, o.desc ?? null, o.done ? 1 : 0, o.prio ? 1 : 0, o.color ?? null, pos, o.deleted ? NOW : null])
    const t1 = await task(s1, null, TASK_LONG, 0, { desc: "Description of the long task.\n" + "More text on the description line ".repeat(8), prio: true, color: COLORS[0] })
    const t1a = await task(s1, t1, pad("Subtask level one with a long text " + UNBROKEN, 90), 0, { color: COLORS[1] })
    const t1b = await task(s1, t1a, pad("Subtask level two with a long text that wraps over more than one line in the UI", 85), 0, { prio: true })
    await task(s1, t1b, pad("Subtask level three with a long text that wraps over more than one line", 85), 0, { desc: "deep description" })
    await task(s1, t1b, "Level three completed", 1, { done: true })
    await task(s1, t1a, "Level two sibling", 1)
    for (let i = 1; i <= 10; i++) await task(s1, null, i % 2 ? `Task ${i}` : pad(`Task ${i} with a medium length text that fills the row`, 70), i, { done: i % 4 === 0, prio: i % 5 === 0, color: i % 3 === 0 ? COLORS[i % 8] : undefined })
    await task(s1, null, UNBROKEN + UNBROKEN, 20)
    await task(s1, null, "Deleted task with a long text for the trash dialog tabs", 30, { deleted: true })
    await task(s2, null, "In progress", 0)
    await task(s2, null, TASK_LONG, 1, { done: true })
    await task(s3, null, "Task in the unbroken section", 0)
    await task(s4, null, "Task in the other section", 0)
    await task(s5, null, "Short", 0)
    await task(s8, null, "Colored", 0)
    // Audio (the files do not exist: the player shows the missing file state)
    await ex("INSERT INTO audio_file (section_groupID, name, path, position) VALUES (?, ?, ?, 0)", [g1, AUDIO_NAME, "C:\\Nowhere\\" + AUDIO_NAME])
    await ex("INSERT INTO audio_file (section_groupID, name, path, position) VALUES (?, ?, ?, 1)", [g1, "short.mp3", "C:\\Nowhere\\short.mp3"])
    await ex("INSERT INTO audio_file (section_groupID, name, path, position, deleted_at) VALUES (?, ?, ?, 2, ?)", [g1, pad("Deleted audio with a long name.mp3"), "C:\\Nowhere\\d.mp3", NOW])
    // Templates
    const content = JSON.stringify({ version: 1, groups: [{ name: GROUP_LONG, position: 0, sections: [{ title: SEC_LONG, color: null, position: 0, tasks: [{ text: TASK_LONG, description: null, completed: false, priority: false, color: null, position: 0, subtasks: [] }] }] }] })
    await ex("INSERT INTO note_template (workspaceID, sourceNoteID, name, color, content) VALUES (?, ?, ?, ?, ?)", [ws, main, TEMPLATE_LONG, COLORS[3], content])
    await ex("INSERT INTO note_template (workspaceID, sourceNoteID, name, content) VALUES (?, ?, ?, ?)", [ws, null, "Short template", content])
    // Automations (long section names)
    await ex("INSERT INTO automation (noteID, name, enabled, trigger, actions, position) VALUES (?, ?, 1, ?, ?, 0)", [main, pad("Automation with a long name given by the user to check the list", 70),
        JSON.stringify({ type: "task.completed", sectionId: s1 }), JSON.stringify([{ type: "moveTo", sectionId: s4, at: "bottom" }, { type: "setColor", color: COLORS[1] }, { type: "setPriority", value: false }])])
    await ex("INSERT INTO automation (noteID, name, enabled, trigger, actions, position) VALUES (?, NULL, 1, ?, ?, 1)", [main,
        JSON.stringify({ type: "task.movedInto", sectionId: s3 }), JSON.stringify([{ type: "moveTo", sectionId: s1, at: "top" }, { type: "completeSubtasks" }])])
    await ex("INSERT INTO automation (noteID, name, enabled, trigger, actions, position) VALUES (?, NULL, 0, ?, ?, 2)", [main,
        JSON.stringify({ type: "subtasks.completed", sectionId: null }), JSON.stringify([{ type: "setCompleted", value: true }])])
    // A second workspace with notes (workspace combobox)
    await ex("INSERT INTO note (workspaceID, name, position) VALUES (?, ?, 0)", [wsIds[1], "Personal note"])
}

/* ------------------------------------------------------------------ capture */
const setTheme = (dark: boolean) => browser.execute((d: boolean) => document.documentElement.classList.toggle("dark", d), dark)

const capture = async (id: string) => {
    if (ONLY && !ONLY.test(id)) return
    for (const theme of ["light", "dark"] as const) {
        await setTheme(theme === "dark")
        await settle(200)
        const res = (await browser.execute(checkerCall)) as { viewport: string; overlays: string[]; issues: Result["issues"] }
        const file = `${id}_${size}_${theme}.png`
        await browser.saveScreenshot(path.join(OUT, file))
        results.push({ id, size, theme, file, ...res })
        const bad = res.issues.filter((i) => !["hscroller", "ellipsis-no-tooltip"].includes(i.kind))
        console.log(`[audit] ${file} ${bad.length ? "ISSUES " + bad.length : "ok"}`)
    }
    await setTheme(false)
}

const wanted = (id: string) => !ONLY || ONLY.test(id)
const recover = async () => {
    const discard = await tr("automations.discardConfirm.confirm")
    for (let i = 0; i < 8; i++) {
        const open = await browser.execute(() => document.querySelectorAll('[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"], [data-radix-popper-content-wrapper]').length)
        if (open === 0) break
        const btn = $(`//*[@role='alertdialog' or @role='dialog']//button[normalize-space()=${xp(discard)}]`)
        if (await btn.isExisting()) await browser.execute((x: HTMLElement) => x.click(), (await btn.getElement()) as unknown as HTMLElement)
        else await browser.keys("Escape").catch(() => undefined)
        await settle(150)
    }
}
const attempt = async (id: string, fn: () => Promise<void>) => {
    if (!wanted(id)) return
    try {
        await fn()
    } catch (error) {
        const message = (error as Error).message.split("\n")[0].slice(0, 200)
        skipped.push(`${id} @${size}: ${message}`)
        console.log(`[audit] SKIPPED ${id} @${size}: ${message}`)
        await browser.saveScreenshot(path.join(OUT, `FAIL_${id}_${size}.png`)).catch(() => undefined)
    }
    await recover()
}
/** Opens a state with `open`, captures it, always recovers. */
const state = (id: string, open: () => Promise<void>) => attempt(id, async () => { await open(); await settle(450); await capture(id) })

const dialogOpen = () => $('[role="dialog"], [role="alertdialog"]')
const waitNoDialog = async () => { await $('[role="dialog"], [role="alertdialog"]').waitForExist({ reverse: true, timeout: 8000 }) }
const domClickEl = async (el: ReturnType<typeof $>) => { const e = (await el.getElement()) as unknown as HTMLElement; await browser.execute((x: HTMLElement) => x.click(), e) }

const menuCount = async () => Array.from(await $$('[role="menu"]')).length
/** Opens every submenu of an open menu one at a time and captures it. */
const withSubmenus = async (id: string, menu: ReturnType<typeof $>) => {
    const triggers = Array.from(await menu.$$(`[role="menuitem"][aria-haspopup="menu"]`))
    for (let i = 0; i < triggers.length; i++) {
        await attempt(`${id}-sub${i}`, async () => {
            const t = triggers[i]
            await t.click()
            if (!(await browser.waitUntil(async () => (await menuCount()) >= 2, { timeout: 3000 }).then(() => true, () => false))) {
                await browser.execute((el: HTMLElement) => el.focus(), (await t.getElement()) as unknown as HTMLElement)
                await browser.keys("ArrowRight")
                await browser.waitUntil(async () => (await menuCount()) >= 2, { timeout: 3000 })
            }
            await settle(350)
            await capture(`${id}-sub${i}`)
        })
        if (i < triggers.length - 1) {
            // reopen the parent menu state: submenus are replaced by hovering the next trigger
            if (!(await menu.isDisplayed().catch(() => false))) return
        }
    }
}

/* ------------------------------------------------------------------ navigation */
const waitHome = async () => { await $(`h2=${await tr("home.recent")}`).waitForDisplayed({ timeout: 20_000 }) }
const goHome = async () => {
    await recover()
    if (await byLabel(await tr("workspace.backHome")).isDisplayed().catch(() => false)) await byLabel(await tr("workspace.backHome")).click()
    await waitHome()
}
const setToggle = async (label: string, open: boolean) => {
    const el = byLabel(label)
    if (!(await el.isExisting())) return
    if (((await el.getAttribute("aria-expanded")) === "true") !== open) { await browser.execute((x: HTMLElement) => x.click(), (await el.getElement()) as unknown as HTMLElement); await settle(500) }
}
const setSidebar = async (open: boolean) => setToggle(await tr("sidebar.toggle"), open)
const setPanel = async (open: boolean) => setToggle(await tr("rightPanel.toggle"), open)
const base = async (sidebar = !compact, panel = false) => {
    await recover()
    await setPanel(panel)
    await setSidebar(sidebar)
    await recover()
}
const noteBase = async () => {
    await base(!compact, false)
    if (!(await byLabel(await tr("notes.closeCurrent")).isDisplayed().catch(() => false))) {
        await openNote(NOTE_MAIN)
        await base(!compact, false)
    }
}
const openWorkspace = async (name: string) => {
    await byLabel(await tr("home.workspace.open", { name })).click()
    await byLabel(await tr("sidebar.toggle")).waitForDisplayed({ timeout: 20_000 })
    await settle(800)
}
const openNote = async (name: string) => {
    await setSidebar(true)
    await treeRow(name).click()
    await byLabel(await tr("notes.closeCurrent")).waitForDisplayed({ timeout: 10_000 })
    await settle(500)
}
const setSize = async (w: number, h: number) => { await browser.setWindowSize(w, h); size = `${w}x${h}`; compact = w < 900; await settle(900) }

const appMenu = async (key: string) => {
    const bar = byLabel(await tr("appMenu.label"))
    await bar.$(`.//*[@role='menuitem'][normalize-space()=${xp(await tr(key))}]`).click()
    const menu = $('[role="menu"]')
    await menu.waitForDisplayed()
    return menu
}
const footerButton = async (key: string) => $(`//button[.//span[normalize-space()=${xp(await tr(key))}]] | //button[normalize-space()=${xp(await tr(key))}]`)
const taskEllipsis = async (startsWith: string) => {
    const edit = await tr("tasks.editText")
    const id = await browser.execute((value: string, aria: string) => {
        const a = Array.from(document.querySelectorAll<HTMLTextAreaElement>(`textarea[aria-label="${aria}"]`)).find((x) => x.value.startsWith(value))
        const row = a?.closest("[data-task-id]") as HTMLElement | null
        row?.scrollIntoView({ block: "center" })
        return row?.dataset.taskId ?? null
    }, startsWith, edit)
    if (!id) throw new Error(`task ${startsWith} not found`)
    const row = $(`[data-task-id="${id}"]`)
    await row.moveTo()
    return row
}
const openTaskMenu = async (startsWith: string) => {
    const row = await taskEllipsis(startsWith)
    await (await menuButton(row)).click()
    const menu = $('[role="menu"]')
    await menu.waitForDisplayed()
    return menu
}
const sectionHeader = (title: string) => $(`//div[@data-section-card]//button[@title=${xp(title)}]`)

/* ------------------------------------------------------------------ the audit */
describe("Layout audit", () => {
    before(async () => {
        if (!ONLY) fs.rmSync(OUT, { recursive: true, force: true })
        fs.mkdirSync(OUT, { recursive: true })
        await waitForApp()
        await byLabel(await tr("settings.title")).waitForDisplayed({ timeout: 30_000 })
        await seed()
        await browser.refresh()
        await waitForApp()
        await waitHome()
    })

    for (const [w, h] of SIZES) {
        it(`audit ${w}x${h}`, async () => {
            await setSize(w, h)
            await goHome()

            /* ---------- home */
            await state("home-grid", async () => { await goHome() })
            await state("home-list", async () => { await byLabel(await tr("home.viewList")).click(); await settle(400) })
            await attempt("home-sort", async () => {
                await byLabel(await tr("home.viewGrid")).click()
                await $(`//button[@aria-label=${xp(await tr("home.sort.label"))} or .//*[normalize-space()=${xp(await tr("home.sort.label"))}]]`).click()
                await $('[role="menu"]').waitForDisplayed()
                await capture("home-sort-menu")
            })
            await state("home-create-dialog", async () => { await byText(await tr("home.createWorkspace.open")).click(); await dialogOpen().waitForDisplayed() })
            await state("home-create-dialog-color", async () => {
                await byText(await tr("home.createWorkspace.open")).click()
                await dialogOpen().waitForDisplayed()
                await $('[role="dialog"] input[name="name"]').setValue(WS_LONG)
                await byLabel(await tr("common.addColor")).click()
            })
            await attempt("home-ws-menu", async () => {
                const menu = await openContextMenu(byLabel(await tr("home.workspace.open", { name: WS_LONG })))
                await capture("home-ws-menu")
                await withSubmenus("home-ws-menu", menu)
            })
            await state("home-rename-dialog", async () => {
                const menu = await openContextMenu(byLabel(await tr("home.workspace.open", { name: WS_LONG })))
                await byText(await tr("common.rename"), menu).click()
                await dialogOpen().waitForDisplayed()
            })
            await state("home-delete-dialog", async () => {
                const menu = await openContextMenu(byLabel(await tr("home.workspace.open", { name: WS_LONG })))
                await byText(await tr("common.delete"), menu).click()
                await (await topDialog()).waitForDisplayed()
            })
            await state("home-trash", async () => { await byLabel(await tr("trash.title")).click(); await dialogOpen().waitForDisplayed() })
            await attempt("home-trash-empty", async () => {
                await byLabel(await tr("trash.title")).click()
                await dialogOpen().waitForDisplayed()
                await byText(await tr("trash.empty"), $('[role="dialog"]')).click()
                await settle(400)
                await capture("home-trash-empty-confirm")
            })
            for (const menuKey of ["appMenu.file", "appMenu.edit", "appMenu.view", "appMenu.help"]) {
                await attempt(`home-${menuKey}`, async () => {
                    const menu = await appMenu(menuKey)
                    await capture(`home-${menuKey}`)
                    await withSubmenus(`home-${menuKey}`, menu)
                })
            }
            // settings (every category)
            for (const cat of ["appearance", "notes", "audio", "shortcuts", "data", "about"]) {
                await state(`settings-${cat}`, async () => {
                    if (!(await dialogOpen().isDisplayed().catch(() => false))) { await byLabel(await tr("settings.title")).click(); await dialogOpen().waitForDisplayed() }
                    const nav = $(`nav[aria-label=${JSON.stringify(await tr("settings.nav"))}]`)
                    await byText(await tr(`settings.categories.${cat}`), nav).click()
                    await settle(500)
                })
                if (wanted(`settings-${cat}`)) { /* dialog stays open for the next category, closed below */ }
            }
            await recover()
            await attempt("home-shortcuts-dialog", async () => {
                await byLabel(await tr("settings.title")).click()
                await dialogOpen().waitForDisplayed()
                await browser.keys("Escape")
                await waitNoDialog()
                await browser.execute(() => (document.activeElement as HTMLElement | null)?.blur())
                const menu = await appMenu("appMenu.help")
                await menu.$(`.//*[@role='menuitem'][contains(normalize-space(),${xp((await tr("appMenu.shortcuts")).replace('…', ''))})]`).click()
                await dialogOpen().waitForDisplayed()
                await settle(400)
                await capture("shortcuts-dialog")
            })
            await attempt("home-release-notes", async () => {
                const menu = await appMenu("appMenu.help")
                await menu.$(`.//*[@role='menuitem'][contains(normalize-space(),${xp((await tr("appMenu.releaseNotes")).replace('…', ''))})]`).click()
                await dialogOpen().waitForDisplayed()
                await settle(800)
                await capture("release-notes-dialog")
            })
            await attempt("home-about", async () => {
                const menu = await appMenu("appMenu.help")
                await menu.$(`.//*[@role='menuitem'][contains(normalize-space(),${xp((await tr("appMenu.about")).replace('…', ''))})]`).click()
                await dialogOpen().waitForDisplayed()
                await settle(800)
                await capture("about-dialog")
            })

            /* ---------- workspace */
            await goHome()
            await openWorkspace(WS_LONG)
            await base()
            await state("ws-sidebar-closed-panel-closed", async () => { await base(false, false); await openNote(NOTE_MAIN).catch(() => undefined); await base(false, false) })
            await state("ws-sidebar-open-panel-closed", async () => { await base(true, false) })
            await state("ws-sidebar-open-panel-details", async () => { await base(true, true) })
            await state("ws-sidebar-closed-panel-details", async () => { await base(false, true) })
            await state("ws-panel-history", async () => {
                await base(!compact, true)
                await $(`//*[@role='tab'][normalize-space()=${xp(await tr("rightPanel.history"))}]`).click()
            })
            await attempt("ws-panel-task-details", async () => {
                await base(!compact, true)
                await $(`//*[@role='tab'][normalize-space()=${xp(await tr("rightPanel.details"))}]`).click()
                const row = await taskEllipsis("Task with a long text")
                await row.$(`button[aria-label="${await tr("details.showTask")}"]`).click().catch(async () => { await domClickEl(row.$(`button[aria-label="${await tr("details.showTask")}"]`)) })
                await settle(600)
                await capture("ws-panel-task-details")
                await $(`//*[@role='tab'][normalize-space()=${xp(await tr("rightPanel.history"))}]`).click()
                await settle(400)
                await capture("ws-panel-history-after-select")
            })

            // many tabs: open the notes of the sidebar one after another
            await attempt("ws-many-tabs", async () => {
                await base(true, false)
                for (const t of await $$(`//div[@role='button'][.//span[contains(normalize-space(),'Meeting notes') or starts-with(normalize-space(),'Note ')]]`)) {
                    await t.click().catch(() => undefined)
                    await settle(150)
                }
                await openNote(NOTE_MAIN)
                await base(!compact, false)
                await capture("ws-many-tabs")
            })
            await attempt("ws-many-tabs-panel", async () => { await base(!compact, true); await capture("ws-many-tabs-both-panels") })

            // note content, sidebars arrangement
            await state("ws-note-content", async () => { await base(!compact, false); await openNote(NOTE_MAIN) })

            // command menu / search
            await state("cmd-search", async () => { await base(!compact, false); await browser.execute(() => (document.activeElement as HTMLElement | null)?.blur()); await browser.keys(["Control", "o"]); await dialogOpen().waitForDisplayed() })
            await state("cmd-search-typed", async () => {
                await browser.keys(["Control", "o"]); await dialogOpen().waitForDisplayed()
                await browser.keys("Meeting")
            })
            await state("ws-combobox", async () => {
                await base(true, false)
                const trigger = $('button[role="combobox"]')
                await trigger.click()
                await $('[role="listbox"], [cmdk-list], [data-slot="popover-content"]').waitForDisplayed()
            })

            // app menu in the workspace
            for (const menuKey of ["appMenu.file", "appMenu.edit", "appMenu.view", "appMenu.help"]) {
                await attempt(`ws-${menuKey}`, async () => {
                    const menu = await appMenu(menuKey)
                    await capture(`ws-${menuKey}`)
                    await withSubmenus(`ws-${menuKey}`, menu)
                })
            }

            // sidebar menus and dialogs
            await attempt("sb-folder-menu", async () => {
                await base(true, false)
                const menu = await openContextMenu(treeRow(FOLDER_LONG))
                await capture("sb-folder-menu")
                await withSubmenus("sb-folder-menu", menu)
            })
            await attempt("sb-note-menu", async () => {
                await base(true, false)
                const menu = await openContextMenu(treeRow(NOTE_MAIN))
                await capture("sb-note-menu")
                await withSubmenus("sb-note-menu", menu)
            })
            await attempt("sb-note-ellipsis-menu", async () => {
                await base(true, false)
                const row = treeRow(NOTE_MAIN)
                await row.moveTo()
                await (await menuButton(row)).click()
                await $('[role="menu"]').waitForDisplayed()
                await capture("sb-note-ellipsis-menu")
            })
            await attempt("sb-selection-menu", async () => {
                await base(true, false)
                await treeRow(FOLDER_LONG).click({ button: "left" })
                await browser.keys(["Control"])
                await treeRow("Research").click()
                const menu = await openContextMenu(treeRow("Research"))
                await capture("sb-selection-menu")
                await withSubmenus("sb-selection-menu", menu)
            })
            await state("sb-rename-dialog", async () => {
                await base(true, false)
                const menu = await openContextMenu(treeRow(NOTE_MAIN))
                await byText(await tr("common.rename"), menu).click()
                await dialogOpen().waitForDisplayed()
            })
            await state("sb-delete-dialog", async () => {
                await base(true, false)
                const menu = await openContextMenu(treeRow(FOLDER_LONG))
                await byText(await tr("common.delete"), menu).click()
                await (await topDialog()).waitForDisplayed()
            })
            await state("sb-create-template-dialog", async () => {
                await base(true, false)
                const menu = await openContextMenu(treeRow(NOTE_MAIN))
                await byText(await tr("menu.createTemplate"), menu).click()
                await dialogOpen().waitForDisplayed()
            })
            await state("sb-new-folder-dialog", async () => { await base(true, false); await byLabel(await tr("sidebar.addFolder")).click(); await dialogOpen().waitForDisplayed() })
            await state("sb-new-note-dialog", async () => { await base(true, false); await byLabel(await tr("sidebar.addNote")).click(); await dialogOpen().waitForDisplayed() })
            await state("sb-new-note-dialog-template-select", async () => {
                await base(true, false)
                await byLabel(await tr("sidebar.addNote")).click()
                await dialogOpen().waitForDisplayed()
                await $('[role="dialog"] [role="combobox"]').click()
                await $('[role="option"]').waitForDisplayed()
            })
            await state("sb-new-note-dialog-color", async () => {
                await base(true, false)
                await byLabel(await tr("sidebar.addNote")).click()
                await dialogOpen().waitForDisplayed()
                await byLabel(await tr("common.addColor")).click()
            })
            await state("sb-new-subfolder-dialog", async () => {
                await base(true, false)
                const menu = await openContextMenu(treeRow(FOLDER_LONG))
                await byText(await tr("menu.newFolder"), menu).click()
                await dialogOpen().waitForDisplayed()
            })

            // footer dialogs
            await state("dlg-trash", async () => { await base(true, false); await (await footerButton("trash.title")).click(); await dialogOpen().waitForDisplayed() })
            for (const type of ["workspace", "folder", "note", "section_group", "section", "task", "audio_file", "note_template"]) {
                await state(`dlg-trash-tab-${type}`, async () => {
                    await base(true, false)
                    await (await footerButton("trash.title")).click()
                    await dialogOpen().waitForDisplayed()
                    const nav = $(`[aria-label=${JSON.stringify(await tr("trash.nav"))}]`)
                    await nav.$(`.//*[contains(normalize-space(),${xp(await tr(`trash.groups.${type}`))})]`).click()
                    await settle(400)
                })
            }
            await state("dlg-trash-empty-confirm", async () => {
                await base(true, false)
                await (await footerButton("trash.title")).click()
                await dialogOpen().waitForDisplayed()
                await byText(await tr("trash.empty"), $('[role="dialog"]')).click()
                await settle(300)
            })
            await state("dlg-archive", async () => { await base(true, false); await (await footerButton("archive.title")).click(); await dialogOpen().waitForDisplayed() })
            for (const type of ["folder", "note", "section_group", "section"]) {
                await state(`dlg-archive-tab-${type}`, async () => {
                    await base(true, false)
                    await (await footerButton("archive.title")).click()
                    await dialogOpen().waitForDisplayed()
                    const nav = $(`[aria-label=${JSON.stringify(await tr("archive.nav"))}]`)
                    await nav.$(`.//*[contains(normalize-space(),${xp(await tr(`archive.types.${type}`))})]`).click()
                    await settle(400)
                })
            }
            await state("dlg-archive-trash-confirm", async () => {
                await base(true, false)
                await (await footerButton("archive.title")).click()
                await dialogOpen().waitForDisplayed()
                await $('[role="dialog"] button[aria-label^="' + (await tr("archive.trashAria", { name: "" })).split(" ")[0] + '"]').click()
                await settle(300)
            })
            await state("dlg-templates", async () => { await base(true, false); await (await footerButton("dialogs.templates.title")).click(); await dialogOpen().waitForDisplayed() })
            await state("dlg-templates-new", async () => {
                await base(true, false)
                await (await footerButton("dialogs.templates.title")).click()
                await dialogOpen().waitForDisplayed()
                await byText(await tr("dialogs.templates.new"), $('[role="dialog"]')).click()
                await settle(400)
            })
            await state("dlg-template-note-from", async () => {
                await base(true, false)
                await (await footerButton("dialogs.templates.title")).click()
                await dialogOpen().waitForDisplayed()
                await byLabel(await tr("dialogs.templates.createNoteFrom", { name: TEMPLATE_LONG })).click()
                await settle(500)
            })
            await state("dlg-template-rename", async () => {
                await base(true, false)
                await (await footerButton("dialogs.templates.title")).click()
                await dialogOpen().waitForDisplayed()
                await byLabel(await tr("dialogs.templates.renameAria", { name: TEMPLATE_LONG })).click()
                await settle(400)
            })
            await state("dlg-template-refresh-confirm", async () => {
                await base(true, false)
                await (await footerButton("dialogs.templates.title")).click()
                await dialogOpen().waitForDisplayed()
                await byLabel(await tr("dialogs.templates.refreshAria", { name: TEMPLATE_LONG })).click()
                await settle(400)
            })
            await state("dlg-template-delete-confirm", async () => {
                await base(true, false)
                await (await footerButton("dialogs.templates.title")).click()
                await dialogOpen().waitForDisplayed()
                await byLabel(await tr("dialogs.templates.deleteAria", { name: TEMPLATE_LONG })).click()
                await settle(400)
            })
            await state("dlg-pick-template", async () => { await base(true, false); await byLabel(await tr("sidebar.addNoteFromTemplate")).click(); await dialogOpen().waitForDisplayed() })
            await state("dlg-shortcuts", async () => {
                await base(!compact, false)
                await browser.execute(() => (document.activeElement as HTMLElement | null)?.blur())
                await browser.keys("?")
                await dialogOpen().waitForDisplayed()
            })

            // automations
            // Below 900px the sidebar is a dialog too: the automations are the last one
            const autoDialog = () => $("(//*[@role='dialog'])[last()]")
            const openAutomations = async () => {
                // No recover() after the sidebar: below 900px it is a dialog itself and would be closed
                await recover()
                await setPanel(false)
                await setSidebar(true)
                const menu = await openContextMenu(treeRow(NOTE_MAIN))
                await byText(await tr("automations.menu"), menu).click()
                await dialogOpen().waitForDisplayed()
                await autoDialog().$("[role='status']").waitForExist({ reverse: true, timeout: 8000 }).catch(() => undefined)
                await settle(500)
            }
            await state("auto-list", openAutomations)
            const footerBtn = async (key: string) => $(`//*[@role='dialog']//*[@data-slot='dialog-footer']//button[normalize-space()=${xp(await tr(key))}]`)
            await state("auto-new", async () => { await openAutomations(); await byText(await tr("automations.add"), autoDialog()).click(); await settle(400) })
            for (const trig of ["taskCompleted", "taskReopened", "taskCreated", "taskMovedInto", "subtasksCompleted"]) {
                await state(`auto-editor-trigger-${trig}`, async () => {
                    await openAutomations()
                    const d = autoDialog()
                    await byText(await tr("automations.add"), d).click()
                    await settle(300)
                    const sel = (await d.$$(`[aria-label=${JSON.stringify(await tr("automations.when"))}]`))[0]
                    await domClickEl(sel as unknown as ReturnType<typeof $>)
                    await $(`//*[@role='option'][normalize-space()=${xp(await tr(`automations.triggers.${trig}`))}]`).click()
                    await settle(400)
                })
            }
            // step 2 of a new rule: all the actions types
            await state("auto-editor-actions", async () => {
                await openAutomations()
                const d = autoDialog()
                await byText(await tr("automations.add"), d).click()
                await settle(300)
                await domClickEl(await footerBtn("automations.next"))
                await settle(300)
                for (const act of ["setCompleted", "setPriority", "setColor", "completeSubtasks", "moveTo"]) {
                    await byText(await tr("automations.addAction"), d).click().catch(() => undefined)
                    await settle(150)
                    const types = Array.from(await d.$$(`[aria-label=${JSON.stringify(await tr("automations.actionType"))}]`))
                    const last = types[types.length - 1]
                    await domClickEl(last as unknown as ReturnType<typeof $>)
                    await $(`//*[@role='option'][normalize-space()=${xp(await tr(`automations.actions.${act}`))}]`).click().catch(() => browser.keys("Escape"))
                    await settle(150)
                }
            })
            // step 3 of a new rule
            await state("auto-editor-summary", async () => {
                await openAutomations()
                const d = autoDialog()
                await byText(await tr("automations.add"), d).click()
                await settle(300)
                await domClickEl(await footerBtn("automations.next"))
                await settle(200)
                await domClickEl(await footerBtn("automations.next"))
                await settle(300)
            })
            await state("auto-editor-edit-long", async () => {
                await openAutomations()
                const d = autoDialog()
                await d.$(`button[aria-label^="${(await tr("automations.editAria", { name: "" })).slice(0, 10)}"]`).click()
                await settle(500)
            })
            await state("auto-editor-section-select-open", async () => {
                await openAutomations()
                const d = autoDialog()
                await d.$(`button[aria-label^="${(await tr("automations.editAria", { name: "" })).slice(0, 10)}"]`).click()
                await settle(400)
                await domClickEl((await d.$$("nav li button"))[0] as unknown as ReturnType<typeof $>)
                await settle(300)
                const sel = (await d.$$(`[aria-label=${JSON.stringify(await tr("automations.where"))}]`))[0]
                await domClickEl(sel as unknown as ReturnType<typeof $>)
                await $('[role="option"]').waitForDisplayed()
            })
            await state("auto-delete-confirm", async () => {
                await openAutomations()
                await autoDialog().$('button[aria-label^="' + (await tr("automations.deleteAria", { name: "" })).slice(0, 10) + '"]').click()
                await settle(400)
            })

            // note content menus
            await attempt("note-group-menu", async () => {
                await noteBase()
                const menu = await openContextMenu($(`//*[contains(normalize-space(),'Group name that')]`))
                await capture("note-group-menu")
                await withSubmenus("note-group-menu", menu)
            })
            await attempt("note-section-menu", async () => {
                await noteBase()
                const menu = await openContextMenu(sectionHeader(SEC_LONG))
                await capture("note-section-menu")
                await withSubmenus("note-section-menu", menu)
            })
            await attempt("note-section-ellipsis", async () => {
                await noteBase()
                const card = sectionHeader(SEC_LONG).parentElement()
                await card.moveTo()
                await (await menuButton(card)).click()
                await $('[role="menu"]').waitForDisplayed()
                await capture("note-section-ellipsis")
            })
            await attempt("note-task-menu", async () => {
                await noteBase()
                const menu = await openTaskMenu("Task with a long text")
                await capture("note-task-menu")
                await withSubmenus("note-task-menu", menu)
            })
            await attempt("note-task-context-menu", async () => {
                await noteBase()
                const row = await taskEllipsis("Subtask level two")
                await row.click({ button: "right" })
                await $('[role="menu"]').waitForDisplayed()
                await capture("note-task-context-menu")
            })
            await state("note-task-description-dialog", async () => {
                await noteBase()
                const menu = await openTaskMenu("Task 1")
                await menu.$(`.//*[contains(normalize-space(),${xp(await tr("tasks.menu.addDescription"))})]`).click()
                await dialogOpen().waitForDisplayed()
            })
            await state("note-task-show-description", async () => {
                await noteBase()
                const row = await taskEllipsis("Task with a long text")
                await row.$(`button[aria-label="${await tr("tasks.showDescription")}"]`).click()
                await settle(300)
            })
            await state("note-add-task-input", async () => {
                await noteBase()
                await $(`//div[@data-section-card][.//button[@title=${xp(SEC_LONG)}]]`).$(`[aria-label="${await tr("tasks.add")}"]`).click()
                await settle(300)
            })
            await state("note-add-subtask-input", async () => {
                await noteBase()
                const row = await taskEllipsis("Task with a long text")
                await row.$(`button[aria-label="${await tr("tasks.addSubtask")}"]`).click()
                await settle(300)
            })
            await state("note-add-group-input", async () => {
                await noteBase()
                const all = Array.from(await $$(`//button[normalize-space()=${xp(await tr("menu.newGroup"))}]`))
                await all[all.length - 1].click()
                await settle(300)
            })
            await state("note-add-section-input", async () => {
                await noteBase()
                const all = Array.from(await $$(`//button[normalize-space()=${xp(await tr("sections.new"))}]`))
                await all[0].click()
                await settle(300)
            })
            await attempt("note-audio-menu", async () => {
                await noteBase()
                const menu = await openContextMenu($(`//*[contains(normalize-space(),'Audio file with a really')]`))
                await capture("note-audio-menu")
                await withSubmenus("note-audio-menu", menu)
            })
            await attempt("note-audio-ellipsis", async () => {
                await noteBase()
                const row = $(`//*[contains(normalize-space(),'Audio file with a really')]`)
                await row.moveTo()
                await capture("note-audio-hover")
            })
            await state("note-hide-completed", async () => {
                await noteBase()
                const menu = await appMenu("appMenu.view")
                await menu.$(`.//*[contains(normalize-space(),${xp(await tr("appMenu.hideCompleted"))})]`).click()
                await settle(500)
            })
            await attempt("note-hide-completed-off", async () => {
                const menu = await appMenu("appMenu.view")
                await menu.$(`.//*[contains(normalize-space(),${xp(await tr("appMenu.hideCompleted"))})]`).click()
                await settle(300)
            })
            await state("ws-close-all-notes", async () => {
                await base(true, false)
                await byLabel(await tr("notes.closeAll")).click()
                await settle(500)
            })
            await state("ws-blank-note-both-panels", async () => { await base(true, true) })
            await attempt("ws-workspace-settings", async () => {
                await base(true, false)
                await byLabel(await tr("settings.title")).click()
                await dialogOpen().waitForDisplayed()
                await settle(400)
                await capture("ws-settings")
            })
            await goHome()
        })
    }

    after(async () => {
        const slim = results.map((r) => ({ ...r }))
        fs.writeFileSync(path.join(OUT, "results.json"), JSON.stringify({ skipped, results: slim }, null, 1))
        console.log(`[audit] ${results.length} captures, ${skipped.length} skipped`)
        for (const s of skipped) console.log("  - " + s)
    })
})
