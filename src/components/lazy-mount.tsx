import { Suspense, useState, type ReactNode } from "react"

type LazyMountProps = {
    /** Becomes true when the lazy content is first needed (e.g. a dialog is opened) */
    active: boolean
    children: ReactNode
}

/**
 * Renders its (lazy) children only from the first time `active` is true, and keeps them mounted afterwards
 * so exit animations and state are preserved. Until then the chunk is never requested.
 */
export const LazyMount = ({ active, children }: LazyMountProps) => {
    const [seen, setSeen] = useState(active)
    if (active && !seen) setSeen(true)
    return seen ? <Suspense fallback={null}>{children}</Suspense> : null
}
