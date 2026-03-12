"""
Script de backup automático para GRAPP.
Genera copias de seguridad con timestamp de db.sqlite3 y directorio media/
"""
import shutil
import os
from datetime import datetime
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
TIMESTAMP = datetime.now().strftime('%Y%m%d_%H%M%S')

def main():
    print("\n" + "="*60)
    print("BACKUP DE GRAPP")
    print("="*60 + "\n")
    
    # Crear directorio de backups si no existe
    backup_dir = BASE_DIR / 'backups'
    backup_dir.mkdir(exist_ok=True)
    
    # Backup de base de datos SQLite
    db_source = BASE_DIR / 'db.sqlite3'
    if db_source.exists():
        db_backup = backup_dir / f'db.sqlite3.backup_{TIMESTAMP}'
        shutil.copy2(db_source, db_backup)
        size_mb = db_backup.stat().st_size / (1024 * 1024)
        print(f"✓ Base de datos respaldada:")
        print(f"  {db_backup}")
        print(f"  Tamaño: {size_mb:.2f} MB\n")
    else:
        print("⚠ No se encontró db.sqlite3\n")
    
    # Backup de directorio media
    media_source = BASE_DIR / 'media'
    if media_source.exists():
        media_backup = backup_dir / f'media_backup_{TIMESTAMP}'
        shutil.copytree(media_source, media_backup)
        
        # Contar archivos
        file_count = sum(1 for _ in media_backup.rglob('*') if _.is_file())
        print(f"✓ Archivos media respaldados:")
        print(f"  {media_backup}")
        print(f"  Archivos: {file_count}\n")
    else:
        print("⚠ No se encontró directorio media/\n")
    
    print("="*60)
    print("✓ BACKUP COMPLETADO EXITOSAMENTE")
    print("="*60 + "\n")
    print("Los backups se encuentran en:")
    print(f"  {backup_dir.absolute()}\n")

if __name__ == '__main__':
    main()
