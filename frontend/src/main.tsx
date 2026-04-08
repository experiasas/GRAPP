import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import Index from './pages/index'
import VinculacionWizardPage from './pages/VinculacionWizardPage'
import SuccessVinculacion from './pages/SuccessVinculacion'
import SuccessRadicacion from './pages/SuccessRadicacion'
import ActivarCuentaPage from './pages/auth/ActivarCuentaPage'
import LoginPage from './pages/auth/LoginPage'
import RecuperarPasswordPage from './pages/auth/RecuperarPasswordPage'
import ProtectedLayout from './components/layout/ProtectedLayout'
import Dashboard from './pages/portal-terceros/Dashboard'
import NuevaRadicacion from './pages/portal-terceros/NuevaRadicacion'
import { AuthProvider } from './context/AuthContext'
import AdminLayout from './components/layout/AdminLayout'
import AdminDashboard from './pages/admin/AdminDashboard'
import TercerosListPage from './pages/admin/TercerosListPage'
import EmpresasListPage from './pages/admin/EmpresasListPage'
import ContratosListPage from './pages/admin/ContratosListPage'
import CuentasCobroListPage from './pages/admin/CuentasCobroListPage'
import OrdenesCompraListPage from './pages/admin/OrdenesCompraListPage'
import TiposTerceroPage from './pages/admin/TiposTerceroPage'

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <BrowserRouter>
            <AuthProvider>
                <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/recuperar-password" element={<RecuperarPasswordPage />} />
                    <Route path="/vinculacion/:token" element={<VinculacionWizardPage />} />
                    <Route path="/success/vinculacion" element={<SuccessVinculacion />} />
                    <Route path="/success/radicacion" element={<SuccessRadicacion />} />
                    <Route path="/activar-cuenta/:token" element={<ActivarCuentaPage />} />

                    {/* Portal de Terceros (Accesible solo si está logueado) */}
                    <Route path="/portal-terceros" element={<ProtectedLayout />}>
                        <Route index element={<Dashboard />} />
                        <Route path="radicar" element={<NuevaRadicacion />} />
                    </Route>

                    {/* Admin Panel */}
                    <Route path="/admin-panel" element={<AdminLayout />}>
                        <Route index element={<AdminDashboard />} />
                        <Route path="terceros" element={<TercerosListPage />} />
                        <Route path="empresas" element={<EmpresasListPage />} />
                        <Route path="contratos" element={<ContratosListPage />} />
                        <Route path="cuentas-cobro" element={<CuentasCobroListPage />} />
                        <Route path="ordenes-compra" element={<OrdenesCompraListPage />} />
                        <Route path="tipos-tercero" element={<TiposTerceroPage />} />
                    </Route>
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    </StrictMode>,
)
