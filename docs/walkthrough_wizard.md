# Walkthrough: Wizard Backend para Radicación de Cuenta de Cobro

## Resumen

Implementé un sistema completo de wizard backend-driven para radicación de cuentas de cobro en GRAPP usando Django REST Framework.

## Cambios Realizados

### 1. Modelos Actualizados y Nuevos

#### [`proveedores/models.py`](file:///c:/Users/asusc/OneDrive/Documentos/EXPERIAS/GRAPP/proveedores/models.py)

**Actualizaciones a `CuentaCobro`**:
- ✅ Nuevo estado inicial: `BORRADOR` (además de RADICADA, EN_REVISION, etc.)
- ✅ Campo `contrato` (FK a Contrato, opcional)
- ✅ Desglose financiero:
  - `valor_base`, `iva_valor`, `admon`, `imprevistos`, `utilidad`
  - `valor_total` (calculado automáticamente)
- ✅ Método `recalcular_total()` para auto-cálculo de totales

**Nuevos modelos**:
- ✅ `TipoAnexo`: Catálogo de tipos de documentos (codigo, nombre, obligatorio)
- ✅ `CuentaCobroAnexo`: Relación M2M para archivos adjuntos

#### [`contratos/models.py`](file:///c:/Users/asusc/OneDrive/Documentos/EXPERIAS/GRAPP/contratos/models.py) (Nueva App)

Creé una app `contratos` con modelo básico:
- `Contrato`: empresa, contratista, numero, objeto, valor, estado, fechas
- Registrado en admin para gestión

### 2. Migraciones

Ejecuté migraciones exitosamente:
- `contratos.0001_initial` - Creación de tabla Contrato
- `proveedores.0003_tipoanexo_remove_cuentacobro_soporte_and_more` - Actualización completa del esquema

### 3. Serializers del Wizard

#### [`proveedores/wizard_serializers.py`](file:///c:/Users/asusc/OneDrive/Documentos/EXPERIAS/GRAPP/proveedores/wizard_serializers.py)

Implementé 6 serializers especializados:

1. **`WizardCreateSerializer`**: 
   - Crea borrador con token o proveedor_id
   - Valida InvitacionRadicacion (PENDIENTE)
   - Inicializa campos vacíos

2. **`WizardStep1Serializer`**:
   - Datos generales: contrato, numero, periodo, concepto, observaciones
   - Guard: solo edita si estado == BORRADOR

3. **`WizardStep2Serializer`**:
   - Detalle financiero con auto-cálculo de valor_total
   - Validación de valores >= 0
   - Guard: solo edita si estado == BORRADOR

4. **`AnexoSerializer`**:
   - Upload de archivos con tipo_anexo (por ID o código)
   - Guard: solo upload si estado == BORRADOR

5. **`WizardRetrieveSerializer`**:
   - Estado completo con flags de completitud:
     - `step1_ok`: ¿contrato, numero, periodo, concepto llenos?
     - `step2_ok`: ¿valor_total coincide con recalcular_total()?
     - `anexos_ok`: ¿existe al menos 1 anexo?

6. **`SubmitSerializer`**:
   - Validaciones duras antes de radicar:
     - Step 1 completo
     - Step 2 consistente
     - Al menos 1 anexo
     - Todos los TipoAnexo obligatorios presentes
   - Transición atómica BORRADOR → RADICADA
   - Marca InvitacionRadicacion como USADA

### 4. ViewSet del Wizard

#### [`proveedores/wizard_viewsets.py`](file:///c:/Users/asusc/OneDrive/Documentos/EXPERIAS/GRAPP/proveedores/wizard_viewsets.py)

**`CuentaCobroWizardViewSet`** con 8 custom actions:

| Endpoint | Método | Acción |
|----------|--------|--------|
| `/wizard/` | POST | Crear borrador |
| `/wizard/{id}/` | GET | Obtener estado |
| `/wizard/{id}/?step=1` | PATCH | Guardar step 1 |
| `/wizard/{id}/?step=2` | PATCH | Guardar step 2 |
| `/wizard/{id}/anexos/` | GET | Listar anexos |
| `/wizard/{id}/anexos/` | POST | Subir anexo |
| `/wizard/{id}/anexos/{anexo_id}/` | DELETE | Eliminar anexo |
| `/wizard/{id}/submit/` | POST | Radicar (submit) |

**`TipoAnexoViewSet`**: Endpoint de catálogo READ-ONLY para tipos de anexo.

### 5. Configuración de URLs

#### [`GRAPP/urls.py`](file:///c:/Users/asusc/OneDrive/Documentos/EXPERIAS/GRAPP/GRAPP/urls.py)

Configuré DRF router:
```python
router = DefaultRouter()
router.register(r'cuentas-cobro', CuentaCobroWizardViewSet, basename='cuentacobro')
router.register(r'tipos-anexo', TipoAnexoViewSet, basename='tipoanexo')
```

