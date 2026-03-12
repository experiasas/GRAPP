import { NavLink, Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
    Loader2, LogOut, LayoutDashboard, Users, FileText,
    ExternalLink, Menu, X, Bell, ChevronDown
} from "lucide-react";
import { useState } from "react";

const NAV = [
    {
        heading: "PRINCIPAL",
        items: [
            { to: "/admin-panel", label: "Dashboard", icon: LayoutDashboard, end: true },
            { to: "/admin-panel/terceros", label: "Terceros", icon: Users },
            { to: "/admin-panel/cuentas", label: "Cuentas de Cobro", icon: FileText },
        ],
    },
    {
        heading: "SISTEMA",
        items: [
            { to: "/admin/", label: "Admin Django", icon: ExternalLink, external: true },
        ],
    },
];

export default function AdminLayout() {
    const { user, isLoading, logout } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const location = useLocation();

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-[#f0f5f9]">
                <Loader2 className="h-6 w-6 animate-spin text-[#0a1628]" />
            </div>
        );
    }

    if (!user) return <Navigate to="/login" replace />;
    if (!user.is_staff) return <Navigate to="/portal-terceros" replace />;

    const initials = user.email.slice(0, 2).toUpperCase();

    // Breadcrumb label
    const crumb = location.pathname.includes("terceros") ? "Terceros"
        : location.pathname.includes("cuentas") ? "Cuentas de Cobro"
        : "Dashboard";

    return (
        <div className="min-h-screen bg-[#f0f5f9] flex flex-col">

            {/* ── Top Header ── */}
            <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
                <div className="flex items-center justify-between h-[70px] px-5 lg:px-8">

                    {/* Left: logo + breadcrumb */}
                    <div className="flex items-center gap-4">
                        <button
                            className="xl:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
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
                            <div className="hidden md:flex items-center gap-2 text-[13px] text-gray-400">
                                <span>/</span>
                                <span className="text-[#0a1628] font-medium">{crumb}</span>
                            </div>
                        </div>
                    </div>

                    {/* Right: bell + user */}
                    <div className="flex items-center gap-2">
                        <button className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
                            <Bell size={18} />
                        </button>

                        <div className="relative">
                            <button
                                onClick={() => setProfileOpen(!profileOpen)}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                                <div className="h-8 w-8 rounded-full bg-[#0a1628] flex items-center justify-center text-white text-[12px] font-semibold">
                                    {initials}
                                </div>
                                <div className="hidden sm:block text-left">
                                    <p className="text-[12px] font-semibold text-[#0a1628] leading-none">{user.email.split("@")[0]}</p>
                                    <p className="text-[11px] text-gray-400 mt-0.5">Administrador</p>
                                </div>
                                <ChevronDown size={14} className="text-gray-400 hidden sm:block" />
                            </button>

                            {profileOpen && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
                                    <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1 overflow-hidden">
                                        <div className="px-4 py-3 border-b border-gray-100">
                                            <p className="text-[12px] font-semibold text-[#0a1628] truncate">{user.email}</p>
                                            <p className="text-[11px] text-gray-400">Administrador</p>
                                        </div>
                                        <button
                                            onClick={logout}
                                            className="w-full flex items-center gap-2 px-4 py-2.5 text-[13px] text-gray-600 hover:bg-gray-50 hover:text-red-600 transition-colors"
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
                    w-[260px] bg-white border-r border-gray-200
                    flex flex-col overflow-y-auto
                    transition-transform duration-200
                    ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} xl:translate-x-0
                `}>
                    <nav className="flex-1 px-4 py-5 space-y-6">
                        {NAV.map((section) => (
                            <div key={section.heading}>
                                <p className="px-3 text-[10px] font-semibold tracking-[0.12em] uppercase text-gray-400 mb-2">
                                    {section.heading}
                                </p>
                                <div className="space-y-0.5">
                                    {section.items.map((item) =>
                                        item.external ? (
                                            <a
                                                key={item.to}
                                                href={item.to}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] font-medium text-gray-500 hover:bg-[#eef2fb] hover:text-[#0a1628] transition-colors"
                                            >
                                                <item.icon size={18} className="flex-shrink-0" />
                                                {item.label}
                                            </a>
                                        ) : (
                                            <NavLink
                                                key={item.to}
                                                to={item.to}
                                                end={item.end}
                                                onClick={() => setSidebarOpen(false)}
                                                className={({ isActive }) =>
                                                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] font-medium transition-colors ${
                                                        isActive
                                                            ? "bg-[#eef2fb] text-[#0a1628] font-semibold"
                                                            : "text-gray-500 hover:bg-[#eef2fb] hover:text-[#0a1628]"
                                                    }`
                                                }
                                            >
                                                <item.icon size={18} className="flex-shrink-0" />
                                                {item.label}
                                            </NavLink>
                                        )
                                    )}
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
