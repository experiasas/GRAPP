import { useState, useEffect, useRef } from "react";
import {
    X, FileText, Loader2, ExternalLink, Download,
    CheckCircle, XCircle, AlertCircle, Paperclip,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
    adminCuentasCobroAPI,
    type CuentaCobroDetalle,
} from "@/lib/adminCuentasCobroApi";
import { API_BASE_URL } from "@/lib/api";

// ─────────────────────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────────────────────

const ESTADO_BADGE: Record<string, string> = {
    RADICADA:    "bg-blue-50 text-blue-700",
    EN_REVISION: "bg-warning/10 text-warning",
    APROBADA:    "bg-success/10 text-success",
    RECHAZADA:   "bg-destructive/10 text-destructive",
    PAGADA:      "bg-muted text-muted-foreground",
};

const ESTADO_LABEL: Record<string, string> = {
    RADICADA:    "Radicada",
    EN_REVISION: "En revisión",
    APROBADA:    "Aprobada",
    RECHAZADA:   "Rechazada",
    PAGADA:      "Pagada",
};

const fmt = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
});

function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("es-CO", {
        day: "2-digit", month: "short", year: "numeric",
    });
}

function todayISO() {
    return new Date().toISOString().split("T")[0];
}

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
    cuentaId: number | null;
    onClose: () => void;
    onEstadoChanged: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente
// ─────────────────────────────────────────────────────────────────────────────

