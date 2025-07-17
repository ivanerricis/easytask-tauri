export type Error = {
    code: string
    message: string
}

export function createError(code: string, message: string): Error {
    return { code, message }
}