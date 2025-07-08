import { DialogSettings } from "@/components/dialog-settings"
import { Navbar } from "@/components/navbar"

type LoginPageLayoutProps = {
    children: React.ReactNode
}

export const LoginPageLayout = ({ children }: LoginPageLayoutProps) => {
    return (
        <div className="flex flex-col h-full w-full">
            <Navbar />
            <main className="flex flex-col w-full h-full items-center justify-center">
                {children}
            </main>
            <DialogSettings />
        </div>
    )
}