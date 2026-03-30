import { Link, useNavigate } from "react-router-dom";
import { ArrowUpRight, Users, FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { TerceroPendienteItem } from "@/pages/admin/AdminDashboard";
import type { CuentaRevisionItem } from "@/components/admin/DocumentosEnRevision";

const URGENCIA_DOT: Record<string, string> = {
    crítica: "bg-destructive",
    media:   "bg-warning",
    baja:    "bg-primary",
};

const fmt = (v: number) =>
    new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        minimumFractionDigits: 0,
    }).format(v);

interface Props {
    tercerosPendientes: TerceroPendienteItem[];
    cuentasEnRevision: CuentaRevisionItem[];
    loadingTerceros: boolean;
    loadingCuentas: boolean;
    className?: string;
}

export function PendientesTabs({
    tercerosPendientes,
    cuentasEnRevision,
    loadingTerceros,
    loadingCuentas,
    className,
}: Props) {
    const navigate = useNavigate();

    return (
        <Card className={`p-5 rounded-xl border-border shadow-sm bg-card ${className ?? ""}`}>
            <Tabs defaultValue="terceros">

                {/* Header row: tabs + count badges */}
                <div className="flex items-center justify-between mb-4">
                    <TabsList className="h-8 bg-muted/60 p-0.5 rounded-lg gap-0.5">
                        <TabsTrigger
                            value="terceros"
                            className="h-7 px-3 text-[12px] font-medium rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-foreground"
                        >
                            Terceros
                            {!loadingTerceros && tercerosPendientes.length > 0 && (
                                <span className="ml-1.5 bg-warning/20 text-warning text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                                    {tercerosPendientes.length}
                                </span>
                            )}
                        </TabsTrigger>
                        <TabsTrigger
                            value="cuentas"
                            className="h-7 px-3 text-[12px] font-medium rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-foreground"
                        >
                            Cuentas
                            {!loadingCuentas && cuentasEnRevision.length > 0 && (
                                <span className="ml-1.5 bg-primary/20 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                                    {cuentasEnRevision.length}
                                </span>
                            )}
                        </TabsTrigger>
                    </TabsList>
                </div>

                {/* ── Tab: Terceros pendientes ── */}
                <TabsContent value="terceros" className="mt-0">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-[11px] text-muted-foreground">Pendientes de aprobación</p>
                        <Link
                            to="/admin-panel/terceros?estado=PENDIENTE"
                            className="text-[11px] text-primary font-medium hover:underline flex items-center gap-0.5"
                        >
                            Ver todos <ArrowUpRight size={11} />
                        </Link>
                    </div>

                    {loadingTerceros ? (
                        <div className="space-y-2">
                            {[...Array(3)].map((_, i) => (
                                <Skeleton key={i} className="h-10 rounded-lg" />
                            ))}
                        </div>
                    ) : tercerosPendientes.length === 0 ? (
                        <div className="py-7 text-center">
                            <Users size={24} className="text-muted-foreground/40 mx-auto mb-2" />
                            <p className="text-[12px] text-muted-foreground">Sin terceros pendientes</p>
                        </div>
                    ) : (
                        <ul className="space-y-0.5">
                            {tercerosPendientes.slice(0, 8).map((item) => {
                                const dot = URGENCIA_DOT[item.urgencia] ?? "bg-muted-foreground";
                                return (
                                    <li key={item.id}>
                                        <button
                                            onClick={() => navigate(`/admin-panel/terceros?highlight=${item.id}`)}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/40 transition-colors text-left"
                                        >
                                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[12px] font-medium text-foreground truncate leading-tight">
                                                    {item.nombre}
                                                </p>
                                                <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                                                    {item.dias_pendiente}d · {item.tarea}
                                                </p>
                                            </div>
                                            <ArrowUpRight size={12} className="text-muted-foreground/40 flex-shrink-0" />
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </TabsContent>

                {/* ── Tab: Cuentas en revisión ── */}
                <TabsContent value="cuentas" className="mt-0">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-[11px] text-muted-foreground">En revisión o radicadas</p>
                        <Link
                            to="/admin-panel/cuentas-cobro"
                            className="text-[11px] text-primary font-medium hover:underline flex items-center gap-0.5"
                        >
                            Ver todos <ArrowUpRight size={11} />
                        </Link>
                    </div>

                    {loadingCuentas ? (
                        <div className="space-y-2">
                            {[...Array(3)].map((_, i) => (
                                <Skeleton key={i} className="h-10 rounded-lg" />
                            ))}
                        </div>
                    ) : cuentasEnRevision.length === 0 ? (
                        <div className="py-7 text-center">
                            <FileText size={24} className="text-muted-foreground/40 mx-auto mb-2" />
                            <p className="text-[12px] text-muted-foreground">Sin cuentas en revisión</p>
                        </div>
                    ) : (
                        <ul className="space-y-0.5">
                            {cuentasEnRevision.slice(0, 8).map((item) => {
                                const dot = URGENCIA_DOT[item.urgencia] ?? "bg-muted-foreground";
                                return (
                                    <li key={item.id}>
                                        <button
                                            onClick={() => navigate(`/admin-panel/cuentas-cobro?highlight=${item.id}`)}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/40 transition-colors text-left"
                                        >
                                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[12px] font-medium text-foreground truncate leading-tight">
                                                    {item.proveedor}
                                                </p>
                                                <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                                                    {item.dias_pendiente}d · {item.tipo_documento} · {fmt(item.valor_total)}
                                                </p>
                                            </div>
                                            <ArrowUpRight size={12} className="text-muted-foreground/40 flex-shrink-0" />
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </TabsContent>

            </Tabs>
        </Card>
    );
}
