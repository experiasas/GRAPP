import { useState, useEffect, useCallback } from "react";
import { Search, ChevronLeft, ChevronRight, X, ShoppingCart, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    adminOrdenesCompraAPI,
    type PaginatedOCResponse,
    type EstadoOC,
    ESTADO_OC_LABELS,
} from "@/lib/adminOrdenesCompraApi";
import { OrdenCompraDetailPanel } from "@/components/admin/OrdenCompraDetailPanel";
import { OrdenCompraFormModal } from "@/components/admin/OrdenCompraFormModal";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const fmt = new Intl.NumberFormat("es-CO", {
    style: "currency", currency: "COP",
    minimumFractionDigits: 0, maximumFractionDigits: 0,
});

function fmtMoney(v: string) {
    const n = parseFloat(v);
    return isNaN(n) ? "—" : fmt.format(n);
}

function fmtDate(iso: string | null) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("es-CO", {
        day: "2-digit", month: "short", year: "numeric",
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-componentes
// ─────────────────────────────────────────────────────────────────────────────

const ESTADO_BADGE: Record<EstadoOC, string> = {
    BORRADOR:     "bg-muted text-muted-foreground",
    EMITIDA:      "bg-blue-50 text-blue-700",
    APROBADA:     "bg-emerald-50 text-emerald-700",
    EN_EJECUCION: "bg-amber-50 text-amber-700",
    CUMPLIDA:     "bg-purple-50 text-purple-700",
    ANULADA:      "bg-red-50 text-red-700",
};

function EstadoBadge({ estado }: { estado: EstadoOC }) {
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold whitespace-nowrap ${ESTADO_BADGE[estado] ?? "bg-muted text-muted-foreground"}`}>
            {ESTADO_OC_LABELS[estado] ?? estado}
        </span>
    );
}

function EjecucionCell({ pct, radicado, total }: { pct: number; radicado: string; total: string }) {
    const color = pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-400" : "bg-emerald-500";
    return (
        <div>
            <p className="text-[13px] font-semibold tabular-nums text-primary">{fmtMoney(total)}</p>
            <div className="flex items-center gap-1.5 mt-1">
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
                <span className="text-[10px] text-muted-foreground tabular-nums whitespace-nowrap">{pct}%</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">{fmtMoney(radicado)} radicado</p>
        </div>
    );
}

function SkeletonRows({ count = 10 }: { count?: number }) {
    return (
        <>
            {Array.from({ length: count }).map((_, i) => (
                <tr key={i} className="border-b border-border">
                    {Array.from({ length: 6 }).map((__, j) => (
                        <td key={j} className="px-4 py-3">
                            <Skeleton className="h-4 w-full" />
                        </td>
                    ))}
                </tr>
            ))}
        </>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Página principal
// ─────────────────────────────────────────────────────────────────────────────

export default function OrdenesCompraListPage() {
    const [data,      setData]      = useState<PaginatedOCResponse | null>(null);
    const [loading,   setLoading]   = useState(true);
    const [search,    setSearch]    = useState("");
    const [dSearch,   setDSearch]   = useState("");
    const [estado,    setEstado]    = useState("all");
    const [page,      setPage]      = useState(1);

    // Panel de detalle
    const [selectedId, setSelectedId] = useState<number | null>(null);

    // Modal crear/editar
    const [modalOpen,  setModalOpen]  = useState(false);
    const [editOcId,   setEditOcId]   = useState<number | null>(null);

    // Debounce search
    useEffect(() => {
        const t = setTimeout(() => setDSearch(search), 350);
        return () => clearTimeout(t);
    }, [search]);

    useEffect(() => { setPage(1); }, [dSearch, estado]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params: Parameters<typeof adminOrdenesCompraAPI.list>[0] = { page, page_size: 20 };
            if (dSearch) params.search = dSearch;
            if (estado && estado !== "all") params.estado = estado;
            const res = await adminOrdenesCompraAPI.list(params);
            setData(res);
        } catch {
            setData(null);
        } finally {
            setLoading(false);
        }
    }, [page, dSearch, estado]);

    useEffect(() => { fetchData(); }, [fetchData]);

    function handleEstadoChanged() {
        fetchData();
        // No cerramos el panel: el usuario puede seguir viendo el detalle actualizado
    }

    function openCreate() {
        setEditOcId(null);
        setModalOpen(true);
    }

    function openEdit(id: number) {
        setEditOcId(id);
        setModalOpen(true);
    }

    function handleSaved() {
        fetchData();
    }

    return (
        <div className="space-y-6">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-[22px] font-bold text-primary tracking-tight">Órdenes de Compra</h1>
                    <p className="text-[13px] text-muted-foreground mt-0.5">
                        Órdenes emitidas a proveedores y contratistas
                    </p>
                </div>
                <Button onClick={openCreate} className="gap-2">
                    <Plus size={15} />
                    Nueva OC
                </Button>
            </div>

            {/* Filtros */}
            <Card className="p-4">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
                        <Input
                            placeholder="Buscar por número, objeto, proveedor…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="pl-9 h-9 text-[13px]"
                        />
                        {search && (
                            <button
                                onClick={() => setSearch("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                    <Select value={estado} onValueChange={v => setEstado(v)}>
                        <SelectTrigger className="w-[160px] h-9 text-[13px]">
                            <SelectValue placeholder="Estado" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos los estados</SelectItem>
                            {(Object.keys(ESTADO_OC_LABELS) as EstadoOC[]).map(e => (
                                <SelectItem key={e} value={e}>{ESTADO_OC_LABELS[e]}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </Card>

            {/* Tabla */}
            <Card className="overflow-hidden p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-[13px]">
                        <thead>
                            <tr className="border-b border-border bg-muted/40">
                                <th className="text-left px-4 py-3 font-semibold text-[11px] uppercase tracking-wide text-muted-foreground">OC / Objeto</th>
                                <th className="text-left px-4 py-3 font-semibold text-[11px] uppercase tracking-wide text-muted-foreground w-[180px]">Tercero</th>
                                <th className="text-left px-4 py-3 font-semibold text-[11px] uppercase tracking-wide text-muted-foreground w-[120px]">Contrato</th>
                                <th className="text-left px-4 py-3 font-semibold text-[11px] uppercase tracking-wide text-muted-foreground w-[170px]">Valor / Ejecución</th>
                                <th className="text-left px-4 py-3 font-semibold text-[11px] uppercase tracking-wide text-muted-foreground w-[110px]">Estado</th>
                                <th className="w-10" />
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <SkeletonRows />
                            ) : !data || data.results.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-16 text-muted-foreground">
                                        <ShoppingCart size={32} className="mx-auto mb-3 opacity-30" />
                                        <p className="font-medium">Sin órdenes de compra</p>
                                        <p className="text-[12px] mt-1">Ajusta los filtros o crea una nueva OC.</p>
                                    </td>
                                </tr>
                            ) : (
                                data.results.map(oc => (
                                    <tr
                                        key={oc.id}
                                        onClick={() => setSelectedId(selectedId === oc.id ? null : oc.id)}
                                        className={`border-b border-border cursor-pointer transition-colors hover:bg-muted/40 ${selectedId === oc.id ? "bg-accent/60" : ""}`}
                                    >
                                        {/* OC / Objeto */}
                                        <td className="px-4 py-3">
                                            <p className="font-mono font-semibold text-primary text-[12px]">
                                                {oc.numero_oc}
                                            </p>
                                            <p className="text-[12px] text-muted-foreground truncate max-w-[260px] mt-0.5">
                                                {oc.objeto}
                                            </p>
                                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                                {fmtDate(oc.fecha_emision)}
                                            </p>
                                        </td>

                                        {/* Tercero */}
                                        <td className="px-4 py-3">
                                            <p className="font-medium text-foreground truncate">{oc.tercero_nombre}</p>
                                            <p className="text-[11px] text-muted-foreground">{oc.tercero_documento}</p>
                                        </td>

                                        {/* Contrato */}
                                        <td className="px-4 py-3 text-muted-foreground text-[12px]">
                                            {oc.contrato_numero
                                                ? <span className="font-medium text-foreground">{oc.contrato_numero}</span>
                                                : <span className="italic opacity-50">sin contrato</span>
                                            }
                                        </td>

                                        {/* Valor / Ejecución */}
                                        <td className="px-4 py-3">
                                            <EjecucionCell
                                                pct={oc.porcentaje_ejecutado}
                                                radicado={oc.valor_radicado}
                                                total={oc.valor_total}
                                            />
                                        </td>

                                        {/* Estado */}
                                        <td className="px-4 py-3">
                                            <EstadoBadge estado={oc.estado} />
                                        </td>

                                        {/* Acciones */}
                                        <td className="px-2 py-3">
                                            <button
                                                onClick={e => { e.stopPropagation(); openEdit(oc.id); }}
                                                className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors text-[11px]"
                                                title="Editar"
                                            >
                                                ···
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Paginación */}
                {data && data.pages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                        <p className="text-[12px] text-muted-foreground">
                            Página {data.page} de {data.pages} · {data.count} registros
                        </p>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page <= 1}
                                className="p-1.5 rounded hover:bg-muted disabled:opacity-40 transition-colors"
                            >
                                <ChevronLeft size={15} />
                            </button>
                            <button
                                onClick={() => setPage(p => Math.min(data.pages, p + 1))}
                                disabled={page >= data.pages}
                                className="p-1.5 rounded hover:bg-muted disabled:opacity-40 transition-colors"
                            >
                                <ChevronRight size={15} />
                            </button>
                        </div>
                    </div>
                )}
            </Card>

            {/* Detalle panel (slide-over) */}
            <OrdenCompraDetailPanel
                ocId={selectedId}
                onClose={() => setSelectedId(null)}
                onEstadoChanged={handleEstadoChanged}
            />

            {/* Modal crear/editar */}
            <OrdenCompraFormModal
                open={modalOpen}
                ocId={editOcId}
                onClose={() => setModalOpen(false)}
                onSaved={handleSaved}
            />
        </div>
    );
}
