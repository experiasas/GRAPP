from django.db import models
from django.utils.crypto import get_random_string
from django.conf import settings
from django.core.exceptions import ValidationError

from django.core.validators import MinValueValidator
from decimal import Decimal
from tenancy.models import Empresa
from terceros.models import Tercero


class EstadoOrdenCompra(models.TextChoices):
    BORRADOR     = 'BORRADOR',     'Borrador'
    EMITIDA      = 'EMITIDA',      'Emitida'
    APROBADA     = 'APROBADA',     'Aprobada'
    EN_EJECUCION = 'EN_EJECUCION', 'En ejecución'
    CUMPLIDA     = 'CUMPLIDA',     'Cumplida'
    ANULADA      = 'ANULADA',      'Anulada'


class TipoOrdenCompra(models.TextChoices):
    COMPRA = 'COMPRA', 'Orden de Compra'


class OrdenCompra(models.Model):
    numero_oc = models.CharField(
        max_length=50, unique=True, blank=True,
        help_text='Ej: OC-2026-0001. Se auto-genera si se deja vacío.'
    )
    tipo = models.CharField(
        max_length=10,
        choices=TipoOrdenCompra.choices,
        default=TipoOrdenCompra.COMPRA
    )
    tercero = models.ForeignKey(
        'terceros.Tercero', on_delete=models.PROTECT,
        related_name='ordenes_compra',
    )
    empresa = models.ForeignKey(
        'tenancy.Empresa', on_delete=models.PROTECT,
        related_name='ordenes_compra',
    )
    contrato = models.ForeignKey(
        'contratos.Contrato', on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='ordenes_compra',
    )
    objeto = models.TextField(help_text='Descripción de los bienes o servicios a adquirir')
    valor_sin_iva = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    iva = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    valor_total = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    fecha_emision = models.DateField()
    fecha_entrega = models.DateField(null=True, blank=True)
    estado = models.CharField(
        max_length=15,
        choices=EstadoOrdenCompra.choices,
        default=EstadoOrdenCompra.BORRADOR
    )
    observaciones = models.TextField(blank=True, default='')
    archivo = models.FileField(
        upload_to='ordenes_compra/%Y/%m/',
        null=True, blank=True,
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='ordenes_compra_creadas'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Orden de Compra'
        verbose_name_plural = 'Órdenes de Compra'

    def __str__(self):
        return f'{self.numero_oc} — {self.tercero}'

    @property
    def valor_radicado(self):
        from django.db.models import Sum
        total = self.cuentas_cobro.exclude(
            estado='BORRADOR'
        ).aggregate(s=Sum('valor_total'))['s']
        return total or 0

    @property
    def valor_pendiente(self):
        return self.valor_total - self.valor_radicado

    @property
    def porcentaje_ejecutado(self):
        if self.valor_total == 0:
            return 0
        return round((float(self.valor_radicado) / float(self.valor_total)) * 100, 1)

    def save(self, *args, **kwargs):
        if not self.numero_oc:
            from django.utils import timezone
            year = timezone.now().year
            prefix = f"OC-{year}"
            last = OrdenCompra.objects.filter(
                numero_oc__startswith=prefix
            ).order_by('-numero_oc').first()
            if last:
                try:
                    seq = int(last.numero_oc.split('-')[-1]) + 1
                except ValueError:
                    seq = 1
            else:
                seq = 1
            self.numero_oc = f"{prefix}-{seq:04d}"
        super().save(*args, **kwargs)


class ItemOrdenCompra(models.Model):
    orden_compra = models.ForeignKey(
        OrdenCompra, on_delete=models.CASCADE,
        related_name='items'
    )
    descripcion = models.CharField(max_length=500)
    cantidad = models.DecimalField(max_digits=12, decimal_places=2, default=1)
    valor_unitario = models.DecimalField(max_digits=18, decimal_places=2)
    valor_total = models.DecimalField(max_digits=18, decimal_places=2, default=0)

    class Meta:
        ordering = ['id']
        verbose_name = 'Ítem de Orden de Compra'

    def save(self, *args, **kwargs):
        self.valor_total = self.cantidad * self.valor_unitario
        super().save(*args, **kwargs)


class CuentaCobro(models.Model):
    class Estado(models.TextChoices):
        BORRADOR = "BORRADOR", "Borrador"
        RADICADA = "RADICADA", "Radicada"
        EN_REVISION = "EN_REVISION", "En revisión"
        APROBADA = "APROBADA", "Aprobada"
        RECHAZADA = "RECHAZADA", "Rechazada"
        PAGADA = "PAGADA", "Pagada"

    class TipoDocumento(models.TextChoices):
        CUENTA_COBRO = "CUENTA_COBRO", "Cuenta de Cobro"
        FACTURA = "FACTURA", "Factura"

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

    orden_compra = models.ForeignKey(
        'OrdenCompra', on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='cuentas_cobro',
        help_text='Orden de compra contra la que se radica'
    )

    # Tipo de documento: inferido desde tipo_persona del tercero
    tipo_documento = models.CharField(
        max_length=20,
        choices=TipoDocumento.choices,
        default=TipoDocumento.CUENTA_COBRO,
        help_text="Persona natural -> Cuenta de Cobro, Persona jurídica -> Factura"
    )

    numero = models.CharField(max_length=50, blank=True, default='')
    periodo = models.CharField(max_length=50)
    concepto = models.TextField()

    # Fecha precisa del mes de servicio para cálculos de acumulado mensual
    mes_servicio_date = models.DateField(
        null=True, blank=True,
        help_text="Primer día del mes del servicio (para cálculo de acumulado)"
    )

    # Financiero
    valor_base = models.DecimalField(max_digits=14, decimal_places=2, validators=[MinValueValidator(0)], default=0)
    iva_porcentaje = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('19.00'),
        help_text="Porcentaje de IVA aplicable. Editable para persona jurídica."
    )
    iva_valor = models.DecimalField(max_digits=14, decimal_places=2, validators=[MinValueValidator(0)], default=0)
    admon = models.DecimalField(max_digits=14, decimal_places=2, validators=[MinValueValidator(0)], default=0)
    imprevistos = models.DecimalField(max_digits=14, decimal_places=2, validators=[MinValueValidator(0)], default=0)
    utilidad = models.DecimalField(max_digits=14, decimal_places=2, validators=[MinValueValidator(0)], default=0)

    # Seguridad social: solo aplica a persona natural
    ibc_valor = models.DecimalField(
        max_digits=14, decimal_places=2, default=0,
        validators=[MinValueValidator(0)],
        help_text="Ingreso Base de Cotización reportado para seguridad social"
    )

    valor_total = models.DecimalField(max_digits=14, decimal_places=2, validators=[MinValueValidator(0)], default=0)

    estado = models.CharField(max_length=20, choices=Estado.choices, default=Estado.BORRADOR)
    observaciones = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("empresa", "proveedor", "numero")

    def clean(self):
        super().clean()

        # Heredar contrato desde la OC si la OC tiene contrato vinculado
        if self.orden_compra_id and self.orden_compra.contrato_id and not self.contrato_id:
            self.contrato = self.orden_compra.contrato

        # Al salir de borrador, debe tener al menos contrato o OC
        if self.estado != self.Estado.BORRADOR:
            if not self.contrato_id and not self.orden_compra_id:
                raise ValidationError(
                    'La radicación debe estar asociada a un contrato o a una orden de compra.'
                )

        # El monto no puede exceder el saldo disponible de la OC
        if self.orden_compra_id and self.valor_total:
            pendiente = self.orden_compra.valor_pendiente
            # Al editar, devolver el valor anterior al saldo para no contarse doble
            if self.pk:
                anterior = CuentaCobro.objects.filter(pk=self.pk).values_list('valor_total', flat=True).first()
                if anterior:
                    pendiente += Decimal(str(anterior))
            if Decimal(str(self.valor_total)) > pendiente:
                raise ValidationError({
                    'valor_total': (
                        f'El valor excede el saldo disponible de la OC '
                        f'(${pendiente:,.0f} disponible de ${self.orden_compra.valor_total:,.0f}).'
                    )
                })

    def recalcular_total(self):
        """Recalcula el valor total sumando todos los componentes."""
        return (self.valor_base + self.iva_valor + self.admon + self.imprevistos + self.utilidad)

    def calcular_iva_desde_porcentaje(self):
        """Calcula el valor del IVA basado en el porcentaje configurado y el valor base."""
        if self.iva_porcentaje and self.valor_base:
            return (self.valor_base * self.iva_porcentaje / Decimal('100')).quantize(Decimal('0.01'))
        return Decimal('0')

    def get_acumulado_mensual(self):
        """
        Calcula el acumulado del proveedor para el mismo periodo de servicio.

        Usa el campo `periodo` (formato YYYY-MM) para identificar el mes.
        Incluye cuentas en estados activos (RADICADA, EN_REVISION, APROBADA,
        PAGADA, RECHAZADA) y excluye la cuenta actual para evitar contar doble.
        Los borradores se excluyen intencionalmente para no inflar el acumulado
        con radicaciones que aun no han sido confirmadas.
        """
        if not self.periodo:
            return Decimal('0')

        ESTADOS_ACTIVOS = [
            self.Estado.RADICADA,
            self.Estado.EN_REVISION,
            self.Estado.APROBADA,
            self.Estado.PAGADA,
            self.Estado.RECHAZADA,
        ]

        from django.db.models import Sum
        total = (
            CuentaCobro.objects
            .filter(
                empresa=self.empresa,
                proveedor=self.proveedor,
                periodo=self.periodo,
                estado__in=ESTADOS_ACTIVOS,
            )
            .exclude(pk=self.pk)
            .aggregate(total=Sum('valor_base'))['total']
        )
        return total or Decimal('0')

