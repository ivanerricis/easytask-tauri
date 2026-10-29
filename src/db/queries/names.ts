/**
 * Options of {@link uniqueName}.
 * @category Database Queries
 */
export type UniqueNameOptions = {
    /** Compare the names ignoring the case (the stored names are matched like that by the UNIQUE indexes). */
    caseInsensitive?: boolean
    /** When false the plain name is never returned, even if free (copies always get a suffix). Default true. */
    allowOriginal?: boolean
}

/**
 * The first name not in `taken`: `name` itself (unless `allowOriginal` is false), then `format(name, 1)`, `format(name, 2)`...
 * The suffix shape (and the language of its word) is up to the formatter.
 * @param name The wanted name.
 * @param taken The names already used among the siblings.
 * @param format Builds the candidate for the n-th attempt (n starts at 1).
 * @category Database Queries
 */
export function uniqueName(name: string, taken: Iterable<string>, format: (name: string, attempt: number) => string, options: UniqueNameOptions = {}): string {
    const { caseInsensitive = false, allowOriginal = true } = options
    const key = (value: string) => caseInsensitive ? value.toLowerCase() : value
    const used = new Set<string>()
    for (const item of taken) used.add(key(item))
    if (allowOriginal && !used.has(key(name))) return name
    for (let attempt = 1; ; attempt++) {
        const candidate = format(name, attempt)
        if (!used.has(key(candidate))) return candidate
    }
}
