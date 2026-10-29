/**
 * True while a dialog (settings, form...) or an alert dialog (confirmation) is open. Used to keep keyboard shortcuts and
 * pop-ups from taking the focus away from it.
 */
export const isDialogOpen = (): boolean => document.querySelector("[role='dialog'], [role='alertdialog']") !== null
