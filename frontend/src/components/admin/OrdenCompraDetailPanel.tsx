import { useState, useEffect } from "react";
import {
    X, FileText, Loader2, ExternalLink, Download,
    AlertCircle, ShoppingCart,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
    adminOrdenesCompraAPI,
    type OCDetalle,
    type EstadoOC,
    ESTADO_OC_LABELS,
} from "@/lib/adminOrdenesCompraApi";
import { API_BASE_URL } from "@/lib/api";

// ─────────────────────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────────────────────

const ESTADO_BADGE: Record<EstadoOC, string> = {
    BORRADOR:     "bg-muted text-muted-foreground",
    EMITIDA:      "bg-blue-50 text-blue-700",
    APROBADA:     "bg-emerald-50 text-emerald-700",
    EN_EJECUCION: "bg-amber-50 text-amber-700",
    CUMPLIDA:     "bg-purple-50 text-purple-700",
    ANULADA:      "bg-red-50 text-red-700",
};

const ESTADO_BUTTON: Record<EstadoOC, string> = {
    BORRADOR:     "bg-muted text-muted-foreground hover:bg-muted/80",
    EMITIDA:      "bg-blue-600 hover:bg-blue-700 text-white",
    APROBADA:     "bg-emerald-600 hover:bg-emerald-700 text-white",
    EN_EJECUCION: "bg-amber-500 hover:bg-amber-600 text-white",
    CUMPLIDA:     "bg-purple-600 hover:bg-purple-700 text-white",
    ANULADA:      "bg-red-600 hover:bg-red-700 text-white",
};

const fmt = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
});

