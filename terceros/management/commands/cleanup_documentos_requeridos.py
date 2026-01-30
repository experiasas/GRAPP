"""
Management command to clean up legacy DocumentoRequerido and DocumentoTipo records.

This command:
1. Migrates legacy codes to canonical codes (e.g., ACUERDO_CONFIDENCIALIDAD -> NDA)
2. Removes DocumentoRequerido with incorrect aplica_a_persona values
3. Deduplicates DocumentoRequerido records
4. Is idempotent (safe to run multiple times)

Usage:
    python manage.py cleanup_documentos_requeridos [--dry-run]
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Count
from terceros.models import DocumentoTipo, DocumentoRequerido


class Command(BaseCommand):
    help = 'Limpia y normaliza DocumentoTipo y DocumentoRequerido legacy'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Muestra qué cambios se harían sin aplicarlos',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        if dry_run:
            self.stdout.write(self.style.WARNING('🔍 MODO DRY-RUN - No se aplicarán cambios\n'))
        
        stats = {
            'tipos_migrados': 0,
            'tipos_eliminados': 0,
            'requeridos_actualizados': 0,
            'requeridos_eliminados': 0,
            'duplicados_eliminados': 0,
        }
        
        # Paso 1: Migrar códigos legacy a canónicos
        self.stdout.write('\n📋 Paso 1: Migración de códigos legacy\n')
        self._migrate_legacy_codes(dry_run, stats)
        
        # Paso 2: Limpiar aplica_a_persona incorrectos
        self.stdout.write('\n🧹 Paso 2: Limpieza de aplica_a_persona\n')
        self._cleanup_aplica_a_persona(dry_run, stats)
        
        # Paso 3: Eliminar duplicados
        self.stdout.write('\n🔧 Paso 3: Eliminación de duplicados\n')
        self._remove_duplicates(dry_run, stats)
        
        # Resumen
        self.stdout.write('\n' + '='*60)
        self.stdout.write(self.style.SUCCESS('\n✅ RESUMEN DE CAMBIOS\n'))
        self.stdout.write(f"  DocumentoTipo migrados: {stats['tipos_migrados']}")
        self.stdout.write(f"  DocumentoTipo eliminados: {stats['tipos_eliminados']}")
        self.stdout.write(f"  DocumentoRequerido actualizados: {stats['requeridos_actualizados']}")
        self.stdout.write(f"  DocumentoRequerido eliminados: {stats['requeridos_eliminados']}")
        self.stdout.write(f"  Duplicados eliminados: {stats['duplicados_eliminados']}")
        self.stdout.write('='*60 + '\n')
        
        if dry_run:
            self.stdout.write(self.style.WARNING('\n⚠️  Ejecuta sin --dry-run para aplicar los cambios'))

    def _migrate_legacy_codes(self, dry_run, stats):
        """Migra códigos legacy a canónicos"""
        
        # Mapa de códigos legacy -> canónico
        LEGACY_TO_CANONICAL = {
            'ACUERDO_CONFIDENCIALIDAD': 'NDA',
            'DECLARACION_ORIGEN_FONDOS': 'DOF',
            'ESTADOS_FINANCIEROS': 'EEFF',
        }
        
        for legacy_code, canonical_code in LEGACY_TO_CANONICAL.items():
            try:
                legacy_tipo = DocumentoTipo.objects.get(code=legacy_code)
                canonical_tipo = DocumentoTipo.objects.get(code=canonical_code)
                
                # Contar DocumentoRequerido que usan el legacy
                count = DocumentoRequerido.objects.filter(documento_tipo=legacy_tipo).count()
                
                if count > 0:
                    self.stdout.write(f'  🔄 {legacy_code} -> {canonical_code}: {count} registros')
                    
                    if not dry_run:
                        # Actualizar todos los DocumentoRequerido
                        DocumentoRequerido.objects.filter(
                            documento_tipo=legacy_tipo
                        ).update(documento_tipo=canonical_tipo)
                        
                        stats['requeridos_actualizados'] += count
                        stats['tipos_migrados'] += 1
                    
                    # Eliminar DocumentoTipo legacy si ya no se usa
                    if not dry_run:
                        legacy_tipo.delete()
                        stats['tipos_eliminados'] += 1
                        self.stdout.write(self.style.SUCCESS(f'    ✓ DocumentoTipo {legacy_code} eliminado'))
                        
            except DocumentoTipo.DoesNotExist:
                if legacy_code in [dt.code for dt in DocumentoTipo.objects.all()]:
                    self.stdout.write(self.style.WARNING(f'  ⚠️  {legacy_code} existe pero falta canónico {canonical_code}'))
                # Si no existe legacy, no hay nada que migrar
                continue

    def _cleanup_aplica_a_persona(self, dry_run, stats):
        """Elimina DocumentoRequerido con aplica_a_persona incorrectos"""
        
        # Documentos que SOLO aplican a JURIDICA (nunca AMBAS o NATURAL)
        JURIDICA_ONLY = {
            'CAMARA_COMERCIO': 'Cámara de Comercio',
            'CEDULA_RL': 'Cédula Representante Legal',
            'EEFF': 'Estados Financieros',
        }
        
        for code, nombre in JURIDICA_ONLY.items():
            try:
                doc_tipo = DocumentoTipo.objects.get(code=code)
                
                # Eliminar registros con AMBAS (deberían ser solo JURIDICA)
                ambas_reqs = DocumentoRequerido.objects.filter(
                    documento_tipo=doc_tipo,
                    aplica_a_persona=DocumentoRequerido.AplicaPersona.AMBAS
                )
                
                count_ambas = ambas_reqs.count()
                if count_ambas > 0:
                    self.stdout.write(f'  🗑️  {code}: eliminando {count_ambas} registros AMBAS (debe ser solo JURIDICA)')
                    
                    if not dry_run:
                        ambas_reqs.delete()
                        stats['requeridos_eliminados'] += count_ambas
                
                # Eliminar registros con NATURAL (nunca debería existir)
                natural_reqs = DocumentoRequerido.objects.filter(
                    documento_tipo=doc_tipo,
                    aplica_a_persona=DocumentoRequerido.AplicaPersona.NATURAL
                )
                
                count_natural = natural_reqs.count()
                if count_natural > 0:
                    self.stdout.write(f'  🗑️  {code}: eliminando {count_natural} registros NATURAL (debe ser solo JURIDICA)')
                    
                    if not dry_run:
                        natural_reqs.delete()
                        stats['requeridos_eliminados'] += count_natural
                        
            except DocumentoTipo.DoesNotExist:
                continue
        
        # Documentos que SÍ aplican a AMBOS: dejar solo AMBAS, eliminar redundantes NATURAL/JURIDICA
        APPLIES_TO_BOTH = {
            'RUT': 'RUT',
            'NDA': 'Acuerdo de Confidencialidad',
            'TRATAMIENTO_DATOS': 'Tratamiento de Datos',
            'DOF': 'Declaración Origen de Fondos',
        }
        
        for code, nombre in APPLIES_TO_BOTH.items():
            try:
                doc_tipo = DocumentoTipo.objects.get(code=code)
                
                # Para cada tipo_tercero, verificar si hay AMBAS
                for tipo_tercero_code in ['CLIENTE', 'PROVEEDOR', 'CONTRATISTA', 'EMPLEADO', 'SOCIO', 'ASPIRANTE']:
                    from terceros.models import TipoTercero
                    try:
                        tipo_tercero = TipoTercero.objects.get(code=tipo_tercero_code)
                        
                        ambas_exists = DocumentoRequerido.objects.filter(
                            tipo_tercero=tipo_tercero,
                            documento_tipo=doc_tipo,
                            aplica_a_persona=DocumentoRequerido.AplicaPersona.AMBAS
                        ).exists()
                        
                        if ambas_exists:
                            # Eliminar NATURAL y JURIDICA redundantes
                            redundantes = DocumentoRequerido.objects.filter(
                                tipo_tercero=tipo_tercero,
                                documento_tipo=doc_tipo,
                                aplica_a_persona__in=[
                                    DocumentoRequerido.AplicaPersona.NATURAL,
                                    DocumentoRequerido.AplicaPersona.JURIDICA
                                ]
                            )
                            
                            count_redundantes = redundantes.count()
                            if count_redundantes > 0:
                                self.stdout.write(
                                    f'  🗑️  {code} ({tipo_tercero_code}): '
                                    f'eliminando {count_redundantes} redundantes (ya existe AMBAS)'
                                )
                                
                                if not dry_run:
                                    redundantes.delete()
                                    stats['requeridos_eliminados'] += count_redundantes
                                    
                    except TipoTercero.DoesNotExist:
                        continue
                        
            except DocumentoTipo.DoesNotExist:
                continue

    def _remove_duplicates(self, dry_run, stats):
        """Elimina duplicados que violan unique_together"""
        
        # Buscar duplicados por (tipo_tercero, documento_tipo, aplica_a_persona)
        duplicates = DocumentoRequerido.objects.values(
            'tipo_tercero', 'documento_tipo', 'aplica_a_persona'
        ).annotate(
            count=Count('id')
        ).filter(count__gt=1)
        
        for dup in duplicates:
            # Obtener todos los registros duplicados
            dup_reqs = DocumentoRequerido.objects.filter(
                tipo_tercero_id=dup['tipo_tercero'],
                documento_tipo_id=dup['documento_tipo'],
                aplica_a_persona=dup['aplica_a_persona']
            ).order_by('id')
            
            # Mantener el primero, eliminar el resto
            to_keep = dup_reqs.first()
            to_delete = dup_reqs.exclude(id=to_keep.id)
            
            count = to_delete.count()
            if count > 0:
                self.stdout.write(
                    f'  🔧 Duplicado encontrado: '
                    f'{to_keep.documento_tipo.code} / {to_keep.aplica_a_persona} - '
                    f'eliminando {count} copia(s)'
                )
                
                if not dry_run:
                    to_delete.delete()
                    stats['duplicados_eliminados'] += count
