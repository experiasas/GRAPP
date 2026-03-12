import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { API_URL } from "@/api/config";
import { AppAlert } from "@/components/ui/app-alert";

export default function RecuperarPasswordPage() {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState("");
    const [isSuccess, setIsSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitError("");
        setIsSubmitting(true);

        try {
            const response = await fetch(`${API_URL}/api/auth/reset-password/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            if (response.ok) {
                setIsSuccess(true);
            } else {
                const data = await response.json().catch(() => ({}));
                setSubmitError(data.message || data.detail || "Error al procesar la solicitud. Intente nuevamente.");
            }
        } catch {
            setSubmitError(
                "Error de conexión. Por favor intente nuevamente más tarde."
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="login-page-root">
            <div className="login-hero">
                <div className="login-hero-overlay" />
                <div className="login-hero-content">
                    <p className="login-hero-tagline">
                        Gestión inteligente de proveedores y cuentas de cobro.
                    </p>
                </div>
            </div>

            <div className="login-form-panel">
                <div className="login-form-container">
                    <button
                        onClick={() => navigate('/login')}
                        className="flex items-center text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors mb-6"
                    >
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        Volver a Inicio de Sesión
                    </button>

                    <div className="login-logo-wrapper">
                        <img
                            src="/explogo.png"
                            alt="Experias"
                            className="login-logo"
                        />
                    </div>

                    {!isSuccess ? (
                        <>
                            <h1 className="login-title">Recuperar Contraseña</h1>
                            <p className="login-subtitle">
                                Ingresa tu correo electrónico asociado a la cuenta y te enviaremos instrucciones para restablecer tu contraseña.
                            </p>

                            <form onSubmit={handleSubmit} className="login-form" noValidate>
                                {submitError && (
                                    <AppAlert
                                        type="error"
                                        title="Error"
                                        description={submitError}
                                    />
                                )}

                                <div className="login-field">
                                    <label htmlFor="email" className="login-label">
                                        Correo electrónico
                                    </label>
                                    <input
                                        id="email"
                                        type="email"
                                        className="login-input"
                                        placeholder="tu@correo.com"
                                        value={email}
                                        required
                                        autoComplete="email"
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="login-submit-btn"
                                    disabled={isSubmitting || !email}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2
                                                size={16}
                                                className="login-spinner"
                                            />
                                            Enviando...
                                        </>
                                    ) : (
                                        "Enviar Instrucciones"
                                    )}
                                </button>
                            </form>
                        </>
                    ) : (
                        <div className="text-center">
                            <div className="flex justify-center mb-4">
                                <CheckCircle2 className="h-16 w-16 text-green-500" />
                            </div>
                            <h1 className="login-title text-2xl text-slate-800">¡Correo Enviado!</h1>
                            <p className="login-subtitle mt-2 text-slate-600">
                                Hemos enviado un enlace de recuperación a <strong>{email}</strong>. Por favor, revisa tu bandeja de entrada o la carpeta de spam.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
