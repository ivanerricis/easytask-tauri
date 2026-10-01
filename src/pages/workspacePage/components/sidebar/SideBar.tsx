import { useTranslation } from "react-i18next"
import React, { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { TooltipCustom } from "@/components/tooltip-custom"
import { useShortcutLabel } from "@/contexts/use-shortcuts"
import { focusRing } from "@/lib/a11y"
import { PanelLeft, PanelRight } from "lucide-react"
import {
    SIDEBAR_DEFAULT_WIDTH, SIDEBAR_MIN_WIDTH, clampSidebarWidth, maxSidebarWidth, widthForKey,
} from "@/lib/sidebar-layout"

type SideBarProps = {
    children: React.ReactNode
    position?: "left" | "right"
    className?: string
    topContainer?: React.ReactNode
    bottomContainer?: React.ReactNode
    open: boolean
    onOpenChange: (value: boolean) => void
    /** Width of the panel in pixels (clamped to the allowed range). */
    width?: number
    onWidthChange?: (value: number) => void
    /** Compact mode: the panel floats over the content instead of pushing it, and is not resizable. */
    overlay?: boolean
}

export const SideBar = ({
    children, position = "left", className, topContainer, bottomContainer,
    open, onOpenChange, width = SIDEBAR_DEFAULT_WIDTH, onWidthChange, overlay = false,
}: SideBarProps) => {
    const { t } = useTranslation()
    const sidebarRef = useRef<HTMLDivElement>(null)
    const toggleRef = useRef<HTMLButtonElement>(null)
    const toggleLabel = useShortcutLabel("toggle-sidebar")
    const [dragWidth, setDragWidth] = useState<number | null>(null)
    const dragWidthRef = useRef<number | null>(null)
    const isResizing = dragWidth !== null
    const direction = position === "left" ? 1 : -1

    const currentWidth = clampSidebarWidth(dragWidth ?? width, window.innerWidth)

    const startResizing = useCallback((e: React.MouseEvent) => {
        e.preventDefault()
        dragWidthRef.current = currentWidth
        setDragWidth(currentWidth)
    }, [currentWidth])

    useEffect(() => {
        if (!isResizing) return
        const resize = (e: MouseEvent) => {
            if (!sidebarRef.current) return
            const rect = sidebarRef.current.getBoundingClientRect()
            const next = position === "left" ? e.clientX - rect.left : rect.right - e.clientX
            const clamped = clampSidebarWidth(next, window.innerWidth)
            dragWidthRef.current = clamped
            setDragWidth(clamped)
        }
        const stop = () => {
            const final = dragWidthRef.current
            dragWidthRef.current = null
            setDragWidth(null)
            if (final !== null) onWidthChange?.(final)
        }
        window.addEventListener("mousemove", resize)
        window.addEventListener("mouseup", stop)
        return () => {
            window.removeEventListener("mousemove", resize)
            window.removeEventListener("mouseup", stop)
        }
    }, [isResizing, position, onWidthChange])

    const handleResizerKeyDown = (e: React.KeyboardEvent) => {
        const next = widthForKey(e.key, currentWidth, window.innerWidth, e.shiftKey, direction)
        if (next === null) return
        e.preventDefault()
        if (next !== currentWidth) onWidthChange?.(next)
    }

    const closeOverlay = () => {
        onOpenChange(false)
        toggleRef.current?.focus()
    }

    const handlePanelKeyDown = (e: React.KeyboardEvent) => {
        if (overlay && e.key === "Escape" && !e.defaultPrevented) {
            e.stopPropagation()
            closeOverlay()
        }
    }

    const showPanel = open
    const flexDirection = position === "left" ? "flex-row-reverse" : "flex-row"
    const borderClass = position === "left" ? "border-r-2" : "border-l-2"
    const resizerPosition = position === "left" ? "right-0" : "left-0"
    const sideAnchor = position === "left" ? "left-full" : "right-full"
    const toggleText = open ? t("layout.hideSidebar") : t("layout.showSidebar")

    return (
        <div className={`flex ${flexDirection} relative h-full z-20 shrink-0 ${className || ""}`}>

            {/* Overlay backdrop: a click outside the floating panel closes it */}
            {overlay && showPanel && (
                <div
                    data-testid="sidebar-backdrop"
                    aria-hidden
                    className={`absolute top-0 h-full w-screen bg-black/30 ${sideAnchor}`}
                    onClick={closeOverlay}
                />
            )}

            {/* Big Sidebar */}
            <div
                ref={sidebarRef}
                data-testid="sidebar-panel"
                onKeyDown={handlePanelKeyDown}
                className={`${overlay ? `absolute top-0 z-10 shadow-xl ${sideAnchor}` : "relative"} flex flex-col h-full bg-secondary ${showPanel ? borderClass : ""}`}
                style={{
                    width: showPanel ? currentWidth : 0,
                    maxWidth: overlay ? "calc(100vw - 80px)" : undefined,
                    minWidth: 0,
                    transition: isResizing ? "none" : "width 0.2s",
                    overflow: "hidden",
                }}
            >
                {showPanel && children}
                {showPanel && !overlay && (
                    <div
                        role="separator"
                        aria-orientation="vertical"
                        aria-label={t("layout.resizeSidebar")}
                        aria-valuemin={SIDEBAR_MIN_WIDTH}
                        aria-valuemax={maxSidebarWidth(window.innerWidth)}
                        aria-valuenow={currentWidth}
                        aria-valuetext={t("layout.resizeValue", { width: currentWidth })}
                        tabIndex={0}
                        className={`${focusRing} absolute top-0 h-full w-1.5 cursor-col-resize hover:bg-accent ${isResizing ? "bg-accent" : ""} ${resizerPosition}`}
                        onMouseDown={startResizing}
                        onDoubleClick={() => onWidthChange?.(SIDEBAR_DEFAULT_WIDTH)}
                        onKeyDown={handleResizerKeyDown}
                    />
                )}
            </div>

            {/* Little Sidebar */}
            <div className={`flex flex-col items-center justify-between p-1 bg-background ${borderClass}`}>
                <div className="h-full w-full flex flex-col">
                    <TooltipCustom text={toggleText} shortcut={toggleLabel} side={position === "left" ? "right" : "left"}>
                        <Button
                            ref={toggleRef}
                            onClick={() => onOpenChange(!open)}
                            aria-label={t("sidebar.toggle")}
                            aria-expanded={open}
                            size="icon"
                            variant="ghost"
                        >
                            {position === "left" ? <PanelLeft /> : <PanelRight />}
                        </Button>
                    </TooltipCustom>
                    {topContainer}
                </div>
                <div className="h-full w-full flex flex-col-reverse">{bottomContainer}</div>
            </div>
        </div>
    )
}
