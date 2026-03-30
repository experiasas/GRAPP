import { useState, useEffect } from "react";
import {
    X, Loader2, Edit2, ChevronDown, FileText,
    Shield, GitCommit, CreditCard, AlertTriangle,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
    adminContratosAPI,
    type ContratoDetalle,
    type EstadoContrato,
    ESTADO_CONTRATO_LABELS,
    PRIORIDAD_LABELS,
} from "@/lib/adminContratosApi";
import { API_BASE_URL } from "@/lib/api";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function fDate(iso: string | null | undefined): string {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("es-CO", {
        day: "2-digit", month: "short", year: "numeric",
    });
}

function fMoney(val: string | undefined): string {
    if (!val) return "—";
    const n = parseFloat(val);
    if (isNaN(n)) return "—";
    return new Intl.NumberFormat("es-CO", {
        style: "currency", currency: "COP",
        minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(n);
}

function fDateTime(iso: string): string {
    return new Date(iso).toLocaleString("es-CO", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Micro-componentes de UI
// ─────────────────────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
    return (
        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/70 mb-2">
            {children}
        </p>
    );
}

function KV({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className="text-[13px] text-foreground mt-0.5">{value || "—"}</p>
        </div>
    );
}

const ESTADO_COLORS: Record<EstadoContrato, string> = {
    BORRADOR:   "bg-muted text-muted-foreground",
    FIRMADO:    "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    VIGENTE:    "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    ACTIVO:     "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    SUSPENDIDO: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    LIQUIDADO:  "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
    FINALIZADO: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    ANULADO:    "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
};

const ESTADO_POLIZA_COLORS: Record<string, string> = {
    VIGENTE:   "text-emerald-600",
    VENCIDA:   "text-amber-600",
    CANCELADA: "text-muted-foreground",
};

const ESTADO_PAGO_COLORS: Record<string, string> = {
    PENDIENTE: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    PAGADO:    "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    VENCIDO:   "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
    ANULADO:   "bg-muted text-muted-foreground",
};

function EstadoBadge({ estado }: { estado: EstadoContrato }) {
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${ESTADO_COLORS[estado]}`}>
            {ESTADO_CONTRATO_LABELS[estado]}
        </span>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton
// ─────────────────────────────────────────────────────────────────────────────

function DetailSkeleton() {
    return (
        <div className="p-5 space-y-5">
            <div className="space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-3.5 w-56" />
                <Skeleton className="h-5 w-20 rounded" />
            </div>
            <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
            </div>
            <Skeleton className="h-24 rounded-lg" />
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tabs
// ─────────────────────────────────────────────────────────────────────────────

type Tab = "info" | "polizas" | "otrosis" | "pagos" | "historial";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "info",     label: "Info",     icon: <FileText size={13} /> },
    { id: "polizas",  label: "Pólizas",  icon: <Shield size={13} /> },
    { id: "otrosis",  label: "Otrosíes", icon: <GitCommit size={13} /> },
    { id: "pagos",    label: "Pagos",    icon: <CreditCard size={13} /> },
    { id: "historial",label: "Historial",icon: <AlertTriangle size={13} /> },
];

// ─────────────────────────────────────────────────────────────────────────────
// Panel de cambio de estado
// ─────────────────────────────────────────────────────────────────────────────

const ESTADOS_TRANSICION: EstadoContrato[] = [
    "BORRADOR", "FIRMADO", "VIGENTE", "SUSPENDIDO", "LIQUIDADO", "FINALIZADO", "ANULADO",
];

interface EstadoPanelProps {
    contratoId:     number;
    estadoActual:   EstadoContrato;
    onEstadoChange: (nuevo: EstadoContrato) => void;
    onClose:        () => void;
}

function EstadoPanel({ contratoId, estadoActual, onEstadoChange, onClose }: EstadoPanelProps) {
    const [selected, setSelected]     = useState<EstadoContrato>(estadoActual);
    const [observacion, setObservacion] = useState("");
    const [saving, setSaving]         = useState(false);
    const [error, setError]           = useState("");

    async function handleGuardar() {
        if (selected === estadoActual) { onClose(); return; }
        setSaving(true);
        setError("");
        try {
            await adminContratosAPI.cambiarEstado(contratoId, selected, observacion);
            onEstadoChange(selected);
            onClose();
        } catch {
            setError("No se pudo cambiar el estado.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="border border-border rounded-lg p-4 bg-muted/10 space-y-3">
            <p className="text-[12px] font-semibold text-foreground">Cambiar estado</p>
            <div className="grid grid-cols-2 gap-1.5">
                {ESTADOS_TRANSICION.map(e => (
                    <button
                        key={e}
                        onClick={() => setSelected(e)}
                        className={`px-2.5 py-1.5 rounded text-[11px] font-medium border transition-colors ${
                            selected === e
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-background hover:bg-muted text-foreground"
                        }`}
                    >
                        {ESTADO_CONTRATO_LABELS[e]}
                    </button>
                ))}
            </div>
            <textarea
                value={observacion}
                onChange={e => setObservacion(e.target.value)}
                placeholder="Observación (opcional)"
                rows={2}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-[12px] placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            />
            {error && <p className="text-[11px] text-destructive">{error}</p>}
            <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" className="flex-1 h-8 text-[12px]" onClick={onClose} disabled={saving}>
                    Cancelar
                </Button>
                <Button size="sm" className="flex-1 h-8 text-[12px]" onClick={handleGuardar} disabled={saving}>
                    {saving && <Loader2 size={12} className="animate-spin mr-1" />}
                    Guardar
                </Button>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Contenido por tab
// ─────────────────────────────────────────────────────────────────────────────

function TabInfo({ c }: { c: ContratoDetalle }) {
    return (
        <div className="space-y-5">
            {/* Objeto */}
            <div>
                <SectionTitle>Objeto</SectionTitle>
                <p className="text-[13px] text-foreground leading-relaxed">{c.objeto}</p>
            </div>

            {/* Partes */}
            <div>
                <SectionTitle>Partes</SectionTitle>
                <div className="grid grid-cols-2 gap-3">
                    <KV label="Empresa" value={c.empresa.nombre} />
                    <KV label="Contratista" value={c.contratista.nombre} />
                    {c.tercero_rl && <KV label="RL Contratista" value={c.tercero_rl.nombre} />}
                    {c.empresa_rl && <KV label="RL Empresa" value={c.empresa_rl.nombre} />}
                    {c.solicitante && <KV label="Solicitante" value={c.solicitante.nombre} />}
                    {c.dependencia_solicitante && (
                        <KV label="Dependencia" value={c.dependencia_solicitante} />
                    )}
                </div>
            </div>

            {/* Fechas */}
            <div>
                <SectionTitle>Fechas</SectionTitle>
                <div className="grid grid-cols-2 gap-3">
                    <KV label="Fecha solicitud" value={fDate(c.fecha_solicitud)} />
                    <KV label="Fecha firma" value={fDate(c.fecha_contrato)} />
                    <KV label="Inicio" value={fDate(c.fecha_inicio)} />
                    <KV label="Fin" value={fDate(c.fecha_fin)} />
                    {c.fecha_fin_otrosi && (
                        <KV label="Fin (otrosí)" value={fDate(c.fecha_fin_otrosi)} />
                    )}
                    {c.dias_restantes !== null && (
                        <div>
                            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                                Días restantes
                            </p>
                            <p className={`text-[13px] font-semibold mt-0.5 ${
                                c.dias_restantes < 0 ? "text-red-600" :
                                c.dias_restantes <= 30 ? "text-amber-600" : "text-foreground"
                            }`}>
                                {c.dias_restantes < 0 ? "Vencido" : `${c.dias_restantes} días`}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Valor */}
            <div>
                <SectionTitle>Valor económico</SectionTitle>
                <div className="grid grid-cols-2 gap-3">
                    <KV label="Sin IVA" value={fMoney(c.valor_sin_iva)} />
                    <KV label="IVA" value={fMoney(c.iva)} />
                    <div className="col-span-2 p-3 rounded-lg bg-muted/30 border border-border">
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Total</p>
                        <p className="text-[18px] font-bold text-foreground mt-0.5">{fMoney(c.valor_total)}</p>
                    </div>
                </div>
            </div>

            {/* Observaciones */}
            {c.observaciones && (
                <div>
                    <SectionTitle>Observaciones</SectionTitle>
                    <p className="text-[12px] text-muted-foreground leading-relaxed">{c.observaciones}</p>
                </div>
            )}

            {/* Anexos */}
            {c.anexos.length > 0 && (
                <div>
                    <SectionTitle>Anexos ({c.anexos.length})</SectionTitle>
                    <div className="space-y-1.5">
                        {c.anexos.map(a => (
                            <a
                                key={a.id}
                                href={`${API_BASE_URL}${a.archivo_url}`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-2 p-2 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 transition-colors"
                            >
                                <FileText size={13} className="text-muted-foreground flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                    <p className="text-[12px] text-foreground truncate">
                                        {a.tipo?.nombre ?? "Anexo"}
                                    </p>
                                    {a.descripcion && (
                                        <p className="text-[11px] text-muted-foreground truncate">{a.descripcion}</p>
                                    )}
                                </div>
                            </a>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function TabPolizas({ c }: { c: ContratoDetalle }) {
    if (c.polizas.length === 0) {
        return (
            <div className="text-center py-10">
                <Shield size={28} className="text-muted-foreground mx-auto mb-2" />
                <p className="text-[13px] text-muted-foreground">Sin pólizas registradas</p>
            </div>
        );
    }
    return (
        <div className="space-y-3">
            {c.polizas.map(p => (
                <div key={p.id} className="p-3 rounded-lg border border-border bg-muted/20">
                    <div className="flex items-start justify-between gap-2">
                        <div>
                            <p className="text-[13px] font-medium text-foreground">{p.amparo}</p>
                            <p className="text-[11px] text-muted-foreground">{p.aseguradora}
                                {p.numero_poliza ? ` · ${p.numero_poliza}` : ""}
                            </p>
                        </div>
                        <span className={`text-[11px] font-medium ${ESTADO_POLIZA_COLORS[p.estado] ?? ""}`}>
                            {p.estado}
                        </span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
                        <p className="text-[11px] text-muted-foreground">
                            Valor: <span className="text-foreground">{fMoney(p.valor_asegurado)}</span>
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                            Vigencia: <span className="text-foreground">{fDate(p.fecha_inicio)} → {fDate(p.fecha_fin)}</span>
                        </p>
                    </div>
                    {p.archivo_url && (
                        <a
                            href={`${API_BASE_URL}${p.archivo_url}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 mt-2 text-[11px] text-primary hover:underline"
                        >
                            <FileText size={11} /> Ver póliza
                        </a>
                    )}
                </div>
            ))}
        </div>
    );
}