function fmtDate(iso: string | null): string {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("es-CO", {
        day: "2-digit", month: "short", year: "numeric",
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
    ocId: number | null;
    onClose: () => void;
    onEstadoChanged: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Radicacion row type
// ─────────────────────────────────────────────────────────────────────────────

interface RadicacionRow {
    id: number;
    numero: string;
    periodo: string;
    valor_total: number;
    estado: string;
    estado_display: string;
    fecha: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────────────────────

type Tab = "info" | "financiero" | "radicaciones";

export function OrdenCompraDetailPanel({ ocId, onClose, onEstadoChanged }: Props) {
    const [data, setData]       = useState<OCDetalle | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError]     = useState<string | null>(null);

    const [activeTab, setActiveTab] = useState<Tab>("info");

    // Radicaciones lazy-load
    const [radicaciones, setRadicaciones]       = useState<RadicacionRow[]>([]);
    const [radLoading, setRadLoading]           = useState(false);
    const [radLoaded, setRadLoaded]             = useState(false);

    // Acciones
    const [actionLoading, setActionLoading] = useState(false);
    const [actionError, setActionError]     = useState<string | null>(null);

    // Anulación inline
    const [showAnular, setShowAnular]   = useState(false);
    const [motivoAnular, setMotivoAnular] = useState("");

    // ── Cargar detalle cuando cambia el id ───────────────────────────────────
    useEffect(() => {
        if (!ocId) {
            setData(null);
            return;
        }
        setLoading(true);
        setError(null);
        setActiveTab("info");
        setRadLoaded(false);
        setRadicaciones([]);
        setShowAnular(false);
        setMotivoAnular("");
        setActionError(null);

        adminOrdenesCompraAPI.get(ocId)
            .then(setData)
            .catch(() => setError("No se pudo cargar el detalle de la OC."))
            .finally(() => setLoading(false));
    }, [ocId]);

    // ── Cargar radicaciones al cambiar a ese tab ─────────────────────────────
    useEffect(() => {
        if (activeTab !== "radicaciones" || !ocId || radLoaded) return;
        setRadLoading(true);
        adminOrdenesCompraAPI.radicaciones(ocId)
            .then(rows => {
                setRadicaciones(rows);
                setRadLoaded(true);
            })
            .catch(() => setRadicaciones([]))
            .finally(() => setRadLoading(false));
    }, [activeTab, ocId, radLoaded]);

    // ── Cambio de estado ─────────────────────────────────────────────────────
    async function cambiarEstado(nuevoEstado: EstadoOC, motivo?: string) {
        if (!ocId) return;
        setActionLoading(true);
        setActionError(null);
        try {
            await adminOrdenesCompraAPI.cambiarEstado(ocId, nuevoEstado, motivo);
            onEstadoChanged();
        } catch (err: unknown) {
            const msg =
                (err as { response?: { data?: { error?: string; detail?: string } } })
                    ?.response?.data?.error
                ?? (err as { response?: { data?: { error?: string; detail?: string } } })
                    ?.response?.data?.detail
                ?? "No se pudo cambiar el estado.";
            setActionError(msg);
        } finally {
            setActionLoading(false);
        }
    }

    async function handleAnular() {
        if (!motivoAnular.trim()) {
            setActionError("El motivo de anulación es obligatorio.");
            return;
        }
        await cambiarEstado("ANULADA", motivoAnular.trim());
        setShowAnular(false);
        setMotivoAnular("");
    }

    // ── No visible ───────────────────────────────────────────────────────────
    if (!ocId) return null;

    const TABS: { key: Tab; label: string }[] = [
        { key: "info",        label: "Información" },
        { key: "financiero",  label: "Financiero" },
        { key: "radicaciones", label: `Radicaciones${data ? ` (${data.radicaciones_count})` : ""}` },
    ];

    // ─────────────────────────────────────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────────────────────────────────────
    return (
        <>
            {/* Overlay */}
            <div
                className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-30"
                onClick={onClose}
            />

            {/* Panel */}
            <div className="fixed inset-y-0 right-0 w-full sm:w-[480px] bg-background border-l border-border shadow-2xl z-40 flex flex-col">

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                            <ShoppingCart size={16} className="text-muted-foreground" />
                        </div>
                        {loading ? (
                            <Skeleton className="h-5 w-36" />
                        ) : data ? (
                            <div className="min-w-0">
                                <p className="text-[14px] font-semibold text-foreground leading-tight truncate">
                                    {data.numero_oc}
                                </p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${ESTADO_BADGE[data.estado] ?? "bg-muted text-muted-foreground"}`}>
                                        {ESTADO_OC_LABELS[data.estado] ?? data.estado}
                                    </span>
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground">
                                        {data.tipo_display}
                                    </span>
                                </div>
                            </div>
                        ) : null}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Tab navigation */}
                <div className="flex border-b border-border flex-shrink-0 px-5">
                    {TABS.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`py-2.5 px-3 text-[12px] font-medium border-b-2 transition-colors whitespace-nowrap -mb-px ${
                                activeTab === tab.key
                                    ? "border-primary text-primary"
                                    : "border-transparent text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
                    {error && (
                        <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-[13px] text-destructive">
                            {error}
                        </div>
                    )}

                    {loading ? (
                        <LoadingSkeleton />
                    ) : data ? (
                        <>
                            {/* ── Tab: Información ── */}
                            {activeTab === "info" && (
                                <>
                                    <Section title="Identificación">
                                        <Row label="Número OC" value={data.numero_oc} />
                                        <Row label="Tipo" value={data.tipo_display} />
                                        <div className="flex justify-between items-baseline gap-4">
                                            <span className="text-[12px] text-muted-foreground flex-shrink-0">Estado</span>
                                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold ${ESTADO_BADGE[data.estado] ?? "bg-muted text-muted-foreground"}`}>
                                                {ESTADO_OC_LABELS[data.estado] ?? data.estado}
                                            </span>
                                        </div>
                                        {data.created_by && (
                                            <Row label="Creado por" value={data.created_by} />
                                        )}
                                        <Row label="Creado" value={fmtDate(data.created_at)} />
                                        <Row label="Actualizado" value={fmtDate(data.updated_at)} />
                                    </Section>

                                    <Section title="Partes">
                                        <Row label="Tercero" value={data.tercero.nombre} />
                                        <Row label="Documento" value={data.tercero.documento} />
                                        <Row label="Tipo persona" value={data.tercero.tipo_persona} />
                                        <Row label="Empresa" value={data.empresa.nombre} />
                                    </Section>

                                    {data.contrato && (
                                        <Section title="Contrato">
                                            <Row label="Número" value={data.contrato.numero} />
                                            <div className="flex justify-between items-baseline gap-4">
                                                <span className="text-[12px] text-muted-foreground flex-shrink-0">Objeto</span>
                                                <a
                                                    href={`/admin/contratos/contrato/${data.contrato.id}/change/`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-[12px] text-primary hover:underline text-right"
                                                >
                                                    {data.contrato.objeto}
                                                    <ExternalLink size={10} className="flex-shrink-0" />
                                                </a>
                                            </div>
                                        </Section>
                                    )}

                                    <Section title="Descripción">
                                        <p className="text-[13px] text-foreground leading-relaxed">
                                            {data.objeto}
                                        </p>
                                        {data.observaciones && (
                                            <div className="mt-3 pt-3 border-t border-border">
                                                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                                                    Observaciones
                                                </p>
                                                <p className="text-[13px] text-foreground leading-relaxed">
                                                    {data.observaciones}
                                                </p>
                                            </div>
                                        )}
                                    </Section>

                                    <Section title="Fechas">
                                        <Row label="Emisión" value={fmtDate(data.fecha_emision)} />
                                        <Row
                                            label="Entrega"
                                            value={data.fecha_entrega ? fmtDate(data.fecha_entrega) : "Sin fecha límite"}
                                        />
                                    </Section>

                                    {data.archivo_url && (
                                        <a
                                            href={`${API_BASE_URL}${data.archivo_url}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 text-[12px] text-primary hover:underline"
                                        >
                                            <Download size={12} />
                                            Descargar archivo adjunto
                                        </a>
                                    )}

                                    <a
                                        href={`/admin/contratos/ordencompra/${data.id}/change/`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        <ExternalLink size={12} />
                                        Abrir en Django admin
                                    </a>
                                </>
                            )}

                            {/* ── Tab: Financiero ── */}
                            {activeTab === "financiero" && (
                                <>
                                    <Section title="Desglose">
                                        <FinRow label="Valor sin IVA" value={fmt.format(Number(data.valor_sin_iva))} />
                                        <FinRow label="IVA" value={fmt.format(Number(data.iva))} />
                                        <div className="h-px bg-border my-1" />
                                        <FinRow label="Total" value={fmt.format(Number(data.valor_total))} bold />
                                    </Section>

                                    <Section title="Ejecución">
                                        <FinRow label="Valor radicado" value={fmt.format(Number(data.valor_radicado))} />
                                        <FinRow label="Valor pendiente" value={fmt.format(Number(data.valor_pendiente))} />
                                        <div className="mt-3 space-y-1.5">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[12px] text-muted-foreground">
                                                    Ejecución
                                                </span>
                                                <span className={`text-[12px] font-semibold tabular-nums ${
                                                    data.porcentaje_ejecutado >= 100
                                                        ? "text-red-600"
                                                        : data.porcentaje_ejecutado >= 80
                                                        ? "text-amber-600"
                                                        : "text-emerald-600"
                                                }`}>
                                                    {data.porcentaje_ejecutado.toFixed(1)}%
                                                </span>
                                            </div>
                                            <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all ${
                                                        data.porcentaje_ejecutado >= 100
                                                            ? "bg-red-500"
                                                            : data.porcentaje_ejecutado >= 80
                                                            ? "bg-amber-400"
                                                            : "bg-emerald-500"
                                                    }`}
                                                    style={{ width: `${Math.min(data.porcentaje_ejecutado, 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    </Section>

                                    {data.items.length > 0 && (
                                        <Section title={`Ítems (${data.items.length})`}>
                                            <div className="rounded-lg border border-border overflow-hidden">
                                                <table className="w-full text-[12px]">
                                                    <thead>
                                                        <tr className="bg-muted/50 border-b border-border">
                                                            <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                                                                Descripción
                                                            </th>
                                                            <th className="px-3 py-2 text-right font-medium text-muted-foreground w-14">
                                                                Cant.
                                                            </th>
                                                            <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                                                                Unitario
                                                            </th>
                                                            <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                                                                Total
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-border">
                                                        {data.items.map(item => (
                                                            <tr key={item.id}>
                                                                <td className="px-3 py-2 text-foreground leading-snug">
                                                                    {item.descripcion}
                                                                </td>
                                                                <td className="px-3 py-2 text-right text-muted-foreground tabular-nums">
                                                                    {item.cantidad}
                                                                </td>
                                                                <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                                                                    {fmt.format(Number(item.valor_unitario))}
                                                                </td>
                                                                <td className="px-3 py-2 text-right tabular-nums font-medium text-foreground">
                                                                    {fmt.format(Number(item.valor_total))}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </Section>
                                    )}
                                </>
                            )}

                            {/* ── Tab: Radicaciones ── */}
                            {activeTab === "radicaciones" && (
                                <>
                                    {radLoading ? (
                                        <div className="space-y-3">
                                            {[1, 2, 3].map(i => (
                                                <Skeleton key={i} className="h-14 w-full rounded-lg" />
                                            ))}
                                        </div>
                                    ) : radicaciones.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
                                            <FileText size={28} className="text-muted-foreground/40" />
                                            <p className="text-[13px] text-muted-foreground">
                                                No hay radicaciones para esta OC.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {radicaciones.map(rad => (
                                                <div
                                                    key={rad.id}
                                                    className="rounded-lg border border-border bg-muted/20 px-4 py-3 space-y-1.5"
                                                >
                                                    <div className="flex items-center justify-between gap-2">
                                                        <p className="text-[13px] font-semibold text-foreground">
                                                            {rad.numero}
                                                        </p>
                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700">
                                                            {rad.estado_display}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[12px] text-muted-foreground">
                                                            {rad.periodo}
                                                        </span>
                                                        <span className="text-[13px] font-medium text-foreground tabular-nums">
                                                            {fmt.format(rad.valor_total)}
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] text-muted-foreground">
                                                        {fmtDate(rad.fecha)}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </>
                    ) : null}
                </div>

                {/* Footer de acciones */}
                {data && (
                    <div className="flex-shrink-0 border-t border-border px-5 py-4 space-y-3">
                        {actionError && (
                            <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-[12px] text-destructive">
                                <AlertCircle size={13} />
                                {actionError}
                            </div>
                        )}

                        {/* Panel inline: anulación */}
                        {showAnular && (
                            <div className="space-y-2">
                                <label className="text-[12px] font-medium text-foreground">
                                    Motivo de anulación <span className="text-destructive">*</span>
                                </label>
                                <textarea
                                    value={motivoAnular}
                                    onChange={e => setMotivoAnular(e.target.value)}
                                    placeholder="Describe el motivo de la anulación..."
                                    rows={3}
                                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                                />
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        variant="destructive"
                                        disabled={actionLoading || !motivoAnular.trim()}
                                        onClick={handleAnular}
                                        className="flex-1"
                                    >
                                        {actionLoading
                                            ? <Loader2 size={13} className="animate-spin mr-1" />
                                            : null}
                                        Confirmar anulación
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                            setShowAnular(false);
                                            setMotivoAnular("");
                                            setActionError(null);
                                        }}
                                    >
                                        Cancelar
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Botones de transición */}
                        {!showAnular && data.transiciones_validas.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {data.transiciones_validas.map(estado => {
                                    const isAnular = estado === "ANULADA";
                                    return (
                                        <button
                                            key={estado}
                                            disabled={actionLoading}
                                            onClick={() => {
                                                if (isAnular) {
                                                    setShowAnular(true);
                                                    setActionError(null);
                                                } else {
                                                    cambiarEstado(estado);
                                                }
                                            }}
                                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors disabled:opacity-60 ${
                                                isAnular
                                                    ? "border border-red-300 text-red-600 hover:bg-red-50"
                                                    : ESTADO_BUTTON[estado]
                                            }`}
                                        >
                                            {actionLoading && (
                                                <Loader2 size={12} className="animate-spin" />
                                            )}
                                            {ESTADO_OC_LABELS[estado]}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {!showAnular && data.transiciones_validas.length === 0 && (
                            <p className="text-center text-[13px] text-muted-foreground py-1">
                                No hay transiciones disponibles para este estado.
                            </p>
                        )}
                    </div>
                )}
            </div>
        </>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-componentes internos
// ─────────────────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {title}
            </p>
            <div className="space-y-1.5">{children}</div>
        </div>
    );
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between items-baseline gap-4">
            <span className="text-[12px] text-muted-foreground flex-shrink-0">{label}</span>
            <span className="text-[13px] text-foreground text-right">{value}</span>
        </div>
    );
}

function FinRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
    return (
        <div className="flex justify-between items-baseline gap-4">
            <span className={`text-[12px] ${bold ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                {label}
            </span>
            <span className={`tabular-nums ${bold ? "text-[15px] font-bold text-foreground" : "text-[13px] text-foreground"}`}>
                {value}
            </span>
        </div>
    );
}

function LoadingSkeleton() {
    return (
        <div className="space-y-5">
            {[1, 2, 3].map(i => (
                <div key={i} className="space-y-2">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                </div>
            ))}
        </div>
    );
}
