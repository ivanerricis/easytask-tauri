import { Button } from "@/components/ui/button"
import { Upload } from "lucide-react"

export const ButtonUpload = () => {
    return (
        <Button variant={"buttonIcon"} size={"icon"}>
            <Upload />
        </Button>
    )
}