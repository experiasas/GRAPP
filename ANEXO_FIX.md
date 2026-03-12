# Anexo Upload Fix

## Issue Identified
When users upload files (anexos) in the radicación wizard:
- Counter shows "Anexos (0/3)" and never updates
- "Radicar Cuenta" button remains disabled
- No uploaded files appear in UI
- Backend not registering or returning anexos correctly

## Root Cause
**Field name mismatch**: Frontend sends `tipo_anexo_id` but backend `AnexoSerializer` only accepted:
- `tipo_anexo` (FK field)
- `tipo_anexo_codigo` (string)

**Response format mismatch**: Frontend expects nested `tipo` object but backend was returning flat structure.

## Solution Applied

### Backend - AnexoSerializer

1. **Added `tipo_anexo_id` support**:
```python
tipo_anexo_id = serializers.IntegerField(write_only=True, required=False)
```

2. **Created nested serializer** for response formatting:
```python
class TipoAnexoNestedSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoAnexo
        fields = ['id', 'codigo', 'nombre', 'obligatorio']

class AnexoSerializer(serializers.ModelSerializer):
    tipo = TipoAnexoNestedSerializer(source='tipo_anexo', read_only=True)
    fecha_subida = serializers.DateTimeField(source='created_at', read_only=True)
```

3. **Updated validation** to handle three ways to specify tipo_anexo:
```python
if tipo_anexo_id:
    tipo_anexo = TipoAnexo.objects.get(id=tipo_anexo_id)
    data['tipo_anexo'] = tipo_anexo
elif tipo_anexo_codigo:
    tipo_anexo = TipoAnexo.objects.get(codigo=tipo_anexo_codigo)
    data['tipo_anexo'] = tipo_anexo
```

## Testing

Run test: `python manage.py shell < proveedores/test_anexo_upload.py`

Expected results:
✅ Anexo created with tipo_anexo_id
✅ Response includes nested tipo object
✅ Frontend can parse tipo.id, tipo.nombre, tipo.obligatorio
✅ Counter updates correctly
✅ Submit button enables when all requirements met
