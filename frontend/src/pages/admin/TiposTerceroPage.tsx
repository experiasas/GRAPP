import { useState, useEffect, useCallback, useRef } from "react";
import {
    Search, Plus, Tag, MoreHorizontal, Pencil, Trash2,
    ChevronLeft, ChevronRight,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TipoTerceroFormModal } from "@/components/admin/TipoTerceroFormModal";
import {
    adminTiposTerceroAPI,
    type TipoTercero,
} from "@/lib/adminTiposTerceroApi";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function EstadoBadge({ activo }: { activo: boolean }) {
    return (
        <span className={`inline-flex items-center gap-1.5 text-[12px] font-medium ${
            activo ? "text-success" : "text-muted-foreground"
        }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${activo ? "bg-success" : "bg-muted-foreground"}`} />
            {activo ? "Activo" : "Inactivo"}
        </span>
    );
}

function CountCell({ value, label }: { value: number; label: string }) {
    return (
        <div className="flex flex-col">
            <span className={`text-[13px] font-bold tabular-nums ${
                value > 0 ? "text-foreground" : "text-muted-foreground"
            }`}>
                {value}
            </span>
            <span className="text-[10px] text-muted-foreground">{label}</span>
        </div>
    );
}

// ─── Skeleton rows ────────────────────────────────────────────────────────────
function SkeletonRows() {
    return (
        <>
            {Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-b border-border">
                    <td className="px-4 py-3"><Skeleton className="h-5 w-20 rounded" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-3.5 w-44" /></td>
                    <td className="px-4 py-3">
                        <div className="space-y-1"><Skeleton className="h-3.5 w-6" /><Skeleton className="h-3 w-12" /></div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                        <div className="space-y-1"><Skeleton className="h-3.5 w-6" /><Skeleton className="h-3 w-14" /></div>
                    </td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-14 rounded" /></td>
                    <td className="px-4 py-3 text-right"><Skeleton className="h-6 w-6 rounded ml-auto" /></td>
                </tr>
            ))}
        </>
    );
}

// ─── Row action menu ──────────────────────────────────────────────────────────
interface RowMenuProps {
    tipo: TipoTercero;
    onEditar: () => void;
    onEliminar: () => void;
}

function RowMenu({ tipo, onEditar, onEliminar }: RowMenuProps) {
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
                        onClick={() => { onEditar(); setOpen(false); }}
                        className="w-full text-left flex items-center gap-2 px-3 py-2 text-[13px] text-foreground hover:bg-muted/60 transition-colors"
                    >
                        <Pencil size={13} />
                        Editar
                    </button>
                    <div className="h-px bg-border my-1" />
                    <button
                        onClick={() => { onEliminar(); setOpen(false); }}
                        disabled={tipo.total_terceros > 0}
                        title={tipo.total_terceros > 0 ? "Tiene terceros vinculados" : undefined}
                        className={`w-full text-left flex items-center gap-2 px-3 py-2 text-[13px] transition-colors ${
                            tipo.total_terceros > 0
                                ? "text-muted-foreground opacity-50 cursor-not-allowed"
                                : "text-destructive hover:bg-destructive/5"
                        }`}
                    >
                        <Trash2 size={13} />
                        Eliminar
                    </button>
                </div>
            )}
        </div>
    );
}

// ─── Pagination ───────────────────────────────────────────────────────────────
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

const PAGE_SIZE = 10;

