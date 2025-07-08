import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { useWorkspace } from "@/contexts/workspace-context"
import { useWorkspaceData } from "@/contexts/workspace-data-context"
import { Home } from "lucide-react"
import React from "react"
import { useNavigate } from "react-router-dom"
import { CommandMenu } from "./components/CommandMenu"

type WorkSpaceLayoutProps = {
    children: React.ReactNode
}

export const WorkSpaceLayout = ({ children }: WorkSpaceLayoutProps) => {

    const { resetWorkspace } = useWorkspace()
    const { resetData } = useWorkspaceData()
    const navigate = useNavigate()

    const handleGoHome = (e: React.MouseEvent) => {
        e.stopPropagation()
        resetWorkspace()
        resetData()
        navigate('/')
    }

    return (
        <div className="flex flex-col w-full h-screen">
            <Navbar
                centerContainer={
                    <CommandMenu />
                }
                rightContainer={
                    <Button onClick={handleGoHome} variant={"buttonIcon"} size={"icon"} className="h-7 w-7 app-no-drag">
                        <Home />
                    </Button>
                }
            />
            <main className="flex flex-1 w-full overflow-hidden">
                {children}
            </main>
        </div>
    )
}