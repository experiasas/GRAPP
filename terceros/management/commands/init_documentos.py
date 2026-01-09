from django.core.management.base import BaseCommand
from terceros.models import TipoTercero, DocumentoTipo, DocumentoRequerido


class Command(BaseCommand):
    help = 'Inicializa los tipos de documentos y documentos requeridos por tipo de tercero'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Iniciando carga de documentos...'))
        
        # ===================================
        # 1. Crear DocumentoTipo
        # ===================================
        documentos_datos = [
            ('RUT', 'RUT'),
            ('CAMARA_COMERCIO', 'Cámara y Comercio'),
            ('CEDULA_RL', 'Cédula Representante Legal'),
            ('CEDULA', 'Cédula'),
            ('ESTADOS_FINANCIEROS', 'Estados Financieros'),
            ('ACUERDO_CONFIDENCIALIDAD', 'Acuerdo de Confidencialidad'),
            ('TRATAMIENTO_DATOS', 'Tratamiento de Datos'),
            ('DECLARACION_ORIGEN_FONDOS', 'Declaración de Origen de Fondos'),
            ('CERTIFICACION_BANCARIA', 'Certificación Bancaria'),
            ('SEGURIDAD_SOCIAL', 'Seguridad Social'),
        ]
        
        documentos_creados = 0
        for code, nombre in documentos_datos:
            doc_tipo, created = DocumentoTipo.objects.get_or_create(
                code=code,
                defaults={'nombre': nombre}
            )
            if created:
                documentos_creados += 1
                self.stdout.write(f'  ✓ Creado DocumentoTipo: {nombre}')
        
        self.stdout.write(self.style.SUCCESS(f'\nDocumentoTipo: {documentos_creados} nuevos, {len(documentos_datos) - documentos_creados} existentes\n'))
        
        # ===================================
        # 2. Crear DocumentoRequerido por TipoTercero
        # ===================================
        
        # Obtener referencias a DocumentoTipo
        rut = DocumentoTipo.objects.get(code='RUT')
        camara = DocumentoTipo.objects.get(code='CAMARA_COMERCIO')
        cedula_rl = DocumentoTipo.objects.get(code='CEDULA_RL')
        cedula = DocumentoTipo.objects.get(code='CEDULA')
        eeff = DocumentoTipo.objects.get(code='ESTADOS_FINANCIEROS')
        nda = DocumentoTipo.objects.get(code='ACUERDO_CONFIDENCIALIDAD')
        tratamiento = DocumentoTipo.objects.get(code='TRATAMIENTO_DATOS')
        dof = DocumentoTipo.objects.get(code='DECLARACION_ORIGEN_FONDOS')
        cert_bancaria = DocumentoTipo.objects.get(code='CERTIFICACION_BANCARIA')
        ss = DocumentoTipo.objects.get(code='SEGURIDAD_SOCIAL')
        
        # Configuración de documentos requeridos por tipo de tercero
        # Formato: (tipo_tercero_code, [(documento_tipo, obligatorio), ...])
        configuracion = {
            'CLIENTE': [
                (rut, True),
                (camara, True),
                (cedula_rl, True),
                (eeff, True),
                (nda, True),
                (tratamiento, True),
                (dof, True),
            ],
            'PROVEEDOR': [
                (rut, True),
                (camara, True),
                (cedula_rl, True),
                (cert_bancaria, True),
                (nda, True),
                (tratamiento, True),
            ],
            'CONTRATISTA': [
                (cedula, True),
                (rut, True),
                (nda, True),
                (tratamiento, True),
                (ss, True),
            ],
            'EMPLEADO': [
                (cedula, True),
                (rut, True),
                (nda, True),
                (tratamiento, True),
                (ss, True),
            ],
            'SOCIO': [
                (cedula, True),
            ],
            'ASPIRANTE': [
                (cedula, True),
                (rut, True),
                (nda, True),
                (tratamiento, True),
                (ss, True),
            ],
        }
        
        requeridos_creados = 0
        for tipo_code, documentos in configuracion.items():
            try:
                tipo_tercero = TipoTercero.objects.get(code=tipo_code)
                self.stdout.write(f'\n{tipo_tercero.nombre}:')
                
                for doc_tipo, obligatorio in documentos:
                    doc_req, created = DocumentoRequerido.objects.get_or_create(
                        tipo_tercero=tipo_tercero,
                        documento_tipo=doc_tipo,
                        defaults={'obligatorio': obligatorio}
                    )
                    if created:
                        requeridos_creados += 1
                        obligatorio_texto = 'obligatorio' if obligatorio else 'opcional'
                        self.stdout.write(f'  ✓ {doc_tipo.nombre} ({obligatorio_texto})')
                    else:
                        # Actualizar obligatorio si cambió
                        if doc_req.obligatorio != obligatorio:
                            doc_req.obligatorio = obligatorio
                            doc_req.save()
                            self.stdout.write(self.style.WARNING(f'  ↻ Actualizado: {doc_tipo.nombre}'))
                        
            except TipoTercero.DoesNotExist:
                self.stdout.write(self.style.ERROR(f'\n⚠ TipoTercero "{tipo_code}" no encontrado. Por favor créelo primero en el admin.'))
        
        self.stdout.write(self.style.SUCCESS(f'\n\n✅ Proceso completado'))
        self.stdout.write(self.style.SUCCESS(f'DocumentoRequerido creados: {requeridos_creados}'))
        self.stdout.write(self.style.SUCCESS('\nEl sistema está listo para vincular terceros con documentos dinámicos.'))
