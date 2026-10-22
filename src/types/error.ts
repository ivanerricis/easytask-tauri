import i18n from "@/i18n"

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

/**
 * Tells whether a caught value is an error built with createError (a plain object with code and message).
 * Driver errors (Error instances of any realm, or strings) never match, so they can be wrapped by the caller.
 */
export function isAppError(error: unknown): error is Error {
    return typeof error === "object" && error !== null && Object.getPrototypeOf(error) === Object.prototype && "code" in error && "message" in error
}

/**
 * The error to throw from a catch block: an app error (built with createError) is kept as it is, anything else
 * (driver errors, strings) is turned into one by `wrap`.
 * ```ts
 * } catch (error: unknown) {
 *     throw toAppError(error, e => createError("X_FAILED", i18n.t("errors.x", { message: getErrorMessage(e) })))
 * }
 * ```
 */
export function toAppError(error: unknown, wrap: (error: unknown) => Error): Error {
    return isAppError(error) ? error : wrap(error)
}

export function handleDBError(error: unknown, codePrefix: string, messages: DBErrorMap = {}): never {
    const message = String(error)
    if (message.includes("UNIQUE")) {
        throw createError(`${codePrefix}_EXISTS`, messages.UNIQUE ?? i18n.t("errors.default.unique"))
    } else if (message.includes("CHECK")) {
        throw createError(`${codePrefix}_CHECK_FAILED`, messages.CHECK ?? i18n.t("errors.default.check"))
    } else if (message.includes("NOT NULL")) {
        throw createError(`${codePrefix}_REQUIRED`, messages.NOT_NULL ?? i18n.t("errors.default.required"))
    } else {
        throw createError(`${codePrefix}_UNKNOWN_ERROR`, i18n.t("errors.default.unknown", { message: error instanceof Error ? error.message : String(error) }))
    }

}