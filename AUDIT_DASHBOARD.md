# AUDIT_DASHBOARD.md — GRAPP Project Audit
**Fecha inicial:** 2026-03-12 · **Última actualización:** 2026-03-27 (sesión 9)
**Stack:** Django REST Framework + React (TypeScript) + Tailwind CSS
**Auditor:** Claude Code (Anthropic)

---

## RESUMEN EJECUTIVO

**GRAPP** es una plataforma de gestión de terceros (Gestión de Radicación y Administración de Proveedores y Personal). Permite el **onboarding/vinculación** de contratistas, empleados y proveedores, junto con la gestión de **cuentas de cobro** (radicación). La arquitectura es API-first con JWT, Django backend, y React SPA frontend.

---

## SECCIÓN 1: BACKEND (DJANGO)

### 1.1 Estructura de Carpetas

```
/c/GRAPP/
├── GRAPP/                      # Config del proyecto Django
│   ├── settings.py             # Config general, JWT, CORS, DB
│   └── urls.py                 # Routing principal (140 líneas)
├── terceros/                   # App core: vinculación de terceros
│   ├── models.py               # Tercero, InvitacionVinculacion, Documentos, Perfil (596 líneas)
│   ├── serializers.py          # Serializers DRF (206 líneas)
│   ├── api_views.py            # Endpoints vinculación y documentos (~400 líneas)
│   ├── viewsets.py             # CRUD ViewSets (estudios, cursos, idiomas...) (~200 líneas)
│   ├── admin_api.py            # Stats y listas del dashboard admin (186 líneas)
│   └── views.py                # Vistas HTML legacy (39 líneas)
├── proveedores/                # App cuentas de cobro + wizard
│   ├── models.py               # CuentaCobro, TipoAnexo, InvitacionRadicacion (258 líneas)
│   ├── wizard_serializers.py   # Serializers complejos wizard (620 líneas)
│   ├── wizard_viewsets.py      # ViewSets del wizard (364 líneas)
│   ├── serializers.py          # Serializers básicos (36 líneas)
│   ├── api_views.py            # Endpoints radicación legacy (54 líneas)
│   └── admin_api.py            # 3 endpoints admin: list paginado, detalle, cambio de estado con comprobante
├── contratos/                  # App contratos (completa)
│   ├── models.py               # 8 modelos: Contrato, TipoContrato, TipoAnexoContrato, PolizaContrato, CondicionContractual, OtrosiContrato, FormaPagoContrato, ContratoAnexo, ContratoFlujo (~300 líneas)
│   ├── admin.py                # Admin completo con inlines para los 6 modelos hijo
│   └── admin_api.py            # 14 endpoints REST para contratos (nuevo)
├── tenancy/                    # Multi-tenancy
│   ├── models.py               # Empresa, ContactoEmpresa (54 líneas)
│   ├── admin_api.py            # Endpoints admin de empresas y contactos
│   └── views.py
├── ventas/                     # App vacía (pendiente)
├── db.sqlite3                  # DB desarrollo
├── manage.py
└── media/                      # Uploads (documentos, cuentas_cobro, terceros)
```

---

### 1.2 Modelos de Vinculación (`terceros/models.py`)

| Modelo | Propósito | Campos clave |
|--------|-----------|--------------|
| **TipoTercero** | Categoriza el tipo de tercero | `code` (CLIENTE, PROVEEDOR, CONTRATISTA, EMPLEADO, ASPIRANTE), `nombre` |
| **InvitacionVinculacion** | Token de invitación para onboarding | `token`, `email`, `estado` (PENDIENTE/USADA/EXPIRADA), `tipo_tercero_fk`, `empresa_fk` |
| **Tercero** | Registro principal del tercero | `tipo_persona` (NATURAL/JURIDICA), identificación, contacto, dirección, info financiera, `estado` (BORRADOR/PENDIENTE/APROBADO/RECHAZADO), M2M a TipoTercero |
| **DocumentoTipo** | Categoría de documento | `code` (RUT, CEDULA_RL, EEFF, etc.), `nombre` |
| **DocumentoRequerido** | Regla de vinculación | Relaciona `tipo_tercero` + `documento_tipo` con filtro `aplica_a_persona` (NATURAL/JURIDICA/AMBAS), `obligatorio` |
| **DocumentoTercero** | Documento cargado | `tercero_fk`, `documento_tipo_fk`, `archivo`, `estado` (PENDIENTE/CARGADO/APROBADO/RECHAZADO) |
| **Tag** | Etiqueta de categorización | `nombre`, `slug` |
| **TokenActivacionTercero** | Activación de cuenta | `usuario_fk`, `token`, `expires_at` |

**Modelos de Perfil (datos complementarios):**

| Modelo | Propósito |
|--------|-----------|
| **Estudio** | Formación académica (nivel, institución, título, fechas) |
| **Curso** | Capacitaciones (nombre, entidad, horas) |
| **Certificacion** | Certificaciones (nombre, fabricante, fecha) |
| **ExperienciaLaboral** | Historial laboral (empresa, cargo, fechas) |
| **Idioma** / **TerceroIdioma** | Idiomas (BASICO/INTERMEDIO/AVANZADO/NATIVO) |
| **SeguridadSocial** | EPS, ARL, AFP |

---

### 1.3 Endpoints de Vinculación y Dashboard

#### Autenticación:
```
POST   /api/auth/token/                          → Obtener JWT (access + refresh)
POST   /api/auth/token/refresh/                  → Renovar token
GET    /api/auth/me/                             → Perfil del usuario actual
POST   /api/auth/activar/<token>/                → Activar cuenta de tercero
```

#### Flujo de Vinculación:
```
GET    /api/vinculacion/<token>/                 → Datos de invitación (empresa, email, tipo_tercero, docs requeridos)
POST   /api/vinculacion/<token>/                 → Crear registro de tercero
GET    /api/vinculacion/<token>/documentos/      → Documentos requeridos filtrados por tipo_persona
GET    /api/terceros/<tercero_id>/status/        → Estado de completitud (docs + perfil)
GET    /api/terceros/<tercero_id>/               → Detalle del tercero
```

#### Carga de Documentos:
```
POST   /api/terceros/<tercero_id>/documentos/<doc_type_code>/upload
POST   /api/terceros/<tercero_id>/documentos/bulk-upload
```

#### CRUD de Perfil (anidado):
```
GET/POST   /api/terceros/<tercero_id>/estudios/
PUT/DELETE /api/terceros/<tercero_id>/estudios/<id>/
GET/POST   /api/terceros/<tercero_id>/cursos/
PUT/DELETE /api/terceros/<tercero_id>/cursos/<id>/
GET/POST   /api/terceros/<tercero_id>/certificaciones/
PUT/DELETE /api/terceros/<tercero_id>/certificaciones/<id>/
GET/POST   /api/terceros/<tercero_id>/experiencias/
PUT/DELETE /api/terceros/<tercero_id>/experiencias/<id>/
GET/POST   /api/terceros/<tercero_id>/idiomas/
PUT/DELETE /api/terceros/<tercero_id>/idiomas/<id>/
GET        /api/idiomas/                          → Catálogo de idiomas
GET/PUT    /api/terceros/<tercero_id>/seguridad-social/
GET/POST   /api/terceros/<tercero_id>/tags/
```

#### Admin Dashboard:
```
GET    /api/admin/stats/                         → KPIs (total terceros, valor mes, contratos)
GET    /api/admin/terceros/                      → Lista paginada con filtros (estado, tipo_tercero,
                                                   tipo_persona, search, ordering, page, page_size)
                                                   Respuesta: {count, page, page_size, pages, results[]}
GET    /api/admin/terceros/<id>/detalle/         → Detalle completo (contacto, empresa, docs, perfil)
PATCH  /api/admin/terceros/<id>/estado/          → Aprobar/rechazar tercero (requiere motivo si RECHAZADO)
POST   /api/admin/invitaciones/                  → Crear InvitacionVinculacion; retorna token + link
GET    /api/admin/empresas/                      → Lista simple {id,nombre,nit} (backward compat modal)
                                                   Con ?page=N → lista paginada con stats y contacto principal
POST   /api/admin/empresas/                      → Crear empresa (nombre, nit, activa)
GET    /api/admin/empresas/<id>/                 → Detalle: contactos + stats terceros/contratos
PATCH  /api/admin/empresas/<id>/                 → Editar empresa (parcial, valida NIT único)
POST   /api/admin/empresas/<id>/contactos/       → Crear ContactoEmpresa
PATCH  /api/admin/empresas/<id>/contactos/<cid>/ → Editar contacto
DELETE /api/admin/empresas/<id>/contactos/<cid>/ → Eliminar contacto
GET    /api/admin/cuentas/                       → Lista resumida de cuentas (dashboard widget)
GET    /api/admin/cuentas-cobro/               → Lista paginada completa de cuentas (filtros: estado, search, tercero, periodo, ordering, page, page_size) — excluye BORRADOR
GET    /api/admin/cuentas-cobro/<id>/detalle/  → Detalle completo (tercero, contrato, desglose financiero, anexos, comprobante)
PATCH  /api/admin/cuentas-cobro/<id>/estado/   → Cambiar estado (transiciones validadas; RECHAZADA requiere motivo; PAGADA acepta comprobante MultiPart)
GET    /api/admin/terceros-pendientes/           → Terceros PENDIENTE con urgencia/tarea/días
GET    /api/admin/documentos-recientes/          → Documentos cargados últimas 48h (max 5)
```

