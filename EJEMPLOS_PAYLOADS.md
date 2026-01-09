# Ejemplos de Payloads - Sistema de Documentos Dinámicos GRAPP

## 📥 GET Invitación

### Endpoint
```
GET /api/vinculacion/{token}/
```

### Ejemplo de Respuesta - CLIENTE (7 documentos)

```json
{
  "email": "test_cliente@example.com",
  "tipo_tercero": {
    "code": "CLIENTE",
    "nombre": "Cliente"
  },
  "empresa": {
    "id": 1,
    "nombre": "Experias S.A.S."
  },
  "documentos_requeridos": [
    {
      "documento_tipo_code": "RUT",
      "documento_tipo_nombre": "RUT",
      "obligatorio": true
    },
    {
      "documento_tipo_code": "CAMARA_COMERCIO",
      "documento_tipo_nombre": "Cámara y Comercio",
      "obligatorio": true
    },
    {
      "documento_tipo_code": "CEDULA_RL",
      "documento_tipo_nombre": "Cédula Representante Legal",
      "obligatorio": true
    },
    {
      "documento_tipo_code": "ESTADOS_FINANCIEROS",
      "documento_tipo_nombre": "Estados Financieros",
      "obligatorio": true
    },
    {
      "documento_tipo_code": "ACUERDO_CONFIDENCIALIDAD",
      "documento_tipo_nombre": "Acuerdo de Confidencialidad",
      "obligatorio": true
    },
    {
      "documento_tipo_code": "TRATAMIENTO_DATOS",
      "documento_tipo_nombre": "Tratamiento de Datos",
      "obligatorio": true
    },
    {
      "documento_tipo_code": "DECLARACION_ORIGEN_FONDOS",
      "documento_tipo_nombre": "Declaración de Origen de Fondos",
      "obligatorio": true
    }
  ]
}
```

### Ejemplo de Respuesta - PROVEEDOR (6 documentos)

```json
{
  "email": "test_proveedor@example.com",
  "tipo_tercero": {
    "code": "PROVEEDOR",
    "nombre": "Proveedor"
  },
  "empresa": {
    "id": 1,
    "nombre": "Experias S.A.S."
  },
  "documentos_requeridos": [
    {
      "documento_tipo_code": "RUT",
      "documento_tipo_nombre": "RUT",
      "obligatorio": true
    },
    {
      "documento_tipo_code": "CAMARA_COMERCIO",
      "documento_tipo_nombre": "Cámara y Comercio",
      "obligatorio": true
    },
    {
      "documento_tipo_code": "CEDULA_RL",
      "documento_tipo_nombre": "Cédula Representante Legal",
      "obligatorio": true
    },
    {
      "documento_tipo_code": "CERTIFICACION_BANCARIA",
      "documento_tipo_nombre": "Certificación Bancaria",
      "obligatorio": true
    },
    {
      "documento_tipo_code": "ACUERDO_CONFIDENCIALIDAD",
      "documento_tipo_nombre": "Acuerdo de Confidencialidad",
      "obligatorio": true
    },
    {
      "documento_tipo_code": "TRATAMIENTO_DATOS",
      "documento_tipo_nombre": "Tratamiento de Datos",
      "obligatorio": true
    }
  ]
}
```

### Ejemplo de Respuesta - CONTRATISTA/EMPLEADO (5 documentos)

```json
{
  "email": "test_contratista@example.com",
  "tipo_tercero": {
    "code": "CONTRATISTA",
    "nombre": "Contratista"
  },
  "empresa": {
    "id": 1,
    "nombre": "Experias S.A.S."
  },
  "documentos_requeridos": [
    {
      "documento_tipo_code": "CEDULA",
      "documento_tipo_nombre": "Cédula",
      "obligatorio": true
    },
    {
      "documento_tipo_code": "RUT",
      "documento_tipo_nombre": "RUT",
      "obligatorio": true
    },
    {
      "documento_tipo_code": "ACUERDO_CONFIDENCIALIDAD",
      "documento_tipo_nombre": "Acuerdo de Confidencialidad",
      "obligatorio": true
    },
    {
      "documento_tipo_code": "TRATAMIENTO_DATOS",
      "documento_tipo_nombre": "Tratamiento de Datos",
      "obligatorio": true
    },
    {
      "documento_tipo_code": "SEGURIDAD_SOCIAL",
      "documento_tipo_nombre": "Seguridad Social",
      "obligatorio": true
    }
  ]
}
```

### Ejemplo de Respuesta - SOCIO (1 documento)

```json
{
  "email": "test_socio@example.com",
  "tipo_tercero": {
    "code": "SOCIO",
    "nombre": "Socio"
  },
  "empresa": {
    "id": 1,
    "nombre": "Experias S.A.S."
  },
  "documentos_requeridos": [
    {
      "documento_tipo_code": "CEDULA",
      "documento_tipo_nombre": "Cédula",
      "obligatorio": true
    }
  ]
}
```