class TipoAnexo(models.Model):
    class AplicaPersona(models.TextChoices):
        AMBAS = "AMBAS", "Ambas"
        NATURAL = "NATURAL", "Solo persona natural"
        JURIDICA = "JURIDICA", "Solo persona jurídica"

    codigo = models.CharField(max_length=30, unique=True)
    nombre = models.CharField(max_length=100)
    obligatorio = models.BooleanField(default=False)
    aplica_a_persona = models.CharField(
        max_length=20,
        choices=AplicaPersona.choices,
        default=AplicaPersona.AMBAS,
        help_text="Tipo de persona al que aplica este anexo"
    )

    def __str__(self):
        return f"{self.nombre} ({'Obligatorio' if self.obligatorio else 'Opcional'})"

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
    contrato = models.ForeignKey(
        "contratos.Contrato",
        on_delete=models.PROTECT,
        null=True, blank=True,
        related_name="invitaciones_radicacion",
    )
    
    # Explicit 1:1 relationship to enforce "1 token = 1 draft" rule
    cuenta_cobro = models.OneToOneField(
        CuentaCobro,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='invitacion_origen',
        help_text="Borrador de cuenta de cobro asociado a esta invitación"
    )

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


class ConfiguracionRadicacion(models.Model):
    """
    Configuración por empresa para reglas de radicación.
    Singleton por empresa: una empresa tiene exactamente una configuración.
    """
    empresa = models.OneToOneField(
        Empresa,
        on_delete=models.CASCADE,
        related_name="configuracion_radicacion"
    )
    salario_minimo_vigente = models.DecimalField(
        max_digits=14, decimal_places=2, default=Decimal('1750905.00'),
        help_text="Salario mínimo legal mensual vigente (SMLMV)"
    )
    porcentaje_umbral = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('100.00'),
        help_text="Porcentaje del SMLMV que define el umbral para exigir seguridad social"
    )
    porcentaje_minimo_ibc = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('40.00'),
        help_text="Porcentaje mínimo del ingreso que debe ser el IBC"
    )

    class Meta:
        verbose_name = "Configuración de Radicación"
        verbose_name_plural = "Configuraciones de Radicación"

    def __str__(self):
        return f"Config. Radicación - {self.empresa.nombre}"

    @property
    def umbral_seguridad_social(self):
        """Valor monetario del umbral (ej: 80% del SMLMV)."""
        return (self.salario_minimo_vigente * self.porcentaje_umbral / Decimal('100')).quantize(Decimal('0.01'))

    @classmethod
    def get_for_empresa(cls, empresa):
        """Obtiene o crea la configuración para una empresa."""
        config, _ = cls.objects.get_or_create(empresa=empresa)
        return config


class ComprobantePago(models.Model):
    cuenta_cobro = models.ForeignKey(
        CuentaCobro, 
        on_delete=models.CASCADE, 
        related_name="comprobantes",
        help_text="Cuenta de cobro asociada a este comprobante"
    )
    archivo = models.FileField(upload_to="cuentas_cobro/comprobantes/")
    fecha_pago = models.DateField()
    valor_pagado = models.DecimalField(max_digits=14, decimal_places=2, validators=[MinValueValidator(0)])
    referencia = models.CharField(max_length=100, blank=True, null=True, help_text="Número de referencia o transacción")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Comprobante de Pago"
        verbose_name_plural = "Comprobantes de Pago"

    def __str__(self):
        return f"Comprobante para {self.cuenta_cobro.numero or self.cuenta_cobro.id} - {self.valor_pagado}"
