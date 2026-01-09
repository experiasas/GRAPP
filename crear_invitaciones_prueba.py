"""
Script para crear invitaciones de prueba para cada tipo de tercero
Ejecutar con: py manage.py shell < crear_invitaciones_prueba.py
"""
from terceros.models import InvitacionVinculacion, TipoTercero
from tenancy.models import Empresa

# Obtener o crear empresa de prueba
empresa, _ = Empresa.objects.get_or_create(
    nombre="Experias S.A.S.",
    defaults={
        'nombre': 'Experias S.A.S.'
    }
)

# Tipos de tercero
tipos = ['CLIENTE', 'PROVEEDOR', 'CONTRATISTA', 'EMPLEADO', 'SOCIO', 'ASPIRANTE']

print("Creando invitaciones de prueba...\n")

for tipo_code in tipos:
    tipo_tercero = TipoTercero.objects.get(code=tipo_code)
    
    # Eliminar invitaciones pendientes antiguas para este tipo (opcional)
    InvitacionVinculacion.objects.filter(
        empresa=empresa,
        tipo_tercero=tipo_tercero,
        estado='PENDIENTE'
    ).delete()
    
    # Crear nueva invitación
    inv = InvitacionVinculacion.objects.create(
        empresa=empresa,
        email=f'test_{tipo_code.lower()}@example.com',
        tipo_tercero=tipo_tercero,
        estado='PENDIENTE'
    )
    
    url = f'http://localhost:5173/vinculacion/{inv.token}/'
    docs_count = inv.tipo_tercero.documentos_requeridos.count()
    
    print(f"✓ {tipo_tercero.nombre}")
    print(f"  Email: {inv.email}")
    print(f"  Documentos requeridos: {docs_count}")
    print(f"  URL: {url}")
    print()

print("\n✅ Invitaciones creadas exitosamente")
print("Puedes copiar cualquier URL en el navegador para probar el formulario")
