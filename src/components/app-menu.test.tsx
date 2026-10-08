import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { AppMenu } from "./app-menu"
import { ShortcutsProvider } from "@/contexts/shortcuts-context"
import { useShortcut } from "@/hooks/use-shortcut"
import { APP_COMMAND_EVENT } from "@/lib/app-commands"
import { OPEN_SETTINGS_EVENT } from "@/lib/updater"

const appWindow = { close: vi.fn() }
vi.mock("@tauri-apps/api/window", () => ({ getCurrentWindow: () => appWindow }))
const setTheme = vi.fn()
vi.mock("@/components/use-theme", () => ({ useTheme: () => ({ theme: "dark", setTheme }) }))

function Probe({ id, handler, enabled }: { id: string, handler: () => void, enabled?: boolean }) {
    useShortcut(id, handler, { enabled })
    return null
}

beforeEach(() => {
    vi.clearAllMocks()
    appWindow.close.mockResolvedValue(undefined)
})

const openMenu = async (user: ReturnType<typeof userEvent.setup>, name: string) => {
    await user.click(screen.getByRole("menuitem", { name }))
}

describe("AppMenu", () => {
    it("shows File, Edit, View and Help in the workspace, without Edit in the home", () => {
        const { unmount } = render(<ShortcutsProvider><AppMenu page="workspace" /></ShortcutsProvider>)
        expect(screen.getAllByRole("menuitem").map(item => item.textContent)).toEqual(["File", "Modifica", "Visualizza", "Aiuto"])
        unmount()
        render(<ShortcutsProvider><AppMenu page="home" /></ShortcutsProvider>)
        expect(screen.getAllByRole("menuitem").map(item => item.textContent)).toEqual(["File", "Visualizza", "Aiuto"])
    })

    it("runs the handler of a shortcut and shows its keys", async () => {
        const user = userEvent.setup()
        const newNote = vi.fn()
        render(<ShortcutsProvider><Probe id="new-note" handler={newNote} /><AppMenu page="workspace" /></ShortcutsProvider>)
        await openMenu(user, "File")
        const item = await screen.findByRole("menuitem", { name: /Nuova nota\s*Ctrl\+N/ })
        await user.click(item)
        await waitFor(() => expect(newNote).toHaveBeenCalledTimes(1))
    })

    it("disables the entries whose shortcut has no active handler", async () => {
        const user = userEvent.setup()
        render(<ShortcutsProvider><Probe id="new-folder" handler={vi.fn()} enabled={false} /><AppMenu page="workspace" /></ShortcutsProvider>)
        await openMenu(user, "File")
        expect(await screen.findByRole("menuitem", { name: /Nuova cartella/ })).toHaveAttribute("data-disabled")
        expect(screen.getByRole("menuitem", { name: /^Nuova nota\s*Ctrl/ })).toHaveAttribute("data-disabled")
    })

    it("asks the owner of the actions without a shortcut to run them", async () => {
        const user = userEvent.setup()
        const commands: string[] = []
        const listener = (event: Event) => commands.push((event as CustomEvent<string>).detail)
        window.addEventListener(APP_COMMAND_EVENT, listener)
        render(<ShortcutsProvider><AppMenu page="workspace" /></ShortcutsProvider>)
        await openMenu(user, "Modifica")
        await user.click(await screen.findByRole("menuitem", { name: "Cestino..." }))
        await waitFor(() => expect(commands).toEqual(["open-trash"]))
        window.removeEventListener(APP_COMMAND_EVENT, listener)
    })

    it("opens the settings, the about page and closes the window", async () => {
        const user = userEvent.setup()
        const categories: (string | undefined)[] = []
        const listener = (event: Event) => categories.push((event as CustomEvent<{ category?: string }>).detail?.category)
        window.addEventListener(OPEN_SETTINGS_EVENT, listener)
        render(<ShortcutsProvider><AppMenu page="home" /></ShortcutsProvider>)
        await openMenu(user, "File")
        await user.click(await screen.findByRole("menuitem", { name: "Impostazioni..." }))
        await openMenu(user, "Aiuto")
        await user.click(await screen.findByRole("menuitem", { name: "Informazioni e aggiornamenti" }))
        await waitFor(() => expect(categories).toEqual([undefined, "about"]))
        await openMenu(user, "File")
        await user.click(await screen.findByRole("menuitem", { name: "Esci" }))
        await waitFor(() => expect(appWindow.close).toHaveBeenCalledTimes(1))
        window.removeEventListener(OPEN_SETTINGS_EVENT, listener)
    })

    it("changes the theme from the View menu", async () => {
        const user = userEvent.setup()
        render(<ShortcutsProvider><AppMenu page="home" /></ShortcutsProvider>)
        await openMenu(user, "Visualizza")
        // The submenu opens from the keyboard: the pointer leaving the trigger would close it in jsdom
        const themeItem = await screen.findByRole("menuitem", { name: "Tema" })
        themeItem.focus()
        await user.keyboard("{ArrowRight}")
        fireEvent.click(await screen.findByRole("menuitemradio", { name: "Chiaro" }))
        expect(setTheme).toHaveBeenCalledWith("light")
    })

    it("focuses the first menu with Alt alone or F10, and gives the focus back", () => {
        render(<ShortcutsProvider><input aria-label="campo" /><AppMenu page="home" /></ShortcutsProvider>)
        const input = screen.getByLabelText("campo")
        input.focus()
        fireEvent.keyDown(window, { key: "Alt" })
        fireEvent.keyUp(window, { key: "Alt" })
        expect(screen.getByRole("menuitem", { name: "File" })).toHaveFocus()
        fireEvent.keyDown(window, { key: "F10" })
        expect(input).toHaveFocus()
    })

    it("does not move the focus when Alt is part of a combination", () => {
        render(<ShortcutsProvider><input aria-label="campo" /><AppMenu page="home" /></ShortcutsProvider>)
        const input = screen.getByLabelText("campo")
        input.focus()
        fireEvent.keyDown(window, { key: "Alt" })
        fireEvent.keyDown(window, { key: "n", altKey: true })
        fireEvent.keyUp(window, { key: "Alt" })
        expect(input).toHaveFocus()
    })
})
