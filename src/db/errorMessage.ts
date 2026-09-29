/**
 * Extracts a readable message from an unknown thrown value.
 * @param err The caught value.
 * @returns The error message.
 * @category Database
 */
export function getErrorMessage(err: unknown): string {
    return err instanceof Error ? err.message : String(err)
}
