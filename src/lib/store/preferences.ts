import type { AudioPlayerPosition } from "@/types/types"
import { store } from "./initStore"
import { SIDEBAR_DEFAULT_WIDTH, clampSidebarWidth } from "@/lib/sidebar-layout"
import { DEFAULT_COLOR_INTENSITY, clampColorIntensity } from "@/lib/color-intensity"
import { DEFAULT_LANGUAGE_PREFERENCE, isLanguagePreference, type LanguagePreference } from "@/i18n"

const SHOW_PROGRESSBAR_KEY = "showProgressBar"
const SHOW_GROUP_PROGRESSBAR_KEY = "showGroupProgressBar"
const PRIMARY_COLOR_KEY = "primaryColor"
const SHOW_SECTION_COUNT_KEY = "showSectionCount"
const SHOW_TASK_COUNT_KEY = "showTaskCount"
const SIDEBAR_LEFT_OPEN_KEY = "sidebarLeftOpen"
const SIDEBAR_RIGHT_OPEN_KEY = "sidebarRightOpen"
const AUDIOPLAYER_POSITION_KEY = "audioPlayerPosition"
const AUDIO_VOLUME_KEY = "audioVolume"
const AUDIOPLAYER_VISIBLE_KEY = "audioPlayerVisible"
const AUDIOPLAYER_SCALE_KEY = "audioPlayerScale"
const AUDIOPLAYER_OPACITY_KEY = "audioPlayerOpacity"
const WORKSPACE_VIEW_KEY = "workspaceView"
const REOPEN_NOTES_KEY = "reopenNotes"
const REOPEN_LAST_WORKSPACE_KEY = "reopenLastWorkspace"
const LAST_WORKSPACE_ID_KEY = "lastWorkspaceId"
const SIDEBAR_ITEM_SIZE_KEY = "sidebarItemSize"
const LANGUAGE_KEY = "language"
const BACKUP_KEEP_KEY = "backupKeep"
const AUTO_BACKUP_KEY = "autoBackup"
const CHECK_UPDATES_KEY = "checkUpdatesOnStartup"
const SIDEBAR_LEFT_WIDTH_KEY = "sidebarLeftWidth"
const SIDEBAR_RIGHT_WIDTH_KEY = "sidebarRightWidth"
const COLOR_INTENSITY_KEY = "colorIntensity"
const RIGHT_PANEL_TAB_KEY = "rightPanelTab"
const HIDE_COMPLETED_TASKS_KEY = "hideCompletedTasks"
export const DEFAULT_PRIMARY_COLOR = "#ffb375"

const SAVE_DEBOUNCE_MS = 500

let saveTimer: ReturnType<typeof setTimeout> | null = null
let pendingResolvers: { resolve: () => void; reject: (e: unknown) => void }[] = []

const runSave = async (): Promise<void> => {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = null
    const waiting = pendingResolvers
    pendingResolvers = []
    try {
        await store.save()
        waiting.forEach(w => w.resolve())
    } catch (e) {
        waiting.forEach(w => w.reject(e))
    }
}

/**
 * Schedules a debounced save of the store; values already set stay in memory immediately.
 * @returns A promise that resolves when the save has actually happened.
 * @category Store
 */
const persist = (): Promise<void> =>
    new Promise<void>((resolve, reject) => {
        pendingResolvers.push({ resolve, reject })
        if (saveTimer) clearTimeout(saveTimer)
        saveTimer = setTimeout(() => { void runSave() }, SAVE_DEBOUNCE_MS)
    })

/**
 * Saves immediately any pending preference change (call before the app closes).
 * @returns A promise that resolves when nothing is left to save.
 * @category Store
 */
export const flushPreferences = async (): Promise<void> => {
    if (saveTimer) await runSave()
}

export const DEFAULT_AUDIO_VOLUME = 1
export const AUDIO_PLAYER_SCALES = [0.85, 1, 1.2] as const
export type AudioPlayerScale = typeof AUDIO_PLAYER_SCALES[number]
export const DEFAULT_AUDIO_PLAYER_SCALE: AudioPlayerScale = 1
export const MIN_AUDIO_PLAYER_OPACITY = 0.4
export const DEFAULT_AUDIO_PLAYER_OPACITY = 1

