from django.core.management.base import BaseCommand
from terceros.models import Idioma

class Command(BaseCommand):
    help = 'Inicializa el catálogo de idiomas si está vacío'

    def handle(self, *args, **options):
        initial_idiomas = [
            {'code': 'ES', 'nombre': 'Español'},
            {'code': 'EN', 'nombre': 'Inglés'},
            {'code': 'PT', 'nombre': 'Portugués'},
            {'code': 'FR', 'nombre': 'Francés'},
            {'code': 'DE', 'nombre': 'Alemán'},
            {'code': 'IT', 'nombre': 'Italiano'},
            {'code': 'ZH', 'nombre': 'Chino Mandarín'},
            {'code': 'JA', 'nombre': 'Japonés'},
            {'code': 'RU', 'nombre': 'Ruso'},
            {'code': 'AR', 'nombre': 'Árabe'},
        ]

        created_count = 0
        for data in initial_idiomas:
            obj, created = Idioma.objects.get_or_create(
                code=data['code'],
                defaults={'nombre': data['nombre']}
            )
            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f"Idioma creado: {data['nombre']}"))
            else:
                if obj.nombre != data['nombre']:
                    obj.nombre = data['nombre']
                    obj.save()
                    self.stdout.write(self.style.WARNING(f"Idioma actualizado: {data['nombre']}"))

        if created_count > 0:
            self.stdout.write(self.style.SUCCESS(f'Se crearon {created_count} idiomas nuevos'))
        else:
            self.stdout.write(self.style.SUCCESS('No se crearon nuevos idiomas. Catálogo actualizado.'))
