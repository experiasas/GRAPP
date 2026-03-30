import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
    Search, ChevronLeft, ChevronRight, X, FileText,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    adminCuentasCobroAPI,
    type CuentaCobroListItem,
    type CuentaCobroListResponse,
} from "@/lib/adminCuentasCobroApi";
import { CuentaCobroDetailPanel } from "@/components/admin/CuentaCobroDetailPanel";

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

const URGENCIA_DOT: Record<string, string> = {
    alta:  "bg-destructive",
    media: "bg-warning",
    baja:  "bg-muted-foreground",
};

const fmt = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
});

// ─────────────────────────────────────────────────────────────────────────────
// Sub-componentes
// ─────────────────────────────────────────────────────────────────────────────

function EstadoBadge({ estado }: { estado: string }) {
    const cls = ESTADO_BADGE[estado] ?? "bg-muted text-muted-foreground";
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${cls}`}>
            {ESTADO_LABEL[estado] ?? estado}
        </span>
    );
}

function UrgenciaDot({ urgencia }: { urgencia: string }) {
    const dot = URGENCIA_DOT[urgencia] ?? "bg-muted-foreground";
    return (
        <span
            title={`Urgencia ${urgencia}`}
            className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${dot}`}
        />
    );
}

function SkeletonRows({ count = 10 }: { count?: number }) {
    return (
        <>
            {Array.from({ length: count }).map((_, i) => (
                <tr key={i} className="border-b border-border">
                    <td className="px-4 py-3">
                        <div className="space-y-1.5">
                            <Skeleton className="h-3.5 w-24" />
                            <Skeleton className="h-3 w-16" />
                        </div>
                    </td>
                    <td className="px-4 py-3"><Skeleton className="h-3.5 w-36" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-3.5 w-24" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-3.5 w-20" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-5 w-20 rounded" /></td>
                </tr>
            ))}
        </>
    );
}

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
                Mostrando{" "}
                <span className="font-medium text-foreground">{from}–{to}</span>{" "}
                de <span className="font-medium text-foreground">{count}</span>
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
                    ),
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

const PAGE_SIZE = 20;

