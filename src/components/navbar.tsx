import React from "react"
import { getCurrentWindow } from "@tauri-apps/api/window"
import { ButtonNavbar } from "./button-navbar"
import { Minus, Square, X } from "lucide-react"

type NavBarProps = {
    leftContainer?: React.ReactNode
    centerContainer?: React.ReactNode
    rightContainer?: React.ReactNode
}

export const Navbar = ({ leftContainer, centerContainer, rightContainer }: NavBarProps) => {
    const window = getCurrentWindow();

    const handleClose = async () => {
        window.close()
    }

    const handletoggleMaximize = () => {
        window.toggleMaximize()
    }

    const handleMinimize = () => {
        window.minimize()
    }

    return (
        <div className="z-50 flex items-center justify-between w-full border-b shadow-sm bg-background" data-tauri-drag-region>
            <div className="flex-1 text-left" data-tauri-drag-region>{leftContainer}</div>
            <div className="flex-1 text-center" data-tauri-drag-region>{centerContainer}</div>
            <div className="flex-1 flex flex-row-reverse items-center justify-start text-right" data-tauri-drag-region>
                <div className="flex items-center justify-end">
                    <ButtonNavbar onClick={handleMinimize} window>
                        <Minus className="w-5 h-5" />
                    </ButtonNavbar>
                    <ButtonNavbar onClick={handletoggleMaximize} className={"!p-2.5"} window>
                        <Square className="w-4 h-4" />
                    </ButtonNavbar>
                    <ButtonNavbar onClick={handleClose} window>
                        <X className="w-5 h-5" />
                    </ButtonNavbar>
                </div>
                <div data-tauri-drag-region>
                    {rightContainer}
                </div>
            </div>
        </div >
    )
}