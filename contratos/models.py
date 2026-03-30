from django.db import models
from django.conf import settings
from django.utils import timezone
from tenancy.models import Empresa
from terceros.models import Tercero


class TipoContrato(models.Model):
    nombre = models.CharField(max_length=100, unique=True)
    descripcion = models.TextField(blank=True)
    activo = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Tipo de contrato"
        verbose_name_plural = "Tipos de contrato"
        ordering = ["nombre"]

    def __str__(self):
        return self.nombre


class TipoAnexoContrato(models.Model):
    nombre = models.CharField(max_length=100, unique=True)
    descripcion = models.TextField(blank=True)
    requerido = models.BooleanField(default=False, help_text="¿Es obligatorio adjuntar este anexo?")
    activo = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Tipo de anexo de contrato"
        verbose_name_plural = "Tipos de anexo de contrato"
        ordering = ["nombre"]

    def __str__(self):
        return self.nombre


class Contrato(models.Model):
    class Estado(models.TextChoices):
        BORRADOR    = "BORRADOR",    "Borrador"
        FIRMADO     = "FIRMADO",     "Firmado"
        VIGENTE     = "VIGENTE",     "Vigente"
        ACTIVO      = "ACTIVO",      "Activo"        # legado — preservado
        SUSPENDIDO  = "SUSPENDIDO",  "Suspendido"
        LIQUIDADO   = "LIQUIDADO",   "Liquidado"
        FINALIZADO  = "FINALIZADO",  "Finalizado"
        ANULADO     = "ANULADO",     "Anulado"

    class Prioridad(models.TextChoices):
        ALTA   = "ALTA",   "Alta"
        MEDIA  = "MEDIA",  "Media"
        BAJA   = "BAJA",   "Baja"

    # ── Relaciones principales ─────────────────────────────────────────────────
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="contratos")
    contratista = models.ForeignKey(
        Tercero,
        on_delete=models.PROTECT,
        related_name="contratos",
        limit_choices_to={"estado": "APROBADO", "tipos__code__in": ["PROVEEDOR", "CONTRATISTA"]},
    )
    tipo_contrato = models.ForeignKey(
        TipoContrato,
        on_delete=models.PROTECT,
        null=True, blank=True,
        related_name="contratos",
    )

    # ── Representantes legales / responsables ──────────────────────────────────
    tercero_rl = models.ForeignKey(
        Tercero,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="contratos_como_rl",
        help_text="Representante legal del contratista",
    )
    empresa_rl = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="contratos_como_rl_empresa",
        help_text="Representante legal de la empresa (usuario interno)",
    )
    solicitante = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="contratos_solicitados",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="contratos_creados",
    )

    # ── Identificación y objeto ────────────────────────────────────────────────
    numero = models.CharField(max_length=50, unique=True)
    objeto = models.TextField(help_text="Objeto/descripción del contrato")
    dependencia_solicitante = models.CharField(max_length=200, blank=True)
    observaciones = models.TextField(blank=True)

    # ── Estado y prioridad ─────────────────────────────────────────────────────
    estado = models.CharField(max_length=20, choices=Estado.choices, default=Estado.BORRADOR)
    prioridad = models.CharField(
        max_length=10, choices=Prioridad.choices, default=Prioridad.MEDIA
    )

    # ── Fechas ─────────────────────────────────────────────────────────────────
    fecha_solicitud = models.DateField(null=True, blank=True)
    fecha_contrato  = models.DateField(null=True, blank=True, help_text="Fecha de firma/formalización")
    fecha_inicio    = models.DateField()
    fecha_fin       = models.DateField(null=True, blank=True)
    fecha_fin_otrosi = models.DateField(null=True, blank=True, help_text="Nueva fecha fin por otrosí")

    # ── Valor económico ────────────────────────────────────────────────────────
    valor           = models.DecimalField(max_digits=18, decimal_places=2, default=0,
                                          help_text="Valor total legado (compatibilidad)")
    valor_sin_iva   = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    iva             = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    valor_total     = models.DecimalField(max_digits=18, decimal_places=2, default=0)

    # ── Flags ──────────────────────────────────────────────────────────────────
    tiene_otrosi  = models.BooleanField(default=False)
    tiene_polizas = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Contrato"
        verbose_name_plural = "Contratos"

    def __str__(self):
        return f"{self.numero} - {self.contratista}"

    @property
    def dias_restantes(self):
        """Días hasta la fecha fin efectiva (otrosí si existe, si no fecha_fin)."""
        fecha = self.fecha_fin_otrosi or self.fecha_fin
        if fecha is None:
            return None
        delta = fecha - timezone.localdate()
        return delta.days


def _poliza_upload(instance, filename):
    return f"contratos/{instance.contrato_id}/polizas/{filename}"


