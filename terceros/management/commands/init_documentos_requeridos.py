import sys
from django.core.management.base import BaseCommand
from django.db import transaction
from terceros.models import TipoTercero, DocumentoTipo, DocumentoRequerido

class Command(BaseCommand):
    help = 'Inicializa la matriz canónica de Documentos Requeridos y elimina obsoletos'

    def handle(self, *args, **options):
        self.stdout.write("Iniciando inicialización de documentos requeridos...")

        # 1. Definición de la Matriz Canónica
        # Estructura: TIPO_TERCERO -> TIPO_PERSONA -> [LISTA DE CODES DOCS]
        MATRIZ = {
            "CLIENTE": {
                "NATURAL": ["CEDULA", "RUT", "NDA", "TRATAMIENTO_DATOS", "DOF"],
                "JURIDICA": ["CAMARA_COMERCIO", "RUT", "CEDULA_RL", "EEFF", "NDA", "TRATAMIENTO_DATOS", "DOF"],
            },
            "PROVEEDOR": {
                "NATURAL": ["CEDULA", "RUT", "NDA", "TRATAMIENTO_DATOS", "CERT_BANCARIA"],
                "JURIDICA": ["CAMARA_COMERCIO", "RUT", "CEDULA_RL", "NDA", "TRATAMIENTO_DATOS", "CERT_BANCARIA"],
            },
            "CONTRATISTA": {
                "NATURAL": ["CEDULA", "RUT", "NDA", "TRATAMIENTO_DATOS", "SS"],
                # Asumimos que si no está en la matriz, no aplica o no se define aun
            },
            "EMPLEADO": {
                "NATURAL": ["CEDULA", "RUT", "NDA", "TRATAMIENTO_DATOS", "SS"],
            },
            "SOCIO": {
                "NATURAL": ["CEDULA"],
            },
            "ASPIRANTE": {
                "NATURAL": ["CEDULA", "RUT", "NDA", "TRATAMIENTO_DATOS", "SS"],
            },
        }

        # Validar existencias previas necesarias
        if not TipoTercero.objects.exists():
            self.stdout.write(self.style.ERROR("No existen Tipos de Tercero. Ejecuta seeds o crea data base."))
            return
        
        if not DocumentoTipo.objects.exists():
             self.stdout.write(self.style.ERROR("No existen Tipos de Documento. Ejecuta seeds o crea data base."))
             return

        created_count = 0
        skipped_count = 0
        valid_ids = []

        try:
            with transaction.atomic():
                for tipo_tercero_code, reglas in MATRIZ.items():
                    # Obtener TipoTercero
                    try:
                        tipo_tercero_obj = TipoTercero.objects.get(code=tipo_tercero_code)
                    except TipoTercero.DoesNotExist:
                        self.stdout.write(self.style.WARNING(f"TipoTercero '{tipo_tercero_code}' no encontrado. Saltando..."))
                        continue

                    for persona_type, doc_codes in reglas.items():
                        # persona_type es "NATURAL" o "JURIDICA" coincidiendo con choices
                        
                        count_local = 0
                        for doc_code in doc_codes:
                            # Obtener DocumentoTipo
                            try:
                                doc_tipo_obj = DocumentoTipo.objects.get(code=doc_code)
                            except DocumentoTipo.DoesNotExist:
                                self.stdout.write(self.style.ERROR(f"DocumentoTipo '{doc_code}' no existe (Requerido para {tipo_tercero_code}/{persona_type})."))
                                # Podríamos optar por saltar o fallar. Aquí saltamos este doc.
                                continue

                            # Crear o Recueprar DocumentoRequerido
                            # aplica_a_persona debe ser exacto
                            req, created = DocumentoRequerido.objects.get_or_create(
                                tipo_tercero=tipo_tercero_obj,
                                documento_tipo=doc_tipo_obj,
                                aplica_a_persona=persona_type,
                                defaults={'obligatorio': True}
                            )

                            # Asegurar obligatorio=True si ya existía
                            if not created and not req.obligatorio:
                                req.obligatorio = True
                                req.save()

                            valid_ids.append(req.id)
                            
                            if created:
                                created_count += 1
                            else:
                                skipped_count += 1
                            
                            count_local += 1
                        
                        self.stdout.write(f"✔ {tipo_tercero_code} / {persona_type} -> {count_local} documentos procesados")

                # Limpieza de obsoletos
                # Borramos todo lo que NO esté en valid_ids
                total_before = DocumentoRequerido.objects.count()
                deleted_info = DocumentoRequerido.objects.exclude(id__in=valid_ids).delete()
                deleted_count = deleted_info[0]

                self.stdout.write("------------------------------------------------")
                self.stdout.write(f"Resumen de Operación:")
                self.stdout.write(f"Total procesados (validos): {len(valid_ids)}")
                self.stdout.write(f"Nuevos creados: {created_count}")
                self.stdout.write(f"Existentes mantenidos: {skipped_count}")
                self.stdout.write(f"Eliminados (obsoletos/duplicados/ambas): {deleted_count}")
                self.stdout.write(f"Total final en DB: {DocumentoRequerido.objects.count()}")

        except Exception as e:
             self.stdout.write(self.style.ERROR(f"Error crítico durante la ejecución: {str(e)}"))
             raise e
