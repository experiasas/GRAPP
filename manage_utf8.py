#!/usr/bin/env python
"""
Wrapper para manage.py que establece codificación UTF-8 antes de cualquier importación.
Esto soluciona el UnicodeDecodeError en psycopg2 cuando lee archivos de configuración del sistema.

Uso: py manage_utf8.py runserver
"""
import os
import sys

# CRÍTICO: Establecer codificación ANTES de importar Django o psycopg2
os.environ['PYTHONIOENCODING'] = 'utf-8'
os.environ['LANG'] = 'C.UTF-8'
os.environ['LC_ALL'] = 'C.UTF-8'
os.environ['PGCLIENTENCODING'] = 'UTF8'

# Deshabilitar archivos de configuración de PostgreSQL del sistema
os.environ['PGSYSCONFDIR'] = ''
os.environ['PGSSLMODE'] = 'disable'

# Forzar codificación de salida estándar
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')
if sys.stderr.encoding != 'utf-8':
    sys.stderr.reconfigure(encoding='utf-8')

# Ahora ejecutar manage.py normalmente
if __name__ == '__main__':
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'GRAPP.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)