class PolizaContrato(models.Model):
    class Estado(models.TextChoices):
        VIGENTE   = "VIGENTE",   "Vigente"
        VENCIDA   = "VENCIDA",   "Vencida"
        CANCELADA = "CANCELADA", "Cancelada"

    contrato     = models.ForeignKey(Contrato, on_delete=models.CASCADE, related_name="polizas")
    aseguradora  = models.CharField(max_length=200)
    numero_poliza = models.CharField(max_length=100, blank=True)
    amparo       = models.CharField(max_length=200, help_text="Nombre del amparo cubierto")
    valor_asegurado = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    fecha_inicio = models.DateField()
    fecha_fin    = models.DateField()
    estado       = models.CharField(max_length=20, choices=Estado.choices, default=Estado.VIGENTE)
    archivo      = models.FileField(upload_to=_poliza_upload, null=True, blank=True)
    observaciones = models.TextField(blank=True)
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Póliza de contrato"
        verbose_name_plural = "Pólizas de contrato"
        ordering = ["contrato", "fecha_fin"]

    def __str__(self):
        return f"Póliza {self.numero_poliza or self.pk} — {self.amparo}"


class CondicionContractual(models.Model):
    contrato  = models.ForeignKey(Contrato, on_delete=models.CASCADE, related_name="condiciones")
    titulo    = models.CharField(max_length=200)
    contenido = models.TextField()
    orden     = models.PositiveSmallIntegerField(default=0)

    class Meta:
        verbose_name = "Condición contractual"
        verbose_name_plural = "Condiciones contractuales"
        ordering = ["contrato", "orden"]

    def __str__(self):
        return f"{self.contrato.numero} — {self.titulo}"


def _otrosi_upload(instance, filename):
    return f"contratos/{instance.contrato_id}/otrosis/{filename}"


class OtrosiContrato(models.Model):
    contrato         = models.ForeignKey(Contrato, on_delete=models.CASCADE, related_name="otrosis")
    numero           = models.PositiveSmallIntegerField(help_text="Número secuencial del otrosí (1, 2, 3…)")
    fecha            = models.DateField()
    objeto           = models.TextField(help_text="Descripción del otrosí / modificación pactada")
    nuevo_valor      = models.DecimalField(max_digits=18, decimal_places=2, null=True, blank=True,
                                           help_text="Nuevo valor total del contrato (si aplica)")
    nueva_fecha_fin  = models.DateField(null=True, blank=True,
                                        help_text="Nueva fecha de terminación (si aplica)")
    archivo          = models.FileField(upload_to=_otrosi_upload, null=True, blank=True)
    created_at       = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Otrosí de contrato"
        verbose_name_plural = "Otrosíes de contrato"
        ordering = ["contrato", "numero"]
        unique_together = [("contrato", "numero")]

    def __str__(self):
        return f"Otrosí #{self.numero} — {self.contrato.numero}"


class FormaPagoContrato(models.Model):
    class Estado(models.TextChoices):
        PENDIENTE = "PENDIENTE", "Pendiente"
        PAGADO    = "PAGADO",    "Pagado"
        VENCIDO   = "VENCIDO",   "Vencido"
        ANULADO   = "ANULADO",   "Anulado"

    contrato        = models.ForeignKey(Contrato, on_delete=models.CASCADE, related_name="formas_pago")
    descripcion     = models.CharField(max_length=300, help_text="Hito o cuota (ej. 'Anticipo 30%')")
    valor           = models.DecimalField(max_digits=18, decimal_places=2)
    fecha_estimada  = models.DateField(null=True, blank=True)
    fecha_pago      = models.DateField(null=True, blank=True, help_text="Fecha real de pago")
    estado          = models.CharField(max_length=20, choices=Estado.choices, default=Estado.PENDIENTE)
    observaciones   = models.TextField(blank=True)
    orden           = models.PositiveSmallIntegerField(default=0)

    class Meta:
        verbose_name = "Forma de pago"
        verbose_name_plural = "Formas de pago"
        ordering = ["contrato", "orden", "fecha_estimada"]

    def __str__(self):
        return f"{self.contrato.numero} — {self.descripcion}"


def _anexo_upload(instance, filename):
    return f"contratos/{instance.contrato_id}/anexos/{filename}"


class ContratoAnexo(models.Model):
    contrato     = models.ForeignKey(Contrato, on_delete=models.CASCADE, related_name="anexos")
    tipo         = models.ForeignKey(
        TipoAnexoContrato,
        on_delete=models.PROTECT,
        null=True, blank=True,
        related_name="anexos",
    )
    descripcion  = models.CharField(max_length=300, blank=True)
    archivo      = models.FileField(upload_to=_anexo_upload)
    created_by   = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="contratos_anexos_creados",
    )
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Anexo de contrato"
        verbose_name_plural = "Anexos de contrato"
        ordering = ["contrato", "created_at"]

    def __str__(self):
        tipo_str = self.tipo.nombre if self.tipo else "Sin tipo"
        return f"{self.contrato.numero} — {tipo_str}"


class ContratoFlujo(models.Model):
    contrato       = models.ForeignKey(Contrato, on_delete=models.CASCADE, related_name="flujo")
    estado_anterior = models.CharField(max_length=20, choices=Contrato.Estado.choices, blank=True)
    estado_nuevo   = models.CharField(max_length=20, choices=Contrato.Estado.choices)
    usuario        = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="contratos_flujos",
    )
    observacion    = models.TextField(blank=True)
    fecha          = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Flujo de contrato"
        verbose_name_plural = "Flujos de contrato"
        ordering = ["contrato", "fecha"]

    def __str__(self):
        return f"{self.contrato.numero}: {self.estado_anterior} → {self.estado_nuevo}"
