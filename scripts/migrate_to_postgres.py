"""
Script maestro de migración de SQLite a PostgreSQL para GRAPP.
Orquesta todo el proceso de forma segura y controlada.

PREREQUISITOS:
1. PostgreSQL instalado y corriendo
2. Base de datos y usuario creados en PostgreSQL
3. Variables de entorno configuradas (ver .env.example)
4. psycopg2-binary instalado (pip install -r requirements.txt)
"""
import os
import sys
import subprocess
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
EXPORT_FILE = BASE_DIR / 'data_export.json'

def run_command(cmd, description, check_exit=True):
    """Ejecuta un comando y maneja errores."""
    print(f"\n{'='*60}")
    print(f"▶ {description}")
    print(f"{'='*60}")
    result = subprocess.run(cmd, shell=True, cwd=BASE_DIR, capture_output=True, text=True)
    
    if result.stdout:
        print(result.stdout)
    if result.stderr:
        print(result.stderr, file=sys.stderr)
    
    if check_exit and result.returncode != 0:
        print(f"\n✗ ERROR: {description} falló con código {result.returncode}")
        sys.exit(1)
    print(f"✓ {description} completado")
    return result

def check_prerequisites():
    """Verifica que todo esté listo para la migración."""
    print("\n🔍 Verificando prerequisitos...")
    
    # Verificar variables de entorno
    required_vars = ['DB_NAME', 'DB_USER', 'DB_PASSWORD', 'DB_HOST', 'DB_PORT']
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    
    if missing_vars:
        print(f"\n✗ ERROR: Faltan variables de entorno: {', '.join(missing_vars)}")
        print("\nConfigura las variables de entorno antes de continuar.")
        print("Ejemplo en Windows PowerShell:")
        print('  $env:DB_ENGINE="postgres"')
        print('  $env:DB_NAME="grapp_db"')
        print('  $env:DB_USER="grapp_user"')
        print('  $env:DB_PASSWORD="tu_password"')
        print('  $env:DB_HOST="localhost"')
        print('  $env:DB_PORT="5432"')
        return False
    
    # Verificar que SQLite exista
    if not (BASE_DIR / 'db.sqlite3').exists():
        print("\n✗ ERROR: No se encuentra db.sqlite3")
        return False
    
    print("✓ Prerequisitos verificados\n")
    return True

def main():
    print("""
    ╔══════════════════════════════════════════════════════════╗
    ║  Migración SQLite → PostgreSQL - GRAPP                   ║
    ║  Este proceso es IRREVERSIBLE después de importar        ║
    ╚══════════════════════════════════════════════════════════╝
    """)
    
    # Verificar prerequisitos
    if not check_prerequisites():
        sys.exit(1)
    
    # Confirmar con el usuario
    print("\n⚠️  ADVERTENCIA: Este proceso modificará la base de datos PostgreSQL.")
    print("   Asegúrate de haber hecho backup de db.sqlite3 y media/")
    response = input("\n¿Continuar con la migración? (escribe 'SI' para confirmar): ")
    if response.upper() != 'SI':
        print("\n❌ Migración cancelada por el usuario")
        sys.exit(0)
    
    # 1. Exportar datos desde SQLite
    print("\n" + "="*60)
    print("FASE 1: EXPORTAR DATOS DESDE SQLITE")
    print("="*60)
    
    # Temporalmente forzar SQLite
    original_db_engine = os.environ.get('DB_ENGINE')
    os.environ['DB_ENGINE'] = 'sqlite'
    
    run_command(
        f'py manage.py dumpdata '
        f'--exclude auth.permission '
        f'--exclude contenttypes '
        f'--exclude sessions.session '
        f'--exclude admin.logentry '
        f'--indent 2 '
        f'--output {EXPORT_FILE}',
        'Exportando datos desde SQLite'
    )
    
    # Verificar archivo de exportación
    if EXPORT_FILE.exists():
        size_mb = EXPORT_FILE.stat().st_size / (1024 * 1024)
        print(f"\n✓ Archivo de exportación creado: {size_mb:.2f} MB")
    
    # 2. Cambiar a PostgreSQL y ejecutar migraciones
    print("\n" + "="*60)
    print("FASE 2: CREAR ESQUEMA EN POSTGRESQL")
    print("="*60)
    
    os.environ['DB_ENGINE'] = 'postgres'
    
    run_command('py manage.py migrate', 'Aplicando migraciones en PostgreSQL')
    
    # 3. Importar datos
    print("\n" + "="*60)
    print("FASE 3: IMPORTAR DATOS EN POSTGRESQL")
    print("="*60)
    
    run_command(
        f'py manage.py loaddata {EXPORT_FILE}',
        'Importando datos en PostgreSQL'
    )
    
    # 4. Verificar integridad
    print("\n" + "="*60)
    print("FASE 4: VERIFICAR INTEGRIDAD")
    print("="*60)
    
    verify_result = run_command(
        'py scripts/verify_migration.py',
        'Verificando integridad de datos',
        check_exit=False
    )
    
    # Restaurar DB_ENGINE original si existía
    if original_db_engine:
        os.environ['DB_ENGINE'] = original_db_engine
    
    print("""
    ╔══════════════════════════════════════════════════════════╗
    ║  ✓ Migración completada                                  ║
    ║                                                          ║
    ║  Próximos pasos:                                         ║
    ║  1. Revisar logs de verificación arriba                  ║
    ║  2. Configurar DB_ENGINE=postgres permanentemente        ║
    ║  3. Probar: py manage.py runserver                       ║
    ║  4. Si funciona, puedes mover db.sqlite3 a backups/      ║
    ╚══════════════════════════════════════════════════════════╝
    """)
    
    # Limpiar archivo temporal
    if EXPORT_FILE.exists():
        os.remove(EXPORT_FILE)
        print(f"\n✓ Archivo temporal eliminado: {EXPORT_FILE.name}\n")

if __name__ == '__main__':
    main()
