import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Building2, Loader2, AlertCircle } from 'lucide-react';
import { RadicacionCuentaForm } from '@/components/forms/RadicacionCuentaForm';
import { radicacionAPI } from '@/lib/api';

interface InvitacionData {
    email: string;
    empresa: {
        id: number;
        nombre: string;
    };
    proveedor: {
        id: number;
        nombre: string;
    };
}

const RadicacionPage = () => {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [invitacionData, setInvitacionData] = useState<InvitacionData | null>(null);

    // Cargar datos de la invitación al montar
    useEffect(() => {
        const loadInvitacion = async () => {
            if (!token) {
                setError('Token no válido');
                setLoading(false);
                return;
            }

            try {
                const data = await radicacionAPI.getInvitacion(token);
                setInvitacionData(data);
            } catch (err: any) {
                setError(err.message || 'Error al cargar la invitación');
            } finally {
                setLoading(false);
            }
        };

        loadInvitacion();
    }, [token]);

    const handleSubmit = async (formData: any) => {
        if (!token) return;

        try {
            // Convertir a FormData para enviar el archivo
            const formDataToSend = new FormData();
            formDataToSend.append('numero', formData.numero);
            formDataToSend.append('periodo', formData.periodo);
            formDataToSend.append('concepto', formData.concepto);

            // Limpiar el valor: remover símbolos de moneda y formateo
            const valorLimpio = formData.valor.replace(/[^0-9]/g, '');
            formDataToSend.append('valor', valorLimpio);

            if (formData.soporte) {
                formDataToSend.append('soporte', formData.soporte);
            }

            await radicacionAPI.submitCuenta(token, formDataToSend);

            // Redirigir a success con datos
            navigate('/success/radicacion', {
                state: {
                    cuentaData: {
                        numero: formData.numero,
                        periodo: formData.periodo,
                        valor: formData.valor, // Mantener el formato para mostrar
                        proveedor: invitacionData?.proveedor.nombre || '',
                    }
                }
            });
        } catch (err: any) {
            // Los errores de validación se manejan en el formulario
            console.error('Error al enviar:', err);
        }
    };

    // Pantalla de carga
    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">Cargando invitación...</p>
                </div>
            </div>
        );
    }

    // Pantalla de error
    if (error || !invitacionData) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="max-w-md w-full mx-4">
                    <div className="bg-card border border-border rounded-xl p-8 text-center">
                        <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-foreground mb-2">
                            {error === 'Enlace inválido o expirado' ? 'Enlace Inválido' : 'Error'}
                        </h2>
                        <p className="text-muted-foreground mb-6">
                            {error || 'No se pudo cargar la invitación'}
                        </p>
                        <button
                            onClick={() => navigate('/')}
                            className="bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:opacity-90"
                        >
                            Volver al inicio
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Formulario
    return (
        <div className="min-h-screen bg-background">
            <header className="border-b border-border bg-card sticky top-0 z-10">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => navigate('/')}
                            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                        >
                            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                                <Building2 className="w-5 h-5 text-primary-foreground" />
                            </div>
                            <span className="text-xl font-semibold text-foreground">GRAPP</span>
                        </button>
                        <span className="text-sm text-muted-foreground">
                            Radicación de Cuenta
                        </span>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8 max-w-3xl">
                <div className="mb-8">
                    <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                        Radicación de Cuenta de Cobro
                    </h1>
                    <p className="text-muted-foreground">
                        Ingrese la información de su cuenta de cobro para radicarla en {invitacionData.empresa.nombre}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                        Proveedor: <strong>{invitacionData.proveedor.nombre}</strong>
                    </p>
                </div>

                <RadicacionCuentaForm
                    onSuccess={handleSubmit}
                    proveedorNombre={invitacionData.proveedor.nombre}
                />
            </main>
        </div>
    );
};

export default RadicacionPage;
