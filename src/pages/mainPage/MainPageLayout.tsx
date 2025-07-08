import { Navbar } from "@/components/navbar"
import { DialogSettings } from "../../components/dialog-settings"

type MainPageLayoutProps = {
    children: React.ReactNode
}

export const MainPageLayout = ({ children }: MainPageLayoutProps) => {
    return (
        <div className="flex flex-col h-full w-full">
            <Navbar
                leftContainer={<h1 className="font-bold text-lg">EasyTask</h1>}
            />
            <main className="flex flex-col w-full h-full items-center justify-center">
                {children}
            </main>
            <DialogSettings />
        </div>
    )
}