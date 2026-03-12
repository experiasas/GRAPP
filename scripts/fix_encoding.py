"""
Script para convertir el archivo data_export.json a UTF-8 válido
"""
import json

# Intentar leer con diferentes codificaciones
encodings = ['utf-8', 'latin-1', 'cp1252', 'iso-8859-1']

data = None
for encoding in encodings:
    try:
        print(f"Intentando leer con codificación: {encoding}")
        with open('data_export.json', 'r', encoding=encoding) as f:
            data = json.load(f)
        print(f"✓ Archivo leído exitosamente con codificación: {encoding}")
        break
    except (UnicodeDecodeError, json.JSONDecodeError) as e:
        print(f"✗ Falló con {encoding}: {e}")
        continue

if data is None:
    print("❌ No se pudo leer el archivo con ninguna codificación")
    exit(1)

# Guardar con UTF-8 explícito
print("\nGuardando archivo con UTF-8...")
with open('data_export_utf8.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print(f"✓ Archivo convertido: data_export_utf8.json")
print(f"  Total de objetos: {len(data)}")
