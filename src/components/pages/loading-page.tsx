import { Loader2 } from "lucide-react"

type LoadingPageProps = {
    text: string
}

export const LoadingPage = ({text}: LoadingPageProps) => {
    return (
        <div role="status" aria-live="polite" className="flex flex-col w-full h-full items-center justify-center gap-2">
            <p className="text-lg font-semibold">
                {text}
            </p>
            <Loader2 className="animate-spin" aria-hidden="true" />
        </div>
    )
}