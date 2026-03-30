import { NavLink, Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
    Loader2, LogOut, ExternalLink, Menu, X, Bell, ChevronDown, ChevronRight
} from "lucide-react";
import { useState } from "react";

// Estructura agrupada para el Sidebar sin iconos de módulo
const NAV = [
    {
        heading: "PRINCIPAL",
        items: [
            { to: "/admin-panel", label: "Dashboard", end: true },
        ],
    },
    {
        heading: "MÓDULOS",
        items: [
            {
                label: "Terceros",
                subItems: [
                    { to: "/admin-panel/terceros", label: "Terceros" },
                    { to: "/admin/terceros/tercerotipo/", label: "Tipos de tercero", external: true },
                    { to: "/admin/terceros/documentorequerido/", label: "Documentos requeridos", external: true },
                ]
            },
            {
                label: "Empresas",
                subItems: [
                    { to: "/admin-panel/empresas", label: "Empresas" },
                ]
            },
            {
                label: "Contratos",
                subItems: [
                    { to: "/admin-panel/contratos", label: "Contratos" },
                    { to: "/admin/contratos/tipocontrato/", label: "Tipos de contrato", external: true },
                    { to: "/admin/contratos/tipoanexocontrato/", label: "Tipos de anexo", external: true },
                ]
            },
            {
                label: "Órdenes de Compra",
                subItems: [
                    { to: "/admin-panel/ordenes-compra", label: "Órdenes de compra" },
                ]
            },
            {
                label: "Cuentas de Cobro",
                subItems: [
                    { to: "/admin-panel/cuentas-cobro", label: "Cuentas de cobro" },
                    { to: "/admin/proveedores/comprobantepago/", label: "Comprobantes de pago", external: true },
                    { to: "/admin/proveedores/tipoanexo/", label: "Tipos de anexo", external: true },
                ]
            },
        ],
    },
    {
        heading: "SISTEMA",
        items: [
            { to: "/admin/", label: "Admin Django", icon: ExternalLink, external: true },
        ],
    },
];

