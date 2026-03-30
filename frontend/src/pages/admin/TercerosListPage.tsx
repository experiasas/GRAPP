import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
    Search, UserPlus, MoreHorizontal, ExternalLink,
    ChevronLeft, ChevronRight, X, Users,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    adminTercerosAPI,
    type TerceroListItem,
    type PaginatedResponse,
    type TercerosFilterParams,
} from "@/lib/adminTercerosApi";
import { TerceroDetailPanel } from "@/components/admin/TerceroDetailPanel";
import { InvitarTerceroModal } from "@/components/admin/InvitarTerceroModal";

// ─────────────────────────────────────────────────────────────────────────────
// Constantes de display
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

const TIPO_LABEL: Record<string, string> = {
    CONTRATISTA: "Contratista",
    PROVEEDOR:   "Proveedor",
    EMPLEADO:    "Empleado",
    CLIENTE:     "Cliente",
    ASPIRANTE:   "Aspirante",
};

const TIPO_PERSONA_LABEL: Record<string, string> = {
    NATURAL:  "Natural",
    JURIDICA: "Jurídica",
};

// Colores del avatar por estado
const AVATAR_COLOR: Record<string, string> = {
    APROBADO:  "bg-success/10 text-success",
    RECHAZADO: "bg-destructive/10 text-destructive",
    PENDIENTE: "bg-warning/10 text-warning",
    BORRADOR:  "bg-muted text-muted-foreground",
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getInitials(nombre: string): string {
    const words = nombre.trim().split(/\s+/);
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-componentes internos
// ─────────────────────────────────────────────────────────────────────────────

function EstadoBadge({ estado }: { estado: string }) {
    const cls = ESTADO_BADGE[estado] ?? "bg-muted text-muted-foreground";
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${cls}`}>
            {ESTADO_LABEL[estado] ?? estado}
        </span>
    );
}

function TipoBadge({ code }: { code: string }) {
    return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-muted text-[10px] font-medium text-foreground">
            {TIPO_LABEL[code] ?? code}
        </span>
    );
}

function DocProgress({ completos, total }: { completos: number; total: number }) {
    if (total === 0) return <span className="text-[12px] text-muted-foreground">—</span>;
    const pct = Math.round((completos / total) * 100);
    const colorBar = completos === total
        ? "bg-success"
        : completos > 0 ? "bg-warning" : "bg-muted";
    const colorText = completos === total
        ? "text-success"
        : completos > 0 ? "text-warning" : "text-muted-foreground";

    return (
        <div className="flex flex-col items-start gap-1 min-w-[48px]">
            <span className={`text-[12px] font-semibold tabular-nums ${colorText}`}>
                {completos}/{total}
            </span>
            <div className="w-full h-1 rounded-full bg-border overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all ${colorBar}`}
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    );
}

// ─── Menú de acciones por fila ────────────────────────────────────────────────
interface ActionsMenuProps {
    tercero: TerceroListItem;
    onVerDetalle: () => void;
    onAprobar: () => void;
    onRechazar: () => void;
}

function ActionsMenu({ tercero, onVerDetalle, onAprobar, onRechazar }: ActionsMenuProps) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        function handler(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [open]);

    return (
        <div ref={ref} className="relative" onClick={e => e.stopPropagation()}>
            <button
                onClick={() => setOpen(o => !o)}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title="Acciones"
            >
                <MoreHorizontal size={15} />
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-border rounded-xl shadow-lg z-20 py-1 overflow-hidden">
                    <button
                        onClick={() => { onVerDetalle(); setOpen(false); }}
                        className="w-full text-left px-3 py-2 text-[13px] text-foreground hover:bg-muted/60 transition-colors"
                    >
                        Ver detalle
                    </button>

                    {tercero.estado !== "APROBADO" && (
                        <button
                            onClick={() => { onAprobar(); setOpen(false); }}
                            className="w-full text-left px-3 py-2 text-[13px] text-success hover:bg-success/5 transition-colors"
                        >
                            Aprobar
                        </button>
                    )}

                    {tercero.estado !== "RECHAZADO" && (
                        <button
                            onClick={() => { onRechazar(); setOpen(false); }}
                            className="w-full text-left px-3 py-2 text-[13px] text-destructive hover:bg-destructive/5 transition-colors"
                        >
                            Rechazar
                        </button>
                    )}

                    <div className="h-px bg-border my-1" />

                    <a
                        href={`/admin/terceros/tercero/${tercero.id}/change/`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-2 text-[13px] text-muted-foreground hover:bg-muted/60 transition-colors"
                        onClick={() => setOpen(false)}
                    >
                        <ExternalLink size={12} />
                        Abrir en Django admin
                    </a>
                </div>
            )}
        </div>
    );
}

