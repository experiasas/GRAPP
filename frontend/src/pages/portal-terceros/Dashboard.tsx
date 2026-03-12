import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { API_URL } from "@/api/config";
import axios from "axios";
import { ArrowRight } from "lucide-react";

// -- Interfaces --

interface CuentaCobro {
    id: number;
    consecutivo?: string | null;
    mes_servicio: string;
    estado: string;
    tipo_documento?: string;
    valor_total?: number;
    created_at: string;
}

interface Resumen {
    tipo_persona: string;
    acumulado_mensual: number;
    umbral_ss: number;
    requiere_ss: boolean;
    porcentaje_progreso: number;
}

type EstadoFilter = "TODAS" | "BORRADOR" | "RADICADA" | "EN_REVISION" | "APROBADA" | "RECHAZADA" | "PAGADA";

// -- Configuracion de estados --
// Colors based on user provided tokens: 
// Borrador: hsl(38 92% 95%) text hsl(38 92% 30%)
// Radicada: background --accent text --accent-foreground
// Aprobada: hsl(142 76% 94%) text hsl(142 76% 26%)
// Rechazada: hsl(0 84% 95%) text hsl(0 84% 40%)

const ESTADO_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
    PAGADA: { label: "Pagada", bg: "bg-[#F0FDF4]", text: "text-[#15803D]" },
    APROBADO: { label: "Aprobada", bg: "bg-[#DCFCE7]", text: "text-[#166534]" },
    APROBADA: { label: "Aprobada", bg: "bg-[#DCFCE7]", text: "text-[#166534]" },
    RECHAZADO: { label: "Rechazada", bg: "bg-[#FEE2E2]", text: "text-[#991B1B]" },
    RECHAZADA: { label: "Rechazada", bg: "bg-[#FEE2E2]", text: "text-[#991B1B]" },
    EN_REVISION: { label: "En validación", bg: "bg-[#DBEAFE]", text: "text-[#1D4ED8]" },
    RADICADA: { label: "Radicada", bg: "bg-[#DBEAFE]", text: "text-[#1D4ED8]" },
    BORRADOR: { label: "Borrador", bg: "bg-[#FEF9C3]", text: "text-[#854D0E]" },
};

function getEstadoConfig(estado: string) {
    return ESTADO_CONFIG[estado.toUpperCase()] ?? {
        label: estado,
        bg: "bg-secondary",
        text: "text-muted-foreground",
    };
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
    }).format(value);
};

// -- Componente Principal --

