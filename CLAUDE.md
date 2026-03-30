# CLAUDE.md


## Project Overview

GRAPP is a full-stack Django + React application for managing third-party vendors (terceros), invoices/billing statements (cuentas de cobro), and contracts. It implements two main workflows:

1. **Vinculación** — Vendor onboarding wizard (token-based, no auth required)
2. **Radicación** — Invoice/billing submission wizard (token-based or authenticated)



## Architecture

### Backend Apps
- **tenancy/** — `Empresa` (multi-tenant company) and `ContactoEmpresa`
- **terceros/** — Core vendor management: `Tercero`, profile models (Estudio, Curso, Certificacion, ExperienciaLaboral, TerceroIdioma, SeguridadSocial), document models (`DocumentoTercero`, `DocumentoRequerido`, `DocumentoTipo`), `InvitacionVinculacion`, `TokenActivacionTercero`
- **proveedores/** — Billing: `CuentaCobro`, `CuentaCobroAnexo`, `TipoAnexo`, `InvitacionRadicacion`, `ConfiguracionRadicacion`, `ComprobantePago`
- **contratos/** — `Contrato` linking empresa + contratista

### API URL Structure (`GRAPP/urls.py`)
- `POST /api/auth/token/` — JWT login
- `POST /api/auth/activar/<token>/` — Account activation
- `GET /api/auth/me/` — Current user
- `GET|POST /api/vinculacion/<token>/` — Vendor onboarding
- `POST /api/terceros/<id>/documentos/<code>/upload` — Single doc upload
- `POST /api/terceros/<id>/documentos/bulk-upload` — Bulk upload
- Profile CRUD: `/api/terceros/<id>/estudios/`, `/cursos/`, `/certificaciones/`, `/experiencias/`, `/idiomas/`, `/seguridad-social/`
- `POST /api/cuentas-cobro/wizard/` — Create billing draft
- `GET|PATCH /api/cuentas-cobro/<id>/wizard/` — Get/update billing state
- `GET|POST /api/cuentas-cobro/<id>/anexos/` — Manage attachments
- `POST /api/cuentas-cobro/<id>/submit/` — Submit billing

### Frontend Structure
- **`src/lib/api.ts`** — Axios client with JWT interceptor (token from `localStorage.grapp_access_token`) + `vinculacionAPI` and `terceroAPI` objects
- **`src/api/wizardApi.ts`** — Typed API client for the billing wizard workflow
- **`src/context/AuthContext.tsx`** — Global auth state; auto-logout on 401
- **`src/hooks/useCuentaWizard.ts`** — State hook for billing wizard
- **`src/pages/`** — Route-level page components; `portal-terceros/` requires auth
- **`src/components/wizard/`** — Wizard step components; `sections/` contains profile sub-forms

### Key Data Flow
- All models have `empresa_fk` for tenant isolation
- `Tercero.estado` lifecycle: `BORRADOR → PENDIENTE → APROBADO/RECHAZADO`
- `CuentaCobro.estado` lifecycle: `BORRADOR → RADICADA → EN_REVISION → APROBADA/RECHAZADA/PAGADA`
- `CuentaCobro.recalcular_total()` auto-calculates IVA, admin, contingency, and utility values
- Monthly accumulation tracked via `mes_servicio_date` for social security IBC rules

### Environment
- Copy `.env.example` to `.env`; defaults to SQLite
- Set `DB_ENGINE=postgres` with credentials for PostgreSQL
- Frontend proxies `/media` to `http://localhost:8000` via Vite config
- CORS allows `http://localhost:5173` only

### Authentication
- JWT (SimpleJWT): 60-minute access tokens, 1-day refresh tokens with rotation
- Token stored in `localStorage` key `grapp_access_token`
- Vendor portals use invitation tokens (no user account required for onboarding)
