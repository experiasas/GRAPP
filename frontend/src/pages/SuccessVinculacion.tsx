import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Timeline, TimelineStep } from '@/components/ui/Timeline';
import { Button } from '@/components/ui/button';
import { Home, FileText, ArrowRight } from 'lucide-react';

interface LocationState {
    terceroData?: {
        nombre: string;
        documento: string;
        email: string;
        tipo_persona?: 'NATURAL' | 'JURIDICA';
    };
}

const SuccessVinculacion = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { terceroData } = (location.state as LocationState) || {};

    // Si no hay datos, redirigir al home
    useEffect(() => {
        if (!terceroData) {
            navigate('/');
        }
    }, [terceroData, navigate]);

    // Mostrar null mientras se redirige
    if (!terceroData) {
        return null;
    }

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        }).toUpperCase();
    };

    const today = new Date();
    const estimatedApproval = new Date(today);
    estimatedApproval.setDate(today.getDate() + 5);
    const estimatedActivation = new Date(today);
    estimatedActivation.setDate(today.getDate() + 7);

    const timelineSteps: TimelineStep[] = [
        {
            title: 'Solicitud Enviada',
            description: [
                `Nombre: ${terceroData.nombre}`,
                `Documento: ${terceroData.documento}`,
                `Email: ${terceroData.email}`,
                `Tipo: ${terceroData.tipo_persona === 'NATURAL' ? 'Persona Natural' : 'Persona Jurídica'}`,
            ],
            date: formatDate(today),
            status: 'completed',
        },
        {
            title: 'En Revisión',
            description: [
                'Su solicitud está siendo revisada por nuestro personal de administración',
                'Verificación de documentos e información',
                'Validación de requisitos',
            ],
            date: 'ACTUAL',
            status: 'active',
        },
        {
            title: 'Aprobación',
            description: [
                'Decisión final sobre la vinculación',
                'Notificación vía email',
                'Asignación de permisos',
            ],
            date: `EST. ${formatDate(estimatedApproval)}`,
            status: 'pending',
        },
        {
            title: 'Vinculación Activa',
            description: [
                'Tercero activado en el sistema',
                'Acceso completo a servicios',
                'Inicio de operaciones',
            ],
            date: `EST. ${formatDate(estimatedActivation)}`,
            status: 'pending',
        },
    ];

    return (
        <div className="min-h-screen bg-background">
            <Navbar />

            <div className="container mx-auto px-6 py-12">
                {/* Logo y título */}
                <div className="text-center mb-12">
                    <img
                        src="/explogo.png"
                        alt="Experias Logo"
                        className="h-20 mx-auto mb-6"
                    />
                    <h1 className="text-4xl font-bold text-foreground mb-4">
                        Vinculación Exitosa
                    </h1>
                    {/* Línea divisoria decorativa */}
                    <div className="flex justify-center mb-5">
                        <div className="w-64 h-1 bg-gradient-to-r from-blue-500 via-blue-600 to-blue-500 rounded-full" />
                    </div>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                        Su solicitud ha sido registrada correctamente y está siendo procesada
                    </p>
                </div>

                {/* Mensaje informativo destacado */}
                <div className="max-w-5xl mx-auto mb-12">
                    <div className="bg-indigo-50 border-l-4 border-blue-500 rounded-lg p-6 shadow-sm">
                        <div className="flex items-start gap-4">
                            <FileText className="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" />
                            <div>
                                <h3 className="font-bold text-lg text-blue-900 mb-2">
                                    Estado Actual: En Revisión
                                </h3>
                                <p className="text-blue-800 leading-relaxed">
                                    Nuestro equipo de administración está revisando su solicitud de
                                    vinculación. Recibirá una notificación por correo electrónico una vez
                                    el proceso haya sido completado. Este proceso generalmente toma entre
                                    3 a 5 días hábiles.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Línea de tiempo */}
                <div className="max-w-5xl mx-auto mb-12">
                    <Timeline steps={timelineSteps} />
                </div>

                {/* Acciones */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                    <Button
                        variant="outline"
                        onClick={() => navigate('/')}
                        className="h-12 px-8 min-w-[200px]"
                    >
                        <Home className="w-5 h-5 mr-2" />
                        Volver al inicio
                    </Button>
                    <Button
                        onClick={() => window.location.reload()}
                        className="h-12 px-8 min-w-[200px]"
                    >
                        Vincular otro tercero
                        <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default SuccessVinculacion;