export default function TiposTerceroPage() {
    const [tipos,   setTipos]   = useState<TipoTercero[]>([]);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState<string | null>(null);
    const [search,  setSearch]  = useState("");
    const [page,    setPage]    = useState(1);

    // Modal crear / editar  (null = cerrado, 0 = nuevo, id > 0 = editar)
    const [modalTipoId, setModalTipoId] = useState<number | null>(null);

    // Confirmación eliminar
    const [tipoAEliminar,     setTipoAEliminar]     = useState<TipoTercero | null>(null);
    const [showConfirmDelete, setShowConfirmDelete] = useState(false);
    const [deleteError,       setDeleteError]       = useState<string | null>(null);

    const fetchTipos = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            setTipos(await adminTiposTerceroAPI.list());
        } catch {
            setError("No se pudo cargar la lista de tipos de tercero.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchTipos(); }, [fetchTipos]);

    // Reset page on search change
    useEffect(() => { setPage(1); }, [search]);

    // Filtrado local
    const tiposFiltrados = tipos.filter(t =>
        t.nombre.toLowerCase().includes(search.toLowerCase()) ||
        t.code.toLowerCase().includes(search.toLowerCase())
    );

    const pages    = Math.ceil(tiposFiltrados.length / PAGE_SIZE);
    const tiposPag = tiposFiltrados.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const from     = tiposFiltrados.length > 0 ? (page - 1) * PAGE_SIZE + 1 : 0;
    const to       = Math.min(page * PAGE_SIZE, tiposFiltrados.length);

    const handleEditar = (tipo: TipoTercero) => {
        setModalTipoId(tipo.id);
    };

    const handleEliminar = (tipo: TipoTercero) => {
        setTipoAEliminar(tipo);
        setDeleteError(null);
        setShowConfirmDelete(true);
    };

    const confirmEliminar = async () => {
        if (!tipoAEliminar) return;
        try {
            await adminTiposTerceroAPI.eliminar(tipoAEliminar.id);
            setTipos(prev => prev.filter(t => t.id !== tipoAEliminar.id));
            setShowConfirmDelete(false);
            setTipoAEliminar(null);
        } catch (err: any) {
            setDeleteError(err?.response?.data?.error ?? "No se pudo eliminar el tipo.");
        }
    };

    // ConfirmDialog description: show error if present, otherwise contextual message
    const confirmDescription = deleteError
        ? deleteError
        : tipoAEliminar?.total_terceros
            ? `"${tipoAEliminar.nombre}" tiene terceros vinculados y no puede eliminarse.`
            : `Esta acción no se puede deshacer. ¿Confirmas que deseas eliminar "${tipoAEliminar?.nombre}"?`;

    return (
        <div className="space-y-5">

            {/* ── Header ─────────────────────────────────────────────────── */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Tipos de tercero</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        {loading
                            ? "Cargando…"
                            : `${tipos.length} tipo${tipos.length !== 1 ? "s" : ""} configurados`}
                    </p>
                </div>
                <Button
                    onClick={() => setModalTipoId(0)}
                    className="flex items-center gap-2 shrink-0"
                    size="sm"
                >
                    <Plus size={15} />
                    Nuevo tipo
                </Button>
            </div>

            {/* ── Barra de búsqueda ──────────────────────────────────────── */}
            <Card className="p-4 border-border shadow-sm rounded-xl">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search
                            size={14}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                        />
                        <Input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Buscar por nombre o código..."
                            className="pl-8 h-9 text-sm"
                        />
                    </div>
                    {!loading && tiposFiltrados.length > 0 && (
                        <p className="ml-auto text-sm text-muted-foreground whitespace-nowrap hidden sm:block">
                            Mostrando{" "}
                            <span className="font-medium text-foreground">{from}–{to}</span>{" "}
                            de <span className="font-medium text-foreground">{tiposFiltrados.length}</span>
                        </p>
                    )}
                </div>
            </Card>

            {/* ── Error ──────────────────────────────────────────────────── */}
            {error && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-[13px] text-destructive">
                    {error}{" "}
                    <button onClick={fetchTipos} className="underline hover:no-underline">
                        Reintentar
                    </button>
                </div>
            )}

            {/* ── Tabla ──────────────────────────────────────────────────── */}
            <Card className="border-border shadow-sm rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border bg-muted/30">
                                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide w-[160px]">
                                    Código
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                    Nombre
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide w-[120px]">
                                    Terceros
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide w-[130px] hidden sm:table-cell">
                                    Invitaciones
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide w-[100px]">
                                    Estado
                                </th>
                                <th className="px-4 py-3 w-12" />
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-border">
                            {loading ? (
                                <SkeletonRows />
                            ) : tiposPag.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-16 text-center">
                                        <Tag size={36} className="text-muted-foreground/30 mx-auto mb-3" />
                                        <p className="text-[14px] font-medium text-foreground">
                                            No se encontraron tipos
                                        </p>
                                        <p className="text-[12px] text-muted-foreground mt-1">
                                            {search
                                                ? "Intenta con otro nombre o código"
                                                : "Usa el botón \"Nuevo tipo\" para agregar el primero"}
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                tiposPag.map(tipo => (
                                    <tr
                                        key={tipo.id}
                                        onClick={() => handleEditar(tipo)}
                                        className="hover:bg-muted/40 cursor-pointer transition-colors"
                                    >
                                        {/* Código */}
                                        <td className="px-4 py-3">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-primary/10 text-primary text-[11px] font-semibold font-mono tracking-wide">
                                                {tipo.code}
                                            </span>
                                        </td>

                                        {/* Nombre */}
                                        <td className="px-4 py-3">
                                            <span className="text-[13px] font-medium text-foreground">
                                                {tipo.nombre}
                                            </span>
                                        </td>

                                        {/* Terceros */}
                                        <td className="px-4 py-3">
                                            <CountCell value={tipo.total_terceros} label="terceros" />
                                        </td>

                                        {/* Invitaciones */}
                                        <td className="px-4 py-3 hidden sm:table-cell">
                                            <CountCell value={tipo.total_invitaciones} label="enviadas" />
                                        </td>

                                        {/* Estado */}
                                        <td className="px-4 py-3">
                                            <EstadoBadge activo={tipo.activo} />
                                        </td>

                                        {/* Acciones */}
                                        <td className="px-4 py-3 text-right">
                                            <RowMenu
                                                tipo={tipo}
                                                onEditar={() => handleEditar(tipo)}
                                                onEliminar={() => handleEliminar(tipo)}
                                            />
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {tiposFiltrados.length > PAGE_SIZE && (
                    <div className="px-4 pb-4">
                        <Pagination
                            page={page}
                            pages={pages}
                            count={tiposFiltrados.length}
                            pageSize={PAGE_SIZE}
                            onPageChange={setPage}
                        />
                    </div>
                )}
            </Card>

            {/* ── Modal crear / editar ───────────────────────────────────── */}
            <TipoTerceroFormModal
                open={modalTipoId !== null}
                tipoId={modalTipoId === 0 ? null : modalTipoId}
                onClose={() => setModalTipoId(null)}
                onSuccess={(guardado) => {
                    setTipos(prev => {
                        const existe = prev.some(t => t.id === guardado.id);
                        const next = existe
                            ? prev.map(t => t.id === guardado.id ? guardado : t)
                            : [...prev, guardado];
                        return next.sort((a, b) => a.nombre.localeCompare(b.nombre));
                    });
                    setModalTipoId(null);
                }}
            />

            {/* ── Confirmación eliminar ───────────────────────────────────── */}
            <ConfirmDialog
                open={showConfirmDelete}
                title="¿Eliminar tipo de tercero?"
                description={confirmDescription}
                confirmLabel="Eliminar"
                onConfirm={confirmEliminar}
                onCancel={() => { setShowConfirmDelete(false); setDeleteError(null); }}
            />

        </div>
    );
}
