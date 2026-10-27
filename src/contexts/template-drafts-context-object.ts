import { createContext } from "react"
import type { TemplateDraft } from "@/db/queries/template-draft"
import type { DraftSaveStatus } from "@/lib/template-draft"

export type TemplateDraftsContextType = {
    /** The drafts of the loaded workspace whose template is not deleted (the ones that have a tab or can have one). */
    drafts: TemplateDraft[]
}

/** The save state of the drafts as a store: a tab reads only the state of its own draft. */
export type DraftStatusStore = {
    subscribe: (listener: () => void) => () => void
    getStatus: (noteId: number) => DraftSaveStatus
}

export type TemplateDraftsActionsType = {
    /**
     * Opens the editor of a template: creates its draft (or finds the one that exists) and opens it in a tab.
     * @throws The error of the database when the draft cannot be created.
     */
    openTemplateEditor: (template: { id: number, name: string }) => Promise<void>
    /** Saves the pending changes of the draft of a template now. Resolves false when the draft could not be saved. */
    flushTemplate: (templateId: number) => Promise<boolean>
    /** Saves the pending changes of every open draft now (before an export). Resolves false when one could not be saved. */
    flushAll: () => Promise<boolean>
    /** Tries again to save a draft after an error. */
    retrySave: (noteId: number) => Promise<boolean>
    /** Reads the drafts again (a template was renamed). */
    refreshDrafts: () => Promise<void>
    statusStore: DraftStatusStore
}

const NO_STATUS: DraftStatusStore = { subscribe: () => () => {}, getStatus: () => "idle" }

export const TemplateDraftsContext = createContext<TemplateDraftsContextType>({ drafts: [] })

/** Without a provider (tests of single components) there are no drafts and nothing to save. */
export const TemplateDraftsActionsContext = createContext<TemplateDraftsActionsType>({
    openTemplateEditor: async () => {},
    flushTemplate: async () => true,
    flushAll: async () => true,
    retrySave: async () => true,
    refreshDrafts: async () => {},
    statusStore: NO_STATUS,
})
