"""
Comando de diagnóstico para probar la configuración de email.

Uso:
    python manage.py test_email --to tu@correo.com
"""
from django.core.management.base import BaseCommand
from django.core.mail import send_mail
from django.conf import settings


class Command(BaseCommand):
    help = "Envía un correo de prueba para verificar la configuración SMTP"

    def add_arguments(self, parser):
        parser.add_argument(
            "--to",
            type=str,
            default=None,
            help="Dirección de destino (por defecto usa EMAIL_HOST_USER)",
        )

    def handle(self, *args, **options):
        destinatario = options["to"] or settings.EMAIL_HOST_USER

        self.stdout.write("\n=== Configuración de email cargada ===")
        self.stdout.write(f"  BACKEND  : {settings.EMAIL_BACKEND}")
        self.stdout.write(f"  HOST     : {settings.EMAIL_HOST}:{settings.EMAIL_PORT}")
        self.stdout.write(f"  TLS      : {settings.EMAIL_USE_TLS}")
        self.stdout.write(f"  USER     : {settings.EMAIL_HOST_USER}")
        self.stdout.write(f"  PASSWORD : {'*' * len(settings.EMAIL_HOST_PASSWORD)} ({len(settings.EMAIL_HOST_PASSWORD)} chars)")
        self.stdout.write(f"  FROM     : {settings.DEFAULT_FROM_EMAIL}")
        self.stdout.write(f"  DESTINO  : {destinatario}")
        self.stdout.write("=====================================\n")

        try:
            send_mail(
                subject="[GRAPP] Prueba de configuración SMTP",
                message="Este es un correo de prueba enviado desde GRAPP. Si lo recibes, la configuración SMTP está correcta.",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[destinatario],
                fail_silently=False,
            )
            self.stdout.write(self.style.SUCCESS(f"✓ Correo enviado exitosamente a {destinatario}"))
        except Exception as exc:
            self.stdout.write(self.style.ERROR(f"✗ Error al enviar: {exc}"))
