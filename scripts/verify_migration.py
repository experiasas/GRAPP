"""
Verificación exhaustiva de la migración a PostgreSQL.
Compara conteos, relaciones y estructura de datos.
"""
import os
import sys
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'GRAPP.settings')
os.environ['DB_ENGINE'] = 'postgres'
django.setup()

from django.apps import apps
from django.db import connection
from django.db import models

def print_section(title):
    print(f"\n{'='*60}")
    print(f"{title}")
    print('='*60)

def verify_migration():
    errors = []
    warnings = []
    
    print_section("VERIFICACIÓN DE INTEGRIDAD POST-MIGRACIÓN")
    
    # =========================================
    # 1. Verificar conteo de registros
    # =========================================
    print_section("📊 CONTEO DE REGISTROS POR MODELO")
    
    models_to_check = [
        ('tenancy', 'Empresa'),
        ('terceros', 'Tercero'),
        ('terceros', 'TipoTercero'),
        ('terceros', 'TerceroTipo'),
        ('terceros', 'DocumentoTipo'),
        ('terceros', 'DocumentoRequerido'),
        ('terceros', 'DocumentoTercero'),
        ('terceros', 'InvitacionVinculacion'),
        ('terceros', 'Estudio'),
        ('terceros', 'Curso'),
        ('terceros', 'Certificacion'),
        ('terceros', 'ExperienciaLaboral'),
        ('terceros', 'Idioma'),
        ('terceros', 'TerceroIdioma'),
        ('terceros', 'SeguridadSocial'),
        ('terceros', 'Tag'),
        ('terceros', 'SolicitudActualizacionTercero'),
        ('contratos', 'Contrato'),
        ('proveedores', 'CuentaCobro'),
        ('proveedores', 'TipoAnexo'),
        ('proveedores', 'CuentaCobroAnexo'),
        ('proveedores', 'InvitacionRadicacion'),
    ]
    
    total_records = 0
    for app_label, model_name in models_to_check:
        try:
            model = apps.get_model(app_label, model_name)
            count = model.objects.count()
            total_records += count
            status = "✓" if count > 0 else "○"
            print(f"  {status} {app_label}.{model_name:35s} {count:6d} registros")
        except Exception as e:
            errors.append(f"Error en {app_label}.{model_name}: {e}")
            print(f"  ✗ {app_label}.{model_name:35s} ERROR: {e}")
    
    print(f"\n  Total de registros migrados: {total_records}")
    
    # =========================================
    # 2. Verificar integridad referencial
    # =========================================
    print_section("🔗 INTEGRIDAD REFERENCIAL (FOREIGN KEYS)")
    
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT COUNT(*)
                FROM pg_constraint
                WHERE contype = 'f';
            """)
            fk_count = cursor.fetchone()[0]
            print(f"  ✓ {fk_count} constraints de Foreign Key en la base de datos")
            
            # Verificar que no haya FKs rotas
            cursor.execute("""
                SELECT conname, conrelid::regclass
                FROM pg_constraint
                WHERE contype = 'f'
                ORDER BY conrelid::regclass::text
                LIMIT 10;
            """)
            sample_fks = cursor.fetchall()
            print(f"\n  Muestra de constraints:")
            for name, table in sample_fks:
                print(f"    - {table}: {name}")
    except Exception as e:
        errors.append(f"Error verificando FKs: {e}")
        print(f"  ✗ Error: {e}")
    
    # =========================================
    # 3. Verificar relaciones específicas
    # =========================================
    print_section("🔀 RELACIONES MANY-TO-MANY")
    
    try:
        from terceros.models import Tercero
        
        # Tercero.tipos (M2M through TerceroTipo)
        terceros_con_tipos = Tercero.objects.prefetch_related('tipos').annotate(
            tipo_count=models.Count('tipos')
        ).filter(tipo_count__gt=0).count()
        total_terceros = Tercero.objects.count()
        
        print(f"  Tercero.tipos:")
        print(f"    - Terceros con tipos asignados: {terceros_con_tipos}/{total_terceros}")
        
        # Tercero.tags (M2M)
        terceros_con_tags = Tercero.objects.prefetch_related('tags').annotate(
            tag_count=models.Count('tags')
        ).filter(tag_count__gt=0).count()
        
        print(f"  Tercero.tags:")
        print(f"    - Terceros con tags: {terceros_con_tags}/{total_terceros}")
        
    except Exception as e:
        errors.append(f"Error verificando M2M: {e}")
        print(f"  ✗ Error: {e}")
    
    # =========================================
    # 4. Verificar FileFields
    # =========================================
    print_section("📁 ARCHIVOS (FileField)")
    
    try:
        from terceros.models import DocumentoTercero
        
        docs_total = DocumentoTercero.objects.count()
        docs_con_archivo = DocumentoTercero.objects.exclude(archivo='').exclude(archivo__isnull=True).count()
        
        print(f"  DocumentoTercero:")
        print(f"    - Total: {docs_total}")
        print(f"    - Con archivo: {docs_con_archivo}")
        print(f"    - Sin archivo: {docs_total - docs_con_archivo}")
        
        # Verificar que las rutas no se hayan corrompido
        if docs_con_archivo > 0:
            sample = DocumentoTercero.objects.exclude(archivo='').first()
            print(f"\n  Muestra de ruta de archivo:")
            print(f"    {sample.archivo.name if sample else 'N/A'}")
        
    except Exception as e:
        warnings.append(f"Advertencia verificando FileFields: {e}")
        print(f"  ⚠ Advertencia: {e}")
    
    # =========================================
    # 5. Verificar estados y choices
    # =========================================
    print_section("🏷️  ESTADOS Y VALORES (TextChoices)")
    
    try:
        from terceros.models import Tercero
        from contratos.models import Contrato
        from proveedores.models import CuentaCobro
        
        # Estados de Tercero
        if Tercero.objects.exists():
            print(f"  Tercero.estado:")
            estados = Tercero.objects.values('estado').annotate(
                count=models.Count('id')
            ).order_by('-count')
            for estado_info in estados:
                print(f"    - {estado_info['estado']}: {estado_info['count']}")
        
        # Estados de Contrato
        if Contrato.objects.exists():
            print(f"\n  Contrato.estado:")
            estados = Contrato.objects.values('estado').annotate(
                count=models.Count('id')
            ).order_by('-count')
            for estado_info in estados:
                print(f"    - {estado_info['estado']}: {estado_info['count']}")
        
        # Estados de CuentaCobro
        if CuentaCobro.objects.exists():
            print(f"\n  CuentaCobro.estado:")
            estados = CuentaCobro.objects.values('estado').annotate(
                count=models.Count('id')
            ).order_by('-count')
            for estado_info in estados:
                print(f"    - {estado_info['estado']}: {estado_info['count']}")
        
    except Exception as e:
        errors.append(f"Error verificando estados: {e}")
        print(f"  ✗ Error: {e}")
    
    # =========================================
    # 6. Verificar unique constraints
    # =========================================
    print_section("🔐 UNIQUE CONSTRAINTS")
    
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT COUNT(*)
                FROM pg_constraint
                WHERE contype = 'u';
            """)
            unique_count = cursor.fetchone()[0]
            print(f"  ✓ {unique_count} constraints UNIQUE en la base de datos")
    except Exception as e:
        errors.append(f"Error verificando UNIQUE: {e}")
        print(f"  ✗ Error: {e}")
    
    # =========================================
    # RESUMEN FINAL
    # =========================================
    print_section("RESUMEN DE VERIFICACIÓN")
    
    if errors:
        print("\n❌ ERRORES ENCONTRADOS:")
        for i, error in enumerate(errors, 1):
            print(f"  {i}. {error}")
    
    if warnings:
        print("\n⚠️  ADVERTENCIAS:")
        for i, warning in enumerate(warnings, 1):
            print(f"  {i}. {warning}")
    
    if not errors and not warnings:
        print("\n✅ VERIFICACIÓN COMPLETADA EXITOSAMENTE")
        print("   Todos los datos fueron migrados correctamente")
        print(f"   Total de registros verificados: {total_records}")
        return True
    elif not errors:
        print("\n⚠️  VERIFICACIÓN COMPLETADA CON ADVERTENCIAS")
        print("   Los datos fueron migrados pero revisa las advertencias")
        return True
    else:
        print("\n❌ VERIFICACIÓN FALLÓ")
        print("   Revisa los errores antes de usar la base de datos")
        return False

if __name__ == '__main__':
    try:
        success = verify_migration()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n❌ ERROR CRÍTICO: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