#### Contratos:
```
GET    /api/admin/tipos-contrato/                → Catálogo de TipoContrato
GET    /api/admin/tipos-anexo-contrato/          → Catálogo de TipoAnexoContrato
GET    /api/admin/contratos/                     → Lista paginada (filtros: search, estado, prioridad, empresa)
POST   /api/admin/contratos/                     → Crear contrato
GET    /api/admin/contratos/<id>/                → Detalle completo
PATCH  /api/admin/contratos/<id>/                → Editar contrato
POST   /api/admin/contratos/<id>/estado/         → Cambiar estado (crea ContratoFlujo)
GET|POST   /api/admin/contratos/<id>/polizas/    → Listar/crear pólizas
PATCH|DELETE /api/admin/contratos/<id>/polizas/<pid>/
GET|POST   /api/admin/contratos/<id>/otrosis/    → Listar/crear otrosíes (auto-actualiza fecha_fin_otrosi)
PATCH|DELETE /api/admin/contratos/<id>/otrosis/<oid>/
GET|POST   /api/admin/contratos/<id>/formas-pago/ → Listar/crear formas de pago
PATCH|DELETE /api/admin/contratos/<id>/formas-pago/<fpid>/
GET|POST   /api/admin/contratos/<id>/anexos/    → Listar/subir anexos (MultiPart)
DELETE     /api/admin/contratos/<id>/anexos/<aid>/
```

#### Órdenes de Compra:
```
GET|POST  /api/admin/ordenes-compra/                    → Lista paginada (filtros: search, estado, tercero, empresa, contrato, ordering) + crear OC
GET|PATCH /api/admin/ordenes-compra/<id>/               → Detalle completo + editar campos (objeto, valores, fechas, contrato, ítems)
POST      /api/admin/ordenes-compra/<id>/estado/        → Cambiar estado (máquina: BORRADOR→EMITIDA→APROBADA→EN_EJECUCION→CUMPLIDA; anulación requiere motivo)
GET       /api/admin/ordenes-compra/<id>/radicaciones/  → Cuentas de cobro vinculadas (excluye BORRADOR)
GET       /api/portal/mis-ordenes-compra/               → OCs del tercero logueado en estados APROBADA/EN_EJECUCION (portal)
```

#### Wizard Cuentas de Cobro:
```
GET/POST/PATCH /api/cuentas-cobro/               → CRUD del wizard
GET/POST/PATCH /api/cuentas-cobro/<id>/          → Operaciones por instancia
GET            /api/tipos-anexo/                 → Catálogo de TipoAnexo
```

---

### 1.4 Views y ViewSets

**`terceros/api_views.py`:**

| Función | Método | Propósito |
|---------|--------|-----------|
| `vinculacion_api(token)` | GET/POST | Formulario principal de vinculación (valida token, crea Tercero, crea placeholders de DocumentoTercero) |
| `upload_documento(...)` | POST | Carga un documento (update_or_create) |
| `bulk_upload_documentos(...)` | POST | Carga múltiple de archivos (FormData) |
| `tercero_status(...)` | GET | Chequeo de completitud (docs + perfil) |
| `get_documentos_requeridos_filtrados(...)` | GET | Filtra DocumentoRequerido por tipo_tercero + tipo_persona |
| `activar_cuenta_tercero(...)` | POST | Activa cuenta con token de invitación |

**`terceros/admin_api.py`:**
- `admin_stats()`: Agrega KPIs mensuales e históricos (trend %, estado predominante, contratos próximos a vencer, gráfico 6 meses con clasificación arriba/en-meta/debajo)
- `admin_terceros_list()`: Lista paginada de terceros con filtros reales (`page`/`page_size`, `estado`, `tipo_tercero`, `tipo_persona`, `search`, `ordering`). Anotaciones SQL para `_docs_total`/`_docs_cargados`. Campos legacy mantenidos para compat. con AdminDashboard
- `admin_tercero_detalle(tercero_id)`: Detalle completo de un tercero: contacto, empresa (id/nombre/nit), tipos_tercero, documentos con URL de archivo, perfil (conteos por sección), info tributaria/RL/tesorería, observaciones de aprobación
- `admin_cambiar_estado_tercero(tercero_id)`: PATCH — acepta `{estado, motivo?}`; valida whitelist APROBADO/RECHAZADO; motivo obligatorio para RECHAZADO; guarda `aprobado_por`, `aprobado_at`, `observaciones_aprobacion`
- `admin_crear_invitacion()`: POST — crea `InvitacionVinculacion`; valida email, tipo_tercero (por code), empresa_id; retorna token + link relativo
- `admin_cuentas_list()`: Lista de cuentas enriquecida con `urgencia`, `accion`, `dias_pendiente`, `relativo`
- `admin_documentos_recientes()`: Documentos cargados en las últimas 48h (excluye placeholders sin archivo)
- `admin_terceros_pendientes()`: Terceros en estado PENDIENTE con urgencia, tarea derivada del estado de documentos, y tiempo relativo

**Helpers internos de `admin_api.py`:**
- `_clasificar_urgencia(dias)`: `crítica` > 10d / `media` ≥ 5d / `baja` < 5d
- `_mes_range(offset)`: inicio/fin de un mes relativo al actual
- `_trend_pct(actual, anterior)`: variación porcentual redondeada a 1 decimal

**`tenancy/admin_api.py`:**
- `admin_empresas_list()`: GET lista empresas — sin `?page` retorna `[{id,nombre,nit}]` simple (compat modal); con `?page` retorna paginado con `total_terceros`, `total_contratos`, `contactos_count`, email/teléfono del contacto principal. POST crea empresa con validación de NIT único
- `admin_empresa_detalle()`: GET detalle completo: contactos serializados (con `tipo_display`), stats de terceros (total/aprobados/pendientes) y contratos (total/vigentes). PATCH actualización parcial con validación
- `admin_empresa_contacto_crear()`: POST — crea `ContactoEmpresa`; campos: nombre*, tipo*, cargo, email, telefono, principal
- `admin_empresa_contacto_detalle()`: PATCH edición parcial / DELETE eliminación de contacto
- Helper `_serialize_contacto()`: serialización reutilizable de ContactoEmpresa
- Constante `_TIPOS_CONTACTO`: whitelist de tipos válidos

**`terceros/viewsets.py`:**
- `EstudioViewSet`, `CursoViewSet`, `CertificacionViewSet`, `ExperienciaLaboralViewSet`: CRUD estándar por tercero_id
- `TerceroIdiomaViewSet`: `create()` personalizado para resolver `idioma_code` → FK
- `SeguridadSocialView`: Singleton APIView
- `IdiomaListView`: Catálogo de idiomas (solo lectura)

---

### 1.5 Serializers Clave

| Serializer | Campos | Uso |
|------------|--------|-----|
| **TerceroCreateSerializer** | Info básica + financiera | POST vinculación |
| **TerceroDetailSerializer** | Lectura + `nombre_completo` calculado | GET detalle |
| **EstudioSerializer** | nivel, institucion, titulo, fechas, soporte | CRUD perfil |
| **TerceroIdiomaSerializer** | idioma + nivel | Gestión idiomas |
| **SeguridadSocialSerializer** | eps, arl, afp, soporte | Seguridad social |
| **DocumentoRequeridoSerializer** | código + nombre + obligatorio + aplica_a_persona | Filtrado de docs |

---

### 1.6 Autenticación y Seguridad

**JWT (django-rest-framework-simplejwt):**
- `ACCESS_TOKEN_LIFETIME`: 60 minutos
- `REFRESH_TOKEN_LIFETIME`: 1 día
- `ROTATE_REFRESH_TOKENS`: True
- `BLACKLIST_AFTER_ROTATION`: True

**CORS:**
- Origen permitido: `http://localhost:5173` (Vite dev server)
- Credenciales: habilitadas

---

## SECCIÓN 2: FRONTEND (REACT + TYPESCRIPT)

### 2.1 Estructura de Carpetas