// ─── Filas skeleton de carga ──────────────────────────────────────────────────
function SkeletonRows({ count = 8 }: { count?: number }) {
    return (
        <>
            {Array.from({ length: count }).map((_, i) => (
                <tr key={i} className="border-b border-border">
                    <td className="px-4 py-3 w-10"><Skeleton className="h-4 w-4 rounded" /></td>
                    <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                            <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                            <div className="space-y-1.5">
                                <Skeleton className="h-3.5 w-36" />
                                <Skeleton className="h-3 w-24" />
                                <Skeleton className="h-3 w-40" />
                            </div>
                        </div>
                    </td>
                    <td className="px-4 py-3 w-[110px]"><Skeleton className="h-5 w-20 rounded" /></td>
                    <td className="px-4 py-3 w-[70px]"><Skeleton className="h-5 w-10 rounded" /></td>
                    <td className="px-4 py-3 w-[110px]"><Skeleton className="h-5 w-16 rounded" /></td>
                    <td className="px-4 py-3 w-10"><Skeleton className="h-6 w-6 rounded" /></td>
                </tr>
            ))}
        </>
    );
}

// ─── Paginación ───────────────────────────────────────────────────────────────
interface PaginationProps {
    page: number;
    pages: number;
    count: number;
    pageSize: number;
    onPageChange: (p: number) => void;
}

