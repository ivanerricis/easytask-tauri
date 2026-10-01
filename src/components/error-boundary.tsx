import { Component, type ErrorInfo, type ReactNode } from "react"
import { CrashScreen } from "@/components/pages/error-page"
import { reportError } from "@/lib/report-error"

type ErrorBoundaryProps = {
    children: ReactNode
}

type ErrorBoundaryState = {
    error: Error | null
}

/**
 * Catches render errors of its subtree, reports them to the console (no toast: the error screen is the feedback)
 * and shows a recovery screen with "Reload" and "Copy details".
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    state: ErrorBoundaryState = { error: null }

    static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
        return { error: error instanceof Error ? error : new Error(String(error)) }
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        reportError(error)
        if (info.componentStack) console.error("Component stack:", info.componentStack)
    }

    render() {
        return this.state.error ? <CrashScreen error={this.state.error} /> : this.props.children
    }
}
