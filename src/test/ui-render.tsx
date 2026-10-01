/* eslint-disable react-refresh/only-export-components */
import type { ReactElement, ReactNode } from "react"
import { render } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { WorkspaceProvider } from "@/contexts/workspace-context"
import { ShortcutsProvider } from "@/contexts/shortcuts-context"
import { WorkspaceDataProvider } from "@/contexts/workspace-data"

// Callers must vi.mock the "@/db/queries/*" modules used by the providers.
export function AllProviders({ children }: { children: ReactNode }) {
    return (
        <MemoryRouter>
            <WorkspaceProvider>
                <WorkspaceDataProvider><ShortcutsProvider>{children}</ShortcutsProvider></WorkspaceDataProvider>
            </WorkspaceProvider>
        </MemoryRouter>
    )
}

export function renderWithProviders(ui: ReactElement) {
    return render(ui, { wrapper: AllProviders })
}

export function deferred<T = void>() {
    let resolve!: (value: T) => void
    let reject!: (reason?: unknown) => void
    const promise = new Promise<T>((res, rej) => {
        resolve = res
        reject = rej
    })
    return { promise, resolve, reject }
}
