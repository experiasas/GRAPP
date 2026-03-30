import { useState, useEffect, useRef, useCallback } from "react";
import {
    Search, Building2, ChevronLeft, ChevronRight, X, Plus,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    adminEmpresasAPI,
    type EmpresaListItem,
    type PaginatedEmpresasResponse,
} from "@/lib/adminEmpresasApi";
// Los siguientes componentes se crean en PASO 4 y PASO 5
import { EmpresaDetailPanel } from "@/components/admin/EmpresaDetailPanel";
import { EmpresaFormModal } from "@/components/admin/EmpresaFormModal";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getInitials(nombre: string): string {
    const words = nombre.trim().split(/\s+/);
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
}

function formatRelative(isoDate: string): string {
    const diffDays = Math.floor((Date.now() - new Date(isoDate).getTime()) / 86_400_000);
    if (diffDays === 0)  return "Hoy";
    if (diffDays === 1)  return "Ayer";
    if (diffDays < 7)   return `hace ${diffDays}d`;
    if (diffDays < 30)  return `hace ${Math.floor(diffDays / 7)}sem`;
    if (diffDays < 365) return `hace ${Math.floor(diffDays / 30)}m`;
    return `hace ${Math.floor(diffDays / 365)}a`;
}

function formatDateFull(isoDate: string): string {
    return new Date(isoDate).toLocaleDateString("es-CO", {
        day: "2-digit", month: "short", year: "numeric",
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-componentes internos
// ─────────────────────────────────────────────────────────────────────────────

function ActivaBadge({ activa }: { activa: boolean }) {
    return (
        <span className={`inline-flex items-center gap-1.5 text-[12px] font-medium ${
            activa ? "text-success" : "text-muted-foreground"
        }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${activa ? "bg-success" : "bg-muted-foreground"}`} />
            {activa ? "Activa" : "Inactiva"}
        </span>
    );
}

function CountCell({ value, label }: { value: number; label: string }) {
    return (
        <div className="flex flex-col">
            <span className={`text-[13px] font-semibold tabular-nums ${
                value > 0 ? "text-foreground" : "text-muted-foreground"
            }`}>
                {value}
            </span>
            <span className="text-[10px] text-muted-foreground">{label}</span>
        </div>
    );
}

// ─── Filas skeleton ───────────────────────────────────────────────────────────
function SkeletonRows({ count = 8 }: { count?: number }) {
    return (
        <>
            {Array.from({ length: count }).map((_, i) => (
                <tr key={i} className="border-b border-border">
                    <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                            <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                            <div className="space-y-1.5">
                                <Skeleton className="h-3.5 w-36" />
                                <Skeleton className="h-3 w-24" />
                            </div>
                        </div>
                    </td>
                    <td className="px-4 py-3"><Skeleton className="h-3.5 w-28" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-3.5 w-20" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-3.5 w-8" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-3.5 w-8" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-5 w-14 rounded" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-3.5 w-14" /></td>
                </tr>
            ))}
        </>
    );
}

// ─── Paginación ───────────────────────────────────────────────────────────────
interface PaginationProps {
    page:         number;
    pages:        number;
    count:        number;
    pageSize:     number;
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

const PAGE_SIZE = 20;

export default function EmpresasListPage() {
    // ── Filtros ──────────────────────────────────────────────────────────────
    const [searchInput, setSearchInput]     = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [page, setPage]                   = useState(1);

    // ── Datos ────────────────────────────────────────────────────────────────
    const [data, setData]       = useState<PaginatedEmpresasResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState<string | null>(null);

    // ── Panel detalle + modales ──────────────────────────────────────────────
    const [selectedId, setSelectedId]           = useState<number | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingId, setEditingId]             = useState<number | null>(null);

    // ── Debounce 300ms ───────────────────────────────────────────────────────
    useEffect(() => {
        const t = setTimeout(() => {
            setDebouncedSearch(searchInput);
            setPage(1);
        }, 300);
        return () => clearTimeout(t);
    }, [searchInput]);

    // ── Fetch ────────────────────────────────────────────────────────────────
    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await adminEmpresasAPI.list({
                page,
                page_size: PAGE_SIZE,
                ...(debouncedSearch ? { search: debouncedSearch } : {}),
            });
            setData(res);
        } catch {
            setError("No se pudo cargar la lista de empresas.");
        } finally {
            setLoading(false);
        }
    }, [page, debouncedSearch]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const hasFilters = Boolean(searchInput);

    // ─────────────────────────────────────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-5">

            {/* ── Header ─────────────────────────────────────────────────── */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-xl font-semibold text-foreground">Empresas</h1>
                    <p className="text-[13px] text-muted-foreground mt-0.5">
                        {data
                            ? `Gestión de empresas · ${data.count} registros`
                            : "Gestión de empresas"}
                    </p>
                </div>
                <Button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 shrink-0"
                    size="sm"
                >
                    <Plus size={15} />
                    Nueva empresa
                </Button>
            </div>

            {/* ── Barra de búsqueda ───────────────────────────────────────── */}
            <Card className="p-3 border-border shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                        <Input
                            value={searchInput}
                            onChange={e => setSearchInput(e.target.value)}
                            placeholder="Buscar por nombre o NIT..."
                            className="pl-8 h-9 text-sm"
                        />
                    </div>

                    {hasFilters && (
                        <button
                            onClick={() => { setSearchInput(""); setPage(1); }}
                            className="flex items-center gap-1.5 px-3 h-9 rounded-md text-[13px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                            <X size={13} />
                            Limpiar
                        </button>
                    )}

                    {data && !loading && (
                        <p className="ml-auto text-[12px] text-muted-foreground whitespace-nowrap hidden sm:block">
                            Mostrando{" "}
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
                                    Empresa
                                </th>
                                <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">
                                    Contacto
                                </th>
                                <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">
                                    Contactos
                                </th>
                                <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                    Terceros
                                </th>
                                <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">
                                    Contratos
                                </th>
                                <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                    Estado
                                </th>
                                <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hidden xl:table-cell">
                                    Creada
                                </th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-border">
                            {loading ? (
                                <SkeletonRows count={8} />
                            ) : data && data.results.length > 0 ? (
                                data.results.map(e => (
                                    <tr
                                        key={e.id}
                                        onClick={() => setSelectedId(e.id)}
                                        className="hover:bg-muted/50 cursor-pointer transition-colors"
                                    >
                                        {/* Empresa */}
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[11px] font-semibold flex-shrink-0">
                                                    {getInitials(e.nombre)}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[13px] font-medium text-foreground truncate max-w-[200px]">
                                                        {e.nombre}
                                                    </p>
                                                    <p className="text-[11px] text-muted-foreground font-mono">
                                                        {e.nit}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Contacto principal */}
                                        <td className="px-4 py-3 hidden md:table-cell">
                                            <div className="space-y-0.5">
                                                {e.email ? (
                                                    <p className="text-[12px] text-foreground truncate max-w-[160px]" title={e.email}>
                                                        {e.email}
                                                    </p>
                                                ) : (
                                                    <p className="text-[12px] text-muted-foreground">—</p>
                                                )}
                                                {e.telefono && (
                                                    <p className="text-[11px] text-muted-foreground">{e.telefono}</p>
                                                )}
                                            </div>
                                        </td>

                                        {/* Contactos count */}
                                        <td className="px-4 py-3 hidden sm:table-cell">
                                            <CountCell value={e.contactos_count} label="personas" />
                                        </td>

                                        {/* Terceros */}
                                        <td className="px-4 py-3">
                                            <CountCell value={e.total_terceros} label="terceros" />
                                        </td>

                                        {/* Contratos */}
                                        <td className="px-4 py-3 hidden lg:table-cell">
                                            <CountCell value={e.total_contratos} label="contratos" />
                                        </td>

                                        {/* Estado */}
                                        <td className="px-4 py-3">
                                            <ActivaBadge activa={e.activa} />
                                        </td>

                                        {/* Creada */}
                                        <td className="px-4 py-3 hidden xl:table-cell">
                                            <span
                                                className="text-[12px] text-muted-foreground"
                                                title={formatDateFull(e.fecha_creacion)}
                                            >
                                                {formatRelative(e.fecha_creacion)}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="px-4 py-16 text-center">
                                        <Building2 size={36} className="text-muted-foreground mx-auto mb-3" />
                                        <p className="text-[14px] font-medium text-foreground">
                                            {hasFilters
                                                ? "No se encontraron empresas con esa búsqueda"
                                                : "No hay empresas registradas aún"}
                                        </p>
                                        <p className="text-[12px] text-muted-foreground mt-1">
                                            {hasFilters
                                                ? "Intenta con otro nombre o NIT"
                                                : "Usa el botón \"Nueva empresa\" para crear una"}
                                        </p>
                                        {hasFilters && (
                                            <button
                                                onClick={() => setSearchInput("")}
                                                className="mt-3 text-[13px] text-primary hover:underline"
                                            >
                                                Limpiar búsqueda
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

            {/* ── Panel de detalle lateral (PASO 4) ──────────────────────── */}
            <EmpresaDetailPanel
                empresaId={selectedId}
                onClose={() => setSelectedId(null)}
                onEditRequest={(id) => setEditingId(id)}
                onUpdated={fetchData}
            />

            {/* ── Modal crear / editar empresa (PASO 5) ───────────────────── */}
            <EmpresaFormModal
                open={showCreateModal || editingId !== null}
                empresaId={editingId}
                onClose={() => { setShowCreateModal(false); setEditingId(null); }}
                onSuccess={() => { setShowCreateModal(false); setEditingId(null); fetchData(); }}
            />

        </div>
    );
}
