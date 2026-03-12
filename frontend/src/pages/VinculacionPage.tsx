import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';
import { VinculacionTercerosForm } from '@/components/forms/VinculacionTercerosForm';
import { vinculacionAPI } from '@/lib/api';
import { DocumentoRequerido } from '@/components/forms/DocumentosRequeridos';
import { Navbar } from '@/components/Navbar';

interface InvitacionData {
    email: string;
    empresa: {
        id: number;
        nombre: string;
    };
    tipo_tercero: {
        code: string;
        nombre: string;
    };
    documentos_requeridos?: DocumentoRequerido[];
}

const VinculacionPage = () => {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [invitacionData, setInvitacionData] = useState<InvitacionData | null>(null);
    const [uploadProgress, setUploadProgress] = useState<Record<string, 'uploading' | 'success' | 'error'>>({});
    const [isUploading, setIsUploading] = useState(false);

    // Cargar datos de la invitación al montar
    useEffect(() => {
        const loadInvitacion = async () => {
            if (!token) {
                setError('Token no válido');
                setLoading(false);
                return;
            }

            try {
                const data = await vinculacionAPI.getInvitacion(token);
                setInvitacionData(data);
            } catch (err: any) {
                setError(err.message || 'Error al cargar la invitación');
            } finally {
                setLoading(false);
            }
        };

        loadInvitacion();
    }, [token]);

    const handleSubmit = async (formData: any, documentFiles: Record<string, File>) => {
        if (!token) return;

        try {
            // Step 1: Create tercero and get ID
            const response = await vinculacionAPI.submitTercero(token, formData);
            const terceroId = response.tercero_id;

            // Step 2: Upload documents in parallel if there are any
            if (Object.keys(documentFiles).length > 0) {
                setIsUploading(true);

                await vinculacionAPI.uploadDocumentosParallel(
                    terceroId,
                    documentFiles,
                    3, // Concurrency limit: 3 files at a time
                    (code, status) => {
                        setUploadProgress(prev => ({ ...prev, [code]: status }));
                    }
                );
            }

            // Redirigir a success con datos
            const nombre = formData.tipo_persona === 'JURIDICA'
                ? formData.razon_social
                : `${formData.nombre1} ${formData.apellido1}`;

            navigate('/success/vinculacion', {
                state: {
                    terceroData: {
                        nombre,
                        documento: `${formData.tipo_doc} ${formData.documento}`,
                        email: formData.email,
                    }
                }
            });
        } catch (err: any) {
            // Los errores de validación se manejan en el formulario
            console.error('Error al enviar:', err);
            setError('Error al procesar la solicitud. Por favor intente nuevamente.');
        } finally {
            setIsUploading(false);
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
            <Navbar subtitle="Vinculación de Terceros" />

            <main className="container mx-auto px-4 py-8 max-w-3xl">
                <div className="mb-8">
                    <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                        Vinculación de Terceros
                    </h1>
                    <p className="text-muted-foreground">
                        Complete el formulario para registrarse como {invitacionData.tipo_tercero.nombre.toLowerCase()} en {invitacionData.empresa.nombre}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                        Invitación para: <strong>{invitacionData.email}</strong>
                    </p>
                </div>

                {/* Upload Progress Indicator */}
                {isUploading && (
                    <div className="mb-6 p-4 bg-primary/10 border border-primary rounded-lg">
                        <div className="flex items-center gap-3">
                            <Loader2 className="w-5 h-5 animate-spin text-primary" />
                            <div>
                                <p className="font-medium text-foreground">Subiendo documentos...</p>
                                <p className="text-sm text-muted-foreground">
                                    {Object.values(uploadProgress).filter(s => s === 'success').length} de{' '}
                                    {Object.keys(uploadProgress).length} archivos completados
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                <VinculacionTercerosForm
                    documentosRequeridos={invitacionData.documentos_requeridos || []}
                    onSuccess={handleSubmit}
                />
            </main>
        </div>
    );
};

export default VinculacionPage;
