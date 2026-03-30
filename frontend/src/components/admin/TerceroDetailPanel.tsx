import { useState, useEffect } from "react";
import {
    X, CheckCircle, Clock, XCircle, FileText, Mail, Phone,
    MapPin, Building2, User, Loader2, ExternalLink, ChevronRight, Download,
} from "lucide-react";
import { DescargaDocumentosModal } from "@/components/admin/DescargaDocumentosModal";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
    adminTercerosAPI,
    type TerceroDetalle,
    type EstadoDoc,
    type DescargaHistorial,
} from "@/lib/adminTercerosApi";
import { API_BASE_URL } from "@/lib/api";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers y sub-componentes internos
// ─────────────────────────────────────────────────────────────────────────────

const ESTADO_BADGE: Record<string, string> = {
    APROBADO:  "bg-success/10 text-success",
    RECHAZADO: "bg-destructive/10 text-destructive",
    PENDIENTE: "bg-warning/10 text-warning",
    BORRADOR:  "bg-muted text-muted-foreground",
};

const ESTADO_LABEL: Record<string, string> = {
    APROBADO:  "Aprobado",
    RECHAZADO: "Rechazado",
    PENDIENTE: "Pendiente",
    BORRADOR:  "Borrador",
};

const AVATAR_COLOR: Record<string, string> = {
    APROBADO:  "bg-success/10 text-success",
    RECHAZADO: "bg-destructive/10 text-destructive",
    PENDIENTE: "bg-warning/10 text-warning",
    BORRADOR:  "bg-muted text-muted-foreground",
};

const DOC_ESTADO_BADGE: Record<EstadoDoc, string> = {
    CARGADO:   "text-success",
    APROBADO:  "text-success",
    PENDIENTE: "text-warning",
    RECHAZADO: "text-destructive",
};

const DOC_ESTADO_LABEL: Record<EstadoDoc, string> = {
    CARGADO:   "Cargado",
    APROBADO:  "Aprobado",
    PENDIENTE: "Pendiente",
    RECHAZADO: "Rechazado",
};

function getInitials(nombre: string): string {
    const words = nombre.trim().split(/\s+/);
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString("es-CO", {
        day: "2-digit", month: "long", year: "numeric",
    });
}

function formatDateTime(iso: string): string {
    return new Date(iso).toLocaleString("es-CO", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
    });
}

function formatMonthYear(iso: string | null): string {
    if (!iso) return "";
    return new Date(iso + "T12:00:00").toLocaleDateString("es-CO", {
        month: "short", year: "numeric",
    });
}

const NIVEL_BADGE: Record<string, string> = {
    BASICO:     "bg-muted text-muted-foreground",
    INTERMEDIO: "bg-primary/10 text-primary",
    AVANZADO:   "bg-success/10 text-success",
    NATIVO:     "bg-warning/10 text-warning",
};

const NIVEL_LABEL: Record<string, string> = {
    BASICO:     "Básico",
    INTERMEDIO: "Intermedio",
    AVANZADO:   "Avanzado",
    NATIVO:     "Nativo",
};