/** Brings a volume into 0-1 (non-numbers give the default). */
export const clampAudioVolume = (value: unknown): number => {
    if (typeof value !== "number" || !Number.isFinite(value)) return DEFAULT_AUDIO_VOLUME
    return Math.min(1, Math.max(0, Math.round(value * 100) / 100))
}

/** Brings an opacity into 0.4-1 (non-numbers give the default). */
export const clampAudioPlayerOpacity = (value: unknown): number => {
    if (typeof value !== "number" || !Number.isFinite(value)) return DEFAULT_AUDIO_PLAYER_OPACITY
    return Math.min(1, Math.max(MIN_AUDIO_PLAYER_OPACITY, Math.round(value * 100) / 100))
}

/** Returns the allowed scale (0.85, 1 or 1.2) a stored value stands for; anything else gives 1. */
export const normalizeAudioPlayerScale = (value: unknown): AudioPlayerScale =>
    AUDIO_PLAYER_SCALES.find(scale => scale === value) ?? DEFAULT_AUDIO_PLAYER_SCALE

/**
 * Gets the volume of the audio player.
 * @returns A promise that resolves to a number between 0 and 1 (default 1).
 * @category Store
 */
export const getAudioVolume = async (): Promise<number> => {
    return clampAudioVolume(await store.get<number>(AUDIO_VOLUME_KEY) ?? DEFAULT_AUDIO_VOLUME)
}

/**
 * Saves the volume of the audio player.
 * @param value The volume (clamped between 0 and 1).
 * @returns A promise that resolves when the value is saved.
 * @category Store
 */
export const saveAudioVolume = async (value: number): Promise<void> => {
    await store.set(AUDIO_VOLUME_KEY, clampAudioVolume(value))
    await persist()
}

/**
 * Gets whether the floating audio player may be shown.
 * @returns A promise that resolves to a boolean (default true).
 * @category Store
 */
export const getAudioPlayerVisible = async (): Promise<boolean> => {
    const value = await store.get<boolean>(AUDIOPLAYER_VISIBLE_KEY)
    return value ?? true
}

/**
 * Saves whether the floating audio player may be shown.
 * @param value A boolean indicating whether the player is enabled.
 * @returns A promise that resolves when the value is saved.
 * @category Store
 */
export const saveAudioPlayerVisible = async (value: boolean): Promise<void> => {
    await store.set(AUDIOPLAYER_VISIBLE_KEY, value)
    await persist()
}

/**
 * Gets the size of the floating audio player.
 * @returns A promise that resolves to 0.85, 1 (default) or 1.2.
 * @category Store
 */
export const getAudioPlayerScale = async (): Promise<AudioPlayerScale> => {
    return normalizeAudioPlayerScale(await store.get<number>(AUDIOPLAYER_SCALE_KEY))
}

/**
 * Saves the size of the floating audio player.
 * @param value 0.85, 1 or 1.2 (other values are stored as 1).
 * @returns A promise that resolves when the value is saved.
 * @category Store
 */
export const saveAudioPlayerScale = async (value: AudioPlayerScale): Promise<void> => {
    await store.set(AUDIOPLAYER_SCALE_KEY, normalizeAudioPlayerScale(value))
    await persist()
}

/**
 * Gets the opacity of the floating audio player.
 * @returns A promise that resolves to a number between 0.4 and 1 (default 1).
 * @category Store
 */
export const getAudioPlayerOpacity = async (): Promise<number> => {
    return clampAudioPlayerOpacity(await store.get<number>(AUDIOPLAYER_OPACITY_KEY) ?? DEFAULT_AUDIO_PLAYER_OPACITY)
}

/**
 * Saves the opacity of the floating audio player.
 * @param value The opacity (clamped between 0.4 and 1).
 * @returns A promise that resolves when the value is saved.
 * @category Store
 */
export const saveAudioPlayerOpacity = async (value: number): Promise<void> => {
    await store.set(AUDIOPLAYER_OPACITY_KEY, clampAudioPlayerOpacity(value))
    await persist()
}

export type WorkspaceView ="grid" | "list"
export type SidebarItemSize = "compact" | "normal" | "large"


/**
 * Gets the value of the show progress bar preference.
 * @returns A boolean indicating whether the progress bar should be shown.
 * @category Store
 */
export const getShowProgressBar = async (): Promise<boolean> => {
    const value = await store.get<boolean>(SHOW_PROGRESSBAR_KEY)
    return value ?? true
}

