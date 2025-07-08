import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type TextareaWithLabelProps = {
    labelText: string
    placeHolder: string
}

export function TextareaWithLabel({labelText, placeHolder}: TextareaWithLabelProps) {
    return (
        <div className="grid w-full gap-3">
            <Label htmlFor="message">{labelText}</Label>
            <Textarea placeholder={placeHolder} id="message" className="bg-background"/>
        </div>
    )
}
