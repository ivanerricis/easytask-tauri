import React from "react"

type NavBarProps = {
    leftContainer?: React.ReactNode
    centerContainer?: React.ReactNode
    rightContainer?: React.ReactNode
}

export const Navbar = ({ leftContainer, centerContainer, rightContainer }: NavBarProps) => {
    return (
        <div className="z-50 top-0 flex items-center justify-between w-full py-1 px-2 border-b border-border shadow-sm app-drag bg-background">
            <div className="flex-1 text-left">{leftContainer}</div>
            <div className="flex-1 text-center">{centerContainer}</div>
            <div className="flex-1 text-right">{<div className="pr-22">{rightContainer}</div>}</div>
        </div >
    )
}