/**
 * Saves the value of the show progress bar preference.
 * @param value A boolean indicating whether to show the progress bar.
 * @returns A promise that resolves when the value is saved.
 * @category Store
 */
export const saveShowProgressBar = async (value: boolean): Promise<void> => {
    await store.set(SHOW_PROGRESSBAR_KEY, value)
    await persist()
}

/**
 * Gets the value of the show group progress bar preference.
 * @returns A boolean indicating whether the group progress bar should be shown.
 * @category Store
 */
export const getShowGroupProgressBar = async (): Promise<boolean> => {
    const value = await store.get<boolean>(SHOW_GROUP_PROGRESSBAR_KEY)
    return value ?? true
}

/**
 * Saves the value of the show group progress bar preference.
 * @param value A boolean indicating whether to show the group progress bar.
 * @returns A promise that resolves when the value is saved.
 * @category Store
 */
export const saveShowGroupProgressBar = async (value: boolean): Promise<void> => {
    await store.set(SHOW_GROUP_PROGRESSBAR_KEY, value)
    await persist()
}

/**
 * Gets the primary color preference.
 * If no value is set (or it is not a hex color), it defaults to "#ffb375".
 * @returns A promise that resolves to the primary color hex code.
 * @category Store
 */
export const getPrimaryColor = async (): Promise<string> => {
    const value = await store.get<{ hex: unknown }>(PRIMARY_COLOR_KEY)
    const hex = value?.hex
    return typeof hex === "string" && /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex) ? hex : DEFAULT_PRIMARY_COLOR
}

/**
 * Saves the primary color preference.
 * @param hex A string representing the primary color in hex format.
 * @returns A promise that resolves when the primary color is saved.
 * @category Store
 */
export const savePrimaryColor = async (hex: string): Promise<void> => {
    await store.set(PRIMARY_COLOR_KEY, { hex })
    await persist()
}

/**
 * Gets the value of the show section count preference.
 * @returns A promise that resolves to a boolean indicating whether the section count should be shown.
 * @category Store
 */
export const getShowSectionCount = async (): Promise<boolean> => {
    const value = await store.get<boolean>(SHOW_SECTION_COUNT_KEY)
    return value ?? true
}

/**
 * Saves the value of the show section count preference.
 * @param value A boolean indicating whether to show the section count.
 * @category Store
 */
export const saveShowSectionCount = async (value: boolean): Promise<void> => {
    await store.set(SHOW_SECTION_COUNT_KEY, value)
    await persist()
}

/**
 * Gets the value of the show task count preference.
 * @returns A promise that resolves to a boolean indicating whether the task count should be shown.
 * @category Store
 */
export const getShowTaskCount = async (): Promise<boolean> => {
    const value = await store.get<boolean>(SHOW_TASK_COUNT_KEY)
    return value ?? true
}

/**
 * Saves the value of the show task count preference.
 * @param value A boolean indicating whether to show the task count.
 * @returns A promise that resolves when the value is saved.
 * @category Store
 */
export const saveShowTaskCount = async (value: boolean): Promise<void> => {
    await store.set(SHOW_TASK_COUNT_KEY, value)
    await persist()
}

/**
 * Gets the value of the show left sidebar preference.
 * @returns A promise that resolves to a boolean indicating whether the left sidebar is open.
 * @category Store
 */
export const getSideBarLeftOpen = async (): Promise<boolean> => {
    const value = await store.get<boolean>(SIDEBAR_LEFT_OPEN_KEY)
    return value ?? true
}

/**
 * Saves the value of the show left sidebar preference.
 * @param value A boolean indicating whether to show the left sidebar.
 * @returns A promise that resolves when the value is saved.
 * @category Store
 */
export const saveSideBarLeftOpen = async (value: boolean): Promise<void> => {
    await store.set(SIDEBAR_LEFT_OPEN_KEY, value)
    await persist()
}

/**
 * Gets the value of the show right sidebar preference.
 * @returns A promise that resolves to a boolean indicating whether the right sidebar is open.
 * @category Store
 */
export const getSideBarRightOpen = async (): Promise<boolean> => {
    const value = await store.get<boolean>(SIDEBAR_RIGHT_OPEN_KEY)
    return value ?? true
}

/**
 * Saves the value of the show right sidebar preference.
 * @param value A boolean indicating whether to show the right sidebar.
 * @returns A promise that resolves when the value is saved.
 * @category Store
 */