```
/c/GRAPP/frontend/
├── src/
│   ├── main.tsx                        # Entry point + Router + AuthProvider
│   ├── index.css                       # Estilos globales Tailwind + CSS variables (~500 líneas)
│   ├── api/
│   │   ├── config.ts                   # Constante API_URL
│   │   └── wizardApi.ts                # Métodos API del wizard
│   ├── lib/
│   │   ├── api.ts                      # Cliente axios principal + todos los métodos API (306 líneas)
│   │   ├── adminTercerosApi.ts         # TypeScript types + cliente admin terceros
│   │   ├── adminEmpresasApi.ts         # TypeScript types + cliente admin empresas
│   │   └── adminContratosApi.ts        # TypeScript types + cliente admin contratos (18 métodos)
│   ├── context/
│   │   └── AuthContext.tsx             # Estado global de auth (JWT, user, login/logout) (115 líneas)
│   ├── hooks/
│   │   └── useCuentaWizard.ts          # Hook personalizado para estado del wizard
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AdminLayout.tsx         # Sidebar + top nav del admin (289 líneas)
│   │   │   └── ProtectedLayout.tsx     # Guard de autenticación para portal-terceros
│   │   ├── ui/                         # Componentes shadcn/Radix (20+ archivos)
│   │   ├── forms/
│   │   │   ├── VinculacionTercerosForm.tsx
│   │   │   ├── RadicacionCuentaForm.tsx
│   │   │   └── DocumentosRequeridos.tsx
│   │   └── wizard/
│   │       ├── DatosBasicosTab.tsx     # Paso 1: info personal/empresa
│   │       ├── DocumentosTab.tsx       # UI de carga de documentos
│   │       ├── SoportesTab.tsx         # Estudios, cursos, certificaciones
│   │       ├── PerfilTab.tsx           # Estado de completitud del perfil
│   │       ├── AnexosPanel.tsx         # Anexos de cuentas de cobro
│   │       ├── Step1Form.tsx           # Formulario inicial de vinculación
│   │       ├── Step2Form.tsx           # Formulario avanzado (dirección, financiero)
│   │       ├── SummarySidebar.tsx      # Checklist de completitud
│   │       ├── Stepper.tsx             # Indicador de pasos
│   │       └── sections/              # Sub-componentes de secciones del wizard
│   ├── pages/
│   │   ├── index.tsx                   # Página de inicio/landing
│   │   ├── VinculacionWizardPage.tsx   # Wizard principal de vinculación (~23KB)
│   │   ├── VinculacionPage.tsx         # Formulario simple legacy
│   │   ├── SuccessVinculacion.tsx
│   │   ├── SuccessRadicacion.tsx
│   │   ├── auth/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── ActivarCuentaPage.tsx
│   │   │   └── RecuperarPasswordPage.tsx
│   │   ├── admin/
│   │   │   ├── AdminDashboard.tsx      # KPIs, gráficas, actividad reciente
│   │   │   ├── TercerosListPage.tsx    # Gestión de terceros: tabla responsive 6 cols, filtros, panel, modal
│   │   │   ├── EmpresasListPage.tsx    # Gestión de empresas: tabla, búsqueda, panel, modal
│   │   │   ├── ContratosListPage.tsx   # Gestión de contratos: tabla, filtros (estado/prioridad/empresa), panel, modal
│   │   │   └── CuentasCobroListPage.tsx # Gestión de cuentas: tabla 5 cols, filtros, dot urgencia, panel detalle
│   │   └── portal-terceros/
│   │       ├── Dashboard.tsx           # Portal del tercero (inicio)
│   │       └── NuevaRadicacion.tsx     # Wizard de cuentas de cobro (~20KB)
│   └── assets/
├── package.json
├── tailwind.config.cjs                 # Configuración Tailwind
├── vite.config.ts                      # Bundler Vite
└── tsconfig.json
```

---

### 2.2 Páginas y Rutas

| Página | Ruta | Propósito |
|--------|------|-----------|
| **Index** | `/` | Landing/inicio |
| **VinculacionWizardPage** | `/vinculacion/:token` | Registro de tercero multi-paso (moderno) |
| **SuccessVinculacion** | `/success/vinculacion` | Confirmación post-registro |
| **LoginPage** | `/login` | Formulario JWT |
| **ActivarCuentaPage** | `/activar-cuenta/:token` | Activación de cuenta |
| **RecuperarPasswordPage** | `/recuperar-password` | Recuperación de contraseña |
| **Dashboard** | `/portal-terceros` | Portal del tercero (inicio) |
| **NuevaRadicacion** | `/portal-terceros/radicar` | Wizard de cuentas de cobro |
| **AdminDashboard** | `/admin-panel` | Métricas, KPIs, actividad reciente |
| **TercerosListPage** | `/admin-panel/terceros` | Gestión de terceros: tabla, filtros, panel lateral, modal invitación |
| **EmpresasListPage** | `/admin-panel/empresas` | Gestión de empresas: tabla, búsqueda, panel lateral con contactos |
| **ContratosListPage** | `/admin-panel/contratos` | Gestión de contratos: tabla con estado/prioridad/vigencia/días restantes, filtros, panel slide-over 5 tabs, modal crear/editar |
| **CuentasCobroListPage** | `/admin-panel/cuentas-cobro` | Gestión de cuentas de cobro: tabla 5 cols, filtros estado/periodo/search, dot de urgencia, panel detalle con desglose financiero y flujo de aprobación |
| **OrdenesCompraListPage** | `/admin-panel/ordenes-compra` | Gestión de OCs: tabla 7 cols (número, objeto, tercero, empresa, valor total/pendiente/ejecutado, estado, fecha entrega), filtros search+estado+empresa+contrato, panel detalle slide-over, modal crear/editar |

---

### 2.3 Dashboard Administrativo (`AdminDashboard.tsx`)

> **Actualizado 2026-03-15** — Rediseño visual completo alineado a branding Experias S.A.S.

**Métricas principales (ZONA 1 — 4 StatCards):**
- Valor radicado del mes (con `Trend` comparativo vs mes anterior)
- Total de terceros activos + pendientes
- Radicaciones del mes
- Valor pagado

**Gráfica (ZONA 2 — izquierda):** Barras de los últimos 6 meses de valor radicado (recharts). Tooltip personalizado con colores corporativos.

**Tarjetas operativas (ZONA 2 — derecha):**
- `PendientesTabs` — tarjeta unificada con Tabs (Radix): tab "Terceros" (pendientes de aprobación) + tab "Cuentas" (en revisión/radicadas). Filas compactas con dot de urgencia (rojo/ámbar/azul), nombre + días + tarea. Badges de conteo en cada tab. Máx 5 ítems por tab. Reemplaza `DocumentosEnRevision` + `TercerosPendientes` (ambos marcados `@deprecated`).
- "Contratos activos": counter simple con lista de próximos a vencer

**Tabla (ZONA 3 — izquierda):** Últimas cuentas de cobro (proveedor, período, valor, estado, acceso)

**Timeline (ZONA 3 — derecha):** Actividad reciente mixta (terceros + cuentas)

~~**Accesos rápidos:**~~ *(eliminado 2026-03-15 — redundante con sidebar)*

**Componentes admin reutilizables (`components/admin/`):**

| Componente | Propósito |
|------------|-----------|
| `StatCard.tsx` | KPI card: icono `w-10 h-10 rounded-xl`, valor `text-[26px]`, badge |
| `StatCardAdvanced.tsx` | KPI card mejorada: barra lateral de acento (`border-l-4`), trend badge ▲/▼ con %, secondary text, loading skeleton |
| `PendingItemsList.tsx` | Lista de items pendientes con contador grande y links |
| `TercerosPendientes.tsx` | Tarjeta enriquecida de terceros pendientes con prioridad/tarea/tiempo |
| `DocumentosEnRevision.tsx` | ~~@deprecated~~ — Reemplazado por `PendientesTabs.tsx`. Lista de cuentas EN_REVISION/RADICADA con expand/collapse y urgencia |
| `TercerosPendientes.tsx` | ~~@deprecated~~ — Reemplazado por `PendientesTabs.tsx`. Tarjeta enriquecida de terceros pendientes |
| `PendientesTabs.tsx` | Tarjeta unificada tabbed (Radix Tabs): tab Terceros + tab Cuentas. Filas compactas con dot urgencia, skeleton, empty state. Reemplaza las dos anteriores |
| `DocumentosCargadosRecientes.tsx` | Feed de documentos recientes (48h), icono de estado por tipo, máx 4 ítems |
| `TerceroDetailPanel.tsx` | Slide-over de detalle (480px): identidad, contacto, empresa, docs con URL, perfil con secciones colapsables (estudios/exp./cert./cursos/idiomas/seg.social), footer Aprobar/Rechazar inline |
| `InvitarTerceroModal.tsx` | Modal de invitación: form zod+rhf (email, tipo, empresa dinámico), estado éxito con link copiable |
| `EmpresaDetailPanel.tsx` | Slide-over de detalle empresa (480px): identidad (nombre/NIT/activa), gestión inline de ContactoEmpresa (crear/editar/eliminar con confirmación), resumen stats (terceros/contratos), footer "Editar empresa" |
| `EmpresaFormModal.tsx` | Modal crear/editar empresa: form zod+rhf (nombre, NIT, toggle activa), modo dual, errores DRF mapeados por campo |
| `ContratoDetailPanel.tsx` | Slide-over de detalle contrato (5 tabs: Info, Pólizas, Otrosíes, Pagos, Historial). Badge counts en tabs. Panel inline de cambio de estado con flujo. Links a archivos con `API_BASE_URL` |
| `ContratoFormModal.tsx` | Modal crear/editar contrato: secciones Partes/Identificación/Estado/Fechas/Valor. `useWatch` auto-calcula `valor_total = valor_sin_iva + iva`. Carga dinámica de empresas/terceros/tipos |
| `CuentaCobroDetailPanel.tsx` | Slide-over 480px: tercero + contrato vinculado, desglose financiero (base/IVA/admon/imprevistos/utilidad/total), anexos con links de descarga, comprobante de pago con archivo, footer con flujo completo: Iniciar revisión → Aprobar (ConfirmDialog) / Rechazar inline (motivo obligatorio) / Marcar como pagada (fecha + upload comprobante MultiPart) |
| `OrdenCompraDetailPanel.tsx` | Slide-over detalle de OC: identidad (número/tipo/estado), partes (tercero+empresa+contrato), valores (sin IVA, IVA, total, radicado, pendiente, % ejecutado), ítems, radicaciones vinculadas, flujo de cambio de estado con máquina de transiciones |
| `OrdenCompraFormModal.tsx` | Modal crear/editar OC: secciones Partes/Identificación/Valores/Fechas/Ítems. IVA como **porcentaje** (botones rápidos 0%/5%/10%/19%, input con sufijo %, desglose en tiempo real). Calcula `iva_pesos = valor_sin_iva × pct / 100` antes del submit. Retrocomputa porcentaje al editar. Carga terceros por `nombre_completo` + `numero_documento` |
| `QuickAccessCard.tsx` | *(sin uso activo — era parte de Accesos rápidos)* |

