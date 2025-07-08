import { Input } from "@/components/ui/input";
import { LoginPageLayout } from "./LoginPageLayout";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const LoginPage = () => {

    const navigate = useNavigate()

    const handleLogin = () => {
        navigate('/mainpage/')
    }

    return (
        <LoginPageLayout>
            <div className="flex flex-col items-center justify-center h-full gap-2">
                <h1 className="text-4xl font-extrabold">
                    Bentornato!
                </h1>
                <h1 className="text-lg font-bold">
                    Inserisci la password per continuare
                </h1>
                <Input />
                <Button
                    onClick={handleLogin}
                >
                    Entra
                    <ArrowRight className="!h-5 !w-5" />
                </Button>
            </div>
        </LoginPageLayout>
    );
}

export default LoginPage; 