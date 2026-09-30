import { Navbar } from "@/components/navbar"
import { useWorkspace } from "@/contexts/workspace-context"
import { useWorkspaceData } from "@/contexts/workspace-data-context"
import { ArrowLeft } from "lucide-react"
import React, { useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { CommandMenu } from "./components/CommandMenu"
import { ButtonNavbar } from "@/components/button-navbar"
import { clearLastWorkspaceId } from "@/lib/store/preferences"
import { reportError } from "@/lib/report-error"
import { useShortcut } from "@/hooks/use-shortcut"
import { useShortcutLabel } from "@/contexts/shortcuts-context"

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
        clearLastWorkspaceId().catch(error => reportError(error))
        navigate("/")
    }, [resetWorkspace, resetData, navigate])

    useShortcut("go-home", handleGoHome, { allowInInputs: true })
    const homeLabel = useShortcutLabel("go-home")

    return (
        <div className="flex flex-col w-full h-full">
            <Navbar
                centerContainer={
                    <div className="flex">
                        <ButtonNavbar
                            onClick={handleGoHome}
                            className={"text-foreground pr-1"}
                            textTooltip="Torna alla Home"
                            textTooltipShortcut={homeLabel}
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