**Sistema de badges (`BADGE` config en AdminDashboard):**

| Estado | Clase |
|--------|-------|
| PAGADA / APROBADA / APROBADO | `bg-success/10 text-success` |
| RECHAZADA / RECHAZADO | `bg-destructive/10 text-destructive` |
| EN_REVISION | `bg-primary/10 text-secondary` |
| RADICADA | `bg-primary/10 text-primary` |
| PENDIENTE | `bg-warning/10 text-warning` |
| BORRADOR | `bg-muted text-muted-foreground` |

---

### 2.4 Layout Admin (`AdminLayout.tsx`)

- Header: logo, breadcrumb, campana de notificaciones, menú de usuario
- Sidebar colapsable con acordeón de módulos
- Grupos de navegación: PRINCIPAL, MÓDULOS, SISTEMA
- Secciones: Terceros, Empresas, Contratos, Cuentas de Cobro
- Sub-ítems con links al Django admin
- Responsive: sidebar completo en XL+, hamburger en móvil
- **Actualizado 2026-03-15:** todos los colores `gray-*` hardcodeados reemplazados por CSS vars (`border-border`, `hover:bg-muted`, `text-muted-foreground`, `hover:text-destructive`, etc.)
- Shell: `bg-background` (hereda `#F5F7FA` de CSS var)

---

### 2.5 Cliente API y Flujo de Datos

**Base URL** (`api/config.ts`):
```typescript
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
```

**Instancia Axios** (`lib/api.ts`):
```typescript
const apiClient = axios.create({
    baseURL: 'http://127.0.0.1:8000',
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true,
});
```

**Gestión de JWT:**
- Request interceptor: agrega `Authorization: Bearer <token>` desde localStorage
- Response interceptor:
  - 404 → "Enlace inválido o expirado"
  - 400 con data → errores de validación
  - 401 → logout
  - Default → mensaje genérico

**Almacenamiento de tokens:**
- Access: `localStorage.grapp_access_token`
- Refresh: `localStorage.grapp_refresh_token`

**Módulos del cliente API:**

| Módulo | Métodos | Propósito |
|--------|---------|-----------|
| **vinculacionAPI** | `getInvitacion`, `submitTercero`, `getDocumentosRequeridosFiltrados`, `uploadDocumento`, `bulkUploadDocumentos`, `uploadDocumentosParallel` | Registro de terceros |
| **terceroAPI** | CRUD para estudios/cursos/cert./exp./idiomas, singleton seguridadSocial, `get()`, `getStatus()`, `getIdiomasCatalog()` | Gestión de perfil |
| **radicacionAPI** | Submit de cuentas de cobro | Radicación (parcial/legacy) |
| **adminTercerosAPI** *(lib/adminTercerosApi.ts)* | `list(params)`, `getDetalle(id)`, `cambiarEstado(id, data)`, `crearInvitacion(data)`, `getEmpresas()` | Módulo admin de terceros — interfaces completas incl. `PerfilCompleto` con sub-interfaces por sección |
| **adminEmpresasAPI** *(lib/adminEmpresasApi.ts)* | `list(params)`, `getDetalle(id)`, `crear(data)`, `editar(id, data)`, `crearContacto(empresaId, data)`, `editarContacto(empresaId, cid, data)`, `eliminarContacto(empresaId, cid)` | Módulo admin de empresas y contactos — interfaces: `EmpresaListItem`, `EmpresaDetalle`, `ContactoEmpresaDetalle`, `EmpresaStats`, payloads create/update |
| **adminCuentasCobroAPI** *(lib/adminCuentasCobroApi.ts)* | `list(params)`, `getDetalle(id)`, `cambiarEstado(id, data\|FormData)` | Módulo admin de cuentas de cobro — interfaces: `CuentaCobroListItem`, `CuentaCobroListResponse`, `CuentaCobroDetalle`, `AnexoCuenta`, `ComprobantePago`, `CambioEstadoCuentaPayload/Response`, `CuentaCobroListParams` |

---

### 2.6 Gestión de Formularios

**Librería:** react-hook-form + zod

- Validación client-side con esquemas zod antes de enviar
- Estado del formulario en component state (NO en localStorage)
- Mensajes de error desde la API devueltos al usuario
- Carga de archivos con indicador de progreso
- Formularios multi-paso con persistencia en estado de componente

---

## SECCIÓN 3: ESTILOS (TAILWIND CSS)

### 3.1 Configuración (`tailwind.config.cjs`)

```javascript
theme: {
    extend: {
        colors: {
            // Tokens corporativos directos (brand.*)
            brand: {
                blue:   '#24408C',   // azul corporativo principal
                navy:   '#0f1a2e',   // azul oscuro
                medium: '#3b5bcc',   // azul medio
            },
            // Tokens semánticos via CSS vars
            border, input, ring, background, foreground,
            primary, secondary, destructive, muted, accent, popover, card,
            success, warning, info,
            chart: ['1', '2', '3', '4', '5']
        },
        borderRadius: {
            lg: 'var(--radius)',
            md: 'calc(var(--radius) - 2px)',
            sm: 'calc(var(--radius) - 4px)'
        }
    }
},
plugins: [require("tailwindcss-animate")]
```

**Variables CSS** (`index.css` — actualizado 2026-03-15 con paleta corporativa Experias S.A.S.):

| Variable | Valor HSL | Hex equivalente | Propósito |
|----------|-----------|-----------------|-----------|
| `--primary` | `224 59% 35%` | **#24408C** | Azul corporativo principal |
| `--primary-foreground` | `0 0% 100%` | #FFFFFF | Texto sobre primary |
| `--background` | `216 33% 97%` | **#F5F7FA** | Fondo general |
| `--foreground` | `221 39% 11%` | **#111827** | Texto principal |
| `--border` | `220 14% 91%` | **#E5E7EB** | Bordes |
| `--input` | `220 14% 91%` | **#E5E7EB** | Bordes de inputs |
| `--ring` | `224 59% 35%` | **#24408C** | Focus ring |
| `--accent` | `224 59% 94%` | tint azul | Hover/activo sidebar |
| `--accent-foreground` | `224 59% 35%` | **#24408C** | Texto en accent |
| `--destructive` | `0 72% 51%` | **#DC2626** | Error / rojo |
| `--success` | `142 71% 36%` | **#16A34A** | Éxito / verde |
| `--warning` | `38 92% 50%` | **#F59E0B** | Advertencia / ámbar |
| `--info` | `224 59% 35%` | **#24408C** | Info (= brand blue) |
| `--chart-1` | `224 59% 35%` | **#24408C** | Gráfico — brand blue |
| `--chart-2` | `229 54% 52%` | **#3b5bcc** | Gráfico — medium blue |
| `--chart-3` | `218 51% 12%` | **#0f1a2e** | Gráfico — navy |
| `--chart-4` | `38 92% 50%` | **#F59E0B** | Gráfico — warning |
| `--chart-5` | `142 71% 36%` | **#16A34A** | Gráfico — success |
| `--radius` | `0.75rem` | — | Border radius base |

- Dark mode soportado vía selector `[class]` (variables dark no actualizadas aún)

### 3.2 Componentes UI Reutilizables (`components/ui/`)

| Componente | Propósito |
|------------|-----------|
| button.tsx | Sistema de variantes (size/variant/state) |
| card.tsx | Wrapper con borde y sombra |
| input.tsx | Input con estilos de foco |
| label.tsx | Label de formulario |
| select.tsx | Select Radix UI con estilos personalizados |
| tabs.tsx | Tabs Radix UI |
| alert.tsx / app-alert.tsx | Cajas de notificación |
| badge.tsx | Badges de estado/etiqueta |
| textarea.tsx | Input multi-línea |
| skeleton.tsx | Placeholder de carga |
| confirm-dialog.tsx | Modal de confirmación |
| radio-group.tsx | Radios Radix UI |
| separator.tsx | Divisor |
| Timeline.tsx | Visualización de línea de tiempo |

---

## SECCIÓN 4: FLUJO DE DATOS

### Diagrama General

```
BROWSER (React App)
  │
  ├── VinculacionWizardPage
  ├── AdminDashboard
  └── Portal / NuevaRadicacion
          │
     axios/apiClient
     + JWT interceptor
          │
     HTTP/REST + CORS
          │
DJANGO REST API
  │
  ├── /api/auth/          → JWT Authentication
  ├── /api/vinculacion/   → Terceros Module
  ├── /api/terceros/      → Profile CRUD
  └── /api/cuentas-cobro/ → Proveedores Module
          │
     DRF ViewSets + Serializers
          │
     Django ORM
          │
  PostgreSQL (prod) / SQLite (dev)
```

