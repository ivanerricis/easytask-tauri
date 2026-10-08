import { Navbar } from "@/components/navbar"
import { AppMenu } from "@/components/app-menu"
import { DialogSettings } from "@/components/dialogs/dialog-settings"

type MainPageLayoutProps = {
    children: React.ReactNode
}

export const MainPageLayout = ({ children }: MainPageLayoutProps) => {
    return (
        <div className="flex flex-col h-full w-full">
            <Navbar leftContainer={<AppMenu page="home" />} />
            <main className="flex flex-col w-full h-full items-center justify-center">
                {children}
            </main>
            <DialogSettings />
        </div>
    )
}