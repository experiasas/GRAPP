import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle, User, FileText, Briefcase, Check, Paperclip } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { vinculacionAPI, terceroAPI } from '@/lib/api';
import { DocumentoRequerido } from '@/components/forms/DocumentosRequeridos';
import { Navbar } from '@/components/Navbar';

// Tab Components
import DatosBasicosTab from '@/components/wizard/DatosBasicosTab';
import DocumentosTab from '@/components/wizard/DocumentosTab';
import PerfilTab from '@/components/wizard/PerfilTab';
import SoportesTab from '@/components/wizard/SoportesTab';

// Tipo de datos de la invitación
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

// Tipo para status de completitud
interface TerceroStatus {
    tercero_id: number;
    estado: string;
    requiere_perfil: boolean;
    documentos: {
        completo: boolean;
        items: any[];
    };
    perfil: {
        completo: boolean;
        secciones: any;
    };
    puede_enviar_aprobacion: boolean;
}

const VinculacionWizardPage = () => {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [invitacionData, setInvitacionData] = useState<InvitacionData | null>(null);
    const [terceroId, setTerceroId] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState('datos-basicos');
    const [status, setStatus] = useState<TerceroStatus | null>(null);
    const [statusLoading, setStatusLoading] = useState(false);

    // Estado para tipo de persona con localStorage
    const [tipoPersona, setTipoPersona] = useState<"NATURAL" | "JURIDICA">("NATURAL");

    // Estado para documentos requeridos (cargados desde backend)
    const [documentosRequeridos, setDocumentosRequeridos] = useState<DocumentoRequerido[]>([]);
    const [loadingDocuments, setLoadingDocuments] = useState(false);

    // Estado para persistir datos del formulario entre tabs
    const [savedFormData, setSavedFormData] = useState<any>(null);

    // Cargar datos de la invitación
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

    // Cargar tipo_persona desde localStorage al montar
    useEffect(() => {
        if (!token) return;

        const storageKey = `vinculacion:${token}:tipo_persona`;
        const saved = localStorage.getItem(storageKey);

        if (saved === "NATURAL" || saved === "JURIDICA") {
            setTipoPersona(saved);
        }
    }, [token]);

    // Forzar NATURAL para tipos de tercero específicos (regla de negocio)
    useEffect(() => {
        if (!invitacionData) return;

        const naturalOnlyTypes = ["CONTRATISTA", "EMPLEADO", "SOCIO", "ASPIRANTE"];
        if (naturalOnlyTypes.includes(invitacionData.tipo_tercero.code)) {
            setTipoPersona("NATURAL");

            // Guardar en localStorage
            if (token) {
                localStorage.setItem(`vinculacion:${token}:tipo_persona`, "NATURAL");
            }
        }
    }, [invitacionData, token]);

    // Guardar tipo_persona en localStorage cuando cambie
    // SOLO si el tercero no existe aún (antes de guardarlo)
    useEffect(() => {
        if (!token || terceroId) return; // Ignorar si ya hay terceroId

        const storageKey = `vinculacion:${token}:tipo_persona`;
        localStorage.setItem(storageKey, tipoPersona);
    }, [tipoPersona, token, terceroId]);

    // Refrescar status de completitud
    const refreshStatus = async () => {
        if (!terceroId) return;

        setStatusLoading(true);
        try {
            const data = await terceroAPI.getStatus(terceroId);
            setStatus(data);
        } catch (error) {
            console.error('Error fetching status:', error);
        } finally {
            setStatusLoading(false);
        }
    };

    useEffect(() => {
        if (terceroId) {
            refreshStatus();
        }
    }, [terceroId]);

    // Determinar si Persona Jurídica está deshabilitada (regla de negocio)
    const isJuridicaDisabled = useMemo(() => {
        if (!invitacionData) return false;

        const naturalOnlyTypes = ["CONTRATISTA", "EMPLEADO", "SOCIO", "ASPIRANTE"];
        return naturalOnlyTypes.includes(invitacionData.tipo_tercero.code);
    }, [invitacionData]);

    // Determinar si tipo_persona está bloqueado (después de crear tercero)
    const isTipoPersonaLocked = Boolean(terceroId);

    // Cargar documentos requeridos desde backend cuando cambie tipoPersona
    useEffect(() => {
        if (!token) return;

        setLoadingDocuments(true);
        vinculacionAPI
            .getDocumentosRequeridosFiltrados(token, tipoPersona)
            .then(setDocumentosRequeridos)
            .catch((err) => {
                console.error('Error al cargar documentos:', err);
                setDocumentosRequeridos([]);
            })
            .finally(() => setLoadingDocuments(false));
    }, [token, tipoPersona]);

    // Determinar tabs según tipo de tercero
    const tabs = useMemo(() => {
        const baseTabs = [
            { id: 'datos-basicos', label: 'Datos Básicos', icon: User },
            { id: 'documentos', label: 'Documentos', icon: FileText }
        ];

        if (!invitacionData) return baseTabs;

        const requiresPerfil = ['CONTRATISTA', 'EMPLEADO', 'ASPIRANTE', 'SOCIO'].includes(
            invitacionData.tipo_tercero.code
        );

        if (requiresPerfil) {
            baseTabs.push({ id: 'perfil', label: 'Información Adicional', icon: Briefcase });
        }

        const requiresSoportes = ['CONTRATISTA', 'ASPIRANTE'].includes(
            invitacionData.tipo_tercero.code
        );

        if (requiresSoportes) {
            baseTabs.push({ id: 'soportes', label: 'Soportes', icon: Paperclip });
        }

        return baseTabs;
    }, [invitacionData]);

    // Handler para cuando se crea el tercero
    const handleTerceroCreated = (id: number) => {
        setTerceroId(id);
        setActiveTab('documentos');
    };

    // Handler para enviar a aprobación
    const handleSubmitForApproval = async () => {
        if (!terceroId || !status?.puede_enviar_aprobacion) return;

        try {
            // Cargar los datos completos del tercero desde el backend
            const terceroData = await terceroAPI.get(terceroId);

            // Navegar a la página de éxito con los datos del tercero
            navigate('/success/vinculacion', {
                state: {
                    terceroData: {
                        nombre: terceroData.nombre_completo || terceroData.razon_social || 'Tercero',
                        documento: terceroData.numero_documento || terceroData.documento || '-',
                        email: terceroData.email || invitacionData?.email || '',
                        tipo_persona: terceroData.tipo_persona
                    }
                }
            });
        } catch (error) {
            console.error('Error al enviar para aprobación:', error);
            // En caso de error, navegar con los datos básicos disponibles
            navigate('/success/vinculacion', {
                state: {
                    terceroData: {
                        nombre: 'Tercero',
                        documento: '-',
                        email: invitacionData?.email || '',
                        tipo_persona: tipoPersona
                    }
                }
            });
        }
    };

    const isTabCompleted = (tabId: string) => {
        if (!terceroId) return false;
        if (tabId === 'datos-basicos') return true;
        if (tabId === 'documentos') return status?.documentos.completo || false;
        if (tabId === 'perfil') return status?.perfil.completo || false;
        if (tabId === 'soportes') return false; // Soportes se considera un paso adicional que podría completarse opcionalmente.
        return false;
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

    // Wizard principal
    return (
        <div className="min-h-screen bg-background">
            {/* Navbar con logo de Experias */}
            <Navbar subtitle="Vinculación de Terceros" />

            {/* Main - max-w-3xl como VinculacionPage */}
            <main className="container mx-auto px-4 py-8 max-w-3xl">
                {/* Header info - Idéntico a VinculacionPage */}
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

                {/* Wizard Tabs - Diseño limpio tipo steps */}
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    {/* Tab List - Clean step indicators */}
                    <TabsList className="w-full h-auto p-1 bg-muted/50 rounded-lg border border-border mb-6">
                        <div className="grid w-full" style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}>
                            {tabs.map((tab, index) => {
                                const isDisabled = !terceroId && tab.id !== 'datos-basicos';
                                const isCompleted = isTabCompleted(tab.id);
                                const isActive = activeTab === tab.id;

                                // Determine classes based on state
                                let triggerClasses = "relative py-2.5 px-3 text-sm font-medium rounded-md transition-all inline-flex items-center justify-center gap-2 ";

                                if (isActive) {
                                    triggerClasses += "bg-primary text-primary-foreground shadow-sm border border-primary";
                                } else if (isCompleted) {
                                    triggerClasses += "bg-emerald-600 text-white hover:bg-emerald-700 border border-emerald-600";
                                } else {
                                    triggerClasses += "bg-muted text-muted-foreground hover:text-foreground border border-transparent";
                                }

                                if (isDisabled) {
                                    triggerClasses += " opacity-50 cursor-not-allowed";
                                }

                                return (
                                    <TabsTrigger
                                        key={tab.id}
                                        value={tab.id}
                                        disabled={isDisabled}
                                        className={triggerClasses}
                                    >
                                        {/* Step number or check */}
                                        {isCompleted ? (
                                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/20">
                                                <Check className="w-3 h-3 text-white" />
                                            </span>
                                        ) : (
                                            <span className={`
                                                inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-semibold
                                                ${isActive
                                                    ? 'bg-white/20 text-primary-foreground'
                                                    : 'bg-black/10 text-muted-foreground'
                                                }
                                            `}>
                                                {index + 1}
                                            </span>
                                        )}
                                        <span className="hidden sm:inline">{tab.label}</span>
                                    </TabsTrigger>
                                );
                            })}
                        </div>
                    </TabsList>

                    {/* Tab Content - Cards con rounded-xl */}
                    <TabsContent value="datos-basicos" className="mt-0">
                        <div className="bg-card border border-border rounded-xl">
                            <DatosBasicosTab
                                token={token!}
                                terceroId={terceroId}
                                onTerceroCreated={handleTerceroCreated}
                                tipoPersona={tipoPersona}
                                setTipoPersona={setTipoPersona}
                                isJuridicaDisabled={isJuridicaDisabled}
                                isTipoPersonaLocked={isTipoPersonaLocked}
                                savedFormData={savedFormData}
                                onFormDataChange={setSavedFormData}
                            />
                        </div>
                    </TabsContent>

                    <TabsContent value="documentos" className="mt-0">
                        {terceroId ? (
                            <div className="bg-card border border-border rounded-xl">
                                <DocumentosTab
                                    terceroId={terceroId}
                                    documentosRequeridos={documentosRequeridos}
                                    tipoPersona={tipoPersona}
                                    onComplete={refreshStatus}
                                />
                            </div>
                        ) : (
                            <div className="bg-card border border-border rounded-xl p-8 text-center">
                                <p className="text-muted-foreground">
                                    Complete primero los datos básicos para continuar.
                                </p>
                            </div>
                        )}
                    </TabsContent>

                    {tabs.find(t => t.id === 'perfil') && (
                        <TabsContent value="perfil" className="mt-0">
                            {terceroId ? (
                                <PerfilTab
                                    terceroId={terceroId}
                                    tipoTercero={invitacionData.tipo_tercero.code}
                                    onUpdate={refreshStatus}
                                />
                            ) : (
                                <div className="bg-card border border-border rounded-xl p-8 text-center">
                                    <p className="text-muted-foreground">
                                        Complete primero los datos básicos para continuar.
                                    </p>
                                </div>
                            )}
                        </TabsContent>
                    )}

                    {tabs.find(t => t.id === 'soportes') && (
                        <TabsContent value="soportes" className="mt-0">
                            {terceroId ? (
                                <SoportesTab
                                    terceroId={terceroId}
                                    token={token!}
                                    onComplete={refreshStatus}
                                />
                            ) : (
                                <div className="bg-card border border-border rounded-xl p-8 text-center">
                                    <p className="text-muted-foreground">
                                        Complete primero los datos básicos para continuar.
                                    </p>
                                </div>
                            )}
                        </TabsContent>
                    )}
                </Tabs>

                {/* Footer - Diseño minimalista */}
                {terceroId && (
                    <div className="mt-6 bg-card border border-border rounded-xl p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            {/* Status indicators - Mínimo y limpio */}
                            <div className="flex items-center gap-4 text-sm">
                                {statusLoading ? (
                                    <div className="inline-flex items-center gap-2 text-muted-foreground">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Verificando...</span>
                                    </div>
                                ) : status ? (
                                    <>
                                        <div className="inline-flex items-center gap-1.5">
                                            <span className="text-muted-foreground">Documentos:</span>
                                            {status.documentos.completo ? (
                                                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                                    <Check className="w-3.5 h-3.5" />
                                                    <span>Listo</span>
                                                </span>
                                            ) : (
                                                <span className="text-amber-600 dark:text-amber-400">Pendiente</span>
                                            )}
                                        </div>
                                        {status.requiere_perfil && (
                                            <div className="inline-flex items-center gap-1.5">
                                                <span className="text-muted-foreground">Perfil:</span>
                                                {status.perfil.completo ? (
                                                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                                        <Check className="w-3.5 h-3.5" />
                                                        <span>Listo</span>
                                                    </span>
                                                ) : (
                                                    <span className="text-amber-600 dark:text-amber-400">Pendiente</span>
                                                )}
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="inline-flex items-center gap-1.5 min-h-[20px]">
                                        {/* Espacio reservado para evitar saltos, o simplemente nada si se quiere limpieza */}
                                    </div>
                                )}
                            </div>

                            {/* Submit button */}
                            <Button
                                disabled={!status?.puede_enviar_aprobacion}
                                onClick={handleSubmitForApproval}
                                className="w-full sm:w-auto"
                            >
                                Enviar para Aprobación
                            </Button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default VinculacionWizardPage;