export const saveSideBarRightOpen = async (value: boolean): Promise<void> => {
    await store.set(SIDEBAR_RIGHT_OPEN_KEY, value)
    await persist()
}

/**
 * Gets the current position of the audio player.
 * If no position is set (or it is not made of finite numbers), it defaults to { x: 0, y: 0, scaleX: 1, scaleY: 1 }.
 * @returns A promise that resolves to an object containing the audio player's position and scale.
 * @category Store
 */
export const getAudioPlayerPosition = async (): Promise<AudioPlayerPosition> => {
    const value = await store.get<Partial<AudioPlayerPosition>>(AUDIOPLAYER_POSITION_KEY)
    const finite = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n)
    if (!value || typeof value !== "object" || !finite(value.x) || !finite(value.y)) return { x: 0, y: 0, scaleX: 1, scaleY: 1 }
    return { x: value.x, y: value.y, scaleX: finite(value.scaleX) ? value.scaleX : 1, scaleY: finite(value.scaleY) ? value.scaleY : 1 }
}

/**
 * Saves the current position of the audio player.
 * @param position An object containing the audio player's position and scale.
 * @returns A promise that resolves when the position is saved.
 * @category Store
 */
export const saveAudioPlayerPosition = async (position: AudioPlayerPosition): Promise<void> => {
    await store.set(AUDIOPLAYER_POSITION_KEY, position)
    await persist()
}

/**
 * Resets the audio player position to its default state.
 * @returns A promise that resolves when the audio player position is reset.
 * @category Store
 */
export const resetAudioPlayerPosition = async (): Promise<void> => {
    await store.delete(AUDIOPLAYER_POSITION_KEY)
    await persist()
}

/**
 * Gets the layout used to display the workspaces on the start page.
 * @returns A promise that resolves to "grid" (default) or "list".
 * @category Store
 */
export const getWorkspaceView = async (): Promise<WorkspaceView> => {
    const value = await store.get<WorkspaceView>(WORKSPACE_VIEW_KEY)
    return value === "list" ? "list" : "grid"
}

/**
 * Saves the layout used to display the workspaces on the start page.
 * @param value The view to save ("grid" or "list").
 * @returns A promise that resolves when the value is saved.
 * @category Store
 */
export const saveWorkspaceView = async (value: WorkspaceView): Promise<void> => {
    await store.set(WORKSPACE_VIEW_KEY, value)
    await persist()
}

/**
 * Gets the value of the "reopen the notes at startup" preference.
 * @returns A promise that resolves to a boolean indicating whether the open notes must be restored (default true).
 * @category Store
 */
export const getReopenNotes = async (): Promise<boolean> => {
    const value = await store.get<boolean>(REOPEN_NOTES_KEY)
    return value ?? true
}

/**
 * Saves the value of the "reopen the notes at startup" preference.
 * @param value A boolean indicating whether the open notes must be restored at startup.
 * @returns A promise that resolves when the value is saved.
 * @category Store
 */
export const saveReopenNotes = async (value: boolean): Promise<void> => {
    await store.set(REOPEN_NOTES_KEY, value)
    await persist()
}

/**
 * Gets the value of the "reopen the last workspace at startup" preference.
 * @returns A promise that resolves to a boolean indicating whether the last open workspace must be restored (default false).
 * @category Store
 */
export const getReopenLastWorkspace = async (): Promise<boolean> => {
    const value = await store.get<boolean>(REOPEN_LAST_WORKSPACE_KEY)
    return value ?? false
}

/**
 * Saves the value of the "reopen the last workspace at startup" preference.
 * @param value A boolean indicating whether the last open workspace must be restored at startup.
 * @returns A promise that resolves when the value is saved.
 * @category Store
 */
export const saveReopenLastWorkspace = async (value: boolean): Promise<void> => {
    await store.set(REOPEN_LAST_WORKSPACE_KEY, value)
    await persist()
}

/**
 * Gets the id of the workspace that was open when the app was last used.
 * @returns A promise that resolves to the id, or null when none is stored.
 * @category Store
 */
export const getLastWorkspaceId = async (): Promise<number | null> => {
    const value = await store.get<number>(LAST_WORKSPACE_ID_KEY)
    return typeof value === "number" ? value : null
}

/**
 * Remembers the workspace currently open.
 * @param id The id of the workspace.
 * @returns A promise that resolves when the id is saved.
 * @category Store
 */
