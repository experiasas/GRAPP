import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Loader2,
    AlertCircle,
    CheckCircle2,
    Paperclip,
    ArrowLeft,
    ShoppingCart,
    FileText,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { wizardApi } from '@/api/wizardApi';
import { useCuentaWizard } from '@/hooks/useCuentaWizard';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { API_URL } from '@/api/config';
import { Tabs, TabsContent } from '@/components/ui/tabs';

// Components
import { Step1Form } from '@/components/wizard/Step1Form';
import { Step2Form } from '@/components/wizard/Step2Form';
import { AnexosPanel } from '@/components/wizard/AnexosPanel';
import { SummarySidebar } from '@/components/wizard/SummarySidebar';

export default function NuevaRadicacion() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user } = useAuth();

    // Init States
    const [wizardId, setWizardId] = useState<number | null>(null);
    const [initLoading, setInitLoading] = useState(true);
    const [initError, setInitError] = useState<string | null>(null);

    // Wizard Logic
    const {
        estado, anexos, tiposAnexo, saving, actions, canSubmit,
        tipoDocumento, tipoPersona, reglasSegSocial, requiereSeguridadSocial
    } = useCuentaWizard(wizardId);

    // UI State
    const [currentTab, setCurrentTab] = useState("general");

    // OC Selector state
    interface OCOption {
        id: number; numero_oc: string; objeto: string;
        valor_total: string; valor_pendiente: string;
        porcentaje_ejecutado: number; fecha_entrega: string | null;
        contrato: { id: number; numero: string } | null;
    }
    const [ocOptions,    setOcOptions]    = useState<OCOption[]>([]);
    const [loadingOCs,   setLoadingOCs]   = useState(false);
    const [selectedOC,   setSelectedOC]   = useState<OCOption | null>(null);
    const [savingOC,     setSavingOC]     = useState(false);

    // 0. Cargar OCs disponibles del tercero logueado
    const fetchOCs = useCallback(async () => {
        setLoadingOCs(true);
        try {
            const { data } = await import('@/lib/api').then(m => m.apiClient.get('/api/mis-ordenes-compra/'));
            setOcOptions(data);
        } catch {
            setOcOptions([]);
        } finally {
            setLoadingOCs(false);
        }
    }, []);

    useEffect(() => { fetchOCs(); }, [fetchOCs]);

    // Sincronizar selectedOC con el estado del wizard (carga inicial)
    useEffect(() => {
        if (estado?.orden_compra_detalle && ocOptions.length > 0) {
            const match = ocOptions.find(oc => oc.id === estado.orden_compra);
            if (match) setSelectedOC(match);
        }
    }, [estado?.orden_compra, ocOptions]);

    async function handleSelectOC(oc: OCOption | null) {
        if (!wizardId) return;
        setSelectedOC(oc);
        setSavingOC(true);
        try {
            await wizardApi.updateStep1(wizardId, { orden_compra: oc?.id ?? null } as any);
        } catch {
            // revert on error
            setSelectedOC(null);
        } finally {
            setSavingOC(false);
        }
    }

    // 1. Initialization: si hay ?id= en la URL, carga esa cuenta; si no, crea/recupera un borrador
    useEffect(() => {
        const init = async () => {
            try {
                const idParam = searchParams.get('id');

                if (idParam) {
                    // Cargar una cuenta existente (radicada u otro estado) por su ID
                    const id = Number(idParam);
                    if (isNaN(id)) throw new Error("ID de cuenta invalido");
                    setWizardId(id);
                } else {
                    // Crear o recuperar un borrador activo
                    const wizardRes = await wizardApi.createBorrador();
                    const id = wizardRes.id || wizardRes.wizard_id;
                    if (!id) throw new Error("No se pudo iniciar el wizard (ID missing)");
                    setWizardId(id);
                }
            } catch (err: any) {
                console.error(err);
                if (err.response?.status === 400 || err.response?.status === 401) {
                    setInitError(err.response?.data?.detail || "No estas autorizado para crear cuenta de cobro, verifica tu perfil.");
                } else {
                    setInitError(err.message || 'Error inicializando la radicacion');
                }
            } finally {
                setInitLoading(false);
            }
        };

        init();
    }, [searchParams]);


    // Handlers
    const handleStep1Save = async (data: any) => {
        await actions.saveStep1(data);
        setCurrentTab("financiero");
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
        } catch (err: any) {
            console.error(err);
            alert("Error al radicar: " + (err.message || "Unknown"));
        }
    };

    // Derived View State
    const isReadOnly = Boolean(estado?.estado && estado.estado !== 'BORRADOR');

    // Calculate actual progress
    const completedSteps = [estado?.step1_ok, estado?.step2_ok, estado?.anexos_ok].filter(Boolean).length;
    const progressText = `${completedSteps}/3`;

    // Loading Screen
    if (initLoading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="text-center animate-fade-in">
                    <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    </div>
                    <p className="text-slate-500 font-medium">Iniciando sistema de radicación...</p>
                </div>
            </div>
        );
    }

    // Error Screen
    if (initError || !wizardId) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center border border-red-100">
                    <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-8 h-8 text-red-600" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 mb-2">Error de Acceso</h2>
                    <p className="text-slate-500 mb-6">{initError || 'No se pudo cargar la aplicación'}</p>
                    <Button onClick={() => navigate('/portal-terceros')} className="bg-blue-600 hover:bg-blue-700">
                        Volver al Dashboard
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <button
                onClick={() => navigate('/portal-terceros')}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group w-fit"
            >
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                Volver al Dashboard
            </button>

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-foreground mb-1">
                        {tipoDocumento === 'FACTURA' ? 'Nueva Factura' : 'Nueva Cuenta de Cobro'}
                    </h1>
                    <p className="text-muted-foreground">
                        Completa los pasos para radicar tu {tipoDocumento === 'FACTURA' ? 'factura' : 'cuenta de cobro'}.
                    </p>

                    {/* Chips de progreso */}
                    <div className="flex flex-wrap items-center gap-2 mt-4">
                        <span className="inline-flex items-center px-3 py-1 bg-secondary text-muted-foreground text-xs font-semibold uppercase tracking-wider rounded-full">
                            Progreso {progressText}
                        </span>
                        <span className="inline-flex items-center px-3 py-1 bg-secondary text-muted-foreground text-xs font-semibold uppercase tracking-wider rounded-full">
                            Valor {estado?.datos_financieros?.valor_total ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(estado.datos_financieros.valor_total) : '$0'}
                        </span>
                        <span className="inline-flex items-center px-3 py-1 bg-secondary text-muted-foreground text-xs font-semibold uppercase tracking-wider rounded-full">
                            Tipo {tipoDocumento === 'FACTURA' ? 'Factura' : 'Cuenta de Cobro'}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className={`px-4 py-1.5 text-xs rounded-full font-bold uppercase tracking-wider ${isReadOnly ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning-foreground'}`}>
                        {isReadOnly ? estado?.estado.replace('_', ' ') : 'Borrador'}
                    </div>
                </div>
            </div>

            {/* Layout Columnas: Izquierda 65%, Derecha 35% fixed */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative">

                {/* Columna Izquierda: Formulario (65%) */}
                <div className="lg:col-span-8 flex flex-col gap-6 w-full max-w-full">

                    {/* Banners Informativos */}
                    {(estado?.estado === 'RADICADA' || estado?.estado === 'EN_REVISION') && (
                        <div className="bg-[hsl(142_76%_96%)] border-l-4 border-success p-4 rounded-r-xl flex items-start gap-3">
                            <span className="text-success font-bold text-lg leading-none mt-0.5">✓</span>
                            <div>
                                <h3 className="text-success font-semibold">Cuenta Radicada Exitosamente</h3>
                                <p className="text-sm text-success/80 mt-1">
                                    Su cuenta ha sido recibida y se encuentra en validación. No se permiten más cambios.
                                </p>
                            </div>
                        </div>
                    )}

                    {estado?.estado === 'APROBADA' && (
                        <div className="bg-[#F0FDF4] border-l-[4px] border-[#16A34A] p-4 rounded-r-xl flex items-start gap-3">
                            <CheckCircle2 className="w-4 h-4 text-[#16A34A] mt-0.5" />
                            <div>
                                <h3 className="text-[#15803D] font-[600]">Cuenta aprobada exitosamente</h3>
                                <p className="text-[13px] text-[#166534] mt-1">
                                    Su cuenta ha sido validada y aprobada. Ahora será gestionada para su programación de pago.
                                </p>
                            </div>
                        </div>
                    )}

                    {estado?.estado === 'PAGADA' && (
                        <div className="bg-[hsl(142_76%_96%)] border-l-4 border-success p-4 rounded-r-xl flex items-start gap-3">
                            <span className="text-success font-bold text-lg leading-none mt-0.5">✓</span>
                            <div>
                                <h3 className="text-success font-semibold">Pago registrado</h3>
                                <p className="text-sm text-success/80 mt-1">
                                    El pago de esta cuenta ya fue registrado. Puede consultar el comprobante en la sección Comprobantes.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Panel de Comprobantes */}
                    {estado?.comprobantes && estado.comprobantes.length > 0 && (
                        <div className="bg-white border rounded-xl shadow-sm p-6 overflow-hidden relative">
                            <div className="absolute top-0 left-0 w-1 h-full bg-success"></div>
                            <h2 className="text-lg font-bold text-slate-800 mb-4">Comprobantes de Pago</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {estado.comprobantes.map(comp => (
                                    <div key={comp.id} className="border rounded-lg p-4 flex flex-col gap-2 bg-slate-50/50">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-[11px] text-slate-500 uppercase tracking-widest font-semibold mb-1">Fecha de Pago</p>
                                                <p className="font-medium text-slate-700">{comp.fecha_pago}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[11px] text-slate-500 uppercase tracking-widest font-semibold mb-1">Valor</p>
                                                <p className="font-bold text-success text-base">
                                                    {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(comp.valor_pagado)}
                                                </p>
                                            </div>
                                        </div>
                                        {comp.referencia && (
                                            <div className="mt-1">
                                                <p className="text-[11px] text-slate-500 uppercase tracking-widest font-semibold mb-1">Referencia</p>
                                                <p className="text-sm font-medium text-slate-700">{comp.referencia}</p>
                                            </div>
                                        )}
                                        <a href={`${API_URL}${comp.archivo}`} target="_blank" rel="noopener noreferrer" className="mt-3 text-sm text-primary hover:text-primary/80 font-semibold flex items-center gap-1.5 transition-colors w-fit bg-white border border-border px-3 py-1.5 rounded-md shadow-sm">
                                            <Paperclip className="w-4 h-4" /> Ver comprobante
                                        </a>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* OC Selector */}
                    {!isReadOnly && (
                        <div className="bg-white rounded-xl shadow-sm border p-5">
                            <h2 className="text-[15px] font-bold text-slate-800 mb-1">¿Contra qué desea radicar?</h2>
                            <p className="text-slate-500 text-[13px] mb-4">
                                Seleccione la Orden de Compra asignada, o deje en blanco si radica directamente contra un contrato.
                            </p>

                            {loadingOCs ? (
                                <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
                                    <Loader2 size={14} className="animate-spin" /> Cargando órdenes disponibles…
                                </div>
                            ) : ocOptions.length === 0 ? (
                                <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-4 py-3 text-[13px] text-muted-foreground">
                                    <FileText size={14} />
                                    No tienes órdenes de compra activas. Puedes radicar directamente contra tu contrato.
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {/* Opción: sin OC */}
                                    <label className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${!selectedOC ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/30'}`}>
                                        <input
                                            type="radio"
                                            name="oc-select"
                                            checked={!selectedOC}
                                            onChange={() => handleSelectOC(null)}
                                            className="mt-0.5 accent-primary"
                                        />
                                        <div>
                                            <p className="text-[13px] font-semibold text-foreground flex items-center gap-1.5">
                                                <FileText size={13} /> Sin orden de compra
                                            </p>
                                            <p className="text-[12px] text-muted-foreground">Radicación directa contra contrato</p>
                                        </div>
                                    </label>

                                    {/* Opciones de OC */}
                                    {ocOptions.map(oc => {
                                        const fmtCOP = (v: string) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(parseFloat(v));
                                        const pct = oc.porcentaje_ejecutado;
                                        const barColor = pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-400' : 'bg-emerald-500';
                                        return (
                                            <label key={oc.id} className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${selectedOC?.id === oc.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/30'}`}>
                                                <input
                                                    type="radio"
                                                    name="oc-select"
                                                    checked={selectedOC?.id === oc.id}
                                                    onChange={() => handleSelectOC(oc)}
                                                    className="mt-0.5 accent-primary"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[13px] font-semibold text-foreground flex items-center gap-1.5">
                                                        <ShoppingCart size={13} />
                                                        <span className="font-mono">{oc.numero_oc}</span>
                                                    </p>
                                                    <p className="text-[12px] text-muted-foreground truncate">{oc.objeto}</p>
                                                    <div className="mt-2 flex items-center gap-2">
                                                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                                            <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                                                        </div>
                                                        <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                                                            Disponible: <strong>{fmtCOP(oc.valor_pendiente)}</strong> de {fmtCOP(oc.valor_total)} ({pct}% ejecutado)
                                                        </span>
                                                    </div>
                                                </div>
                                            </label>
                                        );
                                    })}

                                    {savingOC && (
                                        <p className="text-[12px] text-muted-foreground flex items-center gap-1.5">
                                            <Loader2 size={12} className="animate-spin" /> Guardando selección…
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* OC info (read-only) */}
                    {isReadOnly && estado?.orden_compra_detalle && (
                        <div className="flex items-center gap-3 rounded-lg bg-muted/40 px-4 py-3 text-[13px]">
                            <ShoppingCart size={15} className="text-primary flex-shrink-0" />
                            <div>
                                <span className="font-semibold text-primary font-mono">{estado.orden_compra_detalle.numero_oc}</span>
                                <span className="text-muted-foreground ml-2">{estado.orden_compra_detalle.objeto}</span>
                            </div>
                        </div>
                    )}

                    {/* Tabs Locales */}
                    <div className="flex border-b border-border">
                        <button
                            className={`flex-1 flex justify-center py-4 text-sm font-semibold transition-colors ${currentTab === 'general' ? 'text-accent-foreground border-b-2 border-ring' : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'}`}
                            onClick={() => setCurrentTab('general')}
                        >
                            Datos Generales
                            {estado?.step1_ok && <CheckCircle2 className="w-4 h-4 ml-2 text-success shrink-0" />}
                        </button>
                        <button
                            className={`flex-1 flex justify-center py-4 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${currentTab === 'financiero' ? 'text-accent-foreground border-b-2 border-ring' : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'}`}
                            onClick={() => setCurrentTab('financiero')}
                            disabled={!estado?.step1_ok && !isReadOnly}
                        >
                            Detalle Financiero
                            {estado?.step2_ok && <CheckCircle2 className="w-4 h-4 ml-2 text-success shrink-0" />}
                        </button>
                        <button
                            className={`flex-1 flex justify-center py-4 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${currentTab === 'anexos' ? 'text-accent-foreground border-b-2 border-ring' : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'}`}
                            onClick={() => setCurrentTab('anexos')}
                            disabled={(!estado?.step2_ok || !estado?.step1_ok) && !isReadOnly}
                        >
                            <Paperclip className="w-4 h-4 mr-2 shrink-0" />
                            Anexos
                            {estado?.anexos_ok && <CheckCircle2 className="w-4 h-4 ml-2 text-success shrink-0" />}
                        </button>
                    </div>

                    <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
                        <TabsContent value="general" className="focus-visible:outline-none mt-0">
                            <div className="bg-white rounded-xl shadow-sm border p-6">
                                <div className="mb-6">
                                    <h2 className="text-lg font-bold text-slate-800">Información del Documento</h2>
                                    <p className="text-slate-500 text-sm">Ingrese los datos básicos de la cuenta de cobro o factura.</p>
                                </div>
                                <div>
                                    <Step1Form
                                        initialData={estado?.datos_generales}
                                        contratoDetalle={estado?.contrato_detalle}
                                        tipoDocumento={tipoDocumento}
                                        onSave={handleStep1Save}
                                        readOnly={isReadOnly}
                                        isSaving={saving}
                                    />
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="financiero" className="focus-visible:outline-none mt-0">
                            <div className="bg-white rounded-xl shadow-sm border p-6">
                                <div className="mb-6">
                                    <h2 className="text-lg font-bold text-slate-800">Detalle Financiero</h2>
                                    <p className="text-slate-500 text-sm">Desglose los valores monetarios. El total se calculará automáticamente.</p>
                                </div>
                                <div>
                                    <Step2Form
                                        initialData={estado?.datos_financieros}
                                        tipoDocumento={tipoDocumento}
                                        reglasSegSocial={reglasSegSocial}
                                        responsableIva={estado?.proveedor_responsable_iva}
                                        onSave={handleStep2Save}
                                        readOnly={isReadOnly}
                                        isSaving={saving}
                                    />
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="anexos" className="focus-visible:outline-none mt-0">
                            <div className="bg-white rounded-xl shadow-sm border p-6">
                                <div className="mb-6">
                                    <h2 className="text-lg font-bold text-slate-800">Soportes y Anexos</h2>
                                    <p className="text-slate-500 text-sm">Adjunte los documentos requeridos para la radicación.</p>
                                </div>
                                <div>
                                    <AnexosPanel
                                        anexos={anexos}
                                        tipos={tiposAnexo}
                                        onUpload={actions.uploadAnexo}
                                        onDelete={actions.deleteAnexo}
                                        readOnly={isReadOnly}
                                        requiereSeguridadSocial={requiereSeguridadSocial}
                                    />
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Right Column: Sticky Sidebar (35%) */}
                <div className="lg:col-span-4 sticky top-[100px]">
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
        </div>
    );
}
