import { DialogSettings } from "@/components/dialog-settings"
import { Navbar } from "@/components/navbar"

type PasswordPageLayoutProps = {
    children: React.ReactNode
}

export const PasswordPageLayout = ({ children }: PasswordPageLayoutProps) => {
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