export const saveLastWorkspaceId = async (id: number): Promise<void> => {
    await store.set(LAST_WORKSPACE_ID_KEY, id)
    await persist()
}

/**
 * Forgets the last open workspace (e.g. after going back to the home).
 * @returns A promise that resolves when the id is removed.
 * @category Store
 */
export const clearLastWorkspaceId = async (): Promise<void> => {
    await store.delete(LAST_WORKSPACE_ID_KEY)
    await persist()
}

/**
 * Gets the size of the folder and note rows in the left sidebar.
 * @returns A promise that resolves to "compact", "normal" (default) or "large"; unknown stored values fall back to "normal".
 * @category Store
 */
export const getSidebarItemSize = async (): Promise<SidebarItemSize> => {
    const value = await store.get<SidebarItemSize>(SIDEBAR_ITEM_SIZE_KEY)
    return value === "compact" || value === "large" ? value : "normal"
}

/**
 * Saves the size of the folder and note rows in the left sidebar.
 * @param value The size to save ("compact", "normal" or "large").
 * @returns A promise that resolves when the value is saved.
 * @category Store
 */
export const saveSidebarItemSize = async (value: SidebarItemSize): Promise<void> => {
    await store.set(SIDEBAR_ITEM_SIZE_KEY, value)
    await persist()
}

/**
 * Gets the language preference.
 * @returns A promise that resolves to "system" (default, follows the OS language), "it" or "en"; unknown stored values fall back to "system".
 * @category Store
 */
export const getLanguage = async (): Promise<LanguagePreference> => {
    const value = await store.get<LanguagePreference>(LANGUAGE_KEY)
    return isLanguagePreference(value) ? value : DEFAULT_LANGUAGE_PREFERENCE
}

/**
 * Saves the language preference.
 * @param value "system", "it" or "en".
 * @returns A promise that resolves when the value is saved.
 * @category Store
 */
export const saveLanguage = async (value: LanguagePreference): Promise<void> => {
    await store.set(LANGUAGE_KEY, value)
    await persist()
}

export const DEFAULT_BACKUP_KEEP = 7
export const MIN_BACKUP_KEEP = 1
export const MAX_BACKUP_KEEP = 100

/** Brings a number of backups to keep into the allowed range (non-numbers give the default). */
export const clampBackupKeep = (value: unknown): number => {
    if (typeof value !== "number" || !Number.isFinite(value)) return DEFAULT_BACKUP_KEEP
    return Math.min(MAX_BACKUP_KEEP, Math.max(MIN_BACKUP_KEEP, Math.round(value)))
}

/**
 * Gets how many backups are kept (the oldest are deleted after each backup).
 * @returns A promise that resolves to a number between 1 and 100 (default 7).
 * @category Store
 */
export const getBackupKeep = async (): Promise<number> => {
    return clampBackupKeep(await store.get<number>(BACKUP_KEEP_KEY) ?? DEFAULT_BACKUP_KEEP)
}

/**
 * Saves how many backups are kept.
 * @param value The number of backups to keep (clamped between 1 and 100).
 * @returns A promise that resolves when the value is saved.
 * @category Store
 */
export const saveBackupKeep = async (value: number): Promise<void> => {
    await store.set(BACKUP_KEEP_KEY, clampBackupKeep(value))
    await persist()
}

/**
 * Gets whether a backup is made automatically at startup (at most one per day).
 * @returns A promise that resolves to a boolean (default true).
 * @category Store
 */
export const getAutoBackup = async (): Promise<boolean> => {
    const value = await store.get<boolean>(AUTO_BACKUP_KEY)
    return value ?? true
}

/**
 * Saves whether a backup is made automatically at startup.
 * @param value A boolean indicating whether the automatic backup is enabled.
 * @returns A promise that resolves when the value is saved.
 * @category Store
 */
export const saveAutoBackup = async (value: boolean): Promise<void> => {
    await store.set(AUTO_BACKUP_KEY, value)
    await persist()
}

/**
 * Gets the width of the left sidebar in pixels.
 * @returns A promise that resolves to the stored width clamped to the allowed range (260 by default; invalid stored values fall back to the default).
 * @category Store
 */
export const getSidebarLeftWidth = async (): Promise<number> => {
    const value = await store.get<number>(SIDEBAR_LEFT_WIDTH_KEY)
    return typeof value === "number" && Number.isFinite(value) ? clampSidebarWidth(value) : SIDEBAR_DEFAULT_WIDTH
}

