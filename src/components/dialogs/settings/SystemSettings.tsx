import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { disable, enable, isEnabled } from "@tauri-apps/plugin-autostart"
import { toast } from "sonner"
import { reportError } from "@/lib/report-error"
import { isPortable } from "@/db/appPaths"
import { getCloseToTray, getRememberWindowState, saveCloseToTray, saveRememberWindowState } from "@/lib/store/preferences"
import { notifyCloseToTrayChanged } from "@/lib/tray"
import { getErrorMessage } from "@/lib/utils"
import { SettingsCard, SettingsPanel, SettingsSwitchRow } from "./SettingsRow"

/** Start with Windows: the state lives in the system (a registry entry on Windows), so it is read from there. */
const AutostartSetting = () => {
    const { t } = useTranslation()
    const [enabled, setEnabled] = useState(false)
    // Off until the system has answered, so the switch cannot be flipped on stale data
    const [ready, setReady] = useState(false)

    useEffect(() => {
        let cancelled = false
        void isEnabled().then(value => {
            if (cancelled) return
            setEnabled(value)
            setReady(true)
        }).catch(error => reportError(error))
        return () => { cancelled = true }
    }, [])

    const change = async (value: boolean) => {
        setEnabled(value)
        try {
            await (value ? enable() : disable())
        } catch (error) {
            reportError(error)
            setEnabled(!value)
            toast.error(t("settings.system.autostart.error", { message: getErrorMessage(error) }))
        }
    }

    return (
        <SettingsSwitchRow
            label={t("settings.system.autostart.label")}
            description={t("settings.system.autostart.description")}
            checked={enabled}
            disabled={!ready}
            onCheckedChange={value => void change(value)}
        />
    )
}

const CloseToTraySetting = () => {
    const { t } = useTranslation()
    const [checked, setChecked] = useState(false)

    useEffect(() => {
        let cancelled = false
        void getCloseToTray().then(value => { if (!cancelled) setChecked(value) }).catch(error => reportError(error))
        return () => { cancelled = true }
    }, [])

    const change = (value: boolean) => {
        setChecked(value)
        notifyCloseToTrayChanged(value)
        void saveCloseToTray(value).catch(error => reportError(error))
    }

    return (
        <SettingsSwitchRow
            label={t("settings.system.closeToTray.label")}
            description={t("settings.system.closeToTray.description")}
            checked={checked}
            onCheckedChange={change}
        />
    )
}

/** Keep position and size of the window between runs. Applied by the Rust side at the next start; not available in portable mode. */
const RememberWindowStateSetting = () => {
    const { t } = useTranslation()
    const [checked, setChecked] = useState(true)
    const [portable, setPortable] = useState(false)

    useEffect(() => {
        let cancelled = false
        void getRememberWindowState().then(value => { if (!cancelled) setChecked(value) }).catch(error => reportError(error))
        void isPortable().then(value => { if (!cancelled) setPortable(value) }).catch(error => reportError(error))
        return () => { cancelled = true }
    }, [])

    const change = (value: boolean) => {
        setChecked(value)
        void saveRememberWindowState(value).catch(error => reportError(error))
    }

    return (
        <SettingsSwitchRow
            label={t("settings.system.rememberWindowState.label")}
            description={t(portable ? "settings.system.rememberWindowState.portable" : "settings.system.rememberWindowState.description")}
            checked={checked && !portable}
            disabled={portable}
            onCheckedChange={change}
        />
    )
}

/** Integration with the operating system: start with Windows, close to the notification area. */
export const SystemSettings = () => {
    const { t } = useTranslation()
    return (
        <SettingsPanel title={t("settings.system.title")}>
            <SettingsCard>
                <AutostartSetting />
                <CloseToTraySetting />
                <RememberWindowStateSetting />
            </SettingsCard>
        </SettingsPanel>
    )
}