---

## 📤 POST Crear Tercero

### Endpoint
```
POST /api/vinculacion/{token}/
```

### Payload de Ejemplo - Persona Jurídica (Cliente/Proveedor)

```json
{
  "tipo_persona": "JURIDICA",
  "tipo_doc": "NIT",
  "documento": "900123456",
  "razon_social": "Empresa Ejemplo S.A.S.",
  "email": "contacto@ejemplo.com",
  "telefono": "+57 310 123 4567",
  "direccion": "Calle 123 # 45-67, Oficina 301",
  "ciudad": "Bogotá"
}
```

### Payload de Ejemplo - Persona Natural (Contratista/Empleado)

```json
{
  "tipo_persona": "NATURAL",
  "tipo_doc": "CC",
  "documento": "1234567890",
  "nombre1": "Juan",
  "nombre2": "Carlos",
  "apellido1": "Pérez",
  "apellido2": "González",
  "email": "juan.perez@example.com",
  "telefono": "+57 300 123 4567",
  "direccion": "Carrera 45 # 12-34, Apto 501",
  "ciudad": "Medellín"
}
```

### Respuesta Exitosa

```json
{
  "success": true,
  "tercero_id": 15,
  "message": "Tercero registrado exitosamente"
}
```

**Nota:** Al crear el tercero, el backend automáticamente:
1. Asigna el `TipoTercero` desde la invitación
2. Crea placeholders `DocumentoTercero` (estado `PENDIENTE`) para cada documento requerido
3. Marca la invitación como `USADA`

---

## 📎 POST Upload Documento Individual

### Endpoint
```
POST /api/terceros/{tercero_id}/documentos/{documento_tipo_code}/upload
```

### Ejemplo
```bash
POST /api/terceros/15/documentos/RUT/upload
Content-Type: multipart/form-data

archivo: [binary file data]
```

### Respuesta Exitosa

```json
{
  "success": true,
  "documento_tipo": "RUT",
  "message": "Archivo cargado exitosamente"
}
```

---

## 📎 POST Upload Múltiples Documentos (Bulk)

### Endpoint
```
POST /api/terceros/{tercero_id}/documentos/bulk-upload
```

### Ejemplo con FormData
```javascript
const formData = new FormData();
formData.append('RUT', fileRUT);
formData.append('CAMARA_COMERCIO', fileCamara);
formData.append('CEDULA_RL', fileCedula);

fetch('http://127.0.0.1:8000/api/terceros/15/documentos/bulk-upload', {
  method: 'POST',
  body: formData
});
```

### Respuesta Exitosa

```json
{
  "success": true,
  "results": [
    {
      "documento_tipo": "RUT",
      "success": true
    },
    {
      "documento_tipo": "CAMARA_COMERCIO",
      "success": true
    },
    {
      "documento_tipo": "CEDULA_RL",
      "success": true
    }
  ],
  "errors": [],
  "total_uploaded": 3,
  "total_failed": 0
}
```

---

## 🎯 Flujo Completo Frontend

```typescript
// 1. GET Invitación
const invitacion = await vinculacionAPI.getInvitacion(token);
// invitacion.documentos_requeridos contiene los docs dinámicos

// 2. Usuario completa formulario y selecciona archivos
const formData = { tipo_persona: 'JURIDICA', ... };
const documentFiles = {
  'RUT': File,
  'CAMARA_COMERCIO': File,
  'CEDULA_RL': File,
  ...
};

// 3. Crear tercero
const { tercero_id } = await vinculacionAPI.submitTercero(token, formData);

// 4. Upload documentos en paralelo (3 a la vez)
await vinculacionAPI.uploadDocumentosParallel(
  tercero_id,
  documentFiles,
  3, // concurrencia
  (code, status) => console.log(`${code}: ${status}`)
);

// 5. Redirigir a success
navigate('/success/vinculacion');
```

---

## 🔍 Verificar Resultados en Base de Datos

```python
# Django shell
from terceros.models import Tercero, DocumentoTercero

tercero = Tercero.objects.get(id=15)
print(f"Tercero: {tercero.nombre_mostrar()}")
print(f"Estado: {tercero.estado}")  # PENDIENTE
print(f"Tipo: {tercero.tipos.first().nombre}")

# Ver documentos
documentos = tercero.documentos.all()
for doc in documentos:
    print(f"{doc.documento_tipo.nombre}: {doc.estado}")
    if doc.archivo:
        print(f"  Archivo: {doc.archivo.url}")
```

Resultado esperado:
```
Tercero: Empresa Ejemplo S.A.S.
Estado: PENDIENTE
Tipo: Cliente

RUT: CARGADO
  Archivo: /media/terceros/anexos/RUT_xyz.pdf
Cámara y Comercio: CARGADO
  Archivo: /media/terceros/anexos/CAMARA_COMERCIO_abc.pdf
...
```
