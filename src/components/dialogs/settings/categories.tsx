import type { ComponentType } from "react"
import { Database, Info, Keyboard, LayoutList, Monitor, Music, Palette, type LucideIcon } from "lucide-react"
import { AppearanceSettings } from "./AppearanceSettings"
import { NotesSettings } from "./NotesSettings"
import { AudioSettings } from "./AudioSettings"
import { DataSettings } from "./DataSettings"
import { ShortcutsSettings } from "./ShortcutsSettings"
import { SystemSettings } from "./SystemSettings"
import { AboutSettings } from "./AboutSettings"

export type SettingsCategory = {
    id: string
    labelKey: `settings.${"appearance" | "notes" | "audio" | "shortcuts" | "data" | "system" | "about"}.title`
    icon: LucideIcon
    Panel: ComponentType
}

// Order here is the order in the nav. Keep "about" last.
export const SETTINGS_CATEGORIES: SettingsCategory[] = [
    { id: "appearance", labelKey: "settings.appearance.title", icon: Palette, Panel: AppearanceSettings },
    { id: "notes", labelKey: "settings.notes.title", icon: LayoutList, Panel: NotesSettings },
    { id: "audio", labelKey: "settings.audio.title", icon: Music, Panel: AudioSettings },
    { id: "shortcuts", labelKey: "settings.shortcuts.title", icon: Keyboard, Panel: ShortcutsSettings },
    { id: "data", labelKey: "settings.data.title", icon: Database, Panel: DataSettings },
    { id: "system", labelKey: "settings.system.title", icon: Monitor, Panel: SystemSettings },
    { id: "about", labelKey: "settings.about.title", icon: Info, Panel: AboutSettings },
]