export default function Dashboard() {
    const { user } = useAuth();
    const [cuentas, setCuentas] = useState<CuentaCobro[]>([]);
    const [resumen, setResumen] = useState<Resumen | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [activeTab, setActiveTab] = useState<EstadoFilter>("TODAS");

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await axios.get(`${API_URL}/api/cuentas-cobro/mis-cuentas/`);
                setCuentas(res.data.cuentas || []);
                setResumen(res.data.resumen || null);
            } catch (error) {
                console.error("Error cargando cuentas", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    // Conteos por estado
    const normalize = (estado: string) => estado.toUpperCase();
    const borradorCount = cuentas.filter(c => normalize(c.estado) === "BORRADOR").length;
    const radicadasCount = cuentas.filter(c => ["RADICADA", "EN_REVISION"].includes(normalize(c.estado))).length;
    const aprobadasCount = cuentas.filter(c => ["APROBADO", "APROBADA"].includes(normalize(c.estado))).length;
    const rechazadasCount = cuentas.filter(c => ["RECHAZADO", "RECHAZADA"].includes(normalize(c.estado))).length;
    const pagadasCount = cuentas.filter(c => normalize(c.estado) === "PAGADA").length;

    // Radicaciones del mes actual
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const radicacionesDelMes = cuentas.filter(c => {
        const fecha = new Date(c.created_at);
        const esDelMes = fecha.getMonth() === currentMonth && fecha.getFullYear() === currentYear;
        const noEsBorrador = normalize(c.estado) !== 'BORRADOR';
        return esDelMes && noEsBorrador;
    }).length;

    const esNatural = resumen?.tipo_persona === 'NATURAL';

    // Filtrado
    const filteredCuentas = cuentas.filter(c => {
        const term = searchTerm.trim().toLowerCase();
        const displayName = c.tipo_documento === 'FACTURA' ? 'factura' : 'cuenta de cobro';
        const matchesSearch =
            !term ||
            (c.consecutivo ?? "").toLowerCase().includes(term) ||
            c.mes_servicio.toLowerCase().includes(term) ||
            displayName.includes(term) ||
            c.estado.toLowerCase().includes(term) ||
            `${c.id}`.includes(term);

        let matchesTab = true;
        if (activeTab !== "TODAS") {
            const est = normalize(c.estado);
            if (activeTab === "APROBADA") {
                matchesTab = est === "APROBADO" || est === "APROBADA";
            } else if (activeTab === "RECHAZADA") {
                matchesTab = est === "RECHAZADO" || est === "RECHAZADA";
            } else if (activeTab === "RADICADA") {
                matchesTab = est === "RADICADA" || est === "EN_REVISION";
            } else {
                matchesTab = est === activeTab;
            }
        }

        return matchesSearch && matchesTab;
    });

    return (
        <div className="flex flex-col gap-8">
            {/* Header del contenido */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-[24px] font-[700] text-foreground">Cuentas de Cobro</h1>
                    <p className="text-[13px] text-muted-foreground mt-1">{user?.email}</p>
                </div>

                <button
                    onClick={() => window.location.href = '/portal-terceros/radicar'}
                    className="group bg-primary text-primary-foreground hover:bg-primary/92 h-[40px] px-4 rounded-[8px] text-[14px] font-medium transition-colors flex items-center gap-2"
                >
                    Nueva Radicación
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </button>
            </div>

            {/* Fila de 3 stat cards */}
            {esNatural && resumen && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Card 1 */}
                    <div className="bg-card border border-border rounded-xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)] flex flex-col justify-between h-full">
                        <div>
                            <h3 className="text-[18px] font-[600] text-foreground mb-4">
                                Total Radicado este Mes
                            </h3>
                            <span className="text-[28px] font-bold text-foreground block mb-2">
                                {formatCurrency(resumen.acumulado_mensual)}
                            </span>
                        </div>
                        <div>
                            {/* Barra de progreso 4px hacia umbral */}
                            <div className="w-full bg-secondary rounded-full h-[4px] mb-3">
                                <div
                                    className="bg-primary h-[4px] rounded-full transition-all duration-500"
                                    style={{ width: `${Math.min(resumen.porcentaje_progreso, 100)}%` }}
                                />
                            </div>
                            <p className="text-[13px] text-muted-foreground">
                                {resumen.porcentaje_progreso < 100
                                    ? `Te faltan ${formatCurrency(resumen.umbral_ss - resumen.acumulado_mensual)} para el umbral`
                                    : 'Has superado el umbral del mes'}
                            </p>
                        </div>
                    </div>

                    {/* Card 2 */}
                    <div className="bg-card border border-border rounded-xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)] flex flex-col justify-center h-full">
                        <h3 className="text-[18px] font-[600] text-foreground mb-4">
                            Radicaciones del Mes
                        </h3>
                        <span className="text-[40px] font-bold text-foreground leading-none mb-2">
                            {radicacionesDelMes}
                        </span>
                        <p className="text-[13px] text-muted-foreground">
                            radicaciones realizadas
                        </p>
                    </div>

                    {/* Card 3 */}
                    <div className="bg-card border border-border rounded-xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)] flex flex-col justify-center h-full">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-[18px] font-[600] text-foreground">
                                Seguridad Social
                            </h3>
                            <span className="px-3 py-1 text-[13px] font-medium rounded-full bg-accent text-accent-foreground">
                                {resumen.requiere_ss ? 'Requerida' : 'No requerida'}
                            </span>
                        </div>
                        <p className="text-[13px] text-muted-foreground leading-relaxed">
                            {resumen.requiere_ss
                                ? 'Es obligatorio adjuntar la planilla de este periodo al realizar la radicación.'
                                : 'Aún no es obligatorio adjuntar planilla para este periodo.'}
                        </p>
                    </div>
                </div>
            )}

            {!esNatural && resumen && (
                <div className="bg-card border border-border rounded-xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                    <h3 className="text-[18px] font-[600] text-foreground mb-2">
                        Facturación Electrónica
                    </h3>
                    <p className="text-[13px] text-muted-foreground">
                        Las radicaciones de persona jurídica serán tratadas como facturas para el proceso contable.
                    </p>
                </div>
            )}

            {/* Tabs y Buscador */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b border-border pb-px gap-4">
                <div className="flex items-center gap-6">
                    {[
                        { id: "TODAS", label: "Todas", count: cuentas.length },
                        { id: "BORRADOR", label: "Borradores", count: borradorCount },
                        { id: "RADICADA", label: "Radicadas", count: radicadasCount },
                        { id: "APROBADA", label: "Aprobadas", count: aprobadasCount },
                        { id: "PAGADA", label: "Pagadas", count: pagadasCount },
                        { id: "RECHAZADA", label: "Rechazadas", count: rechazadasCount },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as EstadoFilter)}
                            className={`pb-3 text-[14px] font-medium transition-colors relative flex items-center gap-2 ${activeTab === tab.id
                                ? "text-accent-foreground border-b-[2px] border-ring"
                                : "text-muted-foreground hover:text-foreground border-b-[2px] border-transparent"
                                }`}
                        >
                            {tab.label}
                            <span className="px-2 py-0.5 rounded-full bg-secondary text-muted-foreground text-[11px] font-semibold">
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>

                <div className="pb-3 w-full sm:w-auto">
                    <input
                        type="text"
                        placeholder="Buscar por consecutivo o periodo"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full sm:w-72 h-[40px] px-3 rounded-[8px] border border-input focus:border-ring focus:ring-[3px] focus:ring-ring/15 outline-none text-[14px] placeholder:text-muted-foreground bg-white transition-all"
                    />
                </div>
            </div>

            {/* Grid de Cards o Empty State */}
            {isLoading ? (
                <div className="flex items-center justify-center p-12">
                    <p className="text-[14px] text-muted-foreground">Cargando cuentas...</p>
                </div>
            ) : filteredCuentas.length === 0 ? (
                <div className="flex items-center justify-center min-h-[300px]">
                    <p className="text-[14px] text-muted-foreground">No hay radicaciones en este estado</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredCuentas.map((cuenta) => {
                        const config = getEstadoConfig(cuenta.estado);
                        const esBorrador = cuenta.estado.toUpperCase() === "BORRADOR";
                        const displayName = cuenta.consecutivo
                            ? cuenta.consecutivo
                            : (cuenta.tipo_documento === 'FACTURA' ? 'Factura' : 'Cuenta de Cobro');

                        return (
                            <div key={cuenta.id} className="bg-card border border-border rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] flex flex-col">
                                <div className="p-6 pb-5 flex-1">
                                    <div className="flex items-start justify-between mb-4">
                                        <div>
                                            <h4 className="text-[16px] font-[600] text-foreground">
                                                {displayName}
                                            </h4>
                                            <p className="text-[12px] text-muted-foreground mt-0.5">
                                                ID: {cuenta.id} · {cuenta.tipo_documento === 'FACTURA' ? 'Factura' : 'Cuenta de Cobro'}
                                            </p>
                                        </div>
                                        <span className={`px-2.5 py-1 text-[12px] font-[500] rounded-full ${config.bg} ${config.text}`}>
                                            {config.label}
                                        </span>
                                    </div>

                                    <div className="h-px bg-border w-full my-4" />

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-[11px] uppercase tracking-[0.08em] font-medium text-muted-foreground mb-1">Periodo</p>
                                            <p className="text-[14px] font-medium text-foreground">{cuenta.mes_servicio || "Sin definir"}</p>
                                        </div>
                                        <div>
                                            <p className="text-[11px] uppercase tracking-[0.08em] font-medium text-muted-foreground mb-1">Valor</p>
                                            <p className="text-[14px] font-medium text-foreground">
                                                {cuenta.valor_total ? formatCurrency(cuenta.valor_total) : "$0"}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-4 pt-0">
                                    <Link
                                        to={esBorrador ? '/portal-terceros/radicar' : `/portal-terceros/radicar?id=${cuenta.id}`}
                                        className={`flex items-center justify-center w-full h-[40px] rounded-[8px] text-[14px] font-medium transition-colors ${esBorrador
                                            ? "bg-primary text-primary-foreground hover:bg-primary/92"
                                            : "bg-white border border-border text-foreground hover:bg-secondary"
                                            }`}
                                    >
                                        {esBorrador ? "Continuar Editando" : "Ver Detalle"}
                                    </Link>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
