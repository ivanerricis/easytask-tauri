import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"

export const ButtonUpload = () => {
    return (
        <Button variant={"buttonIcon"} size={"icon"}>
            <Download />
        </Button>
    )
}