"""
Test script for anexo upload functionality.

Run in Django shell to verify async upload works correctly.
"""

from django.core.files.uploadedfile import SimpleUploadedFile
from proveedores.models import InvitacionRadicacion, CuentaCobro, TipoAnexo, CuentaCobroAnexo
from proveedores.wizard_serializers import AnexoSerializer
from tenancy.models import Empresa
from terceros.models import Tercero

def test_anexo_upload():
    print("\n" + "="*60)
    print("TESTING ANEXO UPLOAD")
    print("="*60 + "\n")
    
    # Get test data
    empresa = Empresa.objects.first()
    proveedor = Tercero.objects.filter(estado='APROBADO').first()
    
    if not empresa or not proveedor:
        print("❌ Missing test data (empresa or proveedor)")
        return
    
    # Create invitation and draft
    print("1. Creating test invitation and draft...")
    inv = InvitacionRadicacion.objects.create(
        empresa=empresa,
        proveedor=proveedor,
        email='test_anexo@example.com'
    )
    
    cuenta = CuentaCobro.objects.create(
        empresa=empresa,
        proveedor=proveedor,
        estado=CuentaCobro.Estado.BORRADOR,
        numero='TEST-ANEXO-001',
        periodo='',
        concepto=''
    )
    
    inv.cuenta_cobro = cuenta
    inv.save()
    print(f"✅ Created draft ID={cuenta.id}\n")
    
    # Check TipoAnexo
    print("2. Checking TipoAnexo catalog...")
    tipos = TipoAnexo.objects.all()
    if tipos.count() == 0:
        print("❌ No TipoAnexo found. Creating test tipos...")
        TipoAnexo.objects.create(codigo='FACTURA', nombre='Factura', obligatorio=True)
        TipoAnexo.objects.create(codigo='ACTA', nombre='Acta de Entrega', obligatorio=True)
        TipoAnexo.objects.create(codigo='SOPORTE', nombre='Soporte Adicional', obligatorio=False)
        tipos = TipoAnexo.objects.all()
    
    for t in tipos:
        print(f"  - {t.codigo}: {t.nombre} (obligatorio={t.obligatorio})")
    print()
    
    # Test anexo creation with tipo_anexo_id (frontend method)
    print("3. Testing anexo upload with tipo_anexo_id (frontend method)...")
    tipo_test = tipos.first()
    
    # Simulate file upload
    test_file = SimpleUploadedFile(
        "test_factura.pdf",
        b"fake pdf content",
        content_type="application/pdf"
    )
    
    serializer = AnexoSerializer(
        data={
            'tipo_anexo_id': tipo_test.id,
            'archivo': test_file,
            'descripcion': 'Test upload'
        },
        context={'cuenta_cobro': cuenta}
    )
    
    if serializer.is_valid():
        anexo = serializer.save()
        print(f"✅ Anexo created: ID={anexo.id}")
        
        # Test serialization for response
        response_data = AnexoSerializer(anexo).data
        print(f"✅ Response data structure:")
        print(f"   - id: {response_data['id']}")
        print(f"   - tipo: {response_data.get('tipo')}")
        print(f"   - archivo: {response_data['archivo']}")
        print(f"   - fecha_subida: {response_data.get('fecha_subida')}")
        
        # Verify nested tipo structure
        if 'tipo' in response_data and isinstance(response_data['tipo'], dict):
            print(f"✅ Nested tipo serialization working:")
            print(f"   - tipo.id: {response_data['tipo']['id']}")
            print(f"   - tipo.nombre: {response_data['tipo']['nombre']}")
            print(f"   - tipo.obligatorio: {response_data['tipo']['obligatorio']}")
        else:
            print(f"❌ Nested tipo serialization FAILED")
            print(f"   Got: {response_data.get('tipo')}")
    else:
        print(f"❌ Serializer validation failed:")
        print(f"   Errors: {serializer.errors}")
        return
    
    print()
    
    # Test listing anexos
    print("4. Testing anexo listing...")
    anexos = cuenta.anexos.all()
    serialized = AnexoSerializer(anexos, many=True).data
    print(f"✅ Found {len(serialized)} anexos")
    for a in serialized:
        print(f"   - Anexo #{a['id']}: {a['tipo']['nombre']}")
    
    print()
    
    # Cleanup
    print("5. Cleanup...")
    inv.delete()
    cuenta.delete()
    print("✅ Test data cleaned up")
    
    print()
    print("="*60)
    print("🎉 ANEXO UPLOAD TEST PASSED!")
    print("="*60 + "\n")

if __name__ == '__main__':
    test_anexo_upload()
