import { useEffect, useRef } from "react"
import { usePreferences } from "@/contexts/use-preferences"
import { COMPACT_BREAKPOINT, sidebarsToClose } from "@/lib/sidebar-layout"

/**
 * When the window shrinks so much that the note would get less than its minimum width, closes the open sidebars
 * (right first, then left) as if the user had pressed their buttons. Only a shrinking window triggers it: nothing
 * reopens when the window grows back and opening a sidebar by hand is never opposed. Compact windows use overlays, so
 * they are left alone.
 */
export function useAutoCloseSidebars() {
    const { sidebarLeftOpen, sidebarLeftWidth, setSideBarLeftOpen, sidebarRightOpen, sidebarRightWidth, setSideBarRightOpen } = usePreferences()
    const latest = useRef({ sidebarLeftOpen, sidebarLeftWidth, setSideBarLeftOpen, sidebarRightOpen, sidebarRightWidth, setSideBarRightOpen })
    useEffect(() => {
        latest.current = { sidebarLeftOpen, sidebarLeftWidth, setSideBarLeftOpen, sidebarRightOpen, sidebarRightWidth, setSideBarRightOpen }
    })

    useEffect(() => {
        let previous = window.innerWidth
        const onResize = () => {
            const width = window.innerWidth
            const shrunk = width < previous
            previous = width
            if (!shrunk || width < COMPACT_BREAKPOINT) return
            const s = latest.current
            const close = sidebarsToClose(width, { open: s.sidebarLeftOpen, width: s.sidebarLeftWidth }, { open: s.sidebarRightOpen, width: s.sidebarRightWidth })
            if (close.right) s.setSideBarRightOpen(false)
            if (close.left) s.setSideBarLeftOpen(false)
        }
        window.addEventListener("resize", onResize)
        return () => window.removeEventListener("resize", onResize)
    }, [])
}
