import type { ComponentType } from "react"
import { Database, Info, Keyboard, LayoutList, Music, Palette, type LucideIcon } from "lucide-react"
import { AppearanceSettings } from "./AppearanceSettings"
import { NotesSettings } from "./NotesSettings"
import { AudioSettings } from "./AudioSettings"
import { DataSettings } from "./DataSettings"
import { ShortcutsSettings } from "./ShortcutsSettings"
import { AboutSettings } from "./AboutSettings"

export type SettingsCategory = {
    id: string
    labelKey: `settings.categories.${"appearance" | "notes" | "audio" | "shortcuts" | "data" | "about"}`
    icon: LucideIcon
    Panel: ComponentType
}

// Order here is the order in the nav. Keep "about" last.
export const SETTINGS_CATEGORIES: SettingsCategory[] = [
    { id: "appearance", labelKey: "settings.categories.appearance", icon: Palette, Panel: AppearanceSettings },
    { id: "notes", labelKey: "settings.categories.notes", icon: LayoutList, Panel: NotesSettings },
    { id: "audio", labelKey: "settings.categories.audio", icon: Music, Panel: AudioSettings },
    { id: "shortcuts", labelKey: "settings.categories.shortcuts", icon: Keyboard, Panel: ShortcutsSettings },
    { id: "data", labelKey: "settings.categories.data", icon: Database, Panel: DataSettings },
    { id: "about", labelKey: "settings.categories.about", icon: Info, Panel: AboutSettings },
]
