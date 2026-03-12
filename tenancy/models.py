from django.db import models


class Empresa(models.Model):
    nombre = models.CharField(max_length=200)
    nit = models.CharField(max_length=30, unique=True)
    activa = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["nombre"]

    def __str__(self):
        return f"{self.nombre} - {self.nit}"


class ContactoEmpresa(models.Model):

    TIPO_CONTACTO = [
        ("RL", "Representante Legal"),
        ("GER", "Gerente"),
        ("TES", "Tesorería"),
        ("CON", "Contabilidad"),
        ("COM", "Comercial"),
        ("OTR", "Otro"),
    ]

    empresa = models.ForeignKey(
        Empresa,
        on_delete=models.CASCADE,
        related_name="contactos"
    )

    nombre = models.CharField(max_length=200)
    cargo = models.CharField(max_length=150, blank=True, null=True)
    tipo = models.CharField(max_length=3, choices=TIPO_CONTACTO)

    email = models.EmailField(blank=True, null=True)
    telefono = models.CharField(max_length=30, blank=True, null=True)

    principal = models.BooleanField(default=False)
    activo = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["empresa", "tipo", "nombre"]
        verbose_name = "Contacto de Empresa"
        verbose_name_plural = "Contactos de Empresa"

    def __str__(self):
        return f"{self.nombre} - {self.get_tipo_display()}"
