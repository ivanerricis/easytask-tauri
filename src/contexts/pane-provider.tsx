import type { ReactNode } from "react"
import type { PaneIndex } from "./layout-reducer"

/** Placeholder: WP-B fills it (overrides the tabs and note contexts with the ones of the pane). */
export function PaneProvider({ children }: { pane: PaneIndex, children: ReactNode }) {
    return <>{children}</>
}
