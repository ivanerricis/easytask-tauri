import { useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"
import { getCurrentWindow } from "@tauri-apps/api/window"
import {
    Menubar,
    MenubarContent,
    MenubarItem,
    MenubarMenu,
    MenubarRadioGroup,
    MenubarRadioItem,
    MenubarSeparator,
    MenubarShortcut,
    MenubarSub,
    MenubarSubContent,
    MenubarSubTrigger,
    MenubarTrigger,
} from "@/components/ui/menubar"
import { useTheme } from "@/components/use-theme"
import { useShortcutKeys, useShortcutsContext } from "@/contexts/use-shortcuts"
import { requestAppCommand, useIsAppCommandActive, type AppCommand } from "@/lib/app-commands"
import { OPEN_SETTINGS_EVENT, openReleasesPage, requestOpenSettings } from "@/lib/updater"
import { reportError } from "@/lib/report-error"

type AppMenuProps = {
    // The home page has no notes: only the entries that make sense there are shown
    page: "home" | "workspace"
}

// The action runs once the menu has closed and given the focus back, so a dialog it opens keeps the focus
const afterClose = (action: () => void) => { window.setTimeout(action, 0) }

const isDialogOpen = () => document.querySelector("[role='dialog'], [role='alertdialog']") !== null

/** An entry that runs a shortcut: it shows the effective binding and is disabled while no handler is active. */
const ShortcutItem = ({ id, label }: { id: string, label: string }) => {
    const { trigger, isActive } = useShortcutsContext()
    const keys = useShortcutKeys(id)
    return (
        <MenubarItem disabled={!isActive(id)} onSelect={() => afterClose(() => { trigger(id) })}>
            {label}
            {keys.length > 0 && <MenubarShortcut>{keys.join("+")}</MenubarShortcut>}
        </MenubarItem>
    )
}

/** An entry that runs an app command: it is disabled while no component is listening to it. */
const CommandItem = ({ command, label }: { command: AppCommand, label: string }) => {
    const active = useIsAppCommandActive(command)
    return <MenubarItem disabled={!active} onSelect={() => afterClose(() => requestAppCommand(command))}>{label}</MenubarItem>
}

const ActionItem = ({ action, label }: { action: () => void, label: string }) => (
    <MenubarItem onSelect={() => afterClose(action)}>{label}</MenubarItem>
)

/**
 * Text menu of the title bar (File, Edit, View, Help), like the desktop programs. Alt alone or F10 moves the focus to it.
 * @category Layout
 */
export const AppMenu = ({ page }: AppMenuProps) => {
    const { t } = useTranslation()
    const { theme, setTheme } = useTheme()
    const rootRef = useRef<HTMLDivElement>(null)

    // Alt pressed and released alone (or F10) focuses the first menu, and gives the focus back when pressed again
    useEffect(() => {
        let altAlone = false
        let previous: HTMLElement | null = null
        const toggleFocus = () => {
            const root = rootRef.current
            if (!root || isDialogOpen()) return
            if (root.contains(document.activeElement)) {
                previous?.focus()
                previous = null
                return
            }
            previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
            root.querySelector<HTMLElement>("[data-slot='menubar-trigger']")?.focus()
        }
        const onKeyDown = (e: KeyboardEvent) => {
            altAlone = e.key === "Alt" && !e.repeat && !e.ctrlKey && !e.shiftKey && !e.metaKey
            if (e.key === "F10" && !e.ctrlKey && !e.altKey && !e.shiftKey && !e.metaKey) {
                e.preventDefault()
                toggleFocus()
            }
        }
        const onKeyUp = (e: KeyboardEvent) => {
            if (e.key !== "Alt" || !altAlone) return
            altAlone = false
            e.preventDefault()
            toggleFocus()
        }
        const reset = () => { altAlone = false }
        window.addEventListener("keydown", onKeyDown)
        window.addEventListener("keyup", onKeyUp)
        window.addEventListener("mousedown", reset)
        window.addEventListener("blur", reset)
        return () => {
            window.removeEventListener("keydown", onKeyDown)
            window.removeEventListener("keyup", onKeyUp)
            window.removeEventListener("mousedown", reset)
            window.removeEventListener("blur", reset)
        }
    }, [])

    const openSettings = () => { window.dispatchEvent(new CustomEvent(OPEN_SETTINGS_EVENT, { detail: {} })) }
    const exit = () => { getCurrentWindow().close().catch(error => reportError(error)) }
    const releaseNotes = () => { openReleasesPage().catch(error => reportError(error)) }

    return (
        <Menubar ref={rootRef} aria-label={t("appMenu.label")} className="pl-1">
            <MenubarMenu>
                <MenubarTrigger>{t("appMenu.file")}</MenubarTrigger>
                <MenubarContent>
                    {page === "workspace" ? (
                        <>
                            <ShortcutItem id="new-note" label={t("appMenu.newNote")} />
                            <ShortcutItem id="new-folder" label={t("appMenu.newFolder")} />
                            <ShortcutItem id="new-group" label={t("appMenu.newGroup")} />
                            <CommandItem command="note-from-template" label={t("appMenu.noteFromTemplate")} />
                            <MenubarSeparator />
                            <CommandItem command="open-templates" label={t("appMenu.templates")} />
                            <CommandItem command="open-archive" label={t("appMenu.archive")} />
                            <CommandItem command="open-trash" label={t("appMenu.trash")} />
                            <CommandItem command="export-workspace" label={t("appMenu.exportWorkspace")} />
                            <MenubarSeparator />
                            <ShortcutItem id="close-note" label={t("appMenu.closeNote")} />
                            <ShortcutItem id="close-all-notes" label={t("appMenu.closeAllNotes")} />
                            <MenubarSeparator />
                            <ShortcutItem id="go-home" label={t("appMenu.goHome")} />
                        </>
                    ) : (
                        <>
                            <ShortcutItem id="new-workspace" label={t("appMenu.newWorkspace")} />
                            <CommandItem command="open-workspace-trash" label={t("appMenu.trash")} />
                        </>
                    )}
                    <MenubarSeparator />
                    <ActionItem action={openSettings} label={t("appMenu.settings")} />
                    <MenubarSeparator />
                    <ActionItem action={exit} label={t("appMenu.exit")} />
                </MenubarContent>
            </MenubarMenu>

            {page === "workspace" && (
                <MenubarMenu>
                    <MenubarTrigger>{t("appMenu.edit")}</MenubarTrigger>
                    <MenubarContent>
                        <ShortcutItem id="undo" label={t("appMenu.undo")} />
                        <ShortcutItem id="redo" label={t("appMenu.redo")} />
                        <MenubarSeparator />
                        <ShortcutItem id="search-notes" label={t("appMenu.searchNotes")} />
                    </MenubarContent>
                </MenubarMenu>
            )}

            <MenubarMenu>
                <MenubarTrigger>{t("appMenu.view")}</MenubarTrigger>
                <MenubarContent>
                    {page === "workspace" && (
                        <>
                            <ShortcutItem id="toggle-sidebar" label={t("appMenu.leftSidebar")} />
                            <ShortcutItem id="toggle-right-sidebar" label={t("appMenu.rightSidebar")} />
                            <ShortcutItem id="toggle-hide-completed" label={t("appMenu.hideCompleted")} />
                            <MenubarSeparator />
                            <ShortcutItem id="next-note" label={t("appMenu.nextNote")} />
                            <ShortcutItem id="previous-note" label={t("appMenu.previousNote")} />
                            <MenubarSeparator />
                        </>
                    )}
                    <MenubarSub>
                        <MenubarSubTrigger>{t("appMenu.theme")}</MenubarSubTrigger>
                        <MenubarSubContent>
                            <MenubarRadioGroup value={theme} onValueChange={value => setTheme(value as typeof theme)}>
                                <MenubarRadioItem value="light">{t("settings.appearance.theme.light")}</MenubarRadioItem>
                                <MenubarRadioItem value="dark">{t("settings.appearance.theme.dark")}</MenubarRadioItem>
                                <MenubarRadioItem value="system">{t("common.system")}</MenubarRadioItem>
                            </MenubarRadioGroup>
                        </MenubarSubContent>
                    </MenubarSub>
                </MenubarContent>
            </MenubarMenu>

            <MenubarMenu>
                <MenubarTrigger>{t("appMenu.help")}</MenubarTrigger>
                <MenubarContent>
                    <ShortcutItem id="show-shortcuts" label={t("appMenu.shortcuts")} />
                    <ActionItem action={releaseNotes} label={t("appMenu.releaseNotes")} />
                    <MenubarSeparator />
                    <ActionItem action={() => requestOpenSettings("about")} label={t("appMenu.about")} />
                </MenubarContent>
            </MenubarMenu>
        </Menubar>
    )
}
