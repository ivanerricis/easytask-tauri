import { Input } from "@/components/ui/input"
import { PasswordPageLayout } from "./PasswordPageLayout"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { Label } from "@/components/ui/label"
import { useState } from "react"

export const PasswordPage = () => {

    const [passwordText, setPasswordText] = useState<string>("")
    const [repeatPasswordText, setRepeatPasswordText] = useState<string>("")
    const [isTouched, setTouched] = useState(false)

    const navigate = useNavigate()

    const GotoWorkspacesPage = () => {
        navigate('/mainpage/')
    }

    const GotoLoginPage = () => {
        if (passwordText === '' || repeatPasswordText === '' && passwordText != repeatPasswordText)
            console.log('Completare tutti i campi')
        else
            navigate('/login/')
    }

    return (
        <PasswordPageLayout>
            <div className="flex flex-col items-center justify-center h-full">
                <div className="bg-muted rounded-xl shadow-lg p-8 flex flex-col items-center gap-6 w-full max-w-md">
                    <h1 className="font-bold text-2xl sm:text-3xl text-center">Benvenuto in EasyTask!</h1>
                    <div className="flex flex-col items-center gap-2 w-full">
                        <h2 className="text-base sm:text-lg text-center">Crea una password per proteggere i tuoi Workspace</h2>
                        <Label className="text-sm font-medium w-full">Password</Label>
                        <Input
                            type="password"
                            placeholder="Password"
                            value={passwordText}
                            onChange={e => setPasswordText(e.target.value)}
                            onBlur={() => setTouched(true)}
                        />
                        <Label className="text-sm font-medium w-full">Ripeti password</Label>
                        <Input
                            type="password"
                            placeholder="Ripeti password"
                            value={repeatPasswordText}
                            onChange={e => setRepeatPasswordText(e.target.value)}
                            onBlur={() => setTouched(true)}
                        />

                        {isTouched && (passwordText === '' || repeatPasswordText === '') && (
                            <h1 className="text-destructive text-sm w-full">Devi completare tutti i campi</h1>
                        )}
                        {isTouched && passwordText !== '' && repeatPasswordText !== '' && passwordText !== repeatPasswordText && (
                            <h1 className="text-destructive text-sm w-full">Le password non corrispondono</h1>
                        )}
                        <Button
                            onClick={GotoLoginPage}
                            className="w-full mt-2 text-lg">Crea password</Button>
                    </div>
                    <div className="w-full border-t my-2" />
                    <div className="flex flex-col items-center gap-2 w-full">
                        <h2 className="text-lg text-center">Oppure inizia a creare i tuoi Workspace</h2>
                        <Button
                            onClick={GotoWorkspacesPage}
                            className="w-full flex items-center justify-center gap-2 text-lg rounded-lg font-bold">
                            Crea i tuoi Workspace
                            <ArrowRight className="!w-6 !h-6" />
                        </Button>
                    </div>
                </div>
            </div>
        </PasswordPageLayout>
    )
}