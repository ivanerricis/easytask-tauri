export type AppError = {
    code: string
    message: string
}

export function createAppError(code: string, message: string): AppError {
    return { code, message }
}