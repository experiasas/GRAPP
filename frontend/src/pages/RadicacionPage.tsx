import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Building2, Loader2, AlertCircle, Check as CheckIcon } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'; // Assuming Shadcn Tabs
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { radicacionAPI } from '@/lib/api'; // Keep for invitation info
import { wizardApi } from '@/api/wizardApi';
import { useCuentaWizard } from '@/hooks/useCuentaWizard';

// Components
import { Step1Form } from '@/components/wizard/Step1Form';
import { Step2Form } from '@/components/wizard/Step2Form';
import { AnexosPanel } from '@/components/wizard/AnexosPanel';
import { SummarySidebar } from '@/components/wizard/SummarySidebar';
import { Button } from '@/components/ui/button';

interface InvitacionData {
    empresa: { nombre: string };
    proveedor: { nombre: string };
}

const RadicacionPage = () => {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();

    // Init States
    const [invitacion, setInvitacion] = useState<InvitacionData | null>(null);
    const [wizardId, setWizardId] = useState<number | null>(null);
    const [initLoading, setInitLoading] = useState(true);
    const [initError, setInitError] = useState<string | null>(null);

    // Wizard Logic
    const { estado, anexos, tiposAnexo, saving, actions, canSubmit } = useCuentaWizard(wizardId);

    // UI State
    const [currentTab, setCurrentTab] = useState("general");

    // 1. Initialization
    useEffect(() => {
        const init = async () => {
            if (!token) {
                setInitError('Token no válido');
                setInitLoading(false);
                return;
            }
            try {
                // Parallel fetch: Invitation Info + Create/Get Wizard Session
                const [invData, wizardRes] = await Promise.all([
                    radicacionAPI.getInvitacion(token),
                    wizardApi.createBorrador(token)
                ]);

                setInvitacion(invData);
                // Assuming wizardRes is the object { id: ... } or the full object
                const id = wizardRes.id || wizardRes.wizard_id;
                if (!id) throw new Error("No se pudo iniciar el wizard (ID missing)");
                setWizardId(id);

            } catch (err: any) {
                console.error(err);
                setInitError(err.message || 'Error inicializando la radicación');
            } finally {
                setInitLoading(false);
            }
        };

        init();
    }, [token]);


    // Handlers
    const handleStep1Save = async (data: any) => {
        await actions.saveStep1(data);
        setCurrentTab("financiero"); // Auto advance?
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleStep2Save = async (data: any) => {
        await actions.saveStep2(data);
        setCurrentTab("anexos");
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSubmit = async () => {
        try {
            await actions.submit();
            // Success State is handled by the "RADICADA" status update which sets readOnly,
            // but maybe we want to show a success message or redirect?
            // "Si es exitoso: Mostrar confirmación ... Todo queda en modo solo lectura"
            // The hook refreshes state, so 'estado.estado' becomes 'RADICADA'.
            // I'll show a global success alert or toast.
        } catch (err: any) {
            console.error(err);
            // Error likely handled by sidebar or validation, but if global submit fails:
            alert("Error al radicar: " + (err.message || "Unknown"));
        }
    };

    // Derived View State
    const isReadOnly = estado?.estado === 'RADICADA';

    // Loading Screen
    if (initLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">Iniciando sistema de radicación...</p>
                </div>
            </div>
        );
    }

    // Error Screen
    if (initError || !invitacion || !wizardId) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center border border-red-100">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-slate-900 mb-2">Error de Acceso</h2>
                    <p className="text-slate-500 mb-6">{initError || 'No se pudo cargar la aplicación'}</p>
                    <Button onClick={() => navigate('/')}>Volver al Inicio</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
            {/* Header with Metrics/Hero style */}
            <header className="border-b bg-card">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center shrink-0">
                                    <Building2 className="w-6 h-6" />
                                </div>
                                <div>
                                    <h1 className="text-3xl font-bold tracking-tight">Radicación de Cuentas</h1>
                                </div>
                            </div>
                            <p className="text-sm text-muted-foreground ml-15">{invitacion.empresa.nombre}</p>
                        </div>
                        <div className="ml-15 sm:ml-0 sm:text-right">
                            <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-1">Proveedor</p>
                            <p className="text-base font-semibold">{invitacion.proveedor.nombre}</p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Success Banner if Radicated */}
                {isReadOnly && (
                    <Alert className="mb-8">
                        <CheckIcon className="h-4 w-4" />
                        <AlertTitle>Cuenta Radicada Exitosamente</AlertTitle>
                        <AlertDescription>
                            Su cuenta ha sido recibida y se encuentra en validación. No se permiten más cambios.
                        </AlertDescription>
                    </Alert>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                    {/* Left Column: Form & Tabs */}
                    <div className="lg:col-span-8">
                        <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">

                            {/* Visual Stepper / Tab List */}
                            <div className="mb-8">
                                <TabsList className="grid w-full grid-cols-3 h-auto p-1 bg-slate-200/50 rounded-xl">
                                    <TabsTrigger value="general" className="py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg">
                                        1. Datos Generales
                                    </TabsTrigger>
                                    <TabsTrigger value="financiero" className="py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg" disabled={!estado?.step1_ok && !isReadOnly}>
                                        2. Detalle Financiero
                                    </TabsTrigger>
                                    <TabsTrigger value="anexos" className="py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg" disabled={(!estado?.step2_ok || !estado?.step1_ok) && !isReadOnly}>
                                        3. Anexos
                                    </TabsTrigger>
                                </TabsList>
                            </div>

                            <TabsContent value="general" className="focus-visible:outline-none">
                                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
                                    <div className="mb-6">
                                        <h2 className="text-xl font-bold text-slate-900">Información del Documento</h2>
                                        <p className="text-slate-500">Ingrese los datos básicos de la cuenta de cobro o factura.</p>
                                    </div>
                                    <Step1Form
                                        initialData={estado?.datos_generales}
                                        contratoDetalle={estado?.contrato_detalle}
                                        onSave={handleStep1Save}
                                        readOnly={isReadOnly}
                                        isSaving={saving}
                                    />
                                </div>
                            </TabsContent>

                            <TabsContent value="financiero" className="focus-visible:outline-none">
                                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
                                    <div className="mb-6">
                                        <h2 className="text-xl font-bold text-slate-900">Detalle Financiero</h2>
                                        <p className="text-slate-500">Desglose los valores monetarios. El total se calculará automáticamente.</p>
                                    </div>
                                    <Step2Form
                                        initialData={estado?.datos_financieros}
                                        onSave={handleStep2Save}
                                        readOnly={isReadOnly}
                                        isSaving={saving}
                                    />
                                </div>
                            </TabsContent>

                            <TabsContent value="anexos" className="focus-visible:outline-none">
                                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
                                    <div className="mb-6">
                                        <h2 className="text-xl font-bold text-slate-900">Soportes y Anexos</h2>
                                        <p className="text-slate-500">Adjunte los documentos requeridos para la radicación.</p>
                                    </div>
                                    <AnexosPanel
                                        anexos={anexos}
                                        tipos={tiposAnexo}
                                        onUpload={actions.uploadAnexo}
                                        onDelete={actions.deleteAnexo}
                                        readOnly={isReadOnly}
                                    />
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>

                    {/* Right Column: Sticky Sidebar */}
                    <div className="lg:col-span-4">
                        <SummarySidebar
                            estado={estado}
                            anexos={anexos}
                            tiposAnexo={tiposAnexo}
                            onSubmit={handleSubmit}
                            canSubmit={!!canSubmit}
                            isSaving={saving}
                        />
                    </div>

                </div>
            </main>
        </div>
    );
};

export default RadicacionPage;
