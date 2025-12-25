from django.db import models
from django.utils.crypto import get_random_string

from django.core.validators import MinValueValidator
from tenancy.models import Empresa
from terceros.models import Tercero

class CuentaCobro(models.Model):
    class Estado(models.TextChoices):
        RADICADA = "RADICADA", "Radicada"
        EN_REVISION = "EN_REVISION", "En revisión"
        APROBADA = "APROBADA", "Aprobada"
        RECHAZADA = "RECHAZADA", "Rechazada"
        PAGADA = "PAGADA", "Pagada"

    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="cuentas_cobro")
    proveedor = models.ForeignKey(
    Tercero,
    on_delete=models.PROTECT,
    related_name="cuentas_cobro",
    limit_choices_to={
        "estado": "APROBADO",
        "tipos__code__in": ["PROVEEDOR", "CONTRATISTA"],
    },
    )

    numero = models.CharField(max_length=50, help_text="Consecutivo o referencia de la cuenta de cobro.")
    periodo = models.CharField(max_length=50, help_text="Ej: 2025-12, Noviembre 2025, etc.")
    concepto = models.TextField()
    valor = models.DecimalField(max_digits=14, decimal_places=2, validators=[MinValueValidator(0)])

    soporte = models.FileField(upload_to="cuentas_cobro/", blank=True, null=True)

    estado = models.CharField(max_length=20, choices=Estado.choices, default=Estado.RADICADA)
    observaciones = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("empresa", "proveedor", "numero")

    def __str__(self):
        return f"{self.numero} - {self.proveedor} - {self.valor}"

class InvitacionRadicacion(models.Model):
    class Estado(models.TextChoices):
        PENDIENTE = "PENDIENTE", "Pendiente"
        USADA = "USADA", "Usada"
        EXPIRADA = "EXPIRADA", "Expirada"

    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE)
    proveedor = models.ForeignKey(
        Tercero,
        on_delete=models.PROTECT,
        limit_choices_to={"estado": "APROBADO", "tipos__code__in": ["PROVEEDOR", "CONTRATISTA"]},
    )
    email = models.EmailField()

    estado = models.CharField(max_length=20, choices=Estado.choices, default=Estado.PENDIENTE)
    token = models.CharField(max_length=64, unique=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    used_at = models.DateTimeField(null=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.token:
            self.token = get_random_string(48)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.email} ({self.estado})"