### Workflow 1: Vinculación de Tercero

```
1. Admin crea InvitacionVinculacion → genera token único
2. Usuario recibe link /vinculacion/<token>
3. GET /api/vinculacion/<token>/ → datos de la empresa + docs requeridos
4. Usuario llena Step1Form + Step2Form (react-hook-form + zod)
5. POST /api/vinculacion/<token>/ → crea Tercero (PENDIENTE) + placeholders de DocumentoTercero
6. Usuario carga documentos → POST /api/terceros/<id>/documentos/<code>/upload
7. Usuario completa perfil → POST /api/terceros/<id>/estudios/, idiomas/, etc.
8. GET /api/terceros/<id>/status/ → verificar completitud
9. Admin aprueba en Django admin → Tercero.estado = APROBADO
10. Usuario recibe email → /activar-cuenta/<token> → cuenta creada
```

### Workflow 2: Cuenta de Cobro (Radicación)

```
1. Tercero aprobado navega a /portal-terceros/radicar
2. Llena datos básicos (proveedor, periodo, concepto, valor, IVA)
3. Carga anexos (AnexosPanel) → POST /api/cuentas-cobro/<id>/anexos/
4. POST/PATCH /api/cuentas-cobro/ → CuentaCobro.estado = RADICADA
5. Aparece en AdminDashboard como "En revisión"
6. Admin aprueba/rechaza desde Django admin
7. Subida de comprobante de pago → CuentaCobro.estado = PAGADA
```

### Workflow 3: Dashboard Administrativo

```
1. Admin login → POST /api/auth/token/ → JWT a localStorage
2. Navega a /admin-panel → AdminLayout verifica user.is_staff
3. Carga paralela:
   - GET /api/admin/stats/   → KPIs
   - GET /api/admin/terceros/ → Lista reciente
   - GET /api/admin/cuentas/  → Cuentas recientes
4. Links a módulos → Django admin (/admin/...) en nueva pestaña
```

---

## SECCIÓN 5: DEPENDENCIAS CLAVE

### Backend

| Librería | Versión | Propósito |
|----------|---------|-----------|
| Django | 6.0 | Framework principal |
| djangorestframework | latest | API REST |
| djangorestframework-simplejwt | latest | Autenticación JWT |
| django-cors-headers | latest | CORS |
| psycopg[binary] | >=3.1.0 | PostgreSQL driver |
| python-dotenv | latest | Variables de entorno |

> **Nota:** requirements.txt solo lista `psycopg`. Ejecutar `pip freeze` para obtener la lista completa.

### Frontend

