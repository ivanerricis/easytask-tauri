import type { Translation } from "./it"

export const en: Translation = {
    common: {
        cancel: "Cancel",
        delete: "Delete",
        save: "Save",
        rename: "Rename",
        system: "System",
    },
    dialogs: {
        confirm: {
            title: "Are you sure you want to proceed?",
            description: "This action cannot be undone.",
        },
        color: {
            swatch: "Color {{color}}",
        },
        createTemplate: {
            title: "Create template",
            description: "Save a copy of the current content of the note \"{{name}}\" so you can reuse it.",
            name: "Template name",
            created: "Template created",
        },
        delete: {
            title: "Move to trash?",
            description: "The item will be moved to the trash. You can restore it later.",
            confirm: "Move to trash",
            error: "Could not delete the item: {{message}}",
        },
        noteFromTemplate: {
            title: "Create note from template",
            description: "Template: {{name}}",
            name: "Name",
            destination: "Destination",
            root: "Workspace root",
            submit: "Create note",
            created: "Note created",
        },
    },
    audio: {
        player: {
            seek: "Playback position",
            close: "Close the player",
            play: "Play",
            pause: "Pause",
            volume: "Volume",
            defaultTitle: "Audio file title",
        },
    },
    settings: {
        appearance: {
            language: {
                label: "Language",
                description: "Choose the interface language; \"System\" follows the computer's language.",
                options: {
                    system: "System",
                    it: "Italiano",
                    en: "English",
                },
            },
            title: "Appearance",
            theme: {
                label: "Theme",
                description: "Choose between light, dark or the system theme.",
                light: "Light",
                dark: "Dark",
                toggle: "Toggle theme",
            },
            accent: {
                label: "Accent color",
                description: "Used for buttons, selections and highlights.",
            },
        },
    },
}