export function CuentaCobroDetailPanel({ cuentaId, onClose, onEstadoChanged }: Props) {
    const [data, setData]       = useState<CuentaCobroDetalle | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError]     = useState<string | null>(null);

    // ── Acciones ─────────────────────────────────────────────────────────────
    const [confirmAprobar, setConfirmAprobar] = useState(false);
    const [actionLoading, setActionLoading]   = useState(false);
    const [actionError, setActionError]       = useState<string | null>(null);

    // ── Rechazo inline ───────────────────────────────────────────────────────
    const [showRechazo, setShowRechazo]   = useState(false);
    const [motivoRechazo, setMotivoRechazo] = useState("");

    // ── Panel pago inline ────────────────────────────────────────────────────
    const [showPagada, setShowPagada]           = useState(false);
    const [fechaPago, setFechaPago]             = useState(todayISO);
    const [archivoComprobante, setArchivo]      = useState<File | null>(null);
    const fileInputRef                          = useRef<HTMLInputElement>(null);

    // ── Cargar detalle cuando cambia el id ───────────────────────────────────
    useEffect(() => {
        if (!cuentaId) {
            setData(null);
            return;
        }
        setLoading(true);
        setError(null);
        setShowRechazo(false);
        setMotivoRechazo("");
        setShowPagada(false);
        setFechaPago(todayISO());
        setArchivo(null);
        setActionError(null);

        adminCuentasCobroAPI.getDetalle(cuentaId)
            .then(setData)
            .catch(() => setError("No se pudo cargar el detalle."))
            .finally(() => setLoading(false));
    }, [cuentaId]);

    // ── Cambio de estado genérico (JSON) ─────────────────────────────────────
    async function cambiarEstado(nuevoEstado: string, observaciones?: string) {
        if (!cuentaId) return;
        setActionLoading(true);
        setActionError(null);
        try {
            await adminCuentasCobroAPI.cambiarEstado(cuentaId, {
                estado: nuevoEstado,
                ...(observaciones && { observaciones_revision: observaciones }),
            });
            onEstadoChanged();
        } catch (err: unknown) {
            const msg =
                (err as { response?: { data?: { error?: string } } })
                    ?.response?.data?.error ?? "No se pudo cambiar el estado.";
            setActionError(msg);
        } finally {
            setActionLoading(false);
        }
    }

    // ── Rechazo ──────────────────────────────────────────────────────────────
    async function handleRechazar() {
        if (!motivoRechazo.trim()) {
            setActionError("El motivo de rechazo es obligatorio.");
            return;
        }
        await cambiarEstado("RECHAZADA", motivoRechazo.trim());
        setShowRechazo(false);
        setMotivoRechazo("");
    }

    // ── Pago con comprobante (multipart) ─────────────────────────────────────
    async function handlePagada() {
        if (!cuentaId) return;
        setActionLoading(true);
        setActionError(null);
        try {
            let payload: FormData | { estado: string; fecha_pago: string };
            if (archivoComprobante) {
                const form = new FormData();
                form.append("estado", "PAGADA");
                form.append("fecha_pago", fechaPago);
                form.append("comprobante", archivoComprobante);
                payload = form;
            } else {
                payload = { estado: "PAGADA", fecha_pago: fechaPago };
            }
            await adminCuentasCobroAPI.cambiarEstado(cuentaId, payload);
            onEstadoChanged();
        } catch (err: unknown) {
            // The apiClient interceptor unwraps 400 response.data directly,
            // so err may be the data object itself (e.g. { error: "..." })
            const e = err as Record<string, unknown>;
            const msg =
                (typeof e?.error === "string" ? e.error : null) ??
                (e?.response as Record<string, unknown> | undefined)?.data as string | null ??
                "No se pudo registrar el pago.";
            setActionError(String(msg));
        } finally {
            setActionLoading(false);
        }
    }

    function cancelarPagada() {
        setShowPagada(false);
        setFechaPago(todayISO());
        setArchivo(null);
        setActionError(null);
    }

    // ─── No visible ──────────────────────────────────────────────────────────
    if (!cuentaId) return null;

    const anyPanelOpen = showRechazo || showPagada;

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
                            <FileText size={16} className="text-muted-foreground" />
                        </div>
                        {loading ? (
                            <Skeleton className="h-5 w-32" />
                        ) : data ? (
                            <div className="min-w-0">
                                <p className="text-[14px] font-semibold text-foreground leading-tight">
                                    {data.numero}
                                </p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${ESTADO_BADGE[data.estado] ?? "bg-muted text-muted-foreground"}`}>
                                        {ESTADO_LABEL[data.estado] ?? data.estado}
                                    </span>
                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${data.tipo_documento === 'FACTURA' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                        {data.tipo_documento_label}
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
                            {/* Tercero */}
                            <Section title="Tercero">
                                <Row label="Nombre" value={data.tercero.nombre} />
                                <Row
                                    label="Documento"
                                    value={`${data.tercero.tipo_documento} ${data.tercero.numero_documento}`}
                                />
                                {data.contrato && (
                                    <Row label="Contrato" value={`#${data.contrato.numero}`} />
                                )}
                                {data.orden_compra && (
                                    <Row label="Orden de compra" value={data.orden_compra.numero_oc} />
                                )}
                            </Section>

                            {/* Info cuenta */}
                            <Section title="Información">
                                <Row label="Período" value={data.periodo} />
                                <Row label="Tipo doc." value={data.tipo_documento} />
                                <Row label="Radicada" value={fmtDate(data.fecha_radicacion)} />
                                <Row label="Actualizada" value={fmtDate(data.updated_at)} />
                            </Section>

                            {/* Concepto */}
                            {data.concepto && (
                                <Section title="Concepto">
                                    <p className="text-[13px] text-foreground leading-relaxed">
                                        {data.concepto}
                                    </p>
                                </Section>
                            )}

                            {/* Observaciones / motivo rechazo */}
                            {data.observaciones && (
                                <Section title="Observaciones">
                                    <p className="text-[13px] text-foreground leading-relaxed">
                                        {data.observaciones}
                                    </p>
                                </Section>
                            )}

                            {/* Desglose financiero */}
                            <Section title="Desglose financiero">
                                <FinRow label="Valor base" value={fmt.format(data.valor_base)} />
                                {data.iva_valor > 0 && (
                                    <FinRow
                                        label={`IVA (${data.iva_porcentaje}%)`}
                                        value={fmt.format(data.iva_valor)}
                                    />
                                )}
                                {data.admon > 0 && (
                                    <FinRow label="Administración" value={fmt.format(data.admon)} />
                                )}
                                {data.imprevistos > 0 && (
                                    <FinRow label="Imprevistos" value={fmt.format(data.imprevistos)} />
                                )}
                                {data.utilidad > 0 && (
                                    <FinRow label="Utilidad" value={fmt.format(data.utilidad)} />
                                )}
                                <div className="h-px bg-border my-1" />
                                <FinRow label="Total" value={fmt.format(data.valor_total)} bold />
                            </Section>

                            {/* Comprobante de pago */}
                            {data.comprobante && (
                                <Section title="Pago">
                                    <Row label="Fecha de pago" value={fmtDate(data.comprobante.fecha_pago)} />
                                    <Row label="Valor pagado" value={fmt.format(data.comprobante.valor_pagado)} />
                                    {data.comprobante.referencia && (
                                        <Row label="Referencia" value={data.comprobante.referencia} />
                                    )}
                                    {data.comprobante.archivo_url ? (
                                        <a
                                            href={`${API_BASE_URL}${data.comprobante.archivo_url}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 text-[12px] text-primary hover:underline mt-1"
                                        >
                                            <Download size={12} />
                                            Ver comprobante
                                        </a>
                                    ) : (
                                        <p className="text-[12px] text-muted-foreground mt-1">
                                            Sin comprobante adjunto
                                        </p>
                                    )}
                                </Section>
                            )}

                            {/* Anexos */}
                            {data.anexos.length > 0 && (
                                <Section title={`Anexos (${data.anexos.length})`}>
                                    <div className="space-y-2">
                                        {data.anexos.map(a => (
                                            <div
                                                key={a.id}
                                                className="flex items-start justify-between gap-2 py-2 border-b border-border last:border-0"
                                            >
                                                <div className="min-w-0">
                                                    <p className="text-[12px] font-medium text-foreground">
                                                        {a.tipo_anexo}
                                                    </p>
                                                    {a.descripcion && (
                                                        <p className="text-[11px] text-muted-foreground truncate">
                                                            {a.descripcion}
                                                        </p>
                                                    )}
                                                    <p className="text-[10px] text-muted-foreground mt-0.5">
                                                        {fmtDate(a.fecha_carga)}
                                                    </p>
                                                </div>
                                                {a.archivo_url && (
                                                    <a
                                                        href={`${API_BASE_URL}${a.archivo_url}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex-shrink-0 p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                                        title="Descargar"
                                                    >
                                                        <ExternalLink size={13} />
                                                    </a>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </Section>
                            )}

                            {/* Django admin link */}
                            <a
                                href={`/admin/proveedores/cuentacobro/${data.id}/change/`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <ExternalLink size={12} />
                                Abrir en Django admin
                            </a>
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

                        {/* Panel inline: rechazo */}
                        {showRechazo && (
                            <div className="space-y-2">
                                <label className="text-[12px] font-medium text-foreground">
                                    Motivo de rechazo <span className="text-destructive">*</span>
                                </label>
                                <textarea
                                    value={motivoRechazo}
                                    onChange={e => setMotivoRechazo(e.target.value)}
                                    placeholder="Describe el motivo del rechazo..."
                                    rows={3}
                                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                                />
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        variant="destructive"
                                        disabled={actionLoading || !motivoRechazo.trim()}
                                        onClick={handleRechazar}
                                        className="flex-1"
                                    >
                                        {actionLoading
                                            ? <Loader2 size={13} className="animate-spin mr-1" />
                                            : <XCircle size={13} className="mr-1" />}
                                        Confirmar rechazo
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                            setShowRechazo(false);
                                            setMotivoRechazo("");
                                            setActionError(null);
                                        }}
                                    >
                                        Cancelar
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Panel inline: pago */}
                        {showPagada && (
                            <div className="space-y-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
                                <p className="text-[12px] font-semibold text-foreground">
                                    Marcar como pagada
                                </p>

                                {/* Fecha de pago */}
                                <div className="space-y-1">
                                    <label className="text-[12px] text-muted-foreground">
                                        Fecha de pago
                                    </label>
                                    <input
                                        type="date"
                                        value={fechaPago}
                                        onChange={e => setFechaPago(e.target.value)}
                                        className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                                    />
                                </div>

                                {/* Comprobante */}
                                <div className="space-y-1">
                                    <label className="text-[12px] text-muted-foreground">
                                        Comprobante de pago{" "}
                                        <span className="text-muted-foreground/60">(opcional)</span>
                                    </label>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        className="hidden"
                                        onChange={e => setArchivo(e.target.files?.[0] ?? null)}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full flex items-center gap-2 rounded-lg border border-dashed border-border bg-background px-3 py-2 text-[13px] text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
                                    >
                                        <Paperclip size={13} />
                                        {archivoComprobante
                                            ? <span className="text-foreground truncate">{archivoComprobante.name}</span>
                                            : "Seleccionar archivo..."}
                                    </button>
                                    {archivoComprobante && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setArchivo(null);
                                                if (fileInputRef.current) fileInputRef.current.value = "";
                                            }}
                                            className="text-[11px] text-muted-foreground hover:text-destructive transition-colors"
                                        >
                                            Quitar archivo
                                        </button>
                                    )}
                                </div>

                                {/* Acciones */}
                                <div className="flex gap-2 pt-1">
                                    <Button
                                        size="sm"
                                        disabled={actionLoading || !fechaPago}
                                        onClick={handlePagada}
                                        className="flex-1 bg-success hover:bg-success/90 text-white"
                                    >
                                        {actionLoading
                                            ? <Loader2 size={13} className="animate-spin mr-1" />
                                            : <CheckCircle size={13} className="mr-1" />}
                                        Confirmar pago
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={cancelarPagada}
                                    >
                                        Cancelar
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Botones de acción según estado */}
                        {!anyPanelOpen && (
                            <ActionButtons
                                estado={data.estado}
                                loading={actionLoading}
                                onRevisión={() => cambiarEstado("EN_REVISION")}
                                onAprobar={() => setConfirmAprobar(true)}
                                onRechazar={() => setShowRechazo(true)}
                                onPagada={() => setShowPagada(true)}
                            />
                        )}
                    </div>
                )}
            </div>

            {/* Confirm: Aprobar */}
            <ConfirmDialog
                open={confirmAprobar}
                title="Aprobar cuenta de cobro"
                description={`¿Confirmas la aprobación de ${data?.numero}? El tercero será notificado.`}
                confirmLabel={actionLoading ? "Aprobando..." : "Sí, aprobar"}
                cancelLabel="Cancelar"
                onConfirm={async () => { setConfirmAprobar(false); await cambiarEstado("APROBADA"); }}
                onCancel={() => setConfirmAprobar(false)}
            />
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

