import { useContext, type Context } from "react"

/**
 * Builds the hook that reads a context that must have a provider above: it throws
 * `<hookName> must be used within a(n) <providerName>` when there is none.
 * @param context The context (its default value is null outside the provider).
 * @param hookName The name of the hook, for the message.
 * @param providerName The name of the provider component, for the message ("a" or "an" is picked from its first letter).
 */
export function createRequiredContextHook<T, C extends T | null | undefined>(context: Context<C>, hookName: string, providerName: string): () => NonNullable<C> {
    const article = /^[AEIOU]/.test(providerName) ? "an" : "a"
    return function useRequiredContext() {
        const value = useContext(context)
        if (!value) throw new Error(`${hookName} must be used within ${article} ${providerName}`)
        return value as NonNullable<C>
    }
}
