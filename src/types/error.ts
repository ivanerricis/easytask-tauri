export type Error = {
    code: string
    message: string
}

type DBErrorMap = {
    UNIQUE?: string
    CHECK?: string
    NOT_NULL?: string
}

export function createError(code: string, message: string): Error {
    return { code, message }
}

export function handleDBError(error: any, codePrefix: string, messages: DBErrorMap = {}) {
    const message = String(error)
    if (message.includes("UNIQUE")) {
        throw createError(`${codePrefix}_EXISTS`, messages.UNIQUE ?? "A record with this value already exists.")
    } else if (message.includes("CHECK")) {
        throw createError(`${codePrefix}_CHECK_FAILED`, messages.CHECK ?? "A check constraint failed.")
    } else if (message.includes("NOT NULL")) {
        throw createError(`${codePrefix}_REQUIRED`, messages.NOT_NULL ?? "A required field is missing.")
    } else {
        throw createError(`${codePrefix}_UNKNOWN_ERROR`, "An unknown error occurred: " + error.message)
    }
}