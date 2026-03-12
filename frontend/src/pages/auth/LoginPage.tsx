import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { API_URL } from "@/api/config";
import { useAuth } from "@/context/AuthContext";
import { AppAlert } from "@/components/ui/app-alert";

export default function LoginPage() {
    const navigate = useNavigate();
    const { login } = useAuth();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitError("");
        setIsSubmitting(true);

        try {
            const response = await fetch(`${API_URL}/api/auth/token/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: email, password }),
            });

            const data = await response.json();

            if (response.ok) {
                const userData = await login(data.access, data.refresh);
                navigate(userData?.is_staff ? "/admin-panel" : "/portal-terceros", { replace: true });
            } else {
                let errorMsg = data.detail || "Credenciales incorrectas.";
                if (errorMsg === "No active account found with the given credentials") {
                    errorMsg = "No se encontró una cuenta activa con las credenciales proporcionadas. Verifica tu correo y contraseña.";
                }
                setSubmitError(errorMsg);
            }
        } catch {
            setSubmitError(
                "Error de conexion. Por favor intente nuevamente mas tarde."
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="login-page-root">
            {/* Panel izquierdo: imagen de fondo + texto */}
            <div className="login-hero">
                <div className="login-hero-overlay" />
                <div className="login-hero-content">
                    <p className="login-hero-tagline">
                        Gestion inteligente de proveedores y cuentas de cobro.
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
                        />
                    </div>

                    <h1 className="login-title">Bienvenido</h1>
                    <p className="login-subtitle">
                        Ingresa tus credenciales para acceder al portal.
                    </p>

                    <form onSubmit={handleSubmit} className="login-form" noValidate>
                        {submitError && (
                            <AppAlert
                                type="error"
                                title="Error de autenticacion"
                                description={submitError}
                            />
                        )}

                        {/* Campo correo */}
                        <div className="login-field">
                            <label htmlFor="email" className="login-label">
                                Correo electronico
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

                        {/* Campo contrasena */}
                        <div className="login-field">
                            <label htmlFor="password" className="login-label">
                                Contrasena
                            </label>
                            <div className="login-input-wrapper">
                                <input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    className="login-input"
                                    placeholder="Ingresa tu contrasena"
                                    value={password}
                                    required
                                    autoComplete="current-password"
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <button
                                    type="button"
                                    className="login-eye-btn"
                                    onClick={() => setShowPassword(!showPassword)}
                                    tabIndex={-1}
                                    aria-label={
                                        showPassword
                                            ? "Ocultar contrasena"
                                            : "Mostrar contrasena"
                                    }
                                >
                                    {showPassword ? (
                                        <EyeOff size={18} />
                                    ) : (
                                        <Eye size={18} />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Olvidaste contrasena */}
                        <div className="login-forgot-row">
                            <button
                                type="button"
                                className="login-forgot-link"
                                onClick={() => navigate('/recuperar-password')}
                            >
                                Olvide mi contrasena
                            </button>
                        </div>

                        {/* Boton */}
                        <button
                            type="submit"
                            className="login-submit-btn"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2
                                        size={16}
                                        className="login-spinner"
                                    />
                                    Iniciando sesion...
                                </>
                            ) : (
                                "Ingresar"
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
