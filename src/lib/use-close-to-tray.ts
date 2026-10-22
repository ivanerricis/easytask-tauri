import { useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"
import { getCurrentWindow } from "@tauri-apps/api/window"
import { reportError } from "@/lib/report-error"
import { getCloseToTray } from "@/lib/store/preferences"
import {
    CLOSE_TO_TRAY_EVENT,
    createTray,
    hideMainWindow,
    setCloseToTrayActive,
    type AppTray,
    type TrayLabels,
} from "@/lib/tray"

/**
 * Close to the notification area: while the setting is on, an icon with a menu (open, quit) is shown and closing the
 * main window (title bar button, Alt+F4) hides it instead of quitting. Reads the setting at startup and follows
 * `notifyCloseToTrayChanged`. Mount it once, in App.
 * @category Window
 */
export function useCloseToTray(): void {
    const { t, i18n } = useTranslation()
    const labels: TrayLabels = {
        tooltip: t("settings.system.tray.tooltip"),
        open: t("settings.system.tray.open"),
        quit: t("settings.system.tray.quit"),
    }
    const labelsRef = useRef(labels)
    // Applies the current texts to the icon, once there is one
    const refreshRef = useRef<(() => void) | null>(null)

    useEffect(() => {
        labelsRef.current = labels
        refreshRef.current?.()
    // The texts change with the language only
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [i18n.language, t])

    useEffect(() => {
        let disposed = false
        let wanted = false
        let tray: AppTray | null = null
        let unlistenClose: (() => void) | null = null
        // Changes are applied one after the other, so a quick off/on cannot leave two icons
        let queue: Promise<void> = Promise.resolve()
        const enqueue = (task: () => Promise<void>) => { queue = queue.then(task).catch(reportError) }

        const turnOn = async () => {
            if (tray || !wanted) return
            tray = await createTray(labelsRef.current)
            unlistenClose = await getCurrentWindow().onCloseRequested(event => {
                // Before the first await, or the window is destroyed as usual
                event.preventDefault()
                void hideMainWindow().catch(reportError)
            })
            setCloseToTrayActive(true)
        }
        const turnOff = async () => {
            if (!tray) return
            setCloseToTrayActive(false)
            unlistenClose?.()
            unlistenClose = null
            const old = tray
            tray = null
            await old.dispose()
        }
        const apply = (value: boolean) => {
            wanted = value
            enqueue(value ? turnOn : turnOff)
        }

        refreshRef.current = () => enqueue(async () => { await tray?.update(labelsRef.current) })
        void getCloseToTray().then(value => { if (!disposed) apply(value) }).catch(reportError)
        const onChange = (event: Event) => apply((event as CustomEvent<boolean>).detail === true)
        window.addEventListener(CLOSE_TO_TRAY_EVENT, onChange)
        return () => {
            disposed = true
            window.removeEventListener(CLOSE_TO_TRAY_EVENT, onChange)
            refreshRef.current = null
            wanted = false
            enqueue(turnOff)
        }
    }, [])
}