export default function CuentasCobroListPage() {
    const [searchParams, setSearchParams] = useSearchParams();

    // ── Filtros ──────────────────────────────────────────────────────────────
    const [searchInput, setSearchInput] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [estadoFilter, setEstadoFilter] = useState("");
    const [periodoFilter, setPeriodoFilter] = useState("");
    const [page, setPage] = useState(1);

    // ── Datos ────────────────────────────────────────────────────────────────
    const [data, setData]       = useState<CuentaCobroListResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState<string | null>(null);

    // ── Panel detalle ────────────────────────────────────────────────────────
    const [selectedId, setSelectedId] = useState<number | null>(null);

    // ── Query params al montar ───────────────────────────────────────────────
    useEffect(() => {
        const highlightId = searchParams.get("highlight");
        const estadoParam  = searchParams.get("estado");

        if (highlightId) setSelectedId(Number(highlightId));
        if (estadoParam)  setEstadoFilter(estadoParam);

        if (highlightId || estadoParam) {
            setSearchParams({}, { replace: true });
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Debounce búsqueda ────────────────────────────────────────────────────
    useEffect(() => {
        const t = setTimeout(() => {
            setDebouncedSearch(searchInput);
            setPage(1);
        }, 300);
        return () => clearTimeout(t);
    }, [searchInput]);

    // Reset página al cambiar filtros
    useEffect(() => { setPage(1); }, [estadoFilter, periodoFilter]);

    // ── Fetch ────────────────────────────────────────────────────────────────
    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await adminCuentasCobroAPI.list({
                page,
                page_size: PAGE_SIZE,
                ...(debouncedSearch && { search: debouncedSearch }),
                ...(estadoFilter    && { estado: estadoFilter }),
                ...(periodoFilter   && { periodo: periodoFilter }),
            });
            setData(res);
        } catch {
            setError("No se pudo cargar la lista de cuentas de cobro.");
        } finally {
            setLoading(false);
        }
    }, [page, debouncedSearch, estadoFilter, periodoFilter]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // ── Helpers ──────────────────────────────────────────────────────────────
    const hasFilters = searchInput || estadoFilter || periodoFilter;

    function clearFilters() {
        setSearchInput("");
        setEstadoFilter("");
        setPeriodoFilter("");
        setPage(1);
    }

    function handleEstadoChanged() {
        fetchData();
        setSelectedId(null);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-5">

            {/* ── Header ─────────────────────────────────────────────────── */}
            <div>
                <h1 className="text-xl font-semibold text-foreground">Cuentas de cobro</h1>
                <p className="text-[13px] text-muted-foreground mt-0.5">
                    {data
                        ? `Revisión y aprobación de facturas · ${data.count} registros`
                        : "Revisión y aprobación de facturas"}
                </p>
            </div>

            {/* ── Filtros ─────────────────────────────────────────────────── */}
            <Card className="p-3 border-border shadow-sm">
                <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                        <Input
                            value={searchInput}
                            onChange={e => setSearchInput(e.target.value)}
                            placeholder="Buscar por número, concepto o tercero..."
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

                <div className="flex flex-wrap items-center gap-2 mt-2">
                    <Select value={estadoFilter || "__all__"} onValueChange={v => setEstadoFilter(v === "__all__" ? "" : v)}>
                        <SelectTrigger className="h-8 w-[150px] text-[13px]">
                            <SelectValue placeholder="Estado" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="__all__">Todos los estados</SelectItem>
                            <SelectItem value="RADICADA">Radicada</SelectItem>
                            <SelectItem value="EN_REVISION">En revisión</SelectItem>
                            <SelectItem value="APROBADA">Aprobada</SelectItem>
                            <SelectItem value="RECHAZADA">Rechazada</SelectItem>
                            <SelectItem value="PAGADA">Pagada</SelectItem>
                        </SelectContent>
                    </Select>

                    <Input
                        value={periodoFilter}
                        onChange={e => setPeriodoFilter(e.target.value)}
                        placeholder="Periodo (ej. 2025-03)"
                        className="h-8 w-[180px] text-[13px]"
                    />

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
                                <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                    Cuenta
                                </th>
                                <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                    Tercero
                                </th>
                                <th className="px-4 py-3 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider w-[140px]">
                                    Valor total
                                </th>
                                <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider w-[120px]">
                                    Período
                                </th>
                                <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider w-[120px]">
                                    Estado
                                </th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-border">
                            {loading ? (
                                <SkeletonRows count={10} />
                            ) : data && data.results.length > 0 ? (
                                data.results.map((c: CuentaCobroListItem) => (
                                    <tr
                                        key={c.id}
                                        onClick={() => setSelectedId(c.id)}
                                        className="hover:bg-muted/50 cursor-pointer transition-colors"
                                    >
                                        {/* Cuenta */}
                                        <td className="px-4 py-3 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <UrgenciaDot urgencia={c.urgencia} />
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <p className="text-[13px] font-semibold text-foreground">
                                                            {c.numero}
                                                        </p>
                                                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${c.tipo_documento === 'FACTURA' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                                            {c.tipo_documento_label}
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] text-muted-foreground truncate max-w-[220px]">
                                                        {c.concepto}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Tercero */}
                                        <td className="px-4 py-3">
                                            <p className="text-[13px] text-foreground">{c.tercero_nombre}</p>
                                            <p className="text-[11px] text-muted-foreground">
                                                {c.tipo_documento} · {c.dias_pendiente}d pendiente
                                            </p>
                                        </td>

                                        {/* Valor */}
                                        <td className="px-4 py-3 text-right w-[140px]">
                                            <p className="text-[13px] font-semibold text-foreground tabular-nums">
                                                {fmt.format(c.valor_total)}
                                            </p>
                                        </td>

                                        {/* Período */}
                                        <td className="px-4 py-3 w-[120px]">
                                            <p className="text-[13px] text-foreground">{c.periodo}</p>
                                        </td>

                                        {/* Estado */}
                                        <td className="px-4 py-3 w-[120px]">
                                            <EstadoBadge estado={c.estado} />
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-4 py-16 text-center">
                                        <FileText size={36} className="text-muted-foreground mx-auto mb-3" />
                                        <p className="text-[14px] font-medium text-foreground">
                                            {hasFilters
                                                ? "No se encontraron cuentas con esos filtros"
                                                : "No hay cuentas de cobro radicadas"}
                                        </p>
                                        <p className="text-[12px] text-muted-foreground mt-1">
                                            {hasFilters
                                                ? "Intenta con otros criterios"
                                                : "Las cuentas aparecerán aquí cuando los terceros las radiquen"}
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
                            page={page}
                            pages={data.pages}
                            count={data.count}
                            pageSize={PAGE_SIZE}
                            onPageChange={setPage}
                        />
                    </div>
                )}
            </Card>

            {/* ── Panel de detalle ────────────────────────────────────────── */}
            <CuentaCobroDetailPanel
                cuentaId={selectedId}
                onClose={() => setSelectedId(null)}
                onEstadoChanged={handleEstadoChanged}
            />
        </div>
    );
}
