from django.core.management.base import BaseCommand
from terceros.models import TipoTercero


class Command(BaseCommand):
    help = 'Inicializa los tipos de tercero base del sistema'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Inicializando tipos de tercero...'))
        
        tipos_datos = [
            ('CLIENTE', 'Cliente'),
            ('PROVEEDOR', 'Proveedor'),
            ('CONTRATISTA', 'Contratista'),
            ('EMPLEADO', 'Empleado'),
            ('SOCIO', 'Socio'),
            ('ASPIRANTE', 'Aspirante'),
        ]
        
        creados = 0
        for code, nombre in tipos_datos:
            tipo, created = TipoTercero.objects.get_or_create(
                code=code,
                defaults={'nombre': nombre}
            )
            if created:
                creados += 1
                self.stdout.write(f'  ✓ Creado: {nombre}')
            else:
                self.stdout.write(f'  - Ya existe: {nombre}')
        
        self.stdout.write(self.style.SUCCESS(f'\n✅ Proceso completado: {creados} nuevos, {len(tipos_datos) - creados} existentes'))
