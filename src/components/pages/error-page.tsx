import { Button } from "../ui/button"
import { ArrowLeft } from "lucide-react"
import { useNavigate } from "react-router-dom"

type ErrorPageProps = {
    error: string | null
}

export const ErrorPage = ({ error }: ErrorPageProps) => {
    const navigate = useNavigate();

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
            <Button variant="outline" onClick={() => navigate("/")}>
                <ArrowLeft />
                Torna alla home
            </Button>
        </div>
    )
}