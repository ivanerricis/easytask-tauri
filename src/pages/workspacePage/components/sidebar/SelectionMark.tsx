/** Visual state of a selected row: a tint over the row (so it works with any item color and size) next to its border. */
export const SelectionMark = ({ selected }: { selected: boolean }) =>
    selected ? <span aria-hidden="true" data-testid="selection-mark" className="pointer-events-none absolute inset-0 bg-primary/25" /> : null