/**
 * Saves the width of the left sidebar.
 * @param value The width in pixels (clamped to the allowed range).
 * @returns A promise that resolves when the value is saved.
 * @category Store
 */
export const saveSidebarLeftWidth = async (value: number): Promise<void> => {
    await store.set(SIDEBAR_LEFT_WIDTH_KEY, clampSidebarWidth(value))
    await persist()
}

/**
 * Gets the width of the right sidebar in pixels.
 * @returns A promise that resolves to the stored width clamped to the allowed range (260 by default; invalid stored values fall back to the default).
 * @category Store
 */
export const getSidebarRightWidth = async (): Promise<number> => {
    const value = await store.get<number>(SIDEBAR_RIGHT_WIDTH_KEY)
    return typeof value === "number" && Number.isFinite(value) ? clampSidebarWidth(value) : SIDEBAR_DEFAULT_WIDTH
}

/**
 * Saves the width of the right sidebar.
 * @param value The width in pixels (clamped to the allowed range).
 * @returns A promise that resolves when the value is saved.
 * @category Store
 */
export const saveSidebarRightWidth = async (value: number): Promise<void> => {
    await store.set(SIDEBAR_RIGHT_WIDTH_KEY, clampSidebarWidth(value))
    await persist()
}

export type RightPanelTab = "details" | "history"

/**
 * Gets the tab shown in the right sidebar.
 * @returns A promise that resolves to "details" or "history" ("details" by default and for invalid values).
 * @category Store
 */
export const getRightPanelTab = async (): Promise<RightPanelTab> => {
    const value = await store.get<string>(RIGHT_PANEL_TAB_KEY)
    return value === "history" ? "history" : "details"
}

/**
 * Saves the tab shown in the right sidebar.
 * @param value The tab to remember.
 * @returns A promise that resolves when the value is saved.
 * @category Store
 */
export const saveRightPanelTab = async (value: RightPanelTab): Promise<void> => {
    await store.set(RIGHT_PANEL_TAB_KEY, value)
    await persist()
}

/**
 * Gets whether the app silently checks for a new version at startup.
 * @returns A promise that resolves to a boolean (default true).
 * @category Store
 */
export const getCheckUpdatesOnStartup = async (): Promise<boolean> => {
    const value = await store.get<boolean>(CHECK_UPDATES_KEY)
    return value ?? true
}

/**
 * Saves whether the app checks for a new version at startup.
 * @param value A boolean indicating whether the startup update check is enabled.
 * @returns A promise that resolves when the value is saved.
 * @category Store
 */
export const saveCheckUpdatesOnStartup = async (value: boolean): Promise<void> => {
    await store.set(CHECK_UPDATES_KEY, value)
    await persist()
}

/**
 * Gets the intensity of the colors of folders, notes, groups and sections.
 * @returns A promise that resolves to a multiplier between 0.25 and 1.75 (default 1 = 100%; invalid stored values give the default).
 * @category Store
 */
export const getColorIntensity = async (): Promise<number> => {
    return clampColorIntensity(await store.get<number>(COLOR_INTENSITY_KEY) ?? DEFAULT_COLOR_INTENSITY)
}

/**
 * Saves the intensity of the colors of folders, notes, groups and sections.
 * @param value The multiplier (clamped between 0.25 and 1.75).
 * @returns A promise that resolves when the value is saved.
 * @category Store
 */
export const saveColorIntensity = async (value: number): Promise<void> => {
    await store.set(COLOR_INTENSITY_KEY, clampColorIntensity(value))
    await persist()
}

/**
 * Gets whether the completed tasks are hidden in the notes.
 * @returns A promise that resolves to a boolean (default false).
 * @category Store
 */
export const getHideCompletedTasks = async (): Promise<boolean> => {
    const value = await store.get<boolean>(HIDE_COMPLETED_TASKS_KEY)
    return value ?? false
}

/**
 * Saves whether the completed tasks are hidden in the notes.
 * @param value A boolean indicating whether the completed tasks are hidden.
 * @returns A promise that resolves when the value is saved.
 * @category Store
 */
export const saveHideCompletedTasks = async (value: boolean): Promise<void> => {
    await store.set(HIDE_COMPLETED_TASKS_KEY, value)
    await persist()
}
