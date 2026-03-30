import { useState, useEffect, useCallback } from "react";
import {
    Search, FileText, ChevronLeft, ChevronRight, X, Plus, Filter,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    adminContratosAPI,
    type ContratoListItem,
    type PaginatedContratosResponse,
    type EstadoContrato,
    type PrioridadContrato,
    ESTADO_CONTRATO_LABELS,
    PRIORIDAD_LABELS,
} from "@/lib/adminContratosApi";
import { ContratoDetailPanel } from "@/components/admin/ContratoDetailPanel";
import { ContratoFormModal } from "@/components/admin/ContratoFormModal";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("es-CO", {
        day: "2-digit", month: "short", year: "numeric",
    });
}

function formatMoney(value: string): string {
    const n = parseFloat(value);
    if (isNaN(n)) return "—";
    return new Intl.NumberFormat("es-CO", {
        style: "currency", currency: "COP",
        minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(n);
}

// ─────────────────────────────────────────────────────────────────────────────
// Badges
// ─────────────────────────────────────────────────────────────────────────────

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

const PRIORIDAD_COLORS: Record<PrioridadContrato, string> = {
    ALTA:  "text-red-600 dark:text-red-400",
    MEDIA: "text-amber-600 dark:text-amber-400",
    BAJA:  "text-muted-foreground",
};

function EstadoBadge({ estado }: { estado: EstadoContrato }) {
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${ESTADO_COLORS[estado]}`}>
            {ESTADO_CONTRATO_LABELS[estado]}
        </span>
    );
}

function PrioridadDot({ prioridad }: { prioridad: PrioridadContrato }) {
    return (
        <span className={`text-[12px] font-medium ${PRIORIDAD_COLORS[prioridad]}`}>
            {PRIORIDAD_LABELS[prioridad]}
        </span>
    );
}

function DiasRestantes({ dias }: { dias: number | null }) {
    if (dias === null) return <span className="text-muted-foreground text-[12px]">—</span>;
    if (dias < 0)   return <span className="text-[12px] font-medium text-red-600">Vencido</span>;
    if (dias <= 30) return <span className="text-[12px] font-medium text-amber-600">{dias}d</span>;
    return <span className="text-[12px] text-muted-foreground">{dias}d</span>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton
// ─────────────────────────────────────────────────────────────────────────────

function SkeletonRows({ count = 8 }: { count?: number }) {
    return (
        <>
            {Array.from({ length: count }).map((_, i) => (
                <tr key={i} className="border-b border-border">
                    <td className="px-4 py-3"><Skeleton className="h-3.5 w-24 mb-1" /><Skeleton className="h-3 w-36" /></td>
                    <td className="px-4 py-3 hidden md:table-cell"><Skeleton className="h-3.5 w-32" /></td>
                    <td className="px-4 py-3 hidden lg:table-cell"><Skeleton className="h-3.5 w-24" /></td>
                    <td className="px-4 py-3 hidden xl:table-cell"><Skeleton className="h-3.5 w-20" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-5 w-16 rounded" /></td>
                    <td className="px-4 py-3 hidden sm:table-cell"><Skeleton className="h-3.5 w-12" /></td>
                    <td className="px-4 py-3 hidden lg:table-cell"><Skeleton className="h-3.5 w-20" /></td>
                    <td className="px-4 py-3 hidden xl:table-cell"><Skeleton className="h-3.5 w-10" /></td>
                </tr>
            ))}
        </>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Paginación
// ─────────────────────────────────────────────────────────────────────────────

function Pagination({
    page, pages, count, pageSize, onPageChange,
}: { page: number; pages: number; count: number; pageSize: number; onPageChange: (p: number) => void }) {
    if (pages <= 1) return null;
    const from = (page - 1) * pageSize + 1;
    const to   = Math.min(page * pageSize, count);
    const range: (number | "…")[] = [];
    for (let i = 1; i <= pages; i++) {
        if (i === 1 || i === pages || Math.abs(i - page) <= 1) range.push(i);
        else if (range[range.length - 1] !== "…") range.push("…");
    }
    return (
        <div className="flex items-center justify-between px-1 pt-4 border-t border-border">
            <p className="text-[12px] text-muted-foreground">
                Mostrando <span className="font-medium text-foreground">{from}–{to}</span> de{" "}
                <span className="font-medium text-foreground">{count}</span>
            </p>
            <div className="flex items-center gap-1">
                <button disabled={page === 1} onClick={() => onPageChange(page - 1)}
                    className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                    <ChevronLeft size={15} />
                </button>
                {range.map((item, i) =>
                    item === "…"
                        ? <span key={`el-${i}`} className="px-2 text-[12px] text-muted-foreground">…</span>
                        : <button key={item} onClick={() => onPageChange(item as number)}
                            className={`w-7 h-7 rounded-lg text-[12px] font-medium transition-colors ${
                                item === page ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground"
                            }`}>{item}</button>
                )}
                <button disabled={page === pages} onClick={() => onPageChange(page + 1)}
                    className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                    <ChevronRight size={15} />
                </button>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Página principal
// ─────────────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

const ESTADOS: { value: EstadoContrato | ""; label: string }[] = [
    { value: "", label: "Todos los estados" },
    { value: "BORRADOR",   label: "Borrador" },
    { value: "FIRMADO",    label: "Firmado" },
    { value: "VIGENTE",    label: "Vigente" },
    { value: "SUSPENDIDO", label: "Suspendido" },
    { value: "LIQUIDADO",  label: "Liquidado" },
    { value: "FINALIZADO", label: "Finalizado" },
    { value: "ANULADO",    label: "Anulado" },
];

const PRIORIDADES: { value: PrioridadContrato | ""; label: string }[] = [
    { value: "", label: "Todas las prioridades" },
    { value: "ALTA",  label: "Alta" },
    { value: "MEDIA", label: "Media" },
    { value: "BAJA",  label: "Baja" },
];

export default function ContratosListPage() {
    const [searchInput, setSearchInput]       = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [filterEstado, setFilterEstado]     = useState<EstadoContrato | "">("");
    const [filterPrioridad, setFilterPrioridad] = useState<PrioridadContrato | "">("");
    const [page, setPage]                     = useState(1);

    const [data, setData]       = useState<PaginatedContratosResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState<string | null>(null);

    const [selectedId, setSelectedId]           = useState<number | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingId, setEditingId]             = useState<number | null>(null);

    // Debounce búsqueda
    useEffect(() => {
        const t = setTimeout(() => { setDebouncedSearch(searchInput); setPage(1); }, 300);
        return () => clearTimeout(t);
    }, [searchInput]);

    // Reset page al cambiar filtros
    useEffect(() => { setPage(1); }, [filterEstado, filterPrioridad]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await adminContratosAPI.list({
                page,
                page_size: PAGE_SIZE,
                ...(debouncedSearch ? { search: debouncedSearch } : {}),
                ...(filterEstado    ? { estado: filterEstado }      : {}),
                ...(filterPrioridad ? { prioridad: filterPrioridad } : {}),
            });
            setData(res);
        } catch {
            setError("No se pudo cargar la lista de contratos.");
        } finally {
            setLoading(false);
        }
    }, [page, debouncedSearch, filterEstado, filterPrioridad]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const hasFilters = Boolean(searchInput || filterEstado || filterPrioridad);

    function clearFilters() {
        setSearchInput("");
        setFilterEstado("");
        setFilterPrioridad("");
        setPage(1);
    }

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-5">

            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-xl font-semibold text-foreground">Contratos</h1>
                    <p className="text-[13px] text-muted-foreground mt-0.5">
                        {data ? `Gestión de contratos · ${data.count} registros` : "Gestión de contratos"}
                    </p>
                </div>
                <Button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 shrink-0" size="sm">
                    <Plus size={15} />
                    Nuevo contrato
                </Button>
            </div>

            {/* Filtros */}
            <Card className="p-3 border-border shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative flex-1 min-w-[180px]">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                        <Input
                            value={searchInput}
                            onChange={e => setSearchInput(e.target.value)}
                            placeholder="Buscar por número, objeto o contratista..."
                            className="pl-8 h-9 text-sm"
                        />
                    </div>

                    <div className="flex items-center gap-1.5">
                        <Filter size={13} className="text-muted-foreground" />
                    </div>

                    <select
                        value={filterEstado}
                        onChange={e => setFilterEstado(e.target.value as EstadoContrato | "")}
                        className="h-9 rounded-md border border-input bg-background px-2.5 text-[13px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                        {ESTADOS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>

                    <select
                        value={filterPrioridad}
                        onChange={e => setFilterPrioridad(e.target.value as PrioridadContrato | "")}
                        className="h-9 rounded-md border border-input bg-background px-2.5 text-[13px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                        {PRIORIDADES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>

                    {hasFilters && (
                        <button
                            onClick={clearFilters}
                            className="flex items-center gap-1.5 px-3 h-9 rounded-md text-[13px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                            <X size={13} /> Limpiar
                        </button>
                    )}
                </div>
            </Card>

            {/* Error */}
            {error && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-[13px] text-destructive">
                    {error}
                </div>
            )}

            {/* Tabla */}
            <Card className="border-border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border bg-muted/30">
                                <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                    Contrato
                                </th>
                                <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">
                                    Contratista
                                </th>
                                <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">
                                    Tipo
                                </th>
                                <th className="px-4 py-3 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hidden xl:table-cell">
                                    Valor total
                                </th>
                                <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                    Estado
                                </th>
                                <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">
                                    Prioridad
                                </th>
                                <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">
                                    Vigencia
                                </th>
                                <th className="px-4 py-3 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hidden xl:table-cell">
                                    Días rest.
                                </th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-border">
                            {loading ? (
                                <SkeletonRows count={8} />
                            ) : data && data.results.length > 0 ? (
                                data.results.map((c: ContratoListItem) => (
                                    <tr
                                        key={c.id}
                                        onClick={() => setSelectedId(c.id)}
                                        className="hover:bg-muted/50 cursor-pointer transition-colors"
                                    >
                                        {/* Contrato */}
                                        <td className="px-4 py-3">
                                            <p className="text-[13px] font-medium text-foreground font-mono">
                                                {c.numero}
                                            </p>
                                            <p className="text-[11px] text-muted-foreground truncate max-w-[220px]" title={c.objeto}>
                                                {c.objeto}
                                            </p>
                                            <p className="text-[11px] text-muted-foreground md:hidden truncate max-w-[180px]">
                                                {c.contratista.nombre}
                                            </p>
                                        </td>

                                        {/* Contratista */}
                                        <td className="px-4 py-3 hidden md:table-cell">
                                            <p className="text-[13px] text-foreground truncate max-w-[160px]">
                                                {c.contratista.nombre}
                                            </p>
                                            <p className="text-[11px] text-muted-foreground truncate max-w-[160px]">
                                                {c.empresa.nombre}
                                            </p>
                                        </td>

                                        {/* Tipo */}
                                        <td className="px-4 py-3 hidden lg:table-cell">
                                            <span className="text-[12px] text-muted-foreground">
                                                {c.tipo_contrato?.nombre ?? "—"}
                                            </span>
                                        </td>

                                        {/* Valor */}
                                        <td className="px-4 py-3 text-right hidden xl:table-cell">
                                            <span className="text-[13px] font-medium text-foreground tabular-nums">
                                                {formatMoney(c.valor_total)}
                                            </span>
                                        </td>

                                        {/* Estado */}
                                        <td className="px-4 py-3">
                                            <EstadoBadge estado={c.estado} />
                                        </td>

                                        {/* Prioridad */}
                                        <td className="px-4 py-3 hidden sm:table-cell">
                                            <PrioridadDot prioridad={c.prioridad} />
                                        </td>

                                        {/* Vigencia */}
                                        <td className="px-4 py-3 hidden lg:table-cell">
                                            <p className="text-[12px] text-muted-foreground whitespace-nowrap">
                                                {formatDate(c.fecha_inicio)}
                                            </p>
                                            <p className="text-[11px] text-muted-foreground whitespace-nowrap">
                                                → {formatDate(c.fecha_fin)}
                                            </p>
                                        </td>

                                        {/* Días restantes */}
                                        <td className="px-4 py-3 text-right hidden xl:table-cell">
                                            <DiasRestantes dias={c.dias_restantes} />
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={8} className="px-4 py-16 text-center">
                                        <FileText size={36} className="text-muted-foreground mx-auto mb-3" />
                                        <p className="text-[14px] font-medium text-foreground">
                                            {hasFilters
                                                ? "No se encontraron contratos con esos filtros"
                                                : "No hay contratos registrados aún"}
                                        </p>
                                        <p className="text-[12px] text-muted-foreground mt-1">
                                            {hasFilters
                                                ? "Intenta ajustar los filtros"
                                                : "Usa el botón \"Nuevo contrato\" para crear uno"}
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

                {data && data.pages > 1 && (
                    <div className="px-4 pb-4">
                        <Pagination
                            page={page} pages={data.pages} count={data.count}
                            pageSize={PAGE_SIZE} onPageChange={setPage}
                        />
                    </div>
                )}
            </Card>

            {/* Panel detalle lateral */}
            <ContratoDetailPanel
                contratoId={selectedId}
                onClose={() => setSelectedId(null)}
                onEditRequest={(id) => setEditingId(id)}
                onUpdated={fetchData}
            />

            {/* Modal crear / editar */}
            <ContratoFormModal
                open={showCreateModal || editingId !== null}
                contratoId={editingId}
                onClose={() => { setShowCreateModal(false); setEditingId(null); }}
                onSuccess={() => { setShowCreateModal(false); setEditingId(null); fetchData(); }}
            />

        </div>
    );
}