function TabOtrosis({ c }: { c: ContratoDetalle }) {
    if (c.otrosis.length === 0) {
        return (
            <div className="text-center py-10">
                <GitCommit size={28} className="text-muted-foreground mx-auto mb-2" />
                <p className="text-[13px] text-muted-foreground">Sin otrosíes registrados</p>
            </div>
        );
    }
    return (
        <div className="space-y-3">
            {c.otrosis.map(o => (
                <div key={o.id} className="p-3 rounded-lg border border-border bg-muted/20">
                    <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="text-[12px] font-semibold text-foreground">Otrosí #{o.numero}</p>
                        <p className="text-[11px] text-muted-foreground">{fDate(o.fecha)}</p>
                    </div>
                    <p className="text-[12px] text-foreground">{o.objeto}</p>
                    {(o.nuevo_valor || o.nueva_fecha_fin) && (
                        <div className="mt-2 flex flex-wrap gap-3">
                            {o.nuevo_valor && (
                                <p className="text-[11px] text-muted-foreground">
                                    Nuevo valor: <span className="text-foreground font-medium">{fMoney(o.nuevo_valor)}</span>
                                </p>
                            )}
                            {o.nueva_fecha_fin && (
                                <p className="text-[11px] text-muted-foreground">
                                    Nueva fecha fin: <span className="text-foreground font-medium">{fDate(o.nueva_fecha_fin)}</span>
                                </p>
                            )}
                        </div>
                    )}
                    {o.archivo_url && (
                        <a
                            href={`${API_BASE_URL}${o.archivo_url}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 mt-2 text-[11px] text-primary hover:underline"
                        >
                            <FileText size={11} /> Ver documento
                        </a>
                    )}
                </div>
            ))}
        </div>
    );
}

function TabPagos({ c }: { c: ContratoDetalle }) {
    if (c.formas_pago.length === 0) {
        return (
            <div className="text-center py-10">
                <CreditCard size={28} className="text-muted-foreground mx-auto mb-2" />
                <p className="text-[13px] text-muted-foreground">Sin formas de pago registradas</p>
            </div>
        );
    }
    const total = c.formas_pago.reduce((sum, f) => sum + parseFloat(f.valor), 0);
    return (
        <div className="space-y-3">
            {c.formas_pago.map(f => (
                <div key={f.id} className="p-3 rounded-lg border border-border bg-muted/20">
                    <div className="flex items-start justify-between gap-2">
                        <p className="text-[13px] font-medium text-foreground">{f.descripcion}</p>
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${ESTADO_PAGO_COLORS[f.estado] ?? ""}`}>
                            {f.estado}
                        </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-3">
                        <p className="text-[12px] font-semibold text-foreground">{fMoney(f.valor)}</p>
                        {f.fecha_estimada && (
                            <p className="text-[11px] text-muted-foreground">Estimado: {fDate(f.fecha_estimada)}</p>
                        )}
                        {f.fecha_pago && (
                            <p className="text-[11px] text-muted-foreground">Pagado: {fDate(f.fecha_pago)}</p>
                        )}
                    </div>
                </div>
            ))}
            <div className="pt-2 border-t border-border flex justify-between">
                <p className="text-[12px] text-muted-foreground">Total programado</p>
                <p className="text-[13px] font-semibold text-foreground">
                    {new Intl.NumberFormat("es-CO", {
                        style: "currency", currency: "COP",
                        minimumFractionDigits: 0, maximumFractionDigits: 0,
                    }).format(total)}
                </p>
            </div>
        </div>
    );
}

function TabHistorial({ c }: { c: ContratoDetalle }) {
    if (c.flujo.length === 0) {
        return (
            <div className="text-center py-10">
                <AlertTriangle size={28} className="text-muted-foreground mx-auto mb-2" />
                <p className="text-[13px] text-muted-foreground">Sin historial de estados</p>
            </div>
        );
    }
    return (
        <div className="relative pl-4">
            <div className="absolute left-[7px] top-2 bottom-2 w-[2px] bg-border" />
            <div className="space-y-4">
                {[...c.flujo].reverse().map(f => (
                    <div key={f.id} className="relative pl-4">
                        <div className="absolute left-[-9px] top-1.5 w-2 h-2 rounded-full bg-primary border-2 border-background" />
                        <div className="flex items-start justify-between gap-2">
                            <div>
                                <p className="text-[12px] font-medium text-foreground">
                                    {f.estado_anterior
                                        ? `${ESTADO_CONTRATO_LABELS[f.estado_anterior as EstadoContrato] ?? f.estado_anterior} → ${ESTADO_CONTRATO_LABELS[f.estado_nuevo as EstadoContrato] ?? f.estado_nuevo}`
                                        : `Creado como ${ESTADO_CONTRATO_LABELS[f.estado_nuevo as EstadoContrato] ?? f.estado_nuevo}`
                                    }
                                </p>
                                {f.observacion && (
                                    <p className="text-[11px] text-muted-foreground mt-0.5">{f.observacion}</p>
                                )}
                                {f.usuario && (
                                    <p className="text-[11px] text-muted-foreground">{f.usuario}</p>
                                )}
                            </div>
                            <p className="text-[11px] text-muted-foreground whitespace-nowrap">{fDateTime(f.fecha)}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
    contratoId:    number | null;
    onClose:       () => void;
    onEditRequest: (id: number) => void;
    onUpdated:     () => void;
}

export function ContratoDetailPanel({ contratoId, onClose, onEditRequest, onUpdated }: Props) {
    const [detalle, setDetalle]       = useState<ContratoDetalle | null>(null);
    const [loading, setLoading]       = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [activeTab, setActiveTab]   = useState<Tab>("info");
    const [showEstadoPanel, setShowEstadoPanel] = useState(false);

    const loadDetalle = (id: number) => {
        setLoading(true);
        setFetchError(null);
        adminContratosAPI.getDetalle(id)
            .then(d => { setDetalle(d); setActiveTab("info"); })
            .catch(() => setFetchError("No se pudo cargar el detalle del contrato."))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        if (!contratoId) { setDetalle(null); setShowEstadoPanel(false); return; }
        loadDetalle(contratoId);
    }, [contratoId]);

    function handleEstadoChange(nuevo: EstadoContrato) {
        if (!detalle) return;
        setDetalle({ ...detalle, estado: nuevo });
        onUpdated();
    }

    const isOpen = contratoId !== null;

    return (
        <>
            {isOpen && <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />}

            <div className={`
                fixed inset-y-0 right-0 z-40
                w-full max-w-[520px]
                bg-background border-l border-border shadow-2xl
                flex flex-col
                transform transition-transform duration-300 ease-in-out
                ${isOpen ? "translate-x-0" : "translate-x-full"}
            `}>
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <div>
                            <p className="text-[14px] font-semibold text-foreground leading-none">
                                {detalle ? detalle.numero : "Contrato"}
                            </p>
                            {detalle && (
                                <p className="text-[11px] text-muted-foreground mt-0.5 truncate max-w-[300px]">
                                    {detalle.empresa.nombre}
                                </p>
                            )}
                        </div>
                        {detalle && <EstadoBadge estado={detalle.estado} />}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Prioridad + tipo */}
                {detalle && (
                    <div className="px-5 py-2 border-b border-border bg-muted/20 flex items-center gap-3 text-[11px] text-muted-foreground flex-shrink-0">
                        <span>Prioridad: <span className="font-medium text-foreground">{PRIORIDAD_LABELS[detalle.prioridad]}</span></span>
                        {detalle.tipo_contrato && (
                            <>
                                <span className="text-border">·</span>
                                <span>{detalle.tipo_contrato.nombre}</span>
                            </>
                        )}
                        {detalle.dias_restantes !== null && (
                            <>
                                <span className="text-border">·</span>
                                <span className={
                                    detalle.dias_restantes < 0 ? "text-red-600 font-medium" :
                                    detalle.dias_restantes <= 30 ? "text-amber-600 font-medium" : ""
                                }>
                                    {detalle.dias_restantes < 0 ? "Vencido" : `${detalle.dias_restantes}d restantes`}
                                </span>
                            </>
                        )}
                    </div>
                )}

                {/* Tabs */}
                {detalle && (
                    <div className="flex border-b border-border overflow-x-auto flex-shrink-0">
                        {TABS.map(t => (
                            <button
                                key={t.id}
                                onClick={() => { setActiveTab(t.id); setShowEstadoPanel(false); }}
                                className={`flex items-center gap-1.5 px-4 py-2.5 text-[12px] font-medium whitespace-nowrap border-b-2 transition-colors ${
                                    activeTab === t.id
                                        ? "border-primary text-primary"
                                        : "border-transparent text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                {t.icon}
                                {t.label}
                                {t.id === "polizas" && detalle.polizas.length > 0 && (
                                    <span className="ml-0.5 text-[10px] bg-muted rounded-full px-1.5">{detalle.polizas.length}</span>
                                )}
                                {t.id === "otrosis" && detalle.otrosis.length > 0 && (
                                    <span className="ml-0.5 text-[10px] bg-muted rounded-full px-1.5">{detalle.otrosis.length}</span>
                                )}
                                {t.id === "pagos" && detalle.formas_pago.length > 0 && (
                                    <span className="ml-0.5 text-[10px] bg-muted rounded-full px-1.5">{detalle.formas_pago.length}</span>
                                )}
                            </button>
                        ))}
                    </div>
                )}

                {/* Cuerpo */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <DetailSkeleton />
                    ) : fetchError ? (
                        <div className="p-5 text-center">
                            <p className="text-[13px] text-destructive">{fetchError}</p>
                            <button
                                onClick={() => contratoId && loadDetalle(contratoId)}
                                className="mt-2 text-[13px] text-primary hover:underline"
                            >
                                Reintentar
                            </button>
                        </div>
                    ) : detalle ? (
                        <div className="p-5">
                            {/* Panel de cambio de estado (inline, arriba del tab activo) */}
                            {showEstadoPanel && (
                                <div className="mb-5">
                                    <EstadoPanel
                                        contratoId={detalle.id}
                                        estadoActual={detalle.estado}
                                        onEstadoChange={handleEstadoChange}
                                        onClose={() => setShowEstadoPanel(false)}
                                    />
                                </div>
                            )}

                            {activeTab === "info"      && <TabInfo c={detalle} />}
                            {activeTab === "polizas"   && <TabPolizas c={detalle} />}
                            {activeTab === "otrosis"   && <TabOtrosis c={detalle} />}
                            {activeTab === "pagos"     && <TabPagos c={detalle} />}
                            {activeTab === "historial" && <TabHistorial c={detalle} />}
                        </div>
                    ) : null}
                </div>

                {/* Footer */}
                {detalle && !loading && (
                    <div className="border-t border-border p-4 flex-shrink-0 bg-background flex gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 flex items-center gap-2"
                            onClick={() => onEditRequest(detalle.id)}
                        >
                            <Edit2 size={14} />
                            Editar
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 flex items-center gap-2"
                            onClick={() => setShowEstadoPanel(v => !v)}
                        >
                            <ChevronDown size={14} />
                            Cambiar estado
                        </Button>
                    </div>
                )}
            </div>
        </>
    );
}
