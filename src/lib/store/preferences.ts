import type { AudioPlayerPosition } from "@/types/types"
import { store } from "./initStore"
import { DEFAULT_PRIMARY_COLOR } from "@/lib/accent-color"
import { SIDEBAR_DEFAULT_WIDTH, clampSidebarWidth } from "@/lib/sidebar-layout"
import { DEFAULT_COLOR_INTENSITY, clampColorIntensity } from "@/lib/color-intensity"
import { UNDO_LIMIT } from "@/contexts/undo/stack"
import { DEFAULT_LANGUAGE_PREFERENCE, isLanguagePreference, type LanguagePreference } from "@/i18n"

const PRIMARY_COLOR_KEY = "primaryColor"
const AUDIOPLAYER_POSITION_KEY = "audioPlayerPosition"
export { DEFAULT_PRIMARY_COLOR }

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

export type WorkspaceView = "grid" | "list"
export type WorkspaceSortBy = "edited" | "created" | "name"
export type WorkspaceSortDir = "asc" | "desc"
export type WorkspaceSort = { by: WorkspaceSortBy, dir: WorkspaceSortDir }
export const DEFAULT_WORKSPACE_SORT: WorkspaceSort = { by: "edited", dir: "desc" }
export type SidebarItemSize = "compact" | "normal" | "large"
export type RightPanelTab = "details" | "history"

export const DEFAULT_BACKUP_KEEP = 7
export const MIN_BACKUP_KEEP = 1
export const MAX_BACKUP_KEEP = 100

/** Brings a number of backups to keep into the allowed range (non-numbers give the default). */
export const clampBackupKeep = (value: unknown): number => {
    if (typeof value !== "number" || !Number.isFinite(value)) return DEFAULT_BACKUP_KEEP
    return Math.min(MAX_BACKUP_KEEP, Math.max(MIN_BACKUP_KEEP, Math.round(value)))
}

/** The values offered for the undo history limit. */
export const UNDO_LIMIT_OPTIONS = [25, 50, 100, 200, 500] as const

/** Whether a stored value is a valid undo limit (a positive integer up to the largest option). */
export const isValidUndoLimit = (value: unknown): value is number =>
    typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= UNDO_LIMIT_OPTIONS[UNDO_LIMIT_OPTIONS.length - 1]

/**
 * Definition of a preference kept in the store.
 * - `key`: the name used on disk (never rename it: the saved value would be lost).
 * - `default`: the value used when nothing valid is stored.
 * - `normalize`: brings any value (stored or about to be saved) into the allowed ones; without it a missing value gives the default.
 */
export type PrefDef<T> = { key: string, default: T, normalize?: (raw: unknown) => T }

const def = <T>(definition: PrefDef<T>): PrefDef<T> => definition
const isFiniteNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value)
const normalizeSidebarWidth = (value: unknown): number => isFiniteNumber(value) ? clampSidebarWidth(value) : SIDEBAR_DEFAULT_WIDTH

