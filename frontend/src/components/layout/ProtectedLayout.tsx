import { NavLink, Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Loader2, LogOut, User as UserIcon, LayoutDashboard, FileText, HelpCircle, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function ProtectedLayout() {
    const { user, isLoading, logout } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (user.is_staff) {
        return <Navigate to="/admin-panel" replace />;
    }

    return (
        <div className="min-h-screen bg-background flex flex-col md:flex-row">
            {/* Sidebar (Mobile Overlay) */}
            <div
                className={`fixed inset-0 bg-black/50 z-20 md:hidden ${sidebarOpen ? 'block' : 'hidden'}`}
                onClick={() => setSidebarOpen(false)}
            />

            {/* Sidebar */}
            <aside className={`fixed md:sticky top-0 left-0 z-30 h-screen w-[220px] bg-primary flex flex-col transition-transform transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
                {/* Logo Area - Padding 24px */}
                <div className="p-6 flex items-center">
                    <img
                        src="/explogo.png"
                        alt="Experias"
                        className="h-8 w-auto brightness-0 invert"
                        onError={(e) => { e.currentTarget.style.display = 'none' }}
                    />
                </div>

                {/* Nav Links */}
                <nav className="flex-1 py-2 overflow-y-auto">
                    <div className="mb-6">
                        <p className="px-6 text-[10px] font-medium tracking-[0.08em] uppercase text-white/40 mb-2">
                            PRINCIPAL
                        </p>
                        <NavLink
                            to="/portal-terceros"
                            end
                            className={({ isActive }) =>
                                `flex items-center gap-3 py-2 pr-6 pl-[21px] text-[14px] font-medium transition-colors ${isActive
                                    ? "bg-white/12 text-white border-l-[3px] border-white"
                                    : "text-white/80 hover:bg-white/[0.07] border-l-[3px] border-transparent"
                                }`
                            }
                            onClick={() => setSidebarOpen(false)}
                        >
                            <LayoutDashboard size={18} />
                            Dashboard
                        </NavLink>
                        <NavLink
                            to="/portal-terceros/radicar"
                            className={({ isActive }) =>
                                `flex items-center gap-3 py-2 pr-6 pl-[21px] text-[14px] font-medium transition-colors ${isActive
                                    ? "bg-white/12 text-white border-l-[3px] border-white"
                                    : "text-white/80 hover:bg-white/[0.07] border-l-[3px] border-transparent"
                                }`
                            }
                            onClick={() => setSidebarOpen(false)}
                        >
                            <FileText size={18} />
                            Radicar Cuentas
                        </NavLink>
                    </div>

                    <div>
                        <p className="px-6 text-[10px] font-medium tracking-[0.08em] uppercase text-white/40 mb-2">
                            OTROS
                        </p>
                        <a
                            href="#"
                            className="flex items-center gap-3 py-2 pr-6 pl-[21px] text-[14px] font-medium text-white/80 hover:bg-white/[0.07] border-l-[3px] border-transparent transition-colors"
                        >
                            <HelpCircle size={18} />
                            Ayuda
                        </a>
                    </div>
                </nav>

                {/* User & Logout Area */}
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center text-white flex-shrink-0">
                            <UserIcon size={16} />
                        </div>
                        <div className="truncate">
                            <p className="text-[14px] font-medium text-white truncate">Usuario Tercero</p>
                            <p className="text-[13px] text-white/60 truncate" title={user.email}>{user.email}</p>
                        </div>
                    </div>
                    <button
                        onClick={logout}
                        className="flex items-center w-full gap-2 text-[14px] font-medium text-white/80 hover:text-white transition-colors"
                    >
                        <LogOut size={18} />
                        Cerrar Sesión
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 bg-background">
                {/* Mobile Header */}
                <header className="md:hidden bg-card border-b border-border sticky top-0 z-10 h-16 flex items-center justify-between px-4 sm:px-6">
                    <img
                        src="/explogo.png"
                        alt="Experias"
                        className="h-7 w-auto"
                        onError={(e) => { e.currentTarget.style.display = 'none' }}
                    />
                    <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
                        <Menu className="h-6 w-6 text-foreground" />
                    </Button>
                </header>

                <main className="flex-1 p-6 lg:p-12 w-full max-w-7xl mx-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