URLs expuestas:
- `/api/cuentas-cobro/wizard/` (POST)
- `/api/cuentas-cobro/{id}/wizard/` (GET, PATCH)
- `/api/cuentas-cobro/{id}/anexos/` (GET, POST)
- `/api/cuentas-cobro/{id}/anexos/{anexo_id}/` (DELETE)
- `/api/cuentas-cobro/{id}/submit/` (POST)
- `/api/tipos-anexo/` (GET)

### 6. Seed Data

#### [`proveedores/management/commands/init_tipos_anexo.py`](file:///c:/Users/asusc/OneDrive/Documentos/EXPERIAS/GRAPP/proveedores/management/commands/init_tipos_anexo.py)

Management command que inicializa 7 tipos de anexo:

**Obligatorios** (3):
- `CUENTA_COBRO` - Cuenta de Cobro
- `INFORME_ACTIVIDADES` - Informe de Actividades
- `SEGURIDAD_SOCIAL` - Planilla de Seguridad Social

**Opcionales** (4):
- `FACTURA` - Factura
- `CERTIFICADO_BANCARIO` - Certificado Bancario
- `RUT` - RUT Actualizado
- `OTRO` - Otro Documento

**Ejecutado exitosamente**:
```
[+] Creado: FACTURA - Factura
[+] Creado: INFORME_ACTIVIDADES - Informe de Actividades
[+] Creado: SEGURIDAD_SOCIAL - Planilla de Seguridad Social
...
[OK] Proceso completado: 6 creados, 1 actualizados
```

### 7. Correcciones a Código Legacy

#### [`proveedores/forms.py`](file:///c:/Users/asusc/OneDrive/Documentos/EXPERIAS/GRAPP/proveedores/forms.py)
- Actualizado `RadicarCuentaCobroForm` para usar `valor_base` en lugar de `valor`
- Removido campo `soporte` (ahora manejado por anexos)
- Agregado cálculo de `valor_total` en save()

#### [`proveedores/admin.py`](file:///c:/Users/asusc/OneDrive/Documentos/EXPERIAS/GRAPP/proveedores/admin.py)
- Cambiado `list_display` de `'valor'` a `'valor_total'`

#### [`GRAPP/settings.py`](file:///c:/Users/asusc/OneDrive/Documentos/EXPERIAS/GRAPP/GRAPP/settings.py)
- Agregado `'contratos'` a `INSTALLED_APPS`

---

## Flujo de Uso

### 1. Backend Setup
```bash
# Aplicar migraciones
py manage.py migrate

# Inicializar tipos de anexo
py manage.py init_tipos_anexo
```

### 2. Crear Invitación (Admin o Shell)
```python
from proveedores.models import InvitacionRadicacion
from terceros.models import Tercero
from tenancy.models import Empresa

inv = InvitacionRadicacion.objects.create(
    empresa=Empresa.objects.first(),
    proveedor=Tercero.objects.get(documento='123456789'),
    email='proveedor@example.com'
)
print(f"Token: {inv.token}")
```

### 3. Frontend Workflow

```javascript
// Paso 1: Crear borrador
const res1 = await fetch('/api/cuentas-cobro/wizard/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token: 'TOKEN_DE_INVITACION' })
});
const { id } = await res1.json();

// Paso 2: Datos generales
await fetch(`/api/cuentas-cobro/${id}/wizard/?step=1`, {
  method: 'PATCH',
  body: JSON.stringify({
    contrato: 5,
    numero: 'CC-2026-001',
    periodo: 'Enero 2026',
    concepto: 'Servicios mes de enero'
  })
});

// Paso 3: Detalle financiero (valor_total se calcula automáticamente)
await fetch(`/api/cuentas-cobro/${id}/wizard/?step=2`, {
  method: 'PATCH',
  body: JSON.stringify({
    valor_base: '5000000.00',
    iva_valor: '950000.00',
    admon: '150000.00'
  })
});

// Paso 4: Subir anexos
const formData = new FormData();
formData.append('tipo_anexo_codigo', 'CUENTA_COBRO');
formData.append('archivo', fileBlob);
await fetch(`/api/cuentas-cobro/${id}/anexos/`, {
  method: 'POST',
  body: formData
});

// Paso 5: Verificar completitud
const status = await fetch(`/api/cuentas-cobro/${id}/wizard/`);
const { step1_ok, step2_ok, anexos_ok } = await status.json();

// Paso 6: Radicar
if (step1_ok && step2_ok && anexos_ok) {
  await fetch(`/api/cuentas-cobro/${id}/submit/`, {
    method: 'POST',
    body: '{}'
  });
}
```

---

## Validaciones Implementadas

### Guards de Estado
Todas las operaciones de edición (PATCH, POST anexos, DELETE anexos) solo permiten estado `BORRADOR`:

```python
if instance.estado != CuentaCobro.Estado.BORRADOR:
    raise ValidationError("Solo se pueden editar cuentas... BORRADOR")
```

### Validaciones de Submit

El endpoint `/submit/` valida:

1. ✅ **Step 1**: contrato, numero, periodo, concepto no vacíos
2. ✅ **Step 2**: `valor_total == recalcular_total()`
3. ✅ **Anexos mínimos**: al menos 1 anexo
4. ✅ **Anexos obligatorios**: debe existir anexo para cada `TipoAnexo.obligatorio==True`

