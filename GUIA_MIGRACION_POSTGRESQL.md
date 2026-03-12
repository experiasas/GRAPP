# Guía de Migración a PostgreSQL - GRAPP

Esta guía te ayudará a migrar GRAPP de SQLite a PostgreSQL de forma segura.

## Prerequisitos

### 1. Instalar PostgreSQL en Windows

**Opción A: Instalador oficial**
1. Descarga PostgreSQL desde: https://www.postgresql.org/download/windows/
2. Ejecuta el instalador (recomendado: versión 15 o superior)
3. Durante la instalación:
   - Anota el password del usuario `postgres`
   - Puerto por defecto: 5432
   - Instala pgAdmin (herramienta gráfica opcional)

**Opción B: Via Chocolatey**
```powershell
choco install postgresql
```

### 2. Verificar instalación

```powershell
# Verificar que PostgreSQL esté corriendo
psql --version

# Si no está en PATH, busca en:
# C:\Program Files\PostgreSQL\15\bin\
```

### 3. Crear base de datos y usuario

Abre PowerShell como administrador y ejecuta:

```powershell
# Conectar a PostgreSQL como superusuario
psql -U postgres

# Dentro de psql, ejecuta:
```

```sql
-- Crear usuario
CREATE USER grapp_user WITH PASSWORD 'tu_password_seguro';

-- Crear base de datos
CREATE DATABASE grapp_db OWNER grapp_user;

-- Dar permisos
GRANT ALL PRIVILEGES ON DATABASE grapp_db TO grapp_user;

-- Salir
\q
```

### 4. Instalar dependencias Python

```powershell
pip install -r requirements.txt
```

Esto instalará `psycopg2-binary` que es el driver de PostgreSQL.

## Proceso de Migración

### Paso 1: Backup

**CRÍTICO**: Siempre haz backup antes de migrar.

```powershell
# Ejecutar script de backup
py scripts/backup_sqlite.py
```

Esto creará:
- `backups/db.sqlite3.backup_YYYYMMDD_HHMMSS`
- `backups/media_backup_YYYYMMDD_HHMMSS/`

### Paso 2: Configurar variables de entorno

En PowerShell (sesión actual):

```powershell
$env:DB_ENGINE="postgres"
$env:DB_NAME="grapp_db"
$env:DB_USER="grapp_user"
$env:DB_PASSWORD="tu_password_seguro"
$env:DB_HOST="localhost"
$env:DB_PORT="5432"
```

**Nota**: Estas variables solo duran la sesión. Para hacerlas permanentes, agrégalas a las variables de entorno del sistema.

### Paso 3: Ejecutar migración

```powershell
py scripts/migrate_to_postgres.py
```

Este script:
1. Exporta todos los datos desde SQLite
2. Crea el esquema en PostgreSQL
3. Importa los datos
4. Verifica la integridad

### Paso 4: Verificar

```powershell
# Probar conexión a PostgreSQL
py manage.py check

# Iniciar servidor
py manage.py runserver
```

Abre http://localhost:8000 y verifica que:
- El sitio carga correctamente
- Puedes ver terceros existentes
- Los documentos se pueden descargar

## Solución de Problemas

### Error: "psycopg2 no encontrado"

```powershell
pip install psycopg2-binary
```

### Error: "contraseña incorrecta"

Verifica que la variable `DB_PASSWORD` coincida con la configurada en PostgreSQL:

```powershell
echo $env:DB_PASSWORD
```

### Error: "database does not exist"

Asegúrate de haber creado la base de datos:

```powershell
psql -U postgres -c "CREATE DATABASE grapp_db OWNER grapp_user;"
```

### Rollback a SQLite

Si algo sale mal:

```powershell
# Cambiar a SQLite
$env:DB_ENGINE="sqlite"

# Reiniciar servidor
py manage.py runserver
```

Tus datos originales están intactos en `db.sqlite3`.

## Post-Migración

### Configuración permanente

Para usar PostgreSQL permanentemente:

1. **Variables de entorno del sistema** (Windows):
   - Win + R → `sysdm.cpl` → Opciones avanzadas → Variables de entorno
   - Agregar las variables `DB_ENGINE`, `DB_NAME`, etc.

2. **Alternativamente**: Crear archivo `.env` y usar `python-dotenv`:
   ```powershell
   pip install python-dotenv
   ```
   
   Modificar `settings.py` para cargar desde `.env`.

### Optimización PostgreSQL (opcional)

```sql
-- Conectar a la base de datos
psql -U grapp_user -d grapp_db

-- Analizar tablas para optimizar queries
ANALYZE;

-- Ver tamaño de la base de datos
SELECT pg_size_pretty(pg_database_size('grapp_db'));
```

### Backup automatizado

Puedes crear una tarea programada de Windows para ejecutar:

```powershell
pg_dump -U grapp_user grapp_db > backup_$(Get-Date -Format 'yyyyMMdd').sql
```

## Comandos Útiles PostgreSQL

```powershell
# Conectar a la base de datos
psql -U grapp_user -d grapp_db

# Ver todas las tablas
\dt

# Ver esquema de una tabla
\d terceros_tercero

# Contar registros
SELECT COUNT(*) FROM terceros_tercero;

# Salir
\q
```

## Datos de Contacto del DBA (tú mismo)

- Usuario PostgreSQL: `grapp_user`
- Base de datos: `grapp_db`
- Puerto: `5432`
- Host: `localhost`

**Importante**: Anota el password en un gestor de contraseñas seguro. ¡No lo pierdas!