interface ActionButtonsProps {
    estado: string;
    loading: boolean;
    onRevisión: () => void;
    onAprobar: () => void;
    onRechazar: () => void;
    onPagada: () => void;
}

function ActionButtons({ estado, loading, onRevisión, onAprobar, onRechazar, onPagada }: ActionButtonsProps) {
    if (estado === "PAGADA") {
        return (
            <p className="text-center text-[13px] text-muted-foreground py-1">
                Esta cuenta ya fue pagada.
            </p>
        );
    }

    return (
        <div className="flex flex-wrap gap-2">
            {estado === "RADICADA" && (
                <Button
                    size="sm"
                    variant="outline"
                    disabled={loading}
                    onClick={onRevisión}
                    className="flex-1"
                >
                    Iniciar revisión
                </Button>
            )}

            {(estado === "RADICADA" || estado === "EN_REVISION") && (
                <>
                    <Button
                        size="sm"
                        disabled={loading}
                        onClick={onAprobar}
                        className="flex-1 bg-success hover:bg-success/90 text-white"
                    >
                        {loading
                            ? <Loader2 size={13} className="animate-spin mr-1" />
                            : <CheckCircle size={13} className="mr-1" />}
                        Aprobar
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        disabled={loading}
                        onClick={onRechazar}
                        className="flex-1 text-destructive border-destructive/30 hover:bg-destructive/5"
                    >
                        <XCircle size={13} className="mr-1" />
                        Rechazar
                    </Button>
                </>
            )}

            {estado === "APROBADA" && (
                <Button
                    size="sm"
                    disabled={loading}
                    onClick={onPagada}
                    className="flex-1"
                >
                    Marcar como pagada
                </Button>
            )}

            {estado === "RECHAZADA" && (
                <Button
                    size="sm"
                    variant="outline"
                    disabled={loading}
                    onClick={onAprobar}
                    className="flex-1"
                >
                    Re-aprobar
                </Button>
            )}
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
                </div>
            ))}
        </div>
    );
}
