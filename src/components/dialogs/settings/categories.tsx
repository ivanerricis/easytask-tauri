import type { ComponentType } from "react"
import { Info, LayoutList, Music, Palette, type LucideIcon } from "lucide-react"
import { AppearanceSettings } from "./AppearanceSettings"
import { NotesSettings } from "./NotesSettings"
import { AudioSettings } from "./AudioSettings"
import { AboutSettings } from "./AboutSettings"

export type SettingsCategory = {
    id: string
    label: string
    icon: LucideIcon
    Panel: ComponentType
}

// Order here is the order in the nav. Keep "about" last.
export const SETTINGS_CATEGORIES: SettingsCategory[] = [
    { id: "appearance", label: "Aspetto", icon: Palette, Panel: AppearanceSettings },
    { id: "notes", label: "Note e sezioni", icon: LayoutList, Panel: NotesSettings },
    { id: "audio", label: "Audio", icon: Music, Panel: AudioSettings },
    { id: "about", label: "Informazioni", icon: Info, Panel: AboutSettings },
]