function Pagination({ page, pages, count, pageSize, onPageChange }: PaginationProps) {
    if (pages <= 1) return null;

    const from = (page - 1) * pageSize + 1;
    const to   = Math.min(page * pageSize, count);

    // Genera el rango de páginas visible
    const range: (number | "…")[] = [];
    for (let i = 1; i <= pages; i++) {
        if (i === 1 || i === pages || Math.abs(i - page) <= 1) {
            range.push(i);
        } else if (range[range.length - 1] !== "…") {
            range.push("…");
        }
    }

    return (
        <div className="flex items-center justify-between px-1 pt-4 border-t border-border">
            <p className="text-[12px] text-muted-foreground">
                Mostrando <span className="font-medium text-foreground">{from}–{to}</span> de{" "}
                <span className="font-medium text-foreground">{count}</span>
            </p>

            <div className="flex items-center gap-1">
                <button
                    disabled={page === 1}
                    onClick={() => onPageChange(page - 1)}
                    className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                    <ChevronLeft size={15} />
                </button>

                {range.map((item, i) =>
                    item === "…" ? (
                        <span key={`el-${i}`} className="px-2 text-[12px] text-muted-foreground">…</span>
                    ) : (
                        <button
                            key={item}
                            onClick={() => onPageChange(item as number)}
                            className={`w-7 h-7 rounded-lg text-[12px] font-medium transition-colors ${
                                item === page
                                    ? "bg-primary text-primary-foreground"
                                    : "hover:bg-muted text-foreground"
                            }`}
                        >
                            {item}
                        </button>
                    )
                )}

                <button
                    disabled={page === pages}
                    onClick={() => onPageChange(page + 1)}
                    className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                    <ChevronRight size={15} />
                </button>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Página principal
// ─────────────────────────────────────────────────────────────────────────────

interface ConfirmState {
    open: boolean;
    terceroId: number | null;
    accion: "APROBADO" | "RECHAZADO" | null;
    nombre: string;
}

const CONFIRM_INITIAL: ConfirmState = {
    open: false, terceroId: null, accion: null, nombre: "",
};

export default function TercerosListPage() {
    const [searchParams, setSearchParams] = useSearchParams();

    // ── Filtros ──────────────────────────────────────────────────────────────
    const [searchInput, setSearchInput]     = useState("");
    const [estadoFilter, setEstadoFilter]   = useState("");
    const [tipoFilter, setTipoFilter]       = useState("");
    const [personaFilter, setPersonaFilter] = useState("");
    const [page, setPage]                   = useState(1);
    const PAGE_SIZE = 20;

    // ── Datos ────────────────────────────────────────────────────────────────
    const [data, setData]       = useState<PaginatedResponse<TerceroListItem> | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState<string | null>(null);

    // ── Panel detalle y modal invitación ─────────────────────────────────────
    const [selectedId, setSelectedId]           = useState<number | null>(null);
    const [showInviteModal, setShowInviteModal] = useState(false);

    // ── Query params al montar: highlight + estado ───────────────────────────
    useEffect(() => {
        const highlightId = searchParams.get("highlight");
        const estadoParam = searchParams.get("estado");

        if (highlightId) setSelectedId(Number(highlightId));
        if (estadoParam) setEstadoFilter(estadoParam);

        if (highlightId || estadoParam) {
            setSearchParams({}, { replace: true });
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Confirmación de acciones rápidas ────────────────────────────────────
    const [confirm, setConfirm] = useState<ConfirmState>(CONFIRM_INITIAL);
    const [actionLoading, setActionLoading] = useState(false);

    // ── Búsqueda con debounce 300ms ──────────────────────────────────────────
    const [debouncedSearch, setDebouncedSearch] = useState("");
    useEffect(() => {
        const t = setTimeout(() => {
            setDebouncedSearch(searchInput);
            setPage(1);
        }, 300);
        return () => clearTimeout(t);
    }, [searchInput]);

    // Resetear página al cambiar cualquier filtro rápido
    useEffect(() => { setPage(1); }, [estadoFilter, tipoFilter, personaFilter]);

    // ── Fetch ────────────────────────────────────────────────────────────────
    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params: TercerosFilterParams = {
                page,
                page_size: PAGE_SIZE,
                ordering: "-fecha_registro",
            };
            if (debouncedSearch) params.search       = debouncedSearch;
            if (estadoFilter)    params.estado       = estadoFilter;
            if (tipoFilter)      params.tipo_tercero = tipoFilter;
            if (personaFilter)   params.tipo_persona = personaFilter;

            const res = await adminTercerosAPI.list(params);
            setData(res);
        } catch {
            setError("No se pudo cargar la lista de terceros.");
        } finally {
            setLoading(false);
        }
    }, [page, debouncedSearch, estadoFilter, tipoFilter, personaFilter]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // ── Limpiar filtros ──────────────────────────────────────────────────────
    const hasFilters = searchInput || estadoFilter || tipoFilter || personaFilter;
    function clearFilters() {
        setSearchInput("");
        setEstadoFilter("");
        setTipoFilter("");
        setPersonaFilter("");
        setPage(1);
    }

    // ── Acción rápida de aprobación ──────────────────────────────────────────
    async function handleConfirmAction() {
        if (!confirm.terceroId || !confirm.accion) return;
        setActionLoading(true);
        try {
            await adminTercerosAPI.cambiarEstado(confirm.terceroId, {
                estado: confirm.accion,
            });
            setConfirm(CONFIRM_INITIAL);
            fetchData();
        } catch {
            // el interceptor de axios ya muestra el error; solo cerramos
            setConfirm(CONFIRM_INITIAL);
        } finally {
            setActionLoading(false);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-5">

            {/* ── Header ─────────────────────────────────────────────────── */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-xl font-semibold text-foreground">Terceros</h1>
                    <p className="text-[13px] text-muted-foreground mt-0.5">
                        {data
                            ? `Gestión de terceros vinculados · ${data.count} registros`
                            : "Gestión de terceros vinculados"}
                    </p>
                </div>
                <Button
                    onClick={() => setShowInviteModal(true)}
                    className="flex items-center gap-2 shrink-0"
                    size="sm"
                >
                    <UserPlus size={15} />
                    Invitar tercero
                </Button>
            </div>

            {/* ── Barra de filtros ────────────────────────────────────────── */}
            <Card className="p-3 border-border shadow-sm">
                {/* Fila 1: búsqueda + limpiar */}
                <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                        <Input
                            value={searchInput}
                            onChange={e => setSearchInput(e.target.value)}
                            placeholder="Buscar por nombre, documento o email..."
                            className="pl-8 h-9 text-sm"
                        />
                    </div>
                    {hasFilters && (
                        <button
                            onClick={clearFilters}
                            className="flex items-center gap-1.5 px-3 h-9 rounded-md text-[13px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
                        >
                            <X size={13} />
                            <span className="hidden sm:inline">Limpiar</span>
                        </button>
                    )}
                </div>

                {/* Fila 2: selects (siempre visibles, se envuelven en móvil) */}
                <div className="flex flex-wrap items-center gap-2 mt-2">
                    {/* Estado */}
                    <Select value={estadoFilter || "__all__"} onValueChange={v => setEstadoFilter(v === "__all__" ? "" : v)}>
                        <SelectTrigger className="h-8 w-[140px] text-[13px]">
                            <SelectValue placeholder="Estado" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="__all__">Todos los estados</SelectItem>
                            <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                            <SelectItem value="APROBADO">Aprobado</SelectItem>
                            <SelectItem value="RECHAZADO">Rechazado</SelectItem>
                            <SelectItem value="BORRADOR">Borrador</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Tipo */}
                    <Select value={tipoFilter || "__all__"} onValueChange={v => setTipoFilter(v === "__all__" ? "" : v)}>
                        <SelectTrigger className="h-8 w-[140px] text-[13px]">
                            <SelectValue placeholder="Tipo" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="__all__">Todos los tipos</SelectItem>
                            <SelectItem value="CONTRATISTA">Contratista</SelectItem>
                            <SelectItem value="PROVEEDOR">Proveedor</SelectItem>
                            <SelectItem value="EMPLEADO">Empleado</SelectItem>
                            <SelectItem value="CLIENTE">Cliente</SelectItem>
                            <SelectItem value="ASPIRANTE">Aspirante</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Persona */}
                    <Select value={personaFilter || "__all__"} onValueChange={v => setPersonaFilter(v === "__all__" ? "" : v)}>
                        <SelectTrigger className="h-8 w-[120px] text-[13px]">
                            <SelectValue placeholder="Persona" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="__all__">Todas</SelectItem>
                            <SelectItem value="NATURAL">Natural</SelectItem>
                            <SelectItem value="JURIDICA">Jurídica</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Contador */}
                    {data && !loading && (
                        <p className="ml-auto text-[12px] text-muted-foreground whitespace-nowrap hidden sm:block">
                            <span className="font-medium text-foreground">
                                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, data.count)}
                            </span>{" "}
                            de <span className="font-medium text-foreground">{data.count}</span>
                        </p>
                    )}
                </div>
            </Card>

            {/* ── Error ───────────────────────────────────────────────────── */}
            {error && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-[13px] text-destructive">
                    {error}
                </div>
            )}

            {/* ── Tabla ───────────────────────────────────────────────────── */}
            <Card className="border-border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border bg-muted/30">
                                <th className="px-4 py-3 w-10" />
                                <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                    Tercero
                                </th>
                                <th className="px-4 py-3 w-[110px] text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                    Tipo
                                </th>
                                <th className="px-4 py-3 w-[70px] text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                    Docs
                                </th>
                                <th className="px-4 py-3 w-[110px] text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                    Estado
                                </th>
                                <th className="px-4 py-3 w-10" />
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-border">
                            {loading ? (
                                <SkeletonRows count={8} />
                            ) : data && data.results.length > 0 ? (
                                data.results.map(t => (
                                    <tr
                                        key={t.id}
                                        onClick={() => setSelectedId(t.id)}
                                        className="hover:bg-muted/50 cursor-pointer transition-colors group"
                                    >
                                        {/* Checkbox */}
                                        <td className="px-4 py-3 w-10" onClick={e => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                className="rounded border-border accent-primary"
                                                onClick={e => e.stopPropagation()}
                                            />
                                        </td>

                                        {/* Tercero — nombre + doc + email */}
                                        <td className="px-4 py-3 min-w-0">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-[11px] font-semibold flex-shrink-0 ${AVATAR_COLOR[t.estado] ?? "bg-muted text-muted-foreground"}`}>
                                                    {getInitials(t.nombre_completo)}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[13px] font-medium text-foreground truncate">
                                                        {t.nombre_completo}
                                                    </p>
                                                    <p className="text-[11px] text-muted-foreground">
                                                        {t.tipo_documento} {t.numero_documento}
                                                        {" · "}
                                                        {TIPO_PERSONA_LABEL[t.tipo_persona] ?? t.tipo_persona}
                                                    </p>
                                                    {t.email && (
                                                        <p className="text-[11px] text-muted-foreground truncate">
                                                            {t.email}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>

                                        {/* Tipo */}
                                        <td className="px-4 py-3 w-[110px]">
                                            <div className="flex flex-wrap gap-1">
                                                {t.tipos_tercero.length > 0
                                                    ? t.tipos_tercero.map(code => (
                                                        <TipoBadge key={code} code={code} />
                                                    ))
                                                    : <span className="text-[12px] text-muted-foreground">—</span>
                                                }
                                            </div>
                                        </td>

                                        {/* Documentos */}
                                        <td className="px-4 py-3 w-[70px]">
                                            <DocProgress
                                                completos={t.documentos_completos}
                                                total={t.documentos_total}
                                            />
                                        </td>

                                        {/* Estado */}
                                        <td className="px-4 py-3 w-[110px]">
                                            <EstadoBadge estado={t.estado} />
                                        </td>

                                        {/* Acciones */}
                                        <td className="px-4 py-3 w-10" onClick={e => e.stopPropagation()}>
                                            <ActionsMenu
                                                tercero={t}
                                                onVerDetalle={() => setSelectedId(t.id)}
                                                onAprobar={() => setConfirm({
                                                    open: true,
                                                    terceroId: t.id,
                                                    accion: "APROBADO",
                                                    nombre: t.nombre_completo,
                                                })}
                                                onRechazar={() => setSelectedId(t.id)}
                                            />
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-4 py-16 text-center">
                                        <Users size={36} className="text-muted-foreground mx-auto mb-3" />
                                        <p className="text-[14px] font-medium text-foreground">
                                            {hasFilters
                                                ? "No se encontraron terceros con esos filtros"
                                                : "No hay terceros registrados aún"}
                                        </p>
                                        <p className="text-[12px] text-muted-foreground mt-1">
                                            {hasFilters
                                                ? "Intenta con otros criterios de búsqueda"
                                                : "Usa el botón \"Invitar tercero\" para comenzar"}
                                        </p>
                                        {hasFilters && (
                                            <button
                                                onClick={clearFilters}
                                                className="mt-3 text-[13px] text-primary hover:underline"
                                            >
                                                Limpiar filtros
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Paginación */}
                {data && data.pages > 1 && (
                    <div className="px-4 pb-4">
                        <Pagination
                            page={page}
                            pages={data.pages}
                            count={data.count}
                            pageSize={PAGE_SIZE}
                            onPageChange={setPage}
                        />
                    </div>
                )}
            </Card>

            {/* ── Panel de detalle lateral (PASO 6) ─────────────────────── */}
            <TerceroDetailPanel
                terceroId={selectedId}
                onClose={() => setSelectedId(null)}
                onEstadoChanged={fetchData}
            />

            {/* ── Modal invitación (PASO 7) ──────────────────────────────── */}
            <InvitarTerceroModal
                open={showInviteModal}
                onClose={() => setShowInviteModal(false)}
            />

            {/* ── Diálogo de confirmación (Aprobar rápido) ───────────────── */}
            <ConfirmDialog
                open={confirm.open}
                title="Aprobar tercero"
                description={`¿Confirmas la aprobación de "${confirm.nombre}"? Esta acción cambiará el estado a Aprobado.`}
                confirmLabel={actionLoading ? "Aprobando..." : "Sí, aprobar"}
                cancelLabel="Cancelar"
                onConfirm={handleConfirmAction}
                onCancel={() => setConfirm(CONFIRM_INITIAL)}
            />
        </div>
    );
}
