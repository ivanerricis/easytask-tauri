import { Navbar } from "@/components/navbar"
import { useWorkspace } from "@/contexts/workspace-context"
import { useWorkspaceData } from "@/contexts/workspace-data-context"
import { ArrowLeft } from "lucide-react"
import React, { useCallback, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { CommandMenu } from "./components/CommandMenu"
import { ButtonNavbar } from "@/components/button-navbar"

type WorkSpaceLayoutProps = {
    children: React.ReactNode
}

export const WorkSpaceLayout = ({ children }: WorkSpaceLayoutProps) => {

    const { resetWorkspace } = useWorkspace()
    const { resetData } = useWorkspaceData()
    const navigate = useNavigate()

    const handleGoHome = useCallback(() => {
        resetWorkspace()
        resetData()
        navigate("/")
    }, [resetWorkspace, resetData, navigate])

    useEffect(() => {
        const handleShortcut = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key.toLowerCase() === "h") {
                e.preventDefault()
                handleGoHome()
            }
        }
        window.addEventListener("keydown", handleShortcut)
        return () => window.removeEventListener("keydown", handleShortcut)
    }, [handleGoHome])

    return (
        <div className="flex flex-col w-full h-full">
            <Navbar
                centerContainer={
                    <div className="flex">
                        <ButtonNavbar
                            onClick={handleGoHome}
                            className={"text-foreground pr-1"}
                            textTooltip="Torna alla Home"
                            textTooltipShortcut="(Ctrl + H)"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </ButtonNavbar>
                        <CommandMenu />
                    </div>
                }
            />
            <main className="flex flex-1 w-full h-full overflow-hidden">
                {children}
            </main>
        </div>
    )
}