from django.core.management.base import BaseCommand
from proveedores.models import TipoAnexo


class Command(BaseCommand):
    help = 'Inicializa tipos de anexo para cuentas de cobro'

    def handle(self, *args, **options):
        tipos_anexo = [
            {
                'codigo': 'CUENTA_COBRO',
                'nombre': 'Cuenta de Cobro',
                'obligatorio': True,
            },
            {
                'codigo': 'FACTURA',
                'nombre': 'Factura',
                'obligatorio': False,
            },
            {
                'codigo': 'INFORME_ACTIVIDADES',
                'nombre': 'Informe de Actividades',
                'obligatorio': True,
            },
            {
                'codigo': 'CERTIFICADO_BANCARIO',
                'nombre': 'Certificado Bancario',
                'obligatorio': False,
            },
            {
                'codigo': 'RUT',
                'nombre': 'RUT Actualizado',
                'obligatorio': False,
            },
            {
                'codigo': 'SEGURIDAD_SOCIAL',
                'nombre': 'Planilla de Seguridad Social',
                'obligatorio': True,
            },
            {
                'codigo': 'OTRO',
                'nombre': 'Otro Documento',
                'obligatorio': False,
            },
        ]

        created = 0
        updated = 0

        for tipo_data in tipos_anexo:
            tipo, was_created = TipoAnexo.objects.update_or_create(
                codigo=tipo_data['codigo'],
                defaults={
                    'nombre': tipo_data['nombre'],
                    'obligatorio': tipo_data['obligatorio'],
                }
            )
            if was_created:
                created += 1
                self.stdout.write(
                    self.style.SUCCESS(f'[+] Creado: {tipo.codigo} - {tipo.nombre}')
                )
            else:
                updated += 1
                self.stdout.write(
                    self.style.WARNING(f'[~] Actualizado: {tipo.codigo} - {tipo.nombre}')
                )

        self.stdout.write(
            self.style.SUCCESS(
                f'\n[OK] Proceso completado: {created} creados, {updated} actualizados'
            )
        )
