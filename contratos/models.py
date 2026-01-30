from django.db import models
from tenancy.models import Empresa
from terceros.models import Tercero


class Contrato(models.Model):
    """
    Modelo básico de Contrato para referencia desde CuentaCobro.
    TODO: Expandir según necesidades del negocio.
    """
    class Estado(models.TextChoices):
        BORRADOR = "BORRADOR", "Borrador"
        ACTIVO = "ACTIVO", "Activo"
        FINALIZADO = "FINALIZADO", "Finalizado"
        SUSPENDIDO = "SUSPENDIDO", "Suspendido"

    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="contratos")
    contratista = models.ForeignKey(
        Tercero,
        on_delete=models.PROTECT,
        related_name="contratos",
        limit_choices_to={"estado": "APROBADO", "tipos__code__in": ["PROVEEDOR", "CONTRATISTA"]},
    )

    numero = models.CharField(max_length=50, unique=True)
    objeto = models.TextField(help_text="Objeto/descripción del contrato")
    valor = models.DecimalField(max_digits=14, decimal_places=2)
    estado = models.CharField(max_length=20, choices=Estado.choices, default=Estado.BORRADOR)

    fecha_inicio = models.DateField()
    fecha_fin = models.DateField()

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.numero} - {self.contratista}"