/** The preferences exposed by `usePreferences()` (the name of each one is the name of its field there). */
export const UI_PREFS = {
    showProgressBar: def({ key: "showProgressBar", default: true }),
    showGroupProgressBar: def({ key: "showGroupProgressBar", default: true }),
    showSectionCount: def({ key: "showSectionCount", default: true }),
    showTaskCount: def({ key: "showTaskCount", default: true }),
    showSubtaskCount: def({ key: "showSubtaskCount", default: true }),
    showAudioFileCount: def({ key: "showAudioFileCount", default: true }),
    showGroupSeparators: def({ key: "showGroupSeparators", default: false, normalize: value => value === true }),
    undoLimit: def<number>({ key: "undoLimit", default: UNDO_LIMIT, normalize: value => isValidUndoLimit(value) ? value : UNDO_LIMIT }),
    sidebarLeftOpen: def({ key: "sidebarLeftOpen", default: true }),
    sidebarRightOpen: def({ key: "sidebarRightOpen", default: true }),
    sidebarLeftWidth: def<number>({ key: "sidebarLeftWidth", default: SIDEBAR_DEFAULT_WIDTH, normalize: normalizeSidebarWidth }),
    sidebarRightWidth: def<number>({ key: "sidebarRightWidth", default: SIDEBAR_DEFAULT_WIDTH, normalize: normalizeSidebarWidth }),
    sidebarItemSize: def<SidebarItemSize>({ key: "sidebarItemSize", default: "normal", normalize: value => value === "compact" || value === "large" ? value : "normal" }),
    rightPanelTab: def<RightPanelTab>({ key: "rightPanelTab", default: "details", normalize: value => value === "history" ? "history" : "details" }),
    audioVolume: def<number>({ key: "audioVolume", default: DEFAULT_AUDIO_VOLUME, normalize: clampAudioVolume }),
    audioPlayerVisible: def({ key: "audioPlayerVisible", default: true }),
    audioPlayerScale: def<AudioPlayerScale>({ key: "audioPlayerScale", default: DEFAULT_AUDIO_PLAYER_SCALE, normalize: normalizeAudioPlayerScale }),
    audioPlayerOpacity: def<number>({ key: "audioPlayerOpacity", default: DEFAULT_AUDIO_PLAYER_OPACITY, normalize: clampAudioPlayerOpacity }),
    workspaceView: def<WorkspaceView>({ key: "workspaceView", default: "grid", normalize: value => value === "list" ? "list" : "grid" }),
    workspaceSort: def<WorkspaceSort>({
        key: "workspaceSort",
        default: DEFAULT_WORKSPACE_SORT,
        normalize: value => {
            const { by, dir } = (value ?? {}) as Partial<WorkspaceSort>
            return (by === "edited" || by === "created" || by === "name") && (dir === "asc" || dir === "desc") ? { by, dir } : { ...DEFAULT_WORKSPACE_SORT }
        }
    }),
    reopenNotes: def({ key: "reopenNotes", default: true }),
    reopenLastWorkspace: def({ key: "reopenLastWorkspace", default: false }),
    colorIntensity: def<number>({ key: "colorIntensity", default: DEFAULT_COLOR_INTENSITY, normalize: clampColorIntensity }),
    hideCompletedTasks: def({ key: "hideCompletedTasks", default: false }),
    language: def<LanguagePreference>({ key: "language", default: DEFAULT_LANGUAGE_PREFERENCE, normalize: value => isLanguagePreference(value) ? value : DEFAULT_LANGUAGE_PREFERENCE }),
}

/** The preferences used by the app only (not part of `usePreferences()`); saving null removes them from the store. */
export const APP_PREFS = {
    lastWorkspaceId: def<number | null>({ key: "lastWorkspaceId", default: null, normalize: value => typeof value === "number" ? value : null }),
    skippedUpdateVersion: def<string | null>({ key: "skippedUpdateVersion", default: null, normalize: value => typeof value === "string" && value.length > 0 ? value : null }),
    checkUpdatesOnStartup: def({ key: "checkUpdatesOnStartup", default: true }),
    autoBackup: def({ key: "autoBackup", default: true }),
    backupKeep: def<number>({ key: "backupKeep", default: DEFAULT_BACKUP_KEEP, normalize: clampBackupKeep }),
}

const ALL_PREFS = { ...UI_PREFS, ...APP_PREFS }

export type UiPrefName = keyof typeof UI_PREFS
export type PrefName = keyof typeof ALL_PREFS
export type PrefValue<K extends PrefName> = (typeof ALL_PREFS)[K] extends PrefDef<infer T> ? T : never

/**
 * Brings a value into the ones allowed for a preference (what the store would give back for it).
 * @param name The preference (see UI_PREFS and APP_PREFS).
 * @param value The value to check (anything is accepted, undefined gives the default).
 * @returns The value itself when valid, otherwise the nearest allowed one.
 * @category Store
 */
