import React, { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { PanelLeft, PanelRight } from "lucide-react"

type SideBarProps = {
    children: React.ReactNode
    position?: "left" | "right"
    className?: string
    topContainer?: React.ReactNode
    bottomContainer?: React.ReactNode
    defaultOpen?: boolean
}

const DEFAULT_WIDTH = 245

export const SideBar = ({ children, position = "left", className, topContainer, bottomContainer, defaultOpen }: SideBarProps) => {
    const sidebarRef = useRef<HTMLDivElement>(null)
    const [isResizing, setIsResizing] = useState(false)
    const [sidebarOpen, setSidebarOpen] = useState(defaultOpen ?? true)
    const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_WIDTH)
    // const [prevWidth, setPrevWidth] = useState(DEFAULT_WIDTH)

    const startResizing = useCallback((e: React.MouseEvent) => {
        e.preventDefault()
        setIsResizing(true)
    }, [])

    const stopResizing = useCallback(() => {
        setIsResizing(false)
    }, [])

    const resize = useCallback((e: MouseEvent) => {
        if (!isResizing || !sidebarRef.current) return

        const sidebarRect = sidebarRef.current.getBoundingClientRect()
        const newWidth = position === "left"
            ? e.clientX - sidebarRect.left
            : sidebarRect.right - e.clientX

        const clampedWidth = Math.min(Math.max(newWidth, 200), 500)
        setSidebarWidth(clampedWidth)
        // setPrevWidth(clampedWidth)
    }, [isResizing, position])

    useEffect(() => {
        window.addEventListener("mousemove", resize)
        window.addEventListener("mouseup", stopResizing)
        return () => {
            window.removeEventListener("mousemove", resize)
            window.removeEventListener("mouseup", stopResizing)
        }
    }, [resize, stopResizing])

    const handleToggle = () => {
        if (sidebarOpen) {
            // setPrevWidth(sidebarWidth)
        }
        setSidebarOpen(!sidebarOpen)
    }

    const handleDoubleClick = () => {
        setSidebarWidth(DEFAULT_WIDTH)
        // setPrevWidth(DEFAULT_WIDTH)
    }

    const actualWidth = sidebarOpen ? sidebarWidth : 0
    const flexDirection = position === "left" ? "flex-row-reverse" : "flex-row"
    const borderClass = position === "left" ? "border-r-2" : "border-l-2"
    const resizerPosition = position === "left" ? "right-0" : "left-0"

    return (
        <div className={`flex ${flexDirection} h-full ${className || ""}`}>

            {/* Big Sidebar */}
            <div
                ref={sidebarRef}
                className={`relative flex flex-col h-full bg-secondary border-border ${sidebarOpen ? borderClass : ""}`}
                style={{
                    width: actualWidth,
                    minWidth: 0,
                    transition: isResizing ? "none" : "all 0.2s",
                    overflow: "hidden"
                }}
            >
                {sidebarOpen && children}
                {sidebarOpen && (
                    <div
                        className={`absolute top-0 h-full w-1.5 cursor-col-resize hover:bg-foreground/20 ${resizerPosition}`}
                        onMouseDown={startResizing}
                        onDoubleClick={handleDoubleClick}
                    />
                )}
            </div>

            {/* Little Sidebar */}
            <div className={`flex flex-col items-center justify-between p-1 bg-popover border-border ${borderClass}`}>
                <div className="h-full w-full flex flex-col">
                    <Button
                        onClick={handleToggle}
                        aria-label="Toggle sidebar"
                        size="icon"
                        variant="ghost"
                    >
                        {position === "left" ? <PanelLeft /> : <PanelRight />}
                    </Button>
                    {topContainer}
                </div>
                <div className="h-full w-full flex flex-col-reverse">{bottomContainer}</div>
            </div>
        </div>
    )
}
