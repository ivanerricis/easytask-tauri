import { Navbar } from "@/components/navbar"
import { DialogSettings } from "@/components/dialogs/dialog-settings"
import { ButtonTrashWorkspaces } from "./components/ButtonTrashWorkspaces"

type MainPageLayoutProps = {
    children: React.ReactNode
}

export const MainPageLayout = ({ children }: MainPageLayoutProps) => {
    return (
        <div className="flex flex-col h-full w-full">
            <Navbar />
            <main className="flex flex-col w-full h-full items-center justify-center">
                {children}
            </main>
            {/* Kept in the layout so the dialog survives the page-level loading state */}
            <div className="fixed bottom-4 right-4">
                <ButtonTrashWorkspaces />
            </div>
            <DialogSettings />
        </div>
    )
}