from django.db import models
from django.utils.crypto import get_random_string

from django.core.validators import MinValueValidator
from tenancy.models import Empresa
from terceros.models import Tercero


class CuentaCobro(models.Model):
    class Estado(models.TextChoices):
        BORRADOR = "BORRADOR", "Borrador"
        RADICADA = "RADICADA", "Radicada"
        EN_REVISION = "EN_REVISION", "En revisión"
        APROBADA = "APROBADA", "Aprobada"
        RECHAZADA = "RECHAZADA", "Rechazada"
        PAGADA = "PAGADA", "Pagada"

    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="cuentas_cobro")
    proveedor = models.ForeignKey(
        Tercero, on_delete=models.PROTECT, related_name="cuentas_cobro",
        limit_choices_to={"estado": "APROBADO", "tipos__code__in": ["PROVEEDOR", "CONTRATISTA"]},
    )

    contrato = models.ForeignKey(
        "contratos.Contrato",
        on_delete=models.PROTECT,
        related_name="cuentas_cobro",
        null=True, blank=True,
    )

    numero = models.CharField(max_length=50)
    periodo = models.CharField(max_length=50)
    concepto = models.TextField()

   
    valor_base = models.DecimalField(max_digits=14, decimal_places=2, validators=[MinValueValidator(0)], default=0)
    iva_valor = models.DecimalField(max_digits=14, decimal_places=2, validators=[MinValueValidator(0)], default=0)
    admon = models.DecimalField(max_digits=14, decimal_places=2, validators=[MinValueValidator(0)], default=0)
    imprevistos = models.DecimalField(max_digits=14, decimal_places=2, validators=[MinValueValidator(0)], default=0)
    utilidad = models.DecimalField(max_digits=14, decimal_places=2, validators=[MinValueValidator(0)], default=0)


    valor_total = models.DecimalField(max_digits=14, decimal_places=2, validators=[MinValueValidator(0)], default=0)

    estado = models.CharField(max_length=20, choices=Estado.choices, default=Estado.BORRADOR)
    observaciones = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("empresa", "proveedor", "numero")

    def recalcular_total(self):
        return (self.valor_base + self.iva_valor + self.admon + self.imprevistos + self.utilidad)

class TipoAnexo(models.Model):
    codigo = models.CharField(max_length=30, unique=True)
    nombre = models.CharField(max_length=100)
    obligatorio = models.BooleanField(default=False)

class CuentaCobroAnexo(models.Model):
    cuenta_cobro = models.ForeignKey(CuentaCobro, on_delete=models.CASCADE, related_name="anexos")
    tipo_anexo = models.ForeignKey(TipoAnexo, on_delete=models.PROTECT)
    descripcion = models.CharField(max_length=255, blank=True)
    archivo = models.FileField(upload_to="cuentas_cobro/anexos/")
    created_at = models.DateTimeField(auto_now_add=True)

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
