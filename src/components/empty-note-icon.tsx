/** A sheet with a folded corner and dashed placeholder lines: a note with nothing in it yet. Same weight as BoxIcon. */
export const EmptyNoteIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
        xmlns="http://www.w3.org/2000/svg" {...props}>
        <title>empty-note</title>
        <path d="M7 3.75h12.5l6.25 6.25v17.25a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.75a1 1 0 0 1 1-1z" />
        <path d="M19.5 3.75V9a1 1 0 0 0 1 1h5.25" />
        <path d="M10.5 15h11M10.5 19.5h11M10.5 24h6" strokeDasharray="2 2.5" />
    </svg>
)
