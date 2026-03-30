// @deprecated — Reemplazado por PendientesTabs.tsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { Clock, ChevronDown, ChevronUp, ArrowUpRight, FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export interface CuentaRevisionItem {
    id: number;
    numero: string;
    periodo: string;
    tipo_documento: string;
    proveedor: string;
    empresa: string;
    valor_total: number;
    estado: string;
    created_at: string;
    dias_pendiente: number;
    urgencia: string;
    accion: string;
    relativo: string;
}

interface Props {
    count: number;
    items: CuentaRevisionItem[];
    loading: boolean;
    viewAllTo: string;
}

const URGENCIA_STYLES: Record<string, { bar: string; badge: string; text: string }> = {
    crítica: {
        bar:   "bg-destructive",
        badge: "bg-destructive/10 text-destructive",
        text:  "text-destructive",
    },
    media: {
        bar:   "bg-primary",
        badge: "bg-warning/10 text-warning",
        text:  "text-warning",
    },
    baja: {
        bar:   "bg-primary",
        badge: "bg-primary/10 text-primary",
        text:  "text-primary",
    },
};

const fmt = (v: number) =>
    new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        minimumFractionDigits: 0,
    }).format(v);

export function DocumentosEnRevision({ count, items, loading, viewAllTo }: Props) {
    const [expandedId, setExpandedId] = useState<number | null>(null);

    const toggle = (id: number) => setExpandedId((prev) => (prev === id ? null : id));

    return (
        <Card className="p-5 rounded-xl border-border shadow-sm bg-card">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className="bg-primary/10 p-1.5 rounded-lg">
                        <Clock size={16} className="text-primary" />
                    </div>
                    <span className="text-[13px] font-semibold text-foreground">En revisión</span>
                </div>
                <Link
                    to={viewAllTo}
                    className="text-[11px] text-primary font-medium hover:underline flex items-center gap-1"
                >
                    Ver todos <ArrowUpRight size={11} />
                </Link>
            </div>

            {/* Count */}
            {loading ? (
                <Skeleton className="h-8 w-12 mb-3" />
            ) : (
                <p className="text-[28px] font-bold tabular-nums leading-none mb-3 text-primary">
                    {count}
                </p>
            )}

            {/* List */}
            {loading ? (
                <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-12 rounded-lg" />
                    ))}
                </div>
            ) : items.length === 0 ? (
                <div className="py-6 text-center">
                    <FileText size={28} className="text-muted-foreground mx-auto mb-1.5" />
                    <p className="text-[12px] text-muted-foreground">Sin documentos en revisión</p>
                </div>
            ) : (
                <ul className="space-y-1.5">
                    {items.map((item) => {
                        const u = URGENCIA_STYLES[item.urgencia] ?? URGENCIA_STYLES.baja;
                        const isOpen = expandedId === item.id;

                        return (
                            <li key={item.id} className="rounded-lg overflow-hidden border border-border">
                                {/* Row colapsado */}
                                <button
                                    className="w-full flex items-stretch text-left hover:bg-muted/40 transition-colors"
                                    onClick={() => toggle(item.id)}
                                >
                                    {/* Barra lateral urgencia */}
                                    <div className={`w-1 flex-shrink-0 ${u.bar}`} />

                                    <div className="flex-1 flex items-center justify-between gap-2 px-3 py-2.5 min-w-0">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[12px] font-medium text-foreground truncate">
                                                {item.proveedor}
                                            </p>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${u.badge}`}>
                                                    {item.urgencia}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground">
                                                    {item.dias_pendiente}d · {item.relativo}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 flex-shrink-0">
                                            <span className="text-[10px] text-muted-foreground hidden sm:block">
                                                {item.accion}
                                            </span>
                                            {isOpen
                                                ? <ChevronUp size={14} className="text-muted-foreground" />
                                                : <ChevronDown size={14} className="text-muted-foreground" />
                                            }
                                        </div>
                                    </div>
                                </button>

                                {/* Panel expandido */}
                                {isOpen && (
                                    <div className="border-t border-border bg-muted/20 px-4 py-3 space-y-2">
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                                            <div>
                                                <span className="text-muted-foreground">Número</span>
                                                <p className="font-medium text-foreground">{item.numero}</p>
                                            </div>
                                            <div>
                                                <span className="text-muted-foreground">Período</span>
                                                <p className="font-medium text-foreground">{item.periodo}</p>
                                            </div>
                                            <div>
                                                <span className="text-muted-foreground">Valor</span>
                                                <p className="font-medium text-foreground">{fmt(item.valor_total)}</p>
                                            </div>
                                            <div>
                                                <span className="text-muted-foreground">Radicado</span>
                                                <p className="font-medium text-foreground">{item.created_at}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 pt-1">
                                            <Link
                                                to={`/admin-panel/cuentas/${item.id}`}
                                                className="flex-1 text-center text-[11px] font-semibold py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                                            >
                                                Revisar
                                            </Link>
                                            <Link
                                                to={`/admin-panel/cuentas/${item.id}`}
                                                className="flex-1 text-center text-[11px] font-semibold py-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                                            >
                                                Rechazar
                                            </Link>
                                        </div>
                                    </div>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}
        </Card>
    );
}
