import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import Index from './pages/index'
import VinculacionWizardPage from './pages/VinculacionWizardPage'
import RadicacionPage from './pages/RadicacionPage'
import SuccessVinculacion from './pages/SuccessVinculacion'
import SuccessRadicacion from './pages/SuccessRadicacion'

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/vinculacion/:token" element={<VinculacionWizardPage />} />
                <Route path="/radicacion/:token" element={<RadicacionPage />} />
                <Route path="/success/vinculacion" element={<SuccessVinculacion />} />
                <Route path="/success/radicacion" element={<SuccessRadicacion />} />
            </Routes>
        </BrowserRouter>
    </StrictMode>,
)