| Paquete | Versión | Propósito |
|---------|---------|-----------|
| react | 19.x | UI framework |
| typescript | 5.7.2 | Type safety |
| vite | 7.2.4 | Bundler |
| axios | ^1.13.2 | Cliente HTTP |
| react-hook-form | ^7.54.2 | Gestión de formularios |
| @hookform/resolvers | ^3.9.1 | Integración con zod |
| zod | ^3.24.1 | Validación de esquemas |
| react-router-dom | ^7.1.3 | Enrutamiento client-side |
| recharts | ^3.8.0 | Gráficas del dashboard |
| @radix-ui/* | varios | Componentes UI accesibles |
| lucide-react | ^0.469.0 | Iconos |
| tailwindcss | ^3.4.17 | CSS utilitario |
| tailwindcss-animate | ^1.0.7 | Animaciones |
| class-variance-authority | ^0.7.1 | Variantes de componentes |
| clsx + tailwind-merge | latest | Gestión de clases CSS |

---

## SECCIÓN 6: INCONSISTENCIAS Y PROBLEMAS DETECTADOS

### 6.1 Problemas de Seguridad

| Problema | Severidad | Detalle |
|----------|-----------|---------|
| SECRET_KEY hardcodeado en settings.py | **CRÍTICO** | Debe moverse a variable de entorno |
| DEBUG=True | **CRÍTICO** | Expone stacktraces en producción |
| ALLOWED_HOSTS=[] | **ALTO** | Acepta cualquier cabecera Host |
| @csrf_exempt en endpoints públicos | **ALTO** | Vinculación y uploads sin protección CSRF |
| Credenciales de BD débiles (.env tiene password "123") | **ALTO** | Cambiar a contraseñas fuertes |
| URL base hardcodeada en lib/api.ts | **MEDIO** | `http://127.0.0.1:8000` no usa variable de entorno |

### 6.2 Problemas de Validación y Datos

| Problema | Severidad | Detalle |
|----------|-----------|---------|
| Sin verificación de ownership en upload_documento | **ALTO** | Cualquier usuario puede subir a cualquier tercero_id |
| Sin validación de tipo/tamaño de archivos en uploads | **ALTO** | Potencial para archivos maliciosos o muy grandes |
| Sin refresh de JWT en interceptor | **MEDIO** | Solo hace logout en 401, no intenta renovar el token |
| Falta transacción atómica en creación de documentos | **BAJO** | Si falla en el loop, queda estado parcial |
| "PENDIENTE" tiene significado diferente según modelo | **BAJO** | En DocumentoTercero = aún no cargado; en Tercero = pendiente de aprobación |

### 6.3 Problemas de Frontend

| Problema | Severidad | Estado | Detalle |
|----------|-----------|--------|---------|
| Dos instancias axios distintas | **MEDIO** | ⏳ Pendiente | `api/config.ts` y `lib/api.ts` usan bases diferentes; config.ts aparentemente no se usa |
| Colores hardcodeados en AdminLayout | **MEDIO** | ✅ Resuelto (2026-03-15) | Todos los `gray-*` reemplazados por CSS vars (`border-border`, `hover:bg-muted`, etc.) |
| Paleta pastel inconsistente en AdminDashboard | **MEDIO** | ✅ Resuelto (2026-03-15) | Badges y cards ahora usan tokens semánticos (`bg-success/10`, `bg-warning/10`, etc.) |
| Color primary no alineado al branding | **ALTO** | ✅ Resuelto (2026-03-15) | `--primary` actualizado a #24408C (azul corporativo Experias) |
| Estado del formulario no persiste | **MEDIO** | ⏳ Pendiente | Si el usuario recarga, pierde el progreso del wizard |
| Sin error boundaries en componentes del dashboard | **BAJO** | ⏳ Pendiente | Un fetch fallido puede dejar todo en "sin datos" |
| Tamaños de iconos inconsistentes en dashboard | **BAJO** | ✅ Resuelto (2026-03-15) | StatCard usa `w-10 h-10 rounded-xl` como contenedor estándar; iconos `size={18}` |
| Espaciado inconsistente en dashboard | **BAJO** | ✅ Resuelto (2026-03-15) | Todos los grids del dashboard usan `gap-6`; cards `p-5`/`p-6` |

### 6.4 Problemas de Arquitectura API

| Problema | Severidad | Detalle |
|----------|-----------|---------|
| Sin paginación en listas admin | **MEDIO** | ✅ Resuelto — `admin_terceros_list` (2026-03-20) y `admin_cuentas_cobro_list` (2026-03-24) con paginación real |
| Sin rate limiting | **BAJO** | Endpoints de upload sin throttling |
| Sin versionado de API | **BAJO** | Todo bajo `/api/` sin versión; difícil de evolucionar |
| Sin audit trail en modelos clave | **MEDIO** | Tercero no tiene created_by/updated_by |
| Estilos mixtos de autenticación | **MEDIO** | Algunos endpoints usan JWT, otros usan tokens de invitación |

### 6.5 Problemas de Código

| Problema | Severidad | Detalle |
|----------|-----------|---------|
| Valores de estado como strings sueltos | **MEDIO** | "PENDIENTE", "APROBADO", etc. dispersos; debería usar constantes/enum |
| requirements.txt incompleto | **ALTO** | Solo lista psycopg; ejecutar `pip freeze > requirements.txt` |
| Modelo SolicitudActualizacionTercero sin implementar | **BAJO** | Existe el modelo pero sin views/serializers |
| Logging mínimo | **BAJO** | Difícil rastrear errores en producción |

---

## SECCIÓN 7: CHECKLIST DE DEPLOYMENT

- [ ] Mover `SECRET_KEY` y credenciales DB a variables de entorno
- [ ] `DEBUG=False`, `ALLOWED_HOSTS` con dominios reales
- [ ] Configurar PostgreSQL con pool de conexiones
- [ ] Configurar backend de email (SMTP) para correos de activación/aprobación
- [ ] Configurar CORS para el dominio de producción del frontend
- [ ] HTTPS con certificados SSL válidos
- [ ] Servicio de archivos estáticos/media (S3, CDN o nginx)
- [ ] Configurar logging (syslog, CloudWatch, etc.)
- [ ] Monitoreo y alertas (latencia, tasa de errores)
- [ ] Backups automáticos de la base de datos
- [ ] Pruebas de carga antes del lanzamiento
- [ ] Documentar API (Swagger/OpenAPI)
- [ ] Implementar rate limiting (DRF throttling o django-ratelimit)
- [ ] Completar requirements.txt con `pip freeze`

---

## SECCIÓN 8: ACCIONES PRIORITARIAS

### Crítico (resolver antes de cualquier despliegue):
1. Mover SECRET_KEY y credenciales a variables de entorno
2. Agregar verificación de ownership en endpoints de upload de documentos
3. Agregar validación de tipo y tamaño de archivos en uploads
4. Completar requirements.txt

### Alta prioridad:
1. Implementar renovación de JWT en el interceptor de axios (en lugar de solo hacer logout)
2. Consolidar los dos clientes axios en uno solo
3. ~~Corregir colores hardcodeados en AdminLayout para usar variables CSS~~ ✅ Resuelto
4. ~~Agregar paginación a los endpoints de listas del admin~~ ✅ Resuelto para terceros (2026-03-20)
5. Crear constantes/enums para los valores de estado

### Prioridad media:
1. Persistir estado del wizard en localStorage o IndexedDB
2. Agregar error boundaries por sección en el dashboard
3. Agregar audit trail (created_by, updated_by) a Tercero y CuentaCobro
4. Agregar clases de permisos DRF para proteger recursos anidados
5. Agregar rate limiting a endpoints de upload
6. Actualizar variables CSS del dark mode para alinear con paleta corporativa (solo modo claro fue actualizado)
7. ~~Reemplazar colores hardcodeados en `TercerosPendientes.tsx`~~ *(archivo deprecated — ya no relevante)*

---

## SECCIÓN 9: HISTORIAL DE CAMBIOS


### 2026-03-15 — Rediseño visual del Admin (sesión 1)

**Objetivo:** Consistencia visual con `VinculacionWizardPage.tsx`

**Archivos modificados:**
- `frontend/src/pages/admin/AdminDashboard.tsx` — eliminación de ZONA 4 (Accesos rápidos), fondo `bg-slate-50` con negative-margin trick, `gap-6` uniforme, cards `rounded-xl border-slate-200 shadow-sm`, badges pastel (amber/emerald/blue/red)
- `frontend/src/components/admin/StatCard.tsx` — icon container `w-10 h-10 rounded-xl`, valor `text-[26px]`

---

### 2026-03-15 — Alineación con branding corporativo Experias S.A.S. (sesión 2)

**Objetivo:** Dashboard profesional tipo SaaS (Linear/Stripe/Vercel) con identidad visual corporativa

**Cambios en sistema de diseño (`index.css` + `tailwind.config.cjs`):**
- `--primary`: `219 50.8% 12%` (navy oscuro) → `224 59% 35%` (**#24408C** azul corporativo)
- `--background`: → `216 33% 97%` (**#F5F7FA**)
- `--destructive`: → `0 72% 51%` (**#DC2626**)
- `--success`: ajustado a `142 71% 36%` (**#16A34A**)
- `--border` / `--input`: → `220 14% 91%` (**#E5E7EB**)
- `--ring`: → brand blue (**#24408C**)
- `--accent` / `--accent-foreground`: → tint del azul corporativo
- `--chart-1..5`: paleta corporativa (brand blue → medium blue → navy → warning → success)
- `tailwind.config.cjs`: tokens `brand.blue`, `brand.navy`, `brand.medium` añadidos

**Archivos modificados:**
- `frontend/src/index.css` — CSS vars actualizadas
- `frontend/tailwind.config.cjs` — tokens `brand.*` añadidos
- `frontend/src/pages/admin/AdminDashboard.tsx` — BADGE usa CSS vars semánticos, colores de cards operativas actualizados
- `frontend/src/components/admin/StatCard.tsx` — icon container rediseñado
- `frontend/src/components/layout/AdminLayout.tsx` — todos los `gray-*` hardcodeados → CSS vars, shell `bg-background`

**Nuevo componente:**
- `frontend/src/components/admin/TercerosPendientes.tsx` — tarjeta enriquecida con accent line lateral, prioridad, tarea y tiempo por tercero pendiente

---

### 2026-03-19 — Nuevos componentes admin y endpoints enriquecidos

**Objetivo:** Ampliar el dashboard con feeds operativos en tiempo real (documentos recientes, cuentas en revisión con urgencia)

**Nuevos endpoints backend (`terceros/admin_api.py`):**
- `GET /api/admin/terceros-pendientes/` — terceros en PENDIENTE con urgencia, tarea derivada del estado de docs, y tiempo relativo
- `GET /api/admin/documentos-recientes/` — documentos cargados últimas 48h (excluye placeholders sin archivo)
- Helpers extraídos: `_clasificar_urgencia()`, `_mes_range()`, `_trend_pct()`
- `admin_cuentas_list()` enriquecido con campos `urgencia`, `accion`, `dias_pendiente`, `relativo`

**Nuevos componentes frontend (`components/admin/`):**
- `StatCardAdvanced.tsx` — variante de StatCard con barra lateral de acento, trend badge (▲/▼ %), secondary text, skeleton
- `DocumentosEnRevision.tsx` — reemplaza `PendingItemsList` para cuentas en revisión; acordeón por ítem con urgencia (crítica/media/baja), panel expandido con número/período/valor/fecha y acciones
- `DocumentosCargadosRecientes.tsx` — feed de documentos recientes (48h), icono de estado por tipo, máx 4 ítems, enlace a módulo

**Archivos modificados:**
- `GRAPP/urls.py` — registro de los 2 nuevos endpoints
- `terceros/admin_api.py` — 2 nuevas funciones + refactor de helpers

---

### 2026-03-20 — Módulo de Gestión de Terceros (admin React)

**Objetivo:** Reemplazar el Django Admin para la gestión de terceros con una interfaz React moderna tipo CRM, completamente integrada al panel admin existente.

**Nuevos endpoints backend (`terceros/admin_api.py` + `GRAPP/urls.py`):**
- `GET /api/admin/terceros/` — **extendido**: paginación real (`page`/`page_size`), nuevos filtros (`tipo_tercero`, `tipo_persona`, `ordering`), campos enriquecidos (`nombre_completo`, `tipos_tercero`, `fecha_registro` ISO, `documentos_completos`, `documentos_total`, `tiene_perfil_completo`). Anotaciones SQL para conteo de docs. Mantiene campos legacy para compat.
- `GET /api/admin/terceros/<id>/detalle/` — detalle completo con empresa (id/nombre/nit), documentos + archivo_url, conteos de perfil, info tributaria/RL/tesorería, datos de aprobación
- `PATCH /api/admin/terceros/<id>/estado/` — aprobar/rechazar con motivo; actualiza `aprobado_por`, `aprobado_at`, `observaciones_aprobacion`
- `POST /api/admin/invitaciones/` — crea `InvitacionVinculacion`; retorna token + link relativo
- `GET /api/admin/empresas/` — lista de empresas activas (para select dinámico del modal)

**Nuevo módulo API frontend (`lib/adminTercerosApi.ts`):**
- Interfaces TypeScript completas: `TerceroListItem`, `TerceroDetalle`, `DocumentoDetalle`, `PerfilCounts`, `PaginatedResponse<T>`, `CambioEstadoPayload/Response`, `InvitacionPayload/Response`, `EmpresaOption`
- `adminTercerosAPI`: `list()`, `getDetalle()`, `cambiarEstado()`, `crearInvitacion()`, `getEmpresas()`

**Nuevas páginas y componentes:**
- `pages/admin/TercerosListPage.tsx` — página principal: tabla con 8 columnas, filtros con debounce, avatar con iniciales, doc progress bar, badges semánticos, menú de acciones por fila (···), paginación con rango condensado, skeleton rows, empty states diferenciados
- `components/admin/TerceroDetailPanel.tsx` — slide-over 480px con animación, skeleton de carga, secciones colapsadas por tipo (contacto, empresa, info adicional, documentos con link al archivo, perfil), footer sticky con flujo de aprobación (ConfirmDialog) y rechazo inline (textarea + motivo obligatorio)
- `components/admin/InvitarTerceroModal.tsx` — modal centrado z-50, form react-hook-form + zod, empresa select dinámico, errores DRF mapeados por campo, estado de éxito con link copiable (`navigator.clipboard`)

**Archivos modificados:**
- `frontend/src/main.tsx` — ruta `/admin-panel/terceros` registrada
- `frontend/src/components/layout/AdminLayout.tsx` — link "Terceros" del sidebar → `/admin-panel/terceros` (ya no redirige al Django Admin)
- `terceros/admin_api.py` — 5 funciones nuevas + extensión de `admin_terceros_list`
- `GRAPP/urls.py` — 5 URLs nuevas en bloque `api/admin/`

---

### 2026-03-20 — Enriquecimiento panel de detalle de tercero + Módulo Empresas (sesión 3)

**Objetivo 1:** Enriquecer el panel de detalle del tercero con datos completos del perfil (en lugar de conteos), secciones colapsables y links a soportes correctos.

**Objetivo 2:** Nuevo módulo completo de gestión de Empresas integrado al admin React.

#### Mejoras a módulo Terceros:

**Backend (`terceros/admin_api.py`):**
- `admin_tercero_detalle()` extendido: `perfil` ahora retorna arrays de objetos completos (estudios, cursos, certificaciones, experiencias, idiomas, seguridad_social) en lugar de conteos. `prefetch_related` añade `idiomas__idioma` y `select_related` añade `seguridad_social`
- Helpers internos `_date()` y `_file_url()` para serialización de fechas y FileFields

**Frontend:**
- `lib/adminTercerosApi.ts` — `PerfilCounts` reemplazado por `PerfilCompleto` con 6 sub-interfaces tipadas: `EstudioDetalle`, `CursoDetalle`, `CertificacionDetalle`, `ExperienciaDetalle`, `IdiomaDetalle`, `SeguridadSocialDetalle`
- `TerceroDetailPanel.tsx` — sección Perfil rediseñada: componente interno `PerfilSection` con acordeón CSS (`grid-rows: 0fr → 1fr`), fechas formateadas como "ene 2018 — presente", soportes como link "Ver" con prefijo `API_BASE_URL`, niveles de idioma con badge de color (BASICO/INTERMEDIO/AVANZADO/NATIVO), seguridad social con desglose EPS/ARL/AFP
- `lib/api.ts` — exportada constante `API_BASE_URL = 'http://127.0.0.1:8000'` (reutilizada por panel para construir URLs absolutas de soportes)
- `AdminLayout.tsx` — eliminados "Certificaciones", "Idiomas", "Experiencia laboral" del sidebar (se ven en el panel de detalle)

#### Módulo Empresas (nuevo):

**Backend (`tenancy/admin_api.py` — archivo nuevo):**
- `admin_empresas_list()`: GET doble-modo (simple sin `?page` para modal; paginado con stats con `?page`). POST crea empresa con validación NIT único. Anotaciones SQL `Count('terceros')`, `Count('contratos')`, `Count('contactos')`
- `admin_empresa_detalle()`: GET detalle + stats multi-query. PATCH actualización parcial con validación NIT único excluyendo la propia empresa
- `admin_empresa_contacto_crear()`: POST crea `ContactoEmpresa` con whitelist de tipos `_TIPOS_CONTACTO`
- `admin_empresa_contacto_detalle()`: PATCH edición parcial / DELETE eliminación de contacto

**URLs nuevas (`GRAPP/urls.py`):**
```
GET|POST   /api/admin/empresas/
GET|PATCH  /api/admin/empresas/<id>/
POST       /api/admin/empresas/<id>/contactos/
PATCH|DELETE /api/admin/empresas/<id>/contactos/<cid>/
```

**Frontend:**
- `lib/adminEmpresasApi.ts` — 8 interfaces TypeScript + `adminEmpresasAPI` con 7 métodos
- `pages/admin/EmpresasListPage.tsx` — tabla 7 columnas (Empresa/NIT, Contacto principal, Contactos, Terceros, Contratos, Estado, Creada), búsqueda debounce 300ms, skeleton rows, empty state, paginación condensada
- `components/admin/EmpresaDetailPanel.tsx` — slide-over 480px: identidad, gestión **inline** de contactos (crear/editar con `ContactoForm` interno usando react-hook-form+zod, eliminar con confirmación en línea "Confirmar/Cancelar"), stats en `StatCard`, footer "Editar empresa"
- `components/admin/EmpresaFormModal.tsx` — modal dual create/edit: campos nombre, NIT (monospace), toggle activa; mapeo de errores DRF por campo; carga datos existentes en modo edición
- `main.tsx` — ruta `/admin-panel/empresas` registrada
- `AdminLayout.tsx` — sidebar "Empresas" → `/admin-panel/empresas`; eliminado sub-link "Contactos de empresa"

---

---

### 2026-03-21 — Módulo de Contratos (FASE 1: modelos Django)

**Objetivo:** Diseño de datos completo para contratos — catálogos, estados, pólizas, otrosíes, formas de pago, condiciones y flujo de aprobación.

**`contratos/models.py` — 8 modelos nuevos/expandidos:**
- `TipoContrato`: catálogo con `nombre`, `descripcion`, `activo`
- `TipoAnexoContrato`: catálogo con `requerido`, `activo`
- `Contrato` (expandido): ~17 nuevos campos — FKs a User (tercero_rl, empresa_rl, solicitante, created_by), `prioridad` (ALTA/MEDIA/BAJA), nuevos estados (FIRMADO/VIGENTE/LIQUIDADO/ANULADO), fechas (solicitud, contrato, fin_otrosi), `fecha_fin` nullable, campos financieros (valor_sin_iva, iva, valor_total), flags (tiene_otrosi, tiene_polizas), property `dias_restantes`
- `PolizaContrato`: aseguradora, número, amparo, valor asegurado, fechas, estado (VIGENTE/VENCIDA/CANCELADA), archivo
- `CondicionContractual`: título, contenido, orden
- `OtrosiContrato`: número (unique_together con contrato), fecha, objeto, nuevo_valor, nueva_fecha_fin, archivo
- `FormaPagoContrato`: descripción, valor, fecha_estimada, fecha_pago, estado (PENDIENTE/PAGADO/VENCIDO/ANULADO)
- `ContratoAnexo`: tipo FK→TipoAnexoContrato, archivo, created_by
- `ContratoFlujo`: audit trail de cambios de estado (estado_anterior, estado_nuevo, usuario, observacion, fecha auto)

**`contratos/admin.py`:** Admin completo con inlines read-only para ContratoFlujo (audit log).

---

### 2026-03-21 — Módulo de Contratos (FASE 2: API REST + frontend)

**Objetivo:** CRUD completo de contratos desde el panel admin React.

**Backend (`contratos/admin_api.py` — nuevo):** 14 funciones, 16 URLs en `GRAPP/urls.py`:
- Catálogos: `admin_tipos_contrato_list`, `admin_tipos_anexo_contrato_list`
- CRUD contratos: list/create paginado con filtros, detalle GET+PATCH, cambio de estado (crea ContratoFlujo)
- Sub-recursos: pólizas, otrosíes (auto-actualiza `fecha_fin_otrosi`), formas de pago, anexos (MultiPart)
- Serializers internos: `_serialize_contrato_list/detalle/poliza/otrosi/forma_pago/condicion/anexo/flujo`

**Frontend:**
- `lib/adminContratosApi.ts` — 20+ interfaces TypeScript + `adminContratosAPI` con 18 métodos
- `pages/admin/ContratosListPage.tsx` — tabla 8 columnas (numero+objeto+contratista mobile, tipo, valor, estado badge, prioridad dot, vigencia, días restantes). `DiasRestantes` con color semántico (rojo/ámbar/normal). Filtros: search+debounce, estado, prioridad. Paginación.
- `components/admin/ContratoDetailPanel.tsx` — slide-over 5 tabs con badge counts: Info (datos completos + flujo de estado), Pólizas, Otrosíes, Pagos, Historial. Links a archivos con `API_BASE_URL`.
- `components/admin/ContratoFormModal.tsx` — modal 6 secciones. `useWatch` auto-calcula `valor_total`. Carga dinámica empresas (paginado `.results`), terceros APROBADO, tipos_contrato. Errores DRF mapeados por campo.
- `main.tsx` — ruta `/admin-panel/contratos` registrada
- `AdminLayout.tsx` — sidebar Contratos: ruta interna + 2 links externos (TipoContrato, TipoAnexoContrato al Django admin)

**Bug fix:** `empresas.map is not a function` — `adminEmpresasAPI.list()` siempre retorna paginado; corregido usando `.results` explícitamente.

---

### 2026-03-21 — TercerosListPage responsive + reducción de columnas

**Objetivo:** Tabla responsive sin scroll horizontal en pantallas medianas/pequeñas.

**Cambios en `TercerosListPage.tsx`:**
- Reducción de 8 a 6 columnas: Checkbox (w-10), **Tercero** (flex-1, contiene nombre+tipo_doc+documento+email), Tipo (w-[110px]), Docs (w-[70px]), Estado (w-[110px]), Acciones (w-10)
- Columnas eliminadas: Contacto, Empresa, Registrado
- Email embebido como 3ª línea en celda Tercero (`text-[10px] text-muted-foreground/60`)
- Helpers `formatRelative` y `formatDateFull` eliminados (sin uso)
- Filtros: búsqueda en fila superior, selects en fila inferior
- `colSpan` actualizado a 6

---

### 2026-03-21 — Rediseño tarjetas operativas del Dashboard (PendientesTabs)

**Objetivo:** Unificar las dos tarjetas operativas (`DocumentosEnRevision` + `TercerosPendientes`) en una sola tarjeta tabbed más compacta.

**Nuevo componente `components/admin/PendientesTabs.tsx`:**
- Radix/shadcn `Tabs` con `defaultValue="terceros"`
- Tab "Terceros": pendientes de aprobación. Tab "Cuentas": en revisión o radicadas
- Badges de conteo en cada tab (ámbar para terceros, azul para cuentas)
- Filas compactas: dot urgencia (rojo/ámbar/azul) + nombre + `{dias}d · {tarea}` + link "Ver" on hover
- Máx 5 ítems por tab, "Ver todos →", empty state con ícono tenue, skeletons

**`AdminDashboard.tsx`:** imports de `DocumentosEnRevision` y `TercerosPendientes` reemplazados por `PendientesTabs`. Props: `tercerosPendientes`, `cuentasEnRevision`, `loadingTerceros`, `loadingCuentas`.

**`DocumentosEnRevision.tsx` + `TercerosPendientes.tsx`:** marcados `// @deprecated` en primera línea.

---

---

### 2026-03-24 — Módulo de Cuentas de Cobro (admin React) (sesión 7)

**Objetivo:** Reemplazar el Django Admin para la revisión y aprobación de cuentas de cobro con una interfaz React integrada al panel admin, incluyendo flujo completo de estados y registro de comprobantes de pago.

**Backend (`proveedores/admin_api.py` — archivo nuevo):** 3 endpoints:
- `admin_cuentas_cobro_list()`: GET paginado (filtros: `estado`, `search`, `tercero`, `periodo`, `ordering`; whitelist de ordering; excluye BORRADOR; `select_related` + `annotate(anexos_count)`). Retorna `urgencia`/`dias_pendiente` reutilizando `_clasificar_urgencia` de `terceros/admin_api.py`
- `admin_cuenta_cobro_detalle()`: GET detalle completo — info del tercero, contrato vinculado (si existe), desglose financiero (base, IVA, admon, imprevistos, utilidad, total), lista de anexos con URL de archivo, comprobante de pago más reciente (fecha, valor, referencia, URL)
- `admin_cuenta_cobro_estado()`: PATCH con máquina de estados `_TRANSICIONES` (dict que controla transiciones válidas por estado); motivo obligatorio para RECHAZADA; soporte MultiPart para estado PAGADA (valida tipo: PDF/JPG/PNG y tamaño máx 10 MB); crea `ComprobantePago` automáticamente

**Constantes nuevas:**
- `_TRANSICIONES`: `RADICADA→{EN_REVISION,APROBADA,RECHAZADA}`, `EN_REVISION→{APROBADA,RECHAZADA}`, `APROBADA→{PAGADA}`, `RECHAZADA→{RADICADA}`, `PAGADA/BORRADOR→{}`
- `_COMPROBANTE_MAX_BYTES`: 10 MB; `_COMPROBANTE_TIPOS`: whitelist content-type

**Nuevas URLs (`GRAPP/urls.py`):**
```
GET    /api/admin/cuentas-cobro/
GET    /api/admin/cuentas-cobro/<id>/detalle/
PATCH  /api/admin/cuentas-cobro/<id>/estado/
```

**Frontend:**
- `lib/adminCuentasCobroApi.ts` — 8 interfaces TypeScript + `adminCuentasCobroAPI` con 3 métodos (`list`, `getDetalle`, `cambiarEstado`). `cambiarEstado` acepta JSON o `FormData` (detección automática por `instanceof FormData` para ajustar Content-Type)
- `pages/admin/CuentasCobroListPage.tsx` — tabla 5 columnas (Cuenta con dot urgencia + concepto, Tercero + días pendiente, Valor total, Período, Estado badge). Filtros: search debounce 300ms + select estado + input periodo. Paginación condensada reutilizando el mismo patrón de Contratos/Empresas. `?highlight=id&estado=X` en query params al montar
- `components/admin/CuentaCobroDetailPanel.tsx` — slide-over 480px: secciones Tercero, Información, Concepto, Observaciones, Desglose financiero (FinRow con total en bold), Pago (comprobante con download), Anexos con links a `API_BASE_URL`. Footer con `ActionButtons` que renderiza según estado: Iniciar revisión (RADICADA), Aprobar (ConfirmDialog) + Rechazar inline (RADICADA/EN_REVISION), Marcar como pagada con panel inline de fecha+upload (APROBADA), Re-aprobar (RECHAZADA)
- `main.tsx` — ruta `/admin-panel/cuentas-cobro` registrada
- `AdminLayout.tsx` — sección "Cuentas de Cobro" en sidebar: link interno `/admin-panel/cuentas-cobro` + 2 links externos al Django Admin (Comprobantes de pago, Tipos de anexo)

---

### 2026-03-27 — Módulo de Órdenes de Compra (sesión 8)

**Objetivo:** Nuevo módulo completo de gestión de Órdenes de Compra integrado al panel admin React, con soporte para ítems, cambio de estado con máquina de transiciones, y radicaciones vinculadas.

**Backend (`proveedores/admin_oc_api.py` — archivo nuevo):** 5 endpoints:
- `admin_ordenes_compra_list()`: GET paginado (filtros: `search`, `estado`, `tercero`, `empresa`, `contrato`, `ordering`; whitelist de ordering; `select_related`). POST crea OC con ítems opcionales.
- `admin_orden_compra_detalle()`: GET detalle completo + PATCH parcial (objeto, valores, fechas, contrato, ítems)
- `admin_orden_compra_estado()`: POST máquina de estados `_TRANSICIONES_OC` (BORRADOR→EMITIDA→APROBADA→EN_EJECUCION→CUMPLIDA/ANULADA; anulación requiere motivo)
- `admin_orden_compra_radicaciones()`: GET cuentas de cobro vinculadas a la OC (excluye BORRADOR)
- `admin_mis_ordenes_compra_portal()`: GET portal del tercero — OCs propias en APROBADA/EN_EJECUCION

**Modelos nuevos (`proveedores/models.py` + migración 0009):**
- `OrdenCompra`: tercero FK, empresa FK, contrato FK opcional, `numero_oc` (auto), `tipo` (COMPRA/SERVICIO/MIXTA), `estado` con estados propios, campos financieros (`valor_sin_iva`, `iva`, `valor_total`), `valor_radicado`/`valor_pendiente`/`porcentaje_ejecutado` computados, `created_by`, timestamps
- `ItemOrdenCompra`: descripcion, cantidad, valor_unitario, valor_total (propiedad)
- `CuentaCobro.orden_compra` FK nullable añadida

**Frontend:**
- `lib/adminOrdenesCompraApi.ts` — interfaces TypeScript: `EstadoOC`, `ESTADO_OC_LABELS`, `ItemOC`, `OCListItem`, `OCDetalle`, `PaginatedOCResponse`, `CreateOCPayload`; `adminOrdenesCompraAPI` con 5 métodos (`list`, `get`, `create`, `update`, `cambiarEstado`, `radicaciones`)
- `pages/admin/OrdenesCompraListPage.tsx` — tabla 7 columnas, filtros search+estado+empresa+contrato debounce, barra de progreso ejecución (`porcentaje_ejecutado`), paginación
- `components/admin/OrdenCompraDetailPanel.tsx` — slide-over detalle: identidad, partes, valores desglosados, ítems, radicaciones vinculadas, panel de cambio de estado
- `components/admin/OrdenCompraFormModal.tsx` — modal crear/editar con secciones Partes/Identificación/Valores/Fechas/Ítems

---

### 2026-03-27 — Correcciones OrdenCompraFormModal (sesión 9)

**Bug 1 — IVA como valor en pesos (incorrecto):**
- **Problema:** El campo IVA sumaba el valor literal ingresado al total (ej: `19` → `+$19`).
- **Corrección en `OrdenCompraFormModal.tsx`:**
  - Estado interno cambiado de `iva` (pesos) a `ivaPorcentaje` (porcentaje)
  - Fórmula: `ivaEnPesos = valorSinIva × ivaPct / 100`; `valorTotal = valorSinIva + ivaEnPesos`
  - Botones de acceso rápido `[0%] [5%] [10%] [19%]` — activo resaltado con `bg-primary`
  - Input con sufijo `%` visual mediante span absoluto superpuesto
  - Desglose bajo el total: `"IVA: $X (N% de $Y)"` en tiempo real (solo visible si ivaPct > 0)
  - Al hacer submit: convierte a pesos (`data.iva = ivaEnPesos`) — backend Django no se modifica
  - Al editar OC existente: retrocomputa porcentaje con `Math.round(iva / valor_sin_iva * 100)`

**Bug 2 — Nombre de tercero mostraba `"undefined undefined"`:**
- **Causa:** `loadOptions` usaba `t.nombre_mostrar ?? (t.nombre1 + " " + t.apellido1)` y `t.documento`, campos que no existen en `/api/admin/terceros/`.
- **Corrección:** Cambiado a `t.nombre_completo` + `t.numero_documento` (campos reales del endpoint).

---

**Archivos analizados:** 80+ archivos fuente
**Líneas de código revisadas:** ~19,000+ (Python + TypeScript)
**Modelos Django:** 23 (terceros, documentos, perfil, cuentas, contratos ×9, tenancy, OrdenCompra, ItemOrdenCompra)
**Endpoints REST:** 56+
**Páginas/layouts React:** 12 principales
**Componentes UI:** 20+ (shadcn/Radix)
**Componentes admin custom:** 16 activos + 2 deprecated (StatCard, StatCardAdvanced, PendingItemsList, PendientesTabs, DocumentosCargadosRecientes, TerceroDetailPanel, InvitarTerceroModal, EmpresaDetailPanel, EmpresaFormModal, ContratoDetailPanel, ContratoFormModal, CuentaCobroDetailPanel, OrdenCompraDetailPanel, OrdenCompraFormModal, QuickAccessCard, ~~DocumentosEnRevision~~, ~~TercerosPendientes~~)
**Módulos API frontend:** 7 (lib/api.ts, api/wizardApi.ts, lib/adminTercerosApi.ts, lib/adminEmpresasApi.ts, lib/adminContratosApi.ts, lib/adminCuentasCobroApi.ts, lib/adminOrdenesCompraApi.ts)
