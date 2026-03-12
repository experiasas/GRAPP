import { useState, useEffect } from "react";
import axios from "axios";
import { API_URL } from "@/api/config";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, AreaChart, Area
} from "recharts";
import { Users, FileText, Clock, TrendingUp, ArrowUpRight, CheckCircle, XCircle, AlertCircle } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Stats {
    terceros_total: number;
    terceros_pendientes: number;
    terceros_aprobados: number;
    cuentas_en_revision: number;
    valor_mes: number;
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
    valor_total: number;
    estado: string;
    created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatCurrency = (v: number) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(v);

const formatCurrencyShort = (v: number) => {
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
    return `$${v}`;
};

const ESTADO: Record<string, { label: string; bg: string; text: string; dot: string }> = {
    PAGADA:      { label: "Pagada",        bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
    APROBADA:    { label: "Aprobada",      bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
    APROBADO:    { label: "Aprobado",      bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
    RECHAZADA:   { label: "Rechazada",     bg: "bg-red-50",     text: "text-red-700",     dot: "bg-red-500"     },
    RECHAZADO:   { label: "Rechazado",     bg: "bg-red-50",     text: "text-red-700",     dot: "bg-red-500"     },
    EN_REVISION: { label: "En validación", bg: "bg-blue-50",    text: "text-blue-700",    dot: "bg-blue-500"    },
    RADICADA:    { label: "Radicada",      bg: "bg-blue-50",    text: "text-blue-700",    dot: "bg-blue-500"    },
    BORRADOR:    { label: "Borrador",      bg: "bg-amber-50",   text: "text-amber-700",   dot: "bg-amber-400"   },
    PENDIENTE:   { label: "Pendiente",     bg: "bg-amber-50",   text: "text-amber-700",   dot: "bg-amber-400"   },
};

const getBadge = (estado: string) =>
    ESTADO[estado.toUpperCase()] ?? { label: estado, bg: "bg-gray-100", text: "text-gray-600", dot: "bg-gray-400" };

// Sample monthly chart data (replace with real API data when available)
const MESES = ["Ago", "Sep", "Oct", "Nov", "Dic", "Ene", "Feb", "Mar"];
const makeChartData = (valorMes: number) =>
    MESES.map((mes, i) => ({
        mes,
        valor: i < 7
            ? Math.round(valorMes * (0.4 + Math.random() * 0.9))
            : valorMes,
    }));

const sparkData = [30, 25, 35, 20, 30, 40, 38, 45];

// ─── Tooltip personalizado ────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
        return (
            <div className="bg-[#0a1628] text-white text-[12px] px-3 py-2 rounded-lg shadow-lg">
                <p className="font-semibold mb-0.5">{label}</p>
                <p>{formatCurrency(payload[0].value)}</p>
            </div>
        );
    }
    return null;
};

// ─── Card wrapper ──────────────────────────────────────────────────────────────

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={`bg-white rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] border border-gray-100 ${className}`}>
            {children}
        </div>
    );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [terceros, setTerceros] = useState<TerceroItem[]>([]);
    const [cuentas, setCuentas] = useState<CuentaItem[]>([]);
    const [activeTab, setActiveTab] = useState<"terceros" | "cuentas">("terceros");
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            axios.get(`${API_URL}/api/admin/stats/`),
            axios.get(`${API_URL}/api/admin/terceros/`),
            axios.get(`${API_URL}/api/admin/cuentas/`),
        ]).then(([s, t, c]) => {
            setStats(s.data);
            setTerceros(t.data);
            setCuentas(c.data);
        }).catch(console.error)
          .finally(() => setIsLoading(false));
    }, []);

    const chartData = stats ? makeChartData(stats.valor_mes) : [];
    const pendientesPct = stats ? Math.min((stats.terceros_aprobados / Math.max(stats.terceros_total, 1)) * 100, 100) : 0;

    // Activity feed from most recent terceros + cuentas
    const recentActivity = [
        ...terceros.slice(0, 3).map(t => ({
            id: `t-${t.id}`,
            texto: t.nombre,
            sub: `${t.tipo_doc} ${t.documento}`,
            estado: t.estado,
            fecha: t.created_at,
            tipo: "tercero" as const,
        })),
        ...cuentas.slice(0, 3).map(c => ({
            id: `c-${c.id}`,
            texto: c.proveedor,
            sub: c.periodo,
            estado: c.estado,
            fecha: c.created_at,
            tipo: "cuenta" as const,
        })),
    ].sort(() => Math.random() - 0.5).slice(0, 6);

    const activityDot = (estado: string) => {
        const e = estado.toUpperCase();
        if (["APROBADO", "APROBADA", "PAGADA"].includes(e)) return "bg-emerald-500";
        if (["RECHAZADO", "RECHAZADA"].includes(e)) return "bg-red-500";
        if (["EN_REVISION", "RADICADA"].includes(e)) return "bg-blue-500";
        return "bg-amber-400";
    };

    return (
        <div className="flex flex-col gap-6">

            {/* ── Page title ── */}
            <div>
                <h1 className="text-[20px] font-bold text-[#0a1628]">Dashboard</h1>
                <p className="text-[13px] text-gray-400 mt-0.5">Bienvenido al panel de administración GRAPP</p>
            </div>

            {/* ── Main grid ── */}
            <div className="grid grid-cols-12 gap-6">

                {/* ── Revenue Chart (8/12) ── */}
                <div className="col-span-12 lg:col-span-8">
                    <Card className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h5 className="text-[15px] font-bold text-[#0a1628]">Valor Radicado</h5>
                                <p className="text-[12px] text-gray-400 mt-0.5">Últimos 8 meses</p>
                            </div>
                            {stats && (
                                <div className="text-right">
                                    <p className="text-[22px] font-bold text-[#0a1628] tabular-nums">
                                        {formatCurrencyShort(stats.valor_mes)}
                                    </p>
                                    <p className="text-[11px] text-gray-400">este mes</p>
                                </div>
                            )}
                        </div>
                        {isLoading ? (
                            <div className="h-[280px] bg-gray-50 rounded-lg animate-pulse" />
                        ) : (
                            <ResponsiveContainer width="100%" height={280}>
                                <BarChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                                    <XAxis
                                        dataKey="mes"
                                        tick={{ fontSize: 11, fill: "#9ca3af" }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        tickFormatter={formatCurrencyShort}
                                        tick={{ fontSize: 11, fill: "#9ca3af" }}
                                        axisLine={false}
                                        tickLine={false}
                                        width={60}
                                    />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f0f5f9" }} />
                                    <Bar
                                        dataKey="valor"
                                        fill="#0a1628"
                                        radius={[5, 5, 0, 0]}
                                        maxBarSize={40}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </Card>
                </div>

                {/* ── Right column: 2 mini-cards ── */}
                <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">

                    {/* Pendientes card */}
                    <Card className="p-6 flex-1">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="bg-[#eef2fb] p-2.5 rounded-lg">
                                <Clock size={20} className="text-[#0a1628]" />
                            </div>
                            <p className="text-[15px] font-bold text-[#0a1628]">Terceros</p>
                        </div>
                        {isLoading ? (
                            <div className="space-y-3 animate-pulse">
                                <div className="h-6 bg-gray-100 rounded w-1/3" />
                                <div className="h-2 bg-gray-100 rounded" />
                            </div>
                        ) : stats && (
                            <>
                                <div className="flex items-end justify-between mb-3">
                                    <p className="text-[13px] text-gray-500">Aprobados</p>
                                    <p className="text-[13px] font-semibold text-[#0a1628]">{Math.round(pendientesPct)}%</p>
                                </div>
                                <div className="w-full h-2 bg-gray-100 rounded-full mb-5">
                                    <div
                                        className="h-2 bg-[#0a1628] rounded-full transition-all duration-700"
                                        style={{ width: `${pendientesPct}%` }}
                                    />
                                </div>
                                <div className="grid grid-cols-3 gap-3 text-center">
                                    {[
                                        { label: "Total", value: stats.terceros_total, color: "text-[#0a1628]" },
                                        { label: "Aprobados", value: stats.terceros_aprobados, color: "text-emerald-600" },
                                        { label: "Pendientes", value: stats.terceros_pendientes, color: stats.terceros_pendientes > 0 ? "text-amber-600" : "text-gray-400" },
                                    ].map(s => (
                                        <div key={s.label} className="bg-gray-50 rounded-lg py-3">
                                            <p className={`text-[20px] font-bold ${s.color} tabular-nums`}>{s.value}</p>
                                            <p className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-wide">{s.label}</p>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </Card>

                    {/* Valor / Cuentas mini-card */}
                    <Card className="p-6 flex-1">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="bg-[#fff0f0] p-2.5 rounded-lg">
                                <TrendingUp size={20} className="text-red-500" />
                            </div>
                            <p className="text-[15px] font-bold text-[#0a1628]">Cuentas activas</p>
                        </div>
                        {isLoading ? (
                            <div className="h-16 bg-gray-100 rounded animate-pulse" />
                        ) : stats && (
                            <div className="flex items-center gap-4">
                                <div className="flex-1">
                                    <p className="text-[26px] font-bold text-[#0a1628] tabular-nums">
                                        {stats.cuentas_en_revision}
                                    </p>
                                    <span className="inline-block px-2 py-0.5 text-[11px] font-semibold bg-blue-50 text-blue-600 rounded mt-1">
                                        En revisión
                                    </span>
                                </div>
                                <div className="flex-1">
                                    <ResponsiveContainer width="100%" height={56}>
                                        <AreaChart data={sparkData.map((v, i) => ({ v, i }))}>
                                            <defs>
                                                <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                                                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <Area type="monotone" dataKey="v" stroke="#ef4444" strokeWidth={2} fill="url(#sg)" dot={false} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}
                    </Card>
                </div>

                {/* ── Data Table (8/12) ── */}
                <div className="col-span-12 lg:col-span-8">
                    <Card className="overflow-hidden">
                        {/* Tabs */}
                        <div className="flex items-center border-b border-gray-100 px-6 pt-5 pb-0 gap-6">
                            {[
                                { id: "terceros" as const, label: "Terceros", icon: Users },
                                { id: "cuentas"  as const, label: "Cuentas de Cobro", icon: FileText },
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 pb-3 text-[13px] font-semibold border-b-2 transition-colors ${
                                        activeTab === tab.id
                                            ? "text-[#0a1628] border-[#0a1628]"
                                            : "text-gray-400 border-transparent hover:text-gray-600"
                                    }`}
                                >
                                    <tab.icon size={15} />
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Table */}
                        {isLoading ? (
                            <div className="p-6 space-y-3">
                                {[...Array(4)].map((_, i) => (
                                    <div key={i} className="h-10 bg-gray-50 rounded animate-pulse" />
                                ))}
                            </div>
                        ) : activeTab === "terceros" ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-[13px]">
                                    <thead>
                                        <tr className="border-b border-gray-100 bg-gray-50/60">
                                            <th className="px-6 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400">Tercero</th>
                                            <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400 hidden md:table-cell">Empresa</th>
                                            <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400 hidden lg:table-cell">Categoría</th>
                                            <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400">Estado</th>
                                            <th className="px-4 py-3 w-8" />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {terceros.slice(0, 8).map(t => {
                                            const b = getBadge(t.estado);
                                            return (
                                                <tr key={t.id} className="group border-b border-gray-50 last:border-0 hover:bg-gray-50/70 transition-colors">
                                                    <td className="px-6 py-3.5">
                                                        <p className="font-semibold text-[#0a1628] truncate max-w-[180px]">{t.nombre}</p>
                                                        <p className="text-[11px] text-gray-400 mt-0.5">{t.tipo_doc} {t.documento}</p>
                                                    </td>
                                                    <td className="px-4 py-3.5 text-gray-500 hidden md:table-cell">{t.empresa}</td>
                                                    <td className="px-4 py-3.5 hidden lg:table-cell">
                                                        {t.tipos.slice(0, 1).map(tipo => (
                                                            <span key={tipo} className="px-2 py-0.5 rounded bg-[#eef2fb] text-[#0a1628] text-[10px] font-semibold uppercase tracking-wide">
                                                                {tipo}
                                                            </span>
                                                        ))}
                                                    </td>
                                                    <td className="px-4 py-3.5">
                                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-semibold uppercase tracking-wide ${b.bg} ${b.text}`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${b.dot}`} />
                                                            {b.label}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3.5">
                                                        <a href={`/admin/terceros/tercero/${t.id}/change/`} target="_blank" rel="noopener noreferrer"
                                                            className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center justify-center w-7 h-7 rounded-lg border border-gray-200 hover:border-[#0a1628] hover:bg-[#0a1628] hover:text-white text-gray-400 transition-all">
                                                            <ArrowUpRight size={13} />
                                                        </a>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-[13px]">
                                    <thead>
                                        <tr className="border-b border-gray-100 bg-gray-50/60">
                                            <th className="px-6 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400">Proveedor</th>
                                            <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400 hidden md:table-cell">Periodo</th>
                                            <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-gray-400">Valor</th>
                                            <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400">Estado</th>
                                            <th className="px-4 py-3 w-8" />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {cuentas.slice(0, 8).map(c => {
                                            const b = getBadge(c.estado);
                                            return (
                                                <tr key={c.id} className="group border-b border-gray-50 last:border-0 hover:bg-gray-50/70 transition-colors">
                                                    <td className="px-6 py-3.5">
                                                        <p className="font-semibold text-[#0a1628] truncate max-w-[180px]">{c.proveedor}</p>
                                                        <p className="text-[11px] text-gray-400 mt-0.5">{c.numero}</p>
                                                    </td>
                                                    <td className="px-4 py-3.5 text-gray-500 hidden md:table-cell">{c.periodo}</td>
                                                    <td className="px-4 py-3.5 text-right font-semibold text-[#0a1628] tabular-nums">
                                                        {formatCurrency(c.valor_total)}
                                                    </td>
                                                    <td className="px-4 py-3.5">
                                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-semibold uppercase tracking-wide ${b.bg} ${b.text}`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${b.dot}`} />
                                                            {b.label}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3.5">
                                                        <a href={`/admin/proveedores/cuentacobro/${c.id}/change/`} target="_blank" rel="noopener noreferrer"
                                                            className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center justify-center w-7 h-7 rounded-lg border border-gray-200 hover:border-[#0a1628] hover:bg-[#0a1628] hover:text-white text-gray-400 transition-all">
                                                            <ArrowUpRight size={13} />
                                                        </a>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <div className="px-6 py-3 border-t border-gray-50 bg-gray-50/40">
                            <p className="text-[11px] text-gray-400">
                                Mostrando {activeTab === "terceros" ? Math.min(8, terceros.length) : Math.min(8, cuentas.length)} registros recientes
                            </p>
                        </div>
                    </Card>
                </div>

                {/* ── Activity Feed (4/12) ── */}
                <div className="col-span-12 lg:col-span-4">
                    <Card className="p-6 h-full">
                        <h5 className="text-[15px] font-bold text-[#0a1628] mb-6">Actividad reciente</h5>

                        {isLoading ? (
                            <div className="space-y-5">
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} className="flex gap-3 animate-pulse">
                                        <div className="w-2 h-2 rounded-full bg-gray-200 mt-1.5 flex-shrink-0" />
                                        <div className="flex-1 space-y-1.5">
                                            <div className="h-3 bg-gray-100 rounded w-3/4" />
                                            <div className="h-2.5 bg-gray-100 rounded w-1/2" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : recentActivity.length === 0 ? (
                            <p className="text-[13px] text-gray-400 text-center py-8">Sin actividad reciente</p>
                        ) : (
                            <ul className="space-y-0">
                                {recentActivity.map((item, i) => (
                                    <li key={item.id} className="flex gap-4 min-h-[56px]">
                                        <div className="flex flex-col items-center">
                                            <div className={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ${activityDot(item.estado)}`} />
                                            {i < recentActivity.length - 1 && (
                                                <div className="flex-1 w-px bg-gray-100 mt-1" />
                                            )}
                                        </div>
                                        <div className="pb-4 flex-1 min-w-0">
                                            <p className="text-[13px] font-medium text-[#0a1628] truncate">{item.texto}</p>
                                            <p className="text-[11px] text-gray-400 mt-0.5">{item.sub}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`text-[10px] font-semibold uppercase tracking-wide ${getBadge(item.estado).text}`}>
                                                    {getBadge(item.estado).label}
                                                </span>
                                                <span className="text-[10px] text-gray-300">·</span>
                                                <span className="text-[10px] text-gray-400">{item.fecha}</span>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Card>
                </div>

            </div>
        </div>
    );
}
