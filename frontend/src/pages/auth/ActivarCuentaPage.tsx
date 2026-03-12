import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppAlert } from "@/components/ui/app-alert";
import { Eye, EyeOff, Loader2, CheckCircle2, XCircle, AlignJustify } from "lucide-react";
import { API_URL } from "@/api/config";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ActivarCuentaPage() {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();

    const [isLoading, setIsLoading] = useState(true);
    const [isValidToken, setIsValidToken] = useState(false);
    const [email, setEmail] = useState("");
    const [errorValidacion, setErrorValidacion] = useState("");

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState("");
    const [isSuccess, setIsSuccess] = useState(false);

    useEffect(() => {
        const validarToken = async () => {
            try {
                const response = await fetch(`${API_URL}/api/auth/activar/${token}/`);
                const data = await response.json();

                if (response.ok && data.valido) {
                    setIsValidToken(true);
                    setEmail(data.email);
                } else {
                    setIsValidToken(false);
                    setErrorValidacion(data.message || "El enlace de activación no es válido o ha expirado.");
                }
            } catch (error) {
                setIsValidToken(false);
                setErrorValidacion("Hubo un error de conexión al tratar de verificar tu enlace.");
            } finally {
                setIsLoading(false);
            }
        };

        if (token) {
            validarToken();
        } else {
            setIsLoading(false);
            setIsValidToken(false);
            setErrorValidacion("No se proporcionó un token de activación válido.");
        }
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitError("");

        if (password.length < 6) {
            setSubmitError("La contraseña debe tener al menos 6 caracteres.");
            return;
        }
        if (password !== confirmPassword) {
            setSubmitError("Las contraseñas no coinciden.");
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetch(`${API_URL}/api/auth/activar/${token}/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ password })
            });

            const data = await response.json();

            if (response.ok) {
                setIsSuccess(true);
            } else {
                setSubmitError(data.message || "Ocurrió un error al intentar activar la cuenta.");
            }
        } catch (error) {
            setSubmitError("Error de conexión. Por favor intente nuevamente más tarde.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="login-page-root">
                <div className="login-hero" style={{ backgroundImage: "url('/referencia.jpg')" }}>
                    <div className="login-hero-overlay" style={{ backgroundColor: "rgba(0,0,0,0.3)" }} />
                </div>
                <div className="login-form-panel">
                    <div className="login-form-container" style={{ textAlign: "center" }}>
                        <div className="flex justify-center items-center gap-4">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                            <p className="text-slate-600 font-medium">Verificando enlace de activación...</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (isSuccess) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <Card className="w-full max-w-md shadow-lg border-t-4 border-t-green-500 rounded-xl">
                    <CardHeader className="text-center pb-2 pt-8">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border-[3px] border-green-500">
                            <CheckCircle2 className="h-10 w-10 text-green-500" />
                        </div>
                        <CardTitle className="text-2xl font-bold text-slate-800">¡Cuenta Activada!</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center text-slate-600 px-8 pb-6">
                    <p className="text-justify">
                            Tu cuenta ha sido activada exitosamente. A partir de ahora podrás acceder a GRAPP utilizando el correo electrónico y la contraseña anterior.
                        </p>
                    </CardContent>
                    <CardFooter className="px-8 pb-8">
                        <Button
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-md py-6 rounded-lg font-medium"
                            onClick={() => navigate('/login')}
                        >
                            Ir a Iniciar Sesión
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    if (!isValidToken) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <Card className="w-full max-w-md shadow-lg border-t-4 border-t-red-500 rounded-xl">
                    <CardHeader className="text-center pb-2 pt-8">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border-[3px] border-red-500">
                            <XCircle className="h-10 w-10 text-red-500" />
                        </div>
                        <CardTitle className="text-xl font-bold text-slate-800">Enlace Inválido</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center text-slate-600 space-y-4 px-8 pb-6">
                        <p>
                            {errorValidacion}
                        </p>
                        <p className="text-sm text-slate-500">
                            Si crees que esto es un error, por favor contacta al administrador de GRAPP empresarial.
                        </p>
                    </CardContent>
                    <CardFooter className="px-8 pb-8">
                        <Button
                            variant="outline"
                            className="w-full text-md py-6 rounded-lg font-medium text-slate-700 border-slate-300 hover:bg-slate-100/50"
                            onClick={() => navigate('/login')}
                        >
                            Volver al Inicio
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    return (
        <div className="login-page-root">
            {/* Panel izquierdo: imagen de fondo + texto adaptado */}
            <div className="login-hero" style={{ backgroundImage: "url('/referencia.jpg')" }}>
                <div className="login-hero-overlay" style={{ backgroundColor: "rgba(0,0,0,0.3)" }} />
                <div className="login-hero-content">
                    <p className="login-hero-tagline">
                        Gestión inteligente de proveedores y cuentas de cobro.
                    </p>
                </div>
            </div>

            {/* Panel derecho: formulario */}
            <div className="login-form-panel">
                <div className="login-form-container">
                    {/* Logo */}
                    <div className="login-logo-wrapper">
                        <img
                            src="/explogo.png"
                            alt="Experias"
                            className="login-logo"
                            onError={(e) => { e.currentTarget.style.display = 'none' }}
                        />
                    </div>

                    <h1 className="login-title">Activación de Cuenta</h1>
                    <p className="login-subtitle">
                        Crea una contraseña segura para tu cuenta. Tu correo de acceso será <strong>{email}</strong>.
                    </p>

                    <form onSubmit={handleSubmit} className="login-form" noValidate>
                        {submitError && (
                            <AppAlert type="error" title="Error" description={submitError} />
                        )}

                        {/* Campo Nueva Contraseña */}
                        <div className="login-field" style={{ marginTop: '1.5rem' }}>
                            <label htmlFor="password" className="login-label">
                                Nueva Contraseña
                            </label>
                            <div className="login-input-wrapper">
                                <input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    className="login-input"
                                    placeholder="Mínimo 6 caracteres"
                                    value={password}
                                    required
                                    autoComplete="new-password"
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <button
                                    type="button"
                                    className="login-eye-btn"
                                    onClick={() => setShowPassword(!showPassword)}
                                    tabIndex={-1}
                                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {/* Campo Confirmar Contraseña */}
                        <div className="login-field">
                            <label htmlFor="confirmPassword" className="login-label">
                                Confirmar Contraseña
                            </label>
                            <div className="login-input-wrapper">
                                <input
                                    id="confirmPassword"
                                    type={showPassword ? "text" : "password"}
                                    className="login-input"
                                    placeholder="Repite la contraseña"
                                    value={confirmPassword}
                                    required
                                    autoComplete="new-password"
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Botón de envío */}
                        <button
                            type="submit"
                            className="login-submit-btn"
                            disabled={isSubmitting || !password || !confirmPassword}
                            style={{ marginTop: '1.5rem' }}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 size={16} className="login-spinner" style={{ marginRight: '8px', display: 'inline-block' }} />
                                    Activando cuenta...
                                </>
                            ) : (
                                "Activar Mi Cuenta"
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
