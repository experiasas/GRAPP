import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { API_URL } from "@/api/config";
import {
    BarChart, Bar, XAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
    Users, FileText, TrendingUp, CreditCard,
    ArrowUpRight, ChevronRight,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCardAdvanced } from "@/components/admin/StatCardAdvanced";
import { PendientesTabs } from "@/components/admin/PendientesTabs";
import { DocumentosCargadosRecientes, type DocumentoRecienteItem } from "@/components/admin/DocumentosCargadosRecientes";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ContratoProximo {
    id: number;
    numero: string;
    objeto: string;
    dias_para_vencer: number;
    valor: number;
}

interface Stats {
    terceros_total: number;
    terceros_pendientes: number;
    terceros_aprobados: number;
    terceros_total_trend_pct: number;
    cuentas_mes: number;
    cuentas_mes_anterior: number;
    cuentas_mes_trend_pct: number;
    cuentas_pagadas_mes: number;
    cuentas_en_revision: number;
    cuentas_estado_predominante: string | null;
    contratos_activos: number;
    contratos_proximos_vencer: ContratoProximo[];
    valor_mes: number;
    valor_mes_anterior: number;
    valor_mes_trend_pct: number;
    valor_pagado_mes: number;
    valor_pagado_mes_anterior: number;
    valor_pagado_mes_trend_pct: number;
    monthly_data: { mes: string; valor: number; estado: string }[];
}

interface TerceroItem {
    id: number;
    nombre: string;
    tipo_doc: string;
    documento: string;
    email: string;
    estado: string;
    empresa: string;
    tipos: string[];
    created_at: string;
}

interface CuentaItem {
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

export interface TerceroPendienteItem {
    id: number;
    nombre: string;
    tipo_persona: string;
    documento: string;
    email: string;
    empresa: string;
    dias_pendiente: number;
    urgencia: string;
    accion: string;
    tarea: string;
    relativo: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (v: number) =>
    new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        minimumFractionDigits: 0,
    }).format(v);

// ─── Badge config ─────────────────────────────────────────────────────────────

const BADGE: Record<string, { label: string; cls: string; dot: string }> = {
    PAGADA:      { label: "Pagada",      cls: "bg-success/10 text-success",         dot: "bg-success" },
    APROBADA:    { label: "Aprobada",    cls: "bg-success/10 text-success",         dot: "bg-success" },
    APROBADO:    { label: "Aprobado",    cls: "bg-success/10 text-success",         dot: "bg-success" },
    RECHAZADA:   { label: "Rechazada",   cls: "bg-destructive/10 text-destructive", dot: "bg-destructive" },
    RECHAZADO:   { label: "Rechazado",   cls: "bg-destructive/10 text-destructive", dot: "bg-destructive" },
    EN_REVISION: { label: "En revisión", cls: "bg-warning/10 text-warning",         dot: "bg-warning" },
    RADICADA:    { label: "Radicada",    cls: "bg-primary/10 text-primary",         dot: "bg-primary" },
    PENDIENTE:   { label: "Pendiente",   cls: "bg-warning/10 text-warning",         dot: "bg-warning" },
    BORRADOR:    { label: "Borrador",    cls: "bg-muted text-muted-foreground",     dot: "bg-muted-foreground" },
};

const badge = (estado: string) =>
    BADGE[estado.toUpperCase()] ?? {
        label: estado,
        cls: "bg-muted text-muted-foreground",
        dot: "bg-muted-foreground",
    };

// ─── Custom Chart Tooltip ─────────────────────────────────────────────────────

const ChartTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
        return (
            <div className="bg-primary text-primary-foreground text-[12px] px-3 py-2 rounded-lg shadow-lg">
                <p className="font-semibold mb-0.5">{label}</p>
                <p>{fmt(payload[0].value)}</p>
            </div>
        );
    }
    return null;
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminDashboard() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [terceros, setTerceros] = useState<TerceroItem[]>([]);
    const [cuentas, setCuentas] = useState<CuentaItem[]>([]);
    const [tercerosPendientes, setTercerosPendientes] = useState<TerceroPendienteItem[]>([]);
    const [documentosRecientes, setDocumentosRecientes] = useState<DocumentoRecienteItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            axios.get(`${API_URL}/api/admin/stats/`),
            axios.get(`${API_URL}/api/admin/terceros/`),
            axios.get(`${API_URL}/api/admin/cuentas/`),
            axios.get(`${API_URL}/api/admin/terceros-pendientes/`),
            axios.get(`${API_URL}/api/admin/documentos-recientes/`),
        ])
            .then(([s, t, c, tp, dr]) => {
                setStats(s.data);
                // `/api/admin/terceros/` devuelve paginación: { count, page, results, ... }
                // Normalizamos a array para que `slice/map/filter` funcionen siempre.
                const tercerosData = Array.isArray(t.data) ? t.data : (t.data?.results ?? []);
                setTerceros(tercerosData);
                setCuentas(c.data);
                setTercerosPendientes(tp.data);
                setDocumentosRecientes(dr.data.results ?? []);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const cuentasEnRevision = cuentas
        .filter((c) => ["EN_REVISION", "RADICADA"].includes(c.estado.toUpperCase()))
        .slice(0, 5);

    const tercerosPendientesEnriquecidos = tercerosPendientes.slice(0, 4);

    const actividad = [
        ...terceros.slice(0, 6).map((t) => ({
            key: `t-${t.id}`,
            texto: t.nombre,
            sub: `Tercero · ${t.tipo_doc} ${t.documento}`,
            estado: t.estado,
            fecha: t.created_at,
        })),
        ...cuentas.slice(0, 6).map((c) => ({
            key: `c-${c.id}`,
            texto: c.proveedor,
            sub: `Cuenta · ${c.periodo}`,
            estado: c.estado,
            fecha: c.created_at,
        })),
    ].slice(0, 8);

    return (
        <div className="-m-6 lg:-m-8 px-6 py-6 lg:px-8 lg:py-8 bg-muted/30 min-h-full flex flex-col gap-6">

            {/* ── Header ── */}
            <div>
                <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                    Panel de gestión operativa · GRAPP
                </p>
            </div>

            {/* ══════════════════════════════════════════════════════════════════
                ZONA 1 — MÉTRICAS PRINCIPALES
            ═══════════════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">

                <StatCardAdvanced
                    className="col-span-2 lg:col-span-1"
                    icon={TrendingUp}
                    iconBg="bg-primary/10"
                    iconColor="text-primary"
                    loading={loading}
                    value={fmt(stats?.valor_mes ?? 0)}
                    label="Valor radicado este mes"
                    secondary={stats ? `Anterior: ${fmt(stats.valor_mes_anterior)}` : undefined}
                    trend={stats ? { value: stats.valor_mes_trend_pct, label: "vs mes ant." } : undefined}
                />

                <StatCardAdvanced
                    icon={Users}
                    iconBg="bg-primary/10"
                    iconColor="text-primary"
                    loading={loading}
                    value={stats?.terceros_total ?? 0}
                    label="Terceros registrados"
                    secondary={stats ? `${stats.terceros_aprobados} aprobados · ${stats.terceros_pendientes} pendientes` : undefined}
                    trend={stats ? { value: stats.terceros_total_trend_pct, label: "vs mes ant." } : undefined}
                />

                <StatCardAdvanced
                    icon={FileText}
                    iconBg="bg-primary/10"
                    iconColor="text-primary"
                    loading={loading}
                    value={stats?.cuentas_mes ?? 0}
                    label="Radicaciones este mes"
                    secondary={stats?.cuentas_estado_predominante ? `Predomina: ${stats.cuentas_estado_predominante}` : undefined}
                    trend={stats ? { value: stats.cuentas_mes_trend_pct, label: "vs mes ant." } : undefined}
                />

                <StatCardAdvanced
                    icon={CreditCard}
                    iconBg="bg-success/10"
                    iconColor="text-success"
                    loading={loading}
                    value={fmt(stats?.valor_pagado_mes ?? 0)}
                    label="Valor pagado este mes"
                    secondary={stats && stats.cuentas_pagadas_mes > 0 ? `${stats.cuentas_pagadas_mes} pagos realizados` : undefined}
                    trend={stats ? { value: stats.valor_pagado_mes_trend_pct, label: "vs mes ant." } : undefined}
                />
            </div>

            {/* ══════════════════════════════════════════════════════════════════
                ZONA 2 — GRÁFICO + GESTIÓN OPERATIVA
            ═══════════════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-12 gap-6">

                {/* Gráfico histórico */}
                <div className="col-span-12 lg:col-span-7 flex flex-col gap-4">

                    {/* Mini-stats del gráfico */}
                    {loading ? (
                        <div className="grid grid-cols-3 gap-3">
                            {[...Array(3)].map((_, i) => (
                                <Skeleton key={i} className="h-16 rounded-xl" />
                            ))}
                        </div>
                    ) : stats && (
                        <div className="grid grid-cols-3 gap-3">
                            {(() => {
                                const vals = stats.monthly_data.map((d) => d.valor);
                                const promedio = vals.reduce((a, b) => a + b, 0) / (vals.length || 1);
                                const maximo = Math.max(...vals);
                                const minimo = Math.min(...vals);
                                return [
                                    { label: "Promedio", value: promedio },
                                    { label: "Máximo",   value: maximo },
                                    { label: "Mínimo",   value: minimo },
                                ].map(({ label, value }) => (
                                    <div key={label} className="bg-muted/50 rounded-lg px-4 py-3">
                                        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
                                        <p className="text-[13px] font-semibold text-foreground tabular-nums mt-0.5">{fmt(value)}</p>
                                    </div>
                                ));
                            })()}
                        </div>
                    )}

                    <Card className="p-6 rounded-xl border-border shadow-sm bg-card flex flex-col">
                        <div className="flex items-center justify-between mb-5 flex-shrink-0">
                            <div>
                                <h2 className="text-[14px] font-semibold text-foreground">
                                    Valor radicado mensual
                                </h2>
                                <p className="text-[12px] text-muted-foreground">Últimos 6 meses</p>
                            </div>
                            {stats && (
                                <span className="text-[12px] text-muted-foreground">
                                    Total:{" "}
                                    <span className="font-semibold text-foreground">
                                        {fmt(stats.monthly_data.reduce((a, b) => a + b.valor, 0))}
                                    </span>
                                </span>
                            )}
                        </div>
                        {loading ? (
                            <Skeleton className="h-[300px] w-full" />
                        ) : (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart
                                    data={stats?.monthly_data ?? []}
                                    margin={{ top: 0, right: 12, left: 0, bottom: 12 }}
                                >
                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        stroke="hsl(var(--border))"
                                        vertical={false}
                                    />
                                    <XAxis
                                        dataKey="mes"
                                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <Tooltip
                                        content={<ChartTooltip />}
                                        cursor={{ fill: "hsl(var(--accent))" }}
                                    />
                                    <Bar
                                        dataKey="valor"
                                        radius={[4, 4, 0, 0]}
                                        maxBarSize={80}
                                        fill="#25418E" // azul tipo 950
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </Card>

                    {documentosRecientes.length > 0 && (
                        <DocumentosCargadosRecientes
                            items={documentosRecientes}
                            loading={loading}
                        />
                    )}
                </div>

                {/* Operativa: PendientesTabs estirado */}
                <div className="col-span-12 lg:col-span-5 flex flex-col h-full">
                    <PendientesTabs
                        tercerosPendientes={tercerosPendientesEnriquecidos}
                        cuentasEnRevision={cuentasEnRevision}
                        loadingTerceros={loading}
                        loadingCuentas={loading}
                        className="flex-1"
                    />
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════════
                ZONA 3 — RADICACIONES RECIENTES + ACTIVIDAD
            ═══════════════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-12 gap-6">

                {/* Tabla radicaciones recientes */}
                <div className="col-span-12 lg:col-span-8">
                    <Card className="overflow-hidden rounded-xl border-border shadow-sm bg-card">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                            <h2 className="text-[14px] font-semibold text-foreground">
                                Radicaciones recientes
                            </h2>
                            <Link
                                to="/admin-panel/cuentas-cobro"
                                className="text-[12px] text-primary font-medium hover:underline flex items-center gap-1"
                            >
                                Ver todas <ChevronRight size={16} />
                            </Link>
                        </div>
                        {loading ? (
                            <div className="p-6 space-y-3">
                                {[...Array(4)].map((_, i) => (
                                    <Skeleton key={i} className="h-10" />
                                ))}
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-[13px]">
                                    <thead>
                                        <tr className="bg-muted/30 border-b border-border">
                                            <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                                Proveedor
                                            </th>
                                            <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">
                                                Periodo
                                            </th>
                                            <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                                Valor
                                            </th>
                                            <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                                Estado
                                            </th>
                                            <th className="px-4 py-3 w-8" />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {cuentas.slice(0, 8).map((c) => {
                                            const b = badge(c.estado);
                                            return (
                                                <tr
                                                    key={c.id}
                                                    className="group border-b border-border/60 last:border-0 hover:bg-muted/40 transition-colors"
                                                >
                                                    <td className="px-5 py-3.5">
                                                        <p className="font-medium text-foreground truncate max-w-[180px]">
                                                            {c.proveedor}
                                                        </p>
                                                        <p className="text-[11px] text-muted-foreground mt-0.5">
                                                            {c.numero}
                                                        </p>
                                                    </td>
                                                    <td className="px-4 py-3.5 text-muted-foreground hidden md:table-cell">
                                                        {c.periodo}
                                                    </td>
                                                    <td className="px-4 py-3.5 text-right font-semibold text-foreground tabular-nums">
                                                        {fmt(c.valor_total)}
                                                    </td>
                                                    <td className="px-4 py-3.5">
                                                        <span
                                                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold ${b.cls}`}
                                                        >
                                                            <span className={`w-1.5 h-1.5 rounded-full ${b.dot}`} />
                                                            {b.label}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3.5">
                                                        <Link
                                                            to={`/admin-panel/cuentas-cobro?highlight=${c.id}`}
                                                            className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center justify-center w-7 h-7 rounded-lg border border-border hover:bg-primary hover:border-primary hover:text-primary-foreground text-muted-foreground/70"
                                                        >
                                                            <ArrowUpRight size={16} />
                                                        </Link>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                                {cuentas.length === 0 && (
                                    <p className="text-center text-muted-foreground text-[13px] py-10">
                                        Sin radicaciones registradas
                                    </p>
                                )}
                            </div>
                        )}
                    </Card>
                </div>

                {/* Actividad reciente */}
                <div className="col-span-12 lg:col-span-4">
                    <Card className="p-6 h-full rounded-xl border-border shadow-sm bg-card">
                        <h2 className="text-[14px] font-semibold text-foreground mb-5">
                            Actividad reciente
                        </h2>
                        {loading ? (
                            <div className="space-y-4">
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} className="flex gap-3">
                                        <Skeleton className="w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0" />
                                        <div className="flex-1 space-y-1.5">
                                            <Skeleton className="h-3 w-3/4" />
                                            <Skeleton className="h-2.5 w-1/2" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : actividad.length === 0 ? (
                            <p className="text-[13px] text-muted-foreground text-center py-8">
                                Sin actividad reciente
                            </p>
                        ) : (
                            <ul className="space-y-0">
                                {actividad.map((item, i) => {
                                    const b = badge(item.estado);
                                    return (
                                        <li key={item.key} className="flex gap-3 min-h-[52px]">
                                            <div className="flex flex-col items-center">
                                                <span
                                                    className={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ${b.dot}`}
                                                />
                                                {i < actividad.length - 1 && (
                                                    <div className="flex-1 w-px bg-border mt-1" />
                                                )}
                                            </div>
                                            <div className="pb-3 flex-1 min-w-0">
                                                <p className="text-[12px] font-medium text-foreground truncate">
                                                    {item.texto}
                                                </p>
                                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                                    {item.sub}
                                                </p>
                                                <div className="flex items-center gap-1.5 mt-1">
                                                    <span
                                                        className={`text-[10px] font-semibold ${
                                                            b.cls.split(" ").find((c) => c.startsWith("text-")) ?? ""
                                                        }`}
                                                    >
                                                        {b.label}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground/40">·</span>
                                                    <span className="text-[10px] text-muted-foreground">
                                                        {item.fecha}
                                                    </span>
                                                </div>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </Card>
                </div>
            </div>

        </div>
    );
}
