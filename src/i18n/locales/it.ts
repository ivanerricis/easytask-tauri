export const it = {
    common: {
        cancel: "Annulla",
        delete: "Elimina",
        save: "Salva",
        rename: "Rinomina",
        system: "Sistema",
    },
    dialogs: {
        confirm: {
            title: "Sei sicuro di voler procedere?",
            description: "Questa azione non può essere annullata.",
        },
        color: {
            swatch: "Colore {{color}}",
        },
        createTemplate: {
            title: "Crea template",
            description: "Salva una copia del contenuto attuale della nota \"{{name}}\" per riutilizzarla.",
            name: "Nome del template",
            created: "Template creato",
        },
        delete: {
            title: "Spostare nel cestino?",
            description: "L'elemento verrà spostato nel cestino. Potrai ripristinarlo in seguito.",
            confirm: "Sposta nel cestino",
            error: "Impossibile eliminare l'elemento: {{message}}",
        },
        noteFromTemplate: {
            title: "Crea nota da template",
            description: "Template: {{name}}",
            name: "Nome",
            destination: "Destinazione",
            root: "Radice del workspace",
            submit: "Crea nota",
            created: "Nota creata",
        },
    },
    audio: {
        player: {
            seek: "Posizione di riproduzione",
            close: "Chiudi il player",
            play: "Riproduci",
            pause: "Pausa",
            volume: "Volume",
            defaultTitle: "Titolo del file audio",
        },
    },
    settings: {
        appearance: {
            language: {
                label: "Lingua",
                description: "Scegli la lingua dell'interfaccia; \"Sistema\" segue la lingua del computer.",
                options: {
                    system: "Sistema",
                    it: "Italiano",
                    en: "English",
                },
            },
            title: "Aspetto",
            theme: {
                label: "Tema",
                description: "Scegli tra tema chiaro, scuro o quello del sistema.",
                light: "Chiaro",
                dark: "Scuro",
                toggle: "Cambia tema",
            },
            accent: {
                label: "Colore d'accento",
                description: "Usato per pulsanti, selezioni ed evidenziazioni.",
            },
        },
    },
}

export type Translation = typeof it