Si falla, retorna `400 Bad Request` con errores detallados por campo/step.

### Auto-cálculo de Totales

En `WizardStep2Serializer.update()`:
```python
instance.valor_total = instance.recalcular_total()
```

El frontend **nunca** debe enviar `valor_total` en el request - es read-only.

---

## Testing Manual Sugerido

### Test 1: Happy Path
1. POST `/wizard/` con token válido → 201
2. PATCH `?step=1` con datos completos → 200
3. PATCH `?step=2` con valores → 200, verificar `valor_total` calculado
4. POST `/anexos/` x 3 (incluyendo obligatorios) → 201 cada uno
5. GET `/wizard/` → verificar `step1_ok`, `step2_ok`, `anexos_ok` = true
6. POST `/submit/` → 200, estado = RADICADA

### Test 2: Validación de Estado
1. Crear borrador
2. Radicar con POST `/submit/`
3. Intentar PATCH `?step=1` → Debe fallar con 400

### Test 3: Anexos Obligatorios
1. Crear borrador y completar steps 1-2
2. Subir solo anexos NO obligatorios
3. POST `/submit/` → Debe fallar con mensaje específico sobre anexos faltantes

### Test 4: Valor Total Inconsistente
1. Crear borrador, completar step 1
2. Completar step 2 → `valor_total` calculado correctamente
3. Modificar `valor_total` directamente en DB (simular corrupción)
4. POST `/submit/` → Debe fallar con error de inconsistencia

---

## Arquitectura de Archivos

```
proveedores/
├── models.py                         ← CuentaCobro, TipoAnexo, CuentaCobroAnexo
├── wizard_serializers.py             ← 6 serializers (nuevo)
├── wizard_viewsets.py                ← CuentaCobroWizardViewSet (nuevo)
├── management/commands/
│   └── init_tipos_anexo.py           ← Seed data command (nuevo)
├── forms.py                          ← Actualizado (legacy form)
├── admin.py                          ← Actualizado (list_display)
└── migrations/
    └── 0003_tipoanexo_remove...py    ← Nueva migración

contratos/                            ← Nueva app
├── models.py                         ← Contrato model
├── admin.py                          ← Admin config
└── migrations/
    └── 0001_initial.py

GRAPP/
├── settings.py                       ← Agregado 'contratos' a INSTALLED_APPS
└── urls.py                           ← Router + wizard endpoints
```

---

## Próximos Pasos Recomendados

### Backend
- [ ] Implementar filtrado por tenant/empresa (actualmente usa `.first()`)
- [ ] Agregar autenticación/autorización en endpoints
- [ ] Tests unitarios (pytest + DRF APIClient)
- [ ] Agregar endpoint para listar contratos del proveedor

### Frontend
- [ ] Componentes React para wizard de 3 pasos
- [ ] Drag & drop para subida de anexos
- [ ] Barra de progreso visual con flags step1_ok/step2_ok/anexos_ok
- [ ] Preview de PDFs anexados
- [ ] Auto-save en BORRADOR cada N segundos

### Validaciones Adicionales
- [ ] Prevenir duplicados (mismo numero + empresa + proveedor)
- [ ] Validar que contrato pertenezca a la empresa
- [ ] Límite de tamaño/tipo de archivos en anexos
- [ ] Expiración de invitaciones (based on created_at)

---

## Puntos Clave de Implementación

1. **Backend-driven**: Toda la lógica de validación está en el backend - el frontend solo consume API
2. **Estado BORRADOR**: Permite edición incremental antes de radicar
3. **Auto-cálculos**: `valor_total` siempre calculado por backend
4. **Validaciones duras**: Submit falla si datos incompletos/inconsistentes
5. **Anexos tipificados**: Catálogo extensible con tipos obligatorios
6. **Atomic submit**: Usa `transaction.atomic` para garantizar consistencia
7. **Invitaciones one-use**: Token se marca como USADA al radicar

---

## Comandos Útiles

```bash
# Aplicar migraciones
py manage.py migrate

# Seed data de tipos de anexo
py manage.py init_tipos_anexo

# Shell para crear invitación de prueba
py manage.py shell
>>> from proveedores.models import InvitacionRadicacion
>>> from terceros.models import Tercero
>>> from tenancy.models import Empresa
>>> inv = InvitacionRadicacion.objects.create(
...     empresa=Empresa.objects.first(),
...     proveedor=Tercero.objects.filter(estado='APROBADO').first(),
...     email='test@example.com'
... )
>>> print(inv.token)

# Ver endpoints disponibles (Django Extensions)
py manage.py show_urls | grep cuenta
```

---

## Documentación Adicional

Ver [`wizard_api_documentation.md`](file:///C:/Users/asusc/.gemini/antigravity/brain/4b290e5a-24dd-4d12-aba1-2bbe238cf214/wizard_api_documentation.md) para:
- Detalles completos de cada endpoint
- Request/response examples
- Diagrama de flujo Mermaid
- JavaScript client examples
- Tabla de validaciones