function NavAccordionItem({ item, setSidebarOpen }: { item: any, setSidebarOpen: any }) {
    const [isOpen, setIsOpen] = useState(false);

    // Si es un item directo sin submenús (ej. Dashboard, Admin Django)
    if (!item.subItems) {
        if (item.external) {
            return (
                <a
                    href={item.to}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] font-medium text-muted-foreground hover:bg-accent hover:text-primary transition-colors"
                >
                    {item.label}
                    {item.icon && <item.icon size={16} className="ml-auto" />}
                </a>
            );
        }

        return (
            <NavLink
                to={item.to}
                end={item.end}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] font-medium transition-colors ${isActive
                        ? "bg-accent text-primary font-semibold"
                        : "text-muted-foreground hover:bg-accent hover:text-primary"
                    }`
                }
            >
                {item.label}
            </NavLink>
        );
    }

    // Es un acordeón con subsecciones
    return (
        <div className="flex flex-col">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg w-full text-left text-[14px] transition-colors ${isOpen ? "font-semibold text-primary" : "font-medium text-muted-foreground hover:bg-accent hover:text-primary"
                    }`}
            >
                {item.label}
                <ChevronRight
                    size={16}
                    className={`text-muted-foreground/50 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
                />
            </button>

            {/* SubItems dentro del acordeón */}
            <div
                className={`flex flex-col overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? "max-h-[800px] mt-1 opacity-100" : "max-h-0 opacity-0"
                    }`}
            >
                {item.subItems.map((sub: any, i: number) => (
                    sub.external ? (
                        <a
                            key={i}
                            href={sub.to}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center pl-[28px] pr-3 py-2 text-[13px] font-medium text-muted-foreground hover:text-primary transition-colors relative before:content-[''] before:absolute before:left-3 before:w-1 before:h-[2px] before:bg-border hover:before:bg-primary"
                        >
                            {sub.label}
                        </a>
                    ) : (
                        <NavLink
                            key={i}
                            to={sub.to}
                            onClick={() => setSidebarOpen(false)}
                            className={({ isActive }) =>
                                `flex items-center pl-[28px] pr-3 py-2 text-[13px] transition-colors relative before:content-[''] before:absolute before:left-3 before:w-1 before:h-[2px] before:bg-border ${isActive
                                    ? "text-primary font-semibold before:bg-primary"
                                    : "text-muted-foreground font-medium hover:text-primary hover:before:bg-primary"
                                }`
                            }
                        >
                            {sub.label}
                        </NavLink>
                    )
                ))}
            </div>
        </div>
    );
}

export default function AdminLayout() {
    const { user, isLoading, logout } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const location = useLocation();

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-muted/30">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
        );
    }

    if (!user) return <Navigate to="/login" replace />;
    if (!user.is_staff) return <Navigate to="/portal-terceros" replace />;

    const initials = user.email.slice(0, 2).toUpperCase();

    // Breadcrumb label fallback temporal
    const crumb = "Dashboard";

    return (
        <div className="min-h-screen bg-background flex flex-col">

            {/* ── Top Header ── */}
            <header className="sticky top-0 z-40 bg-white border-b border-border shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
                <div className="flex items-center justify-between h-[70px] px-5 lg:px-8">

                    {/* Left: logo + breadcrumb */}
                    <div className="flex items-center gap-4">
                        <button
                            className="xl:hidden p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                        >
                            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
                        </button>
                        <div className="flex items-center gap-3">
                            <img
                                src="/explogo.png"
                                alt="Experias"
                                className="h-8 w-auto"
                                onError={(e) => { e.currentTarget.style.display = "none"; }}
                            />
                            <div className="hidden md:flex items-center gap-2 text-[13px] text-muted-foreground">
                                <span>/</span>
                                <span className="text-primary font-medium">{crumb}</span>
                            </div>
                        </div>
                    </div>

                    {/* Right: bell + user */}
                    <div className="flex items-center gap-2">
                        <button className="relative p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors">
                            <Bell size={18} />
                        </button>

                        <div className="relative">
                            <button
                                onClick={() => setProfileOpen(!profileOpen)}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition-colors"
                            >
                                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-[12px] font-semibold">
                                    {initials}
                                </div>
                                <div className="hidden sm:block text-left">
                                    <p className="text-[12px] font-semibold text-primary leading-none">{user.email.split("@")[0]}</p>
                                    <p className="text-[11px] text-muted-foreground/70 mt-0.5">Administrador</p>
                                </div>
                                <ChevronDown size={14} className="text-muted-foreground/50 hidden sm:block" />
                            </button>

                            {profileOpen && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
                                    <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-border rounded-xl shadow-lg z-20 py-1 overflow-hidden">
                                        <div className="px-4 py-3 border-b border-border/60">
                                            <p className="text-[12px] font-semibold text-primary truncate">{user.email}</p>
                                            <p className="text-[11px] text-muted-foreground/70">Administrador</p>
                                        </div>
                                        <button
                                            onClick={logout}
                                            className="w-full flex items-center gap-2 px-4 py-2.5 text-[13px] text-muted-foreground hover:bg-muted/60 hover:text-destructive transition-colors"
                                        >
                                            <LogOut size={14} />
                                            Cerrar sesión
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* ── Body ── */}
            <div className="flex flex-1 overflow-hidden">

                {/* Mobile overlay */}
                {sidebarOpen && (
                    <div
                        className="fixed inset-0 bg-black/40 z-30 xl:hidden"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}

                {/* ── Sidebar ── */}
                <aside className={`
                    fixed xl:sticky top-[70px] z-30 h-[calc(100vh-70px)]
                    w-[260px] bg-white border-r border-border
                    flex flex-col overflow-y-auto
                    transition-transform duration-200
                    ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} xl:translate-x-0
                `}>
                    <nav className="flex-1 px-4 py-5 space-y-6">
                        {NAV.map((section, sectionIdx) => (
                            <div key={sectionIdx}>
                                <p className="px-3 text-[10px] font-semibold tracking-[0.12em] uppercase text-muted-foreground/60 mb-2">
                                    {section.heading}
                                </p>
                                <div className="space-y-0.5">
                                    {section.items.map((item, itemIdx) => (
                                        <NavAccordionItem key={itemIdx} item={item} setSidebarOpen={setSidebarOpen} />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </nav>
                </aside>

                {/* ── Main Content ── */}
                <main className="flex-1 overflow-y-auto min-w-0">
                    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}