function PerfilSection({ title, count, children }: {
    title: string;
    count: number;
    children: React.ReactNode;
}) {
    const [open, setOpen] = useState(false);
    return (
        <div className="border border-border rounded-lg overflow-hidden">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between px-3 py-2.5 bg-background hover:bg-muted/40 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-foreground">{title}</span>
                    <span className={`text-[11px] px-1.5 py-0.5 rounded font-medium tabular-nums ${
                        count > 0 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    }`}>
                        {count}
                    </span>
                </div>
                <ChevronRight
                    size={14}
                    className={`text-muted-foreground transition-transform duration-200 ${open ? "rotate-90" : ""}`}
                />
            </button>
            <div className={`grid transition-all duration-300 ease-in-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                <div className="overflow-hidden">
                    {count === 0 ? (
                        <p className="text-[12px] text-muted-foreground px-3 py-3">Sin registros.</p>
                    ) : (
                        <div className="px-3 py-1 divide-y divide-border/40">
                            {children}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function DocEstadoIcon({ estado }: { estado: EstadoDoc }) {
    switch (estado) {
        case "CARGADO":
        case "APROBADO":
            return <CheckCircle size={14} className="text-success flex-shrink-0" />;
        case "PENDIENTE":
            return <Clock size={14} className="text-warning flex-shrink-0" />;
        case "RECHAZADO":
            return <XCircle size={14} className="text-destructive flex-shrink-0" />;
        default:
            return <FileText size={14} className="text-muted-foreground flex-shrink-0" />;
    }
}

function SectionTitle({ children }: { children: React.ReactNode }) {
    return (
        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/70 mb-2">
            {children}
        </p>
    );
}

function InfoRow({ icon: Icon, label, value }: {
    icon: React.ElementType;
    label: string;
    value: string | null | undefined;
}) {
    if (!value) return null;
    return (
        <div className="flex items-start gap-2.5">
            <Icon size={13} className="text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground">{label}</p>
                <p className="text-[13px] text-foreground break-words">{value}</p>
            </div>
        </div>
    );
}

function DetailSkeleton() {
    return (
        <div className="p-5 space-y-6">
            <div className="flex items-start gap-3">
                <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-5 w-20 rounded" />
                </div>
            </div>
            <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}
            </div>
            <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 rounded-lg" />)}
            </div>
        </div>
    );
}

function HistorialSkeleton() {
    return (
        <div className="space-y-3 p-5">
            {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                    <Skeleton className="h-3.5 w-40" />
                    <Skeleton className="h-3 w-64" />
                    <Skeleton className="h-3 w-24" />
                </div>
            ))}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tabs
// ─────────────────────────────────────────────────────────────────────────────

type Tab = "informacion" | "documentos" | "perfil" | "descargas";

// ─────────────────────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
    terceroId: number | null;
    onClose: () => void;
    onEstadoChanged: () => void;
}

export function TerceroDetailPanel({ terceroId, onClose, onEstadoChanged }: Props) {
    const [detalle, setDetalle]       = useState<TerceroDetalle | null>(null);
    const [loading, setLoading]       = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [activeTab, setActiveTab]   = useState<Tab>("informacion");

    // Flujo de aprobación
    const [confirmAprobar, setConfirmAprobar] = useState(false);
    const [actionLoading, setActionLoading]   = useState(false);

    // Flujo de rechazo (inline)
    const [rejectMode, setRejectMode]   = useState(false);
    const [motivo, setMotivo]           = useState("");
    const [motivoError, setMotivoError] = useState("");

    // Modal de descarga
    const [showDescargaModal, setShowDescargaModal] = useState(false);

    // Historial de descargas (carga lazy al activar tab)
    const [historial, setHistorial]           = useState<DescargaHistorial[] | null>(null);
    const [loadingHistorial, setLoadingHistorial] = useState(false);

    // Limpiar estado al cambiar de tercero
    useEffect(() => {
        setRejectMode(false);
        setMotivo("");
        setMotivoError("");
        setConfirmAprobar(false);
        setActiveTab("informacion");
        setHistorial(null);

        if (!terceroId) {
            setDetalle(null);
            return;
        }

        setLoading(true);
        setFetchError(null);
        adminTercerosAPI.getDetalle(terceroId)
            .then(setDetalle)
            .catch(() => setFetchError("No se pudo cargar el detalle del tercero."))
            .finally(() => setLoading(false));
    }, [terceroId]);

    // Cargar historial al activar el tab, solo una vez por tercero
    useEffect(() => {
        if (activeTab !== "descargas" || !terceroId || historial !== null) return;
        setLoadingHistorial(true);
        adminTercerosAPI.getHistorialDescargas(terceroId)
            .then(setHistorial)
            .catch(() => setHistorial([]))
            .finally(() => setLoadingHistorial(false));
    }, [activeTab, terceroId, historial]);

    // Al cerrar el modal de descarga exitosamente, invalidar el historial
    // para que se recargue la próxima vez que se abra el tab
    function handleDescargaClose() {
        setShowDescargaModal(false);
        setHistorial(null); // forzar recarga si el tab está activo
    }

    // ── Aprobar ──────────────────────────────────────────────────────────────
    async function handleAprobar() {
        if (!terceroId) return;
        setActionLoading(true);
        try {
            await adminTercerosAPI.cambiarEstado(terceroId, { estado: "APROBADO" });
            setConfirmAprobar(false);
            onEstadoChanged();
            const actualizado = await adminTercerosAPI.getDetalle(terceroId);
            setDetalle(actualizado);
        } catch {
            /* manejado por el interceptor */
        } finally {
            setActionLoading(false);
        }
    }

    // ── Rechazar ─────────────────────────────────────────────────────────────
    async function handleRechazar() {
        if (!terceroId) return;
        if (!motivo.trim()) {
            setMotivoError("El motivo es obligatorio para rechazar.");
            return;
        }
        setActionLoading(true);
        try {
            await adminTercerosAPI.cambiarEstado(terceroId, {
                estado: "RECHAZADO",
                motivo: motivo.trim(),
            });
            setRejectMode(false);
            setMotivo("");
            onEstadoChanged();
            const actualizado = await adminTercerosAPI.getDetalle(terceroId);
            setDetalle(actualizado);
        } catch {
            /* manejado por el interceptor */
        } finally {
            setActionLoading(false);
        }
    }

    // ── Conteos ───────────────────────────────────────────────────────────────
    const docsTotal    = detalle?.documentos.length ?? 0;
    const docsCargados = detalle?.documentos.filter(d =>
        d.estado === "CARGADO" || d.estado === "APROBADO"
    ).length ?? 0;
    const tieneDocumentosConArchivo = docsCargados > 0;

    const isOpen = terceroId !== null;

    // ─────────────────────────────────────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────────────────────────────────────
    return (
        <>
            {isOpen && (
                <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
            )}

            <div className={`
                fixed inset-y-0 right-0 z-40
                w-full max-w-[480px]
                bg-background border-l border-border shadow-2xl
                flex flex-col
                transform transition-transform duration-300 ease-in-out
                ${isOpen ? "translate-x-0" : "translate-x-full"}
            `}>
                {/* ── Header ────────────────────────────────────────────── */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
                    <p className="text-[14px] font-semibold text-foreground">
                        Detalle del tercero
                    </p>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* ── Tabs ──────────────────────────────────────────────── */}
                {detalle && !loading && (
                    <div className="flex border-b border-border overflow-x-auto flex-shrink-0">
                        {(["informacion", "documentos", "perfil", "descargas"] as Tab[]).map(tab => {
                            const labels: Record<Tab, string> = {
                                informacion: "Información",
                                documentos:  "Documentos",
                                perfil:      "Perfil",
                                descargas:   "Descargas",
                            };
                            return (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`flex items-center gap-1.5 px-4 py-2.5 text-[12px] font-medium whitespace-nowrap border-b-2 transition-colors ${
                                        activeTab === tab
                                            ? "border-primary text-primary"
                                            : "border-transparent text-muted-foreground hover:text-foreground"
                                    }`}
                                >
                                    {labels[tab]}
                                    {tab === "descargas" && historial && historial.length > 0 && (
                                        <span className="ml-0.5 text-[10px] bg-muted rounded-full px-1.5">
                                            {historial.length}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* ── Cuerpo scrollable ─────────────────────────────────── */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <DetailSkeleton />
                    ) : fetchError ? (
                        <div className="p-5 text-center">
                            <p className="text-[13px] text-destructive">{fetchError}</p>
                            <button
                                onClick={() => terceroId && adminTercerosAPI.getDetalle(terceroId).then(setDetalle)}
                                className="mt-2 text-[13px] text-primary hover:underline"
                            >
                                Reintentar
                            </button>
                        </div>
                    ) : detalle ? (
                        <>
                            {/* ── Tab: Información ──────────────────────── */}
                            {activeTab === "informacion" && (
                                <div className="divide-y divide-border">
                                    {/* Identidad */}
                                    <div className="p-5">
                                        <div className="flex items-start gap-4">
                                            <div className={`h-12 w-12 rounded-full flex items-center justify-center text-[14px] font-bold flex-shrink-0 ${AVATAR_COLOR[detalle.estado] ?? "bg-muted text-muted-foreground"}`}>
                                                {getInitials(detalle.nombre_completo)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[15px] font-semibold text-foreground leading-snug">
                                                    {detalle.nombre_completo}
                                                </p>
                                                <p className="text-[12px] text-muted-foreground mt-0.5">
                                                    {detalle.tipo_documento} {detalle.numero_documento}
                                                    {" · "}
                                                    {detalle.tipo_persona === "NATURAL" ? "Persona natural" : "Persona jurídica"}
                                                </p>
                                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${ESTADO_BADGE[detalle.estado] ?? "bg-muted text-muted-foreground"}`}>
                                                        {ESTADO_LABEL[detalle.estado] ?? detalle.estado}
                                                    </span>
                                                    {detalle.tipos_tercero.map(t => (
                                                        <span key={t.code} className="inline-flex items-center px-1.5 py-0.5 rounded bg-muted text-[10px] font-medium text-foreground">
                                                            {t.nombre}
                                                        </span>
                                                    ))}
                                                </div>
                                                {detalle.fecha_registro && (
                                                    <p className="text-[11px] text-muted-foreground mt-2">
                                                        Registrado el {formatDate(detalle.fecha_registro)}
                                                    </p>
                                                )}
                                                {detalle.aprobado_por && (
                                                    <p className="text-[11px] text-muted-foreground">
                                                        {detalle.estado === "APROBADO" ? "Aprobado" : "Gestionado"} por {detalle.aprobado_por}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Contacto */}
                                    <div className="p-5 space-y-3">
                                        <SectionTitle>Contacto</SectionTitle>
                                        <InfoRow icon={Mail}  label="Email"    value={detalle.email} />
                                        <InfoRow icon={Phone} label="Teléfono" value={detalle.telefono || detalle.celular} />
                                        <InfoRow icon={MapPin} label="Dirección"
                                            value={[detalle.direccion, detalle.ciudad, detalle.departamento]
                                                .filter(Boolean).join(", ")} />
                                    </div>

                                    {/* Empresa */}
                                    <div className="p-5 space-y-3">
                                        <SectionTitle>Empresa</SectionTitle>
                                        <InfoRow icon={Building2} label="Nombre" value={detalle.empresa.nombre} />
                                        <InfoRow icon={FileText}  label="NIT"    value={detalle.empresa.nit} />
                                    </div>

                                    {/* Info adicional */}
                                    {(detalle.informacion_adicional.rl_nombre ||
                                      detalle.informacion_adicional.tes_contacto ||
                                      detalle.informacion_adicional.regimen_tributario) && (
                                        <div className="p-5 space-y-3">
                                            <SectionTitle>Información adicional</SectionTitle>
                                            {detalle.informacion_adicional.rl_nombre && (
                                                <InfoRow icon={User} label="Representante legal"
                                                    value={`${detalle.informacion_adicional.rl_nombre} (${detalle.informacion_adicional.rl_tipo_doc} ${detalle.informacion_adicional.rl_documento})`} />
                                            )}
                                            {detalle.informacion_adicional.tes_contacto && (
                                                <InfoRow icon={User} label="Contacto tesorería"
                                                    value={`${detalle.informacion_adicional.tes_contacto}${detalle.informacion_adicional.tes_cargo ? ` — ${detalle.informacion_adicional.tes_cargo}` : ""}`} />
                                            )}
                                            {detalle.informacion_adicional.regimen_tributario && (
                                                <InfoRow icon={FileText} label="Régimen tributario"
                                                    value={detalle.informacion_adicional.regimen_tributario === "ORDINARIO"
                                                        ? "Régimen Ordinario" : "Régimen Simple"} />
                                            )}
                                        </div>
                                    )}

                                    {/* Observaciones */}
                                    {detalle.observaciones && (
                                        <div className="p-5">
                                            <SectionTitle>Observaciones</SectionTitle>
                                            <p className="text-[12px] text-foreground bg-muted/50 rounded-lg p-3">
                                                {detalle.observaciones}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── Tab: Documentos ───────────────────────── */}
                            {activeTab === "documentos" && (
                                <div className="p-5">
                                    <div className="flex items-center justify-between mb-3">
                                        <SectionTitle>Documentos ({docsCargados}/{docsTotal})</SectionTitle>
                                        <a
                                            href={`/admin/terceros/tercero/${detalle.id}/change/`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1 text-[11px] text-primary hover:underline"
                                        >
                                            <ExternalLink size={11} />
                                            Admin
                                        </a>
                                    </div>
                                    {detalle.documentos.length === 0 ? (
                                        <p className="text-[12px] text-muted-foreground">Sin documentos requeridos configurados.</p>
                                    ) : (
                                        <ul className="space-y-1.5">
                                            {detalle.documentos.map(doc => (
                                                <li key={doc.tipo} className="flex items-center justify-between gap-3 py-1.5 border-b border-border/50 last:border-0">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <DocEstadoIcon estado={doc.estado} />
                                                        <span className="text-[12px] text-foreground truncate">
                                                            {doc.nombre}
                                                            {doc.obligatorio && (
                                                                <span className="text-destructive ml-0.5">*</span>
                                                            )}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2 flex-shrink-0">
                                                        <span className={`text-[11px] font-medium ${DOC_ESTADO_BADGE[doc.estado]}`}>
                                                            {DOC_ESTADO_LABEL[doc.estado]}
                                                        </span>
                                                        {doc.archivo_url && (
                                                            <a
                                                                href={`${API_BASE_URL}${doc.archivo_url}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-primary hover:text-primary/80"
                                                                title="Ver archivo"
                                                            >
                                                                <ExternalLink size={12} />
                                                            </a>
                                                        )}
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            )}

                            {/* ── Tab: Perfil ───────────────────────────── */}
                            {activeTab === "perfil" && (
                                <div className="p-5">
                                    <div className="space-y-2">

                                        <PerfilSection title="Estudios" count={detalle.perfil.estudios.length}>
                                            {detalle.perfil.estudios.map(e => (
                                                <div key={e.id} className="py-2.5">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <p className="text-[12px] font-medium text-foreground">{e.titulo || e.nivel}</p>
                                                            <p className="text-[11px] text-muted-foreground">{e.institucion}</p>
                                                            {(e.fecha_inicio || e.fecha_fin) && (
                                                                <p className="text-[11px] text-muted-foreground">
                                                                    {formatMonthYear(e.fecha_inicio)} — {e.fecha_fin ? formatMonthYear(e.fecha_fin) : "presente"}
                                                                </p>
                                                            )}
                                                        </div>
                                                        {e.soporte_url && (
                                                            <a href={`${API_BASE_URL}${e.soporte_url}`} target="_blank" rel="noopener noreferrer"
                                                                className="text-[11px] text-primary hover:underline flex-shrink-0">Ver</a>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </PerfilSection>

                                        <PerfilSection title="Experiencia" count={detalle.perfil.experiencias.length}>
                                            {detalle.perfil.experiencias.map(e => (
                                                <div key={e.id} className="py-2.5">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <p className="text-[12px] font-medium text-foreground">{e.cargo}</p>
                                                            <p className="text-[11px] text-muted-foreground">{e.empresa}</p>
                                                            {(e.fecha_inicio || e.fecha_fin) && (
                                                                <p className="text-[11px] text-muted-foreground">
                                                                    {formatMonthYear(e.fecha_inicio)} — {e.fecha_fin ? formatMonthYear(e.fecha_fin) : "presente"}
                                                                </p>
                                                            )}
                                                        </div>
                                                        {e.soporte_url && (
                                                            <a href={`${API_BASE_URL}${e.soporte_url}`} target="_blank" rel="noopener noreferrer"
                                                                className="text-[11px] text-primary hover:underline flex-shrink-0">Ver</a>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </PerfilSection>

                                        <PerfilSection title="Certificaciones" count={detalle.perfil.certificaciones.length}>
                                            {detalle.perfil.certificaciones.map(c => (
                                                <div key={c.id} className="py-2.5">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <p className="text-[12px] font-medium text-foreground">{c.nombre}</p>
                                                            {c.fabricante && <p className="text-[11px] text-muted-foreground">{c.fabricante}</p>}
                                                            {c.fecha && <p className="text-[11px] text-muted-foreground">{formatMonthYear(c.fecha)}</p>}
                                                        </div>
                                                        {c.soporte_url && (
                                                            <a href={`${API_BASE_URL}${c.soporte_url}`} target="_blank" rel="noopener noreferrer"
                                                                className="text-[11px] text-primary hover:underline flex-shrink-0">Ver</a>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </PerfilSection>

                                        <PerfilSection title="Cursos" count={detalle.perfil.cursos.length}>
                                            {detalle.perfil.cursos.map(c => (
                                                <div key={c.id} className="py-2.5">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <p className="text-[12px] font-medium text-foreground">{c.nombre}</p>
                                                            {c.entidad && <p className="text-[11px] text-muted-foreground">{c.entidad}</p>}
                                                            {c.horas != null && <p className="text-[11px] text-muted-foreground">{c.horas} horas</p>}
                                                        </div>
                                                        {c.soporte_url && (
                                                            <a href={`${API_BASE_URL}${c.soporte_url}`} target="_blank" rel="noopener noreferrer"
                                                                className="text-[11px] text-primary hover:underline flex-shrink-0">Ver</a>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </PerfilSection>

                                        <PerfilSection title="Idiomas" count={detalle.perfil.idiomas.length}>
                                            {detalle.perfil.idiomas.map(i => (
                                                <div key={i.id} className="py-2 flex items-center justify-between">
                                                    <p className="text-[12px] text-foreground">{i.idioma}</p>
                                                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${NIVEL_BADGE[i.nivel] ?? "bg-muted text-muted-foreground"}`}>
                                                        {NIVEL_LABEL[i.nivel] ?? i.nivel}
                                                    </span>
                                                </div>
                                            ))}
                                        </PerfilSection>

                                        {detalle.perfil.seguridad_social !== null && (
                                            <div className="border border-border rounded-lg px-3 py-2.5">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-[13px] font-medium text-foreground">Seguridad social</span>
                                                    <CheckCircle size={14} className="text-success" />
                                                </div>
                                                <div className="grid grid-cols-3 gap-2">
                                                    {([
                                                        { label: "EPS", val: detalle.perfil.seguridad_social.eps },
                                                        { label: "ARL", val: detalle.perfil.seguridad_social.arl },
                                                        { label: "AFP", val: detalle.perfil.seguridad_social.afp },
                                                    ] as const).filter(f => f.val).map(({ label, val }) => (
                                                        <div key={label}>
                                                            <p className="text-[10px] text-muted-foreground">{label}</p>
                                                            <p className="text-[11px] font-medium text-foreground">{val}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                                {detalle.perfil.seguridad_social.soporte_url && (
                                                    <a
                                                        href={`${API_BASE_URL}${detalle.perfil.seguridad_social.soporte_url}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-[11px] text-primary hover:underline mt-1.5 inline-block"
                                                    >
                                                        Ver soporte
                                                    </a>
                                                )}
                                            </div>
                                        )}

                                    </div>
                                </div>
                            )}

                            {/* ── Tab: Descargas ────────────────────────── */}
                            {activeTab === "descargas" && (
                                <div className="p-5">
                                    {loadingHistorial ? (
                                        <HistorialSkeleton />
                                    ) : !historial || historial.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-12 text-center">
                                            <Download size={28} className="text-muted-foreground/30 mb-3" />
                                            <p className="text-[13px] text-muted-foreground">Sin descargas registradas</p>
                                        </div>
                                    ) : (
                                        <div>
                                            {historial.map((d, idx) => (
                                                <div key={d.id}>
                                                    <div className="flex items-start gap-3 py-3">
                                                        <div className="mt-0.5 flex-shrink-0 h-7 w-7 rounded-full bg-muted flex items-center justify-center">
                                                            <Download size={13} className="text-muted-foreground" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-[12px] font-medium text-foreground">
                                                                {d.usuario}
                                                                <span className="text-muted-foreground font-normal ml-1.5">
                                                                    · {formatDateTime(d.fecha)}
                                                                </span>
                                                            </p>
                                                            <p className="text-[12px] text-foreground mt-0.5 italic">
                                                                "{d.motivo}"
                                                            </p>
                                                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                                                {d.cantidad_archivos} {d.cantidad_archivos === 1 ? "archivo descargado" : "archivos descargados"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    {idx < historial.length - 1 && (
                                                        <Separator />
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    ) : null}
                </div>

                {/* ── Footer de acciones ────────────────────────────────── */}
                {detalle && !loading && (
                    <div className="border-t border-border p-4 flex-shrink-0 bg-background">
                        {rejectMode ? (
                            <div className="space-y-3">
                                <div>
                                    <label className="text-[12px] font-medium text-foreground mb-1.5 block">
                                        Motivo del rechazo <span className="text-destructive">*</span>
                                    </label>
                                    <textarea
                                        value={motivo}
                                        onChange={e => { setMotivo(e.target.value); setMotivoError(""); }}
                                        placeholder="Ej: Documentos incompletos o información incorrecta..."
                                        rows={3}
                                        className={`w-full text-[13px] px-3 py-2 rounded-lg border bg-background resize-none focus:outline-none focus:ring-1 focus:ring-ring transition-colors ${motivoError ? "border-destructive" : "border-input"}`}
                                    />
                                    {motivoError && (
                                        <p className="text-[11px] text-destructive mt-1">{motivoError}</p>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1"
                                        onClick={() => { setRejectMode(false); setMotivo(""); setMotivoError(""); }}
                                        disabled={actionLoading}
                                    >
                                        Cancelar
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        className="flex-1"
                                        onClick={handleRechazar}
                                        disabled={actionLoading}
                                    >
                                        {actionLoading
                                            ? <Loader2 size={13} className="animate-spin" />
                                            : "Confirmar rechazo"
                                        }
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col sm:flex-row gap-2">
                                {detalle.estado === "APROBADO" && tieneDocumentosConArchivo && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="sm:flex-none"
                                        onClick={() => setShowDescargaModal(true)}
                                    >
                                        <Download size={14} className="mr-1.5" />
                                        Descargar documentos
                                    </Button>
                                )}
                                <div className="flex gap-2 flex-1">
                                    {detalle.estado !== "RECHAZADO" && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1 text-destructive border-destructive/30 hover:bg-destructive/5"
                                            onClick={() => setRejectMode(true)}
                                            disabled={actionLoading}
                                        >
                                            <XCircle size={14} className="mr-1.5" />
                                            Rechazar
                                        </Button>
                                    )}
                                    {detalle.estado !== "APROBADO" && (
                                        <Button
                                            size="sm"
                                            className="flex-1 bg-success hover:bg-success/90 text-white"
                                            onClick={() => setConfirmAprobar(true)}
                                            disabled={actionLoading}
                                        >
                                            <CheckCircle size={14} className="mr-1.5" />
                                            Aprobar
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modal de descarga con auditoría */}
            {detalle && (
                <DescargaDocumentosModal
                    open={showDescargaModal}
                    onClose={handleDescargaClose}
                    terceroId={detalle.id}
                    nombreArchivo={detalle.numero_documento}
                />
            )}

            {/* ConfirmDialog */}
            <ConfirmDialog
                open={confirmAprobar}
                title="Aprobar tercero"
                description={`¿Confirmas la aprobación de "${detalle?.nombre_completo}"? Esta acción cambiará el estado a Aprobado.`}
                confirmLabel={actionLoading ? "Aprobando..." : "Sí, aprobar"}
                cancelLabel="Cancelar"
                onConfirm={handleAprobar}
                onCancel={() => setConfirmAprobar(false)}
            />
        </>
    );
}
