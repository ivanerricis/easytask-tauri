import { SideBar } from "./SideBar"
import { SideBarContainer } from "./SideBarContainer"
import { SideBarHeader } from "./SideBarHeader"
import { TextareaWithLabel } from "@/components/textarea-label"
import { useWorkspace } from "@/contexts/use-workspace"

export const SideBarRight = () => {
    const { currentWorkspace } = useWorkspace()

    return (
        <SideBar position="right" defaultOpen={false}>
            {/* Right Up Container */}
            <SideBarContainer className="flex flex-col"
                header={<SideBarHeader text="Informazioni:" className="border-b-2" />}
            >
                <div className="p-2 flex flex-col gap-6">
                    <div className="w-full h-full flex flex-col p-2 gap-1 border rounded-md bg-background">
                        <span className="text-sm font-base">Creato il: {currentWorkspace?.creation_date}</span>
                        <span className="text-sm font-base">Creato alle ore: {currentWorkspace?.creation_time}</span>
                        <span className="text-sm font-base">Modificato il: {currentWorkspace?.edit_date}</span>
                        <span className="text-sm font-base">Modificato alle ore: {currentWorkspace?.edit_time}</span>
                    </div>
                    <TextareaWithLabel labelText="Descrizione" placeHolder="Scrivi qualcosa per descrivere il task..." />
                </div>
            </SideBarContainer>
        </SideBar>
    )
}