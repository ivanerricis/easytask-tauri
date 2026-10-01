import { useTranslation } from "react-i18next"
import { SideBar } from "./SideBar"
import { SideBarContainer } from "./SideBarContainer"
import { SideBarHeader } from "./SideBarHeader"
import { TextareaWithLabel } from "@/components/textarea-label"
import { useWorkspace } from "@/contexts/use-workspace"

export const SideBarRight = () => {
    const { t } = useTranslation()
    const { currentWorkspace } = useWorkspace()

    return (
        <SideBar position="right" defaultOpen={false}>
            {/* Right Up Container */}
            <SideBarContainer className="flex flex-col"
                header={<SideBarHeader text={t("sidebar.info.title")} className="border-b-2" />}
            >
                <div className="p-2 flex flex-col gap-6">
                    <div className="w-full h-full flex flex-col p-2 gap-1 border rounded-md bg-background">
                        <span className="text-sm font-base">{t("sidebar.info.createdOn", { value: currentWorkspace?.creation_date })}</span>
                        <span className="text-sm font-base">{t("sidebar.info.createdAt", { value: currentWorkspace?.creation_time })}</span>
                        <span className="text-sm font-base">{t("sidebar.info.editedOn", { value: currentWorkspace?.edit_date })}</span>
                        <span className="text-sm font-base">{t("sidebar.info.editedAt", { value: currentWorkspace?.edit_time })}</span>
                    </div>
                    <TextareaWithLabel labelText={t("sidebar.info.description")} placeHolder={t("sidebar.info.placeholder")} />
                </div>
            </SideBarContainer>
        </SideBar>
    )
}