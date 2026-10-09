import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react"
import type { ChooseImportNames, ImportName } from "@/lib/workspace-transfer"
import { DialogImportNames } from "@/components/dialogs/dialog-import-names"

type PendingRequest = {
    proposed: ImportName[]
    submit: (names: string[]) => Promise<unknown>
    resolve: (result: unknown) => void
}

const ImportNamesContext = createContext<ChooseImportNames | undefined>(undefined)

/**
 * Hosts the dialog that shows the names of what an import creates (proposed, editable) before importing.
 * Mounted once around the pages, so the home and the workspace import share it.
 * @category Contexts
 */
export function ImportNamesProvider({ children }: { children: ReactNode }) {
    const [request, setRequest] = useState<PendingRequest | null>(null)

    const choose = useCallback<ChooseImportNames>((proposed, submit) => new Promise(resolve => {
        setRequest({ proposed, submit, resolve: resolve as (result: unknown) => void })
    }), [])

    const close = (result: unknown) => {
        request?.resolve(result)
        setRequest(null)
    }

    const value = useMemo(() => choose, [choose])
    return (
        <ImportNamesContext.Provider value={value}>
            {children}
            {request && (
                <DialogImportNames
                    proposed={request.proposed}
                    onSubmit={async names => close(await request.submit(names))}
                    onCancel={() => close(null)}
                />
            )}
        </ImportNamesContext.Provider>
    )
}

/** The function that asks the names of an import (undefined outside the provider: the proposed names are used). */
// eslint-disable-next-line react-refresh/only-export-components
export const useImportNames = () => useContext(ImportNamesContext)
