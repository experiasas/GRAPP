from django.contrib import admin
from .models import (
    Contrato, TipoContrato, TipoAnexoContrato,
    PolizaContrato, CondicionContractual,
    OtrosiContrato, FormaPagoContrato,
    ContratoAnexo, ContratoFlujo,
)


@admin.register(TipoContrato)
class TipoContratoAdmin(admin.ModelAdmin):
    list_display = ("nombre", "activo")
    list_filter = ("activo",)
    search_fields = ("nombre",)


@admin.register(TipoAnexoContrato)
class TipoAnexoContratoAdmin(admin.ModelAdmin):
    list_display = ("nombre", "requerido", "activo")
    list_filter = ("requerido", "activo")
    search_fields = ("nombre",)


class PolizaContratoInline(admin.TabularInline):
    model = PolizaContrato
    extra = 0
    fields = ("aseguradora", "numero_poliza", "amparo", "valor_asegurado", "fecha_inicio", "fecha_fin", "estado", "archivo")


class CondicionContractualInline(admin.TabularInline):
    model = CondicionContractual
    extra = 0
    fields = ("orden", "titulo", "contenido")


class OtrosiContratoInline(admin.TabularInline):
    model = OtrosiContrato
    extra = 0
    fields = ("numero", "fecha", "objeto", "nuevo_valor", "nueva_fecha_fin", "archivo")


class FormaPagoContratoInline(admin.TabularInline):
    model = FormaPagoContrato
    extra = 0
    fields = ("orden", "descripcion", "valor", "fecha_estimada", "fecha_pago", "estado")


class ContratoAnexoInline(admin.TabularInline):
    model = ContratoAnexo
    extra = 0
    fields = ("tipo", "descripcion", "archivo")
    readonly_fields = ("created_at",)


class ContratoFlujoInline(admin.TabularInline):
    model = ContratoFlujo
    extra = 0
    fields = ("estado_anterior", "estado_nuevo", "usuario", "observacion", "fecha")
    readonly_fields = ("fecha",)

    def has_add_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(Contrato)
class ContratoAdmin(admin.ModelAdmin):
    list_display = (
        "numero", "empresa", "contratista", "tipo_contrato",
        "valor_total", "estado", "prioridad", "fecha_inicio", "fecha_fin",
    )
    list_filter = ("empresa", "estado", "prioridad", "tipo_contrato", "tiene_otrosi", "tiene_polizas")
    search_fields = ("numero", "objeto", "contratista__documento", "contratista__razon_social")
    date_hierarchy = "fecha_inicio"
    readonly_fields = ("created_at", "updated_at", "dias_restantes")
    inlines = [
        PolizaContratoInline, OtrosiContratoInline, FormaPagoContratoInline,
        CondicionContractualInline, ContratoAnexoInline, ContratoFlujoInline,
    ]
    fieldsets = (
        ("Identificación", {
            "fields": ("empresa", "numero", "tipo_contrato", "objeto", "dependencia_solicitante"),
        }),
        ("Partes", {
            "fields": ("contratista", "tercero_rl", "empresa_rl", "solicitante"),
        }),
        ("Estado y prioridad", {
            "fields": ("estado", "prioridad", "observaciones"),
        }),
        ("Fechas", {
            "fields": ("fecha_solicitud", "fecha_contrato", "fecha_inicio", "fecha_fin",
                       "fecha_fin_otrosi", "dias_restantes"),
        }),
        ("Valor económico", {
            "fields": ("valor_sin_iva", "iva", "valor_total", "valor"),
        }),
        ("Flags", {
            "fields": ("tiene_otrosi", "tiene_polizas"),
        }),
        ("Auditoría", {
            "fields": ("created_by", "created_at", "updated_at"),
            "classes": ("collapse",),
        }),
    )
