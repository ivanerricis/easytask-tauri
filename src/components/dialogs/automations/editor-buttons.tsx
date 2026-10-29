import { useTranslation } from "react-i18next"
import { Check, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LAST_STEP, type Step } from "./model"

type EditorButtonsProps = {
    step: Step
    /** Whether the data of the current step is complete. */
    valid: boolean
    saving: boolean
    onCancel: () => void
    onGoTo: (step: Step) => void
    onSave: () => void
}

/** The footer of the editor: cancel on the left, back / next (save on the last step) on the right. */
export const EditorButtons = ({ step, valid, saving, onCancel, onGoTo, onSave }: EditorButtonsProps) => {
    const { t } = useTranslation()
    return (
        <>
            <Button variant="outline" type="button" onClick={onCancel}>
                {t("common.cancel")}
            </Button>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
                {step > 0 && (
                    <Button variant="outline" type="button" onClick={() => onGoTo((step - 1) as Step)}>
                        <ChevronLeft />
                        {t("automations.back")}
                    </Button>
                )}
                {step < LAST_STEP ? (
                    <Button type="button" onClick={() => onGoTo((step + 1) as Step)} disabled={!valid}>
                        {t("automations.next")}
                        <ChevronRight />
                    </Button>
                ) : (
                    <Button type="button" onClick={onSave} disabled={saving || !valid}>
                        {saving ? <Loader2 className="animate-spin motion-reduce:animate-none" /> : <Check />}
                        {t("common.save")}
                    </Button>
                )}
            </div>
        </>
    )
}
