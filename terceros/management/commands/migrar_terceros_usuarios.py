from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from terceros.models import Tercero, TokenActivacionTercero
from proveedores.models import InvitacionRadicacion
from django.db import transaction

class Command(BaseCommand):
    help = 'Migra terceros aprobados antiguos sin usuario asociado a nuevos usuarios y expira las invitaciones de radicación.'

    def handle(self, *args, **kwargs):
        terceros_sin_usuario = Tercero.objects.filter(estado='APROBADO', usuario__isnull=True)
        count_terceros = terceros_sin_usuario.count()
        
        self.stdout.write(self.style.WARNING(f"Se encontraron {count_terceros} terceros aprobados sin usuario."))
        
        count_migrados = 0
        with transaction.atomic():
            for tercero in terceros_sin_usuario:
                email = tercero.email.lower().strip()
                if not email:
                    self.stdout.write(self.style.ERROR(f"El tercero {tercero.id} no tiene email, saltando..."))
                    continue

                user = User.objects.filter(email=email).first()
                if not user:
                    user = User.objects.create_user(
                        username=email,
                        email=email,
                        password=None,
                        is_active=False
                    )
                
                # Asignar usuario
                tercero.usuario = user
                tercero.save(update_fields=['usuario'])
                
                # Crear token de activación
                TokenActivacionTercero.objects.filter(usuario=user).delete() # Invalidar anteriores si hubiera
                token_obj = TokenActivacionTercero.objects.create(usuario=user)
                
                # Aquí se podría disparar el envío del correo (mock o real)
                # print(f"Token para {email}: {token_obj.token}")
                
                count_migrados += 1
                self.stdout.write(self.style.SUCCESS(f"Migrado y token generado: {tercero.razon_social or tercero.nombre_completo} ({email})"))

            # Invalidar InvitacionRadicacion pendientes
            invitaciones = InvitacionRadicacion.objects.filter(estado=InvitacionRadicacion.Estado.PENDIENTE)
            count_invitaciones = invitaciones.count()
            invitaciones.update(estado=InvitacionRadicacion.Estado.EXPIRADA)
            
            self.stdout.write(self.style.WARNING(f"Se expiraron {count_invitaciones} invitaciones de radicación pendientes."))

        self.stdout.write(self.style.SUCCESS(f"Migración completada. Terceros migrados: {count_migrados}"))