export const normalizePref = <K extends PrefName>(name: K, value: unknown): PrefValue<K> => {
    const definition: PrefDef<unknown> = ALL_PREFS[name]
    return (definition.normalize ? definition.normalize(value) : value ?? definition.default) as PrefValue<K>
}

/**
 * Gets a preference.
 * @param name The preference (see UI_PREFS and APP_PREFS).
 * @returns A promise that resolves to the stored value, or to the default when nothing valid is stored.
 * @category Store
 */
export const getPref = async <K extends PrefName>(name: K): Promise<PrefValue<K>> =>
    normalizePref(name, await store.get(ALL_PREFS[name].key))

/**
 * Saves a preference (the value is brought into the allowed ones first).
 * @param name The preference (see UI_PREFS and APP_PREFS).
 * @param value The value to save; null removes the preference from the store.
 * @returns A promise that resolves when the value is saved.
 * @category Store
 */
export const savePref = async <K extends PrefName>(name: K, value: PrefValue<K>): Promise<void> => {
    const key = ALL_PREFS[name].key
    const normalized = normalizePref(name, value)
    if (normalized === null) await store.delete(key)
    else await store.set(key, normalized)
    await persist()
}

// Thin wrappers for the preferences read or written outside of the provider
export const getAutoBackup = () => getPref("autoBackup")
export const saveAutoBackup = (value: boolean) => savePref("autoBackup", value)
export const getBackupKeep = () => getPref("backupKeep")
export const saveBackupKeep = (value: number) => savePref("backupKeep", value)
export const getCheckUpdatesOnStartup = () => getPref("checkUpdatesOnStartup")
export const saveCheckUpdatesOnStartup = (value: boolean) => savePref("checkUpdatesOnStartup", value)
export const getSkippedUpdateVersion = () => getPref("skippedUpdateVersion")
export const saveSkippedUpdateVersion = (version: string | null) => savePref("skippedUpdateVersion", version)
export const getLastWorkspaceId = () => getPref("lastWorkspaceId")
export const saveLastWorkspaceId = (id: number) => savePref("lastWorkspaceId", id)
/** Forgets the last open workspace (e.g. after going back to the home). */
export const clearLastWorkspaceId = () => savePref("lastWorkspaceId", null)
export const getReopenNotes = () => getPref("reopenNotes")
export const getReopenLastWorkspace = () => getPref("reopenLastWorkspace")
export const getLanguage = () => getPref("language")
export const saveLanguage = (value: LanguagePreference) => savePref("language", value)
export const getRightPanelTab = () => getPref("rightPanelTab")
export const getSideBarRightOpen = () => getPref("sidebarRightOpen")
export const getSidebarRightWidth = () => getPref("sidebarRightWidth")

// The preferences below are not plain values, so they stay out of the tables

/**
 * Gets the primary color preference.
 * If no value is set (or it is not a hex color), it defaults to DEFAULT_PRIMARY_COLOR.
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
 * Gets the current position of the audio player.
 * If no position is set (or it is not made of finite numbers), it defaults to { x: 0, y: 0, scaleX: 1, scaleY: 1 }.
 * @returns A promise that resolves to an object containing the audio player's position and scale.
 * @category Store
 */
export const getAudioPlayerPosition = async (): Promise<AudioPlayerPosition> => {
    const value = await store.get<Partial<AudioPlayerPosition>>(AUDIOPLAYER_POSITION_KEY)
    if (!value || typeof value !== "object" || !isFiniteNumber(value.x) || !isFiniteNumber(value.y)) return { x: 0, y: 0, scaleX: 1, scaleY: 1 }
    return { x: value.x, y: value.y, scaleX: isFiniteNumber(value.scaleX) ? value.scaleX : 1, scaleY: isFiniteNumber(value.scaleY) ? value.scaleY : 1 }
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
