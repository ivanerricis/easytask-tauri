type SideBarContainerProps = {
    header?: React.ReactNode
    children?: React.ReactNode
    footer?: React.ReactNode
    className?: string
}

export const SideBarContainer = ({ header, children, footer, className }: SideBarContainerProps) => (
    <div className={`w-full bg-secondary flex flex-col h-full ${className}`}>
        {header && <div className="flex-shrink-0">{header}</div>}
        <div className="flex-1 min-h-0 overflow-y-auto">
            {children}
        </div>
        {footer && <div className="flex-shrink-0">{footer}</div>}
    </div>
)