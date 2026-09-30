import { useWorkspace } from "@/contexts/use-workspace"
import { Button } from "../ui/button"
import { ArrowLeft } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useWorkspaceData } from "@/contexts/workspace-data"

type ErrorPageProps = {
    error: string | null
}

export const ErrorPage = ({ error }: ErrorPageProps) => {
    const navigate = useNavigate()
    const { resetWorkspace } = useWorkspace()
    const { resetData } = useWorkspaceData()

    const handleClick = () => {
        resetWorkspace()
        resetData()
        navigate('/')
    }

    return (
        <div className="flex flex-col items-center justify-center h-full gap-4">
            <h1 className="font-bold text-lg">
                Ops c'è stato un errore...
            </h1>
            <div className="flex flex-col rounded-xs border p-2 gap-1">
                <h2>
                    Descrizione dell'errore:
                </h2>
                <p className="text-destructive w-[300px] border rounded-xs p-2">{error}</p>
            </div>
            <Button variant="outline" onClick={handleClick}>
                <ArrowLeft />
                Torna alla home
            </Button>
        </div>
    )
}