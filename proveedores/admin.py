from django.contrib import admin
from .models import CuentaCobro, InvitacionRadicacion, CuentaCobroAnexo, TipoAnexo, ConfiguracionRadicacion, ComprobantePago, OrdenCompra, ItemOrdenCompra
from terceros.models import Tercero


class AnexoInline(admin.TabularInline):
    model = CuentaCobroAnexo
    extra = 0
    readonly_fields = ('tipo_anexo', 'descripcion', 'archivo', 'created_at')
    can_delete = False
    fields = ('tipo_anexo', 'descripcion', 'archivo', 'created_at')

class ComprobantePagoInline(admin.TabularInline):
    model = ComprobantePago
    extra = 0

@admin.register(CuentaCobro)
class CuentaCobroAdmin(admin.ModelAdmin):
    list_display = (
        "id", "empresa", "proveedor", "tipo_documento",
        "numero", "periodo", "valor_total", "estado", "created_at"
    )
    list_filter = ("empresa", "estado", "tipo_documento", "periodo")
    search_fields = (
        "numero", "proveedor__documento", "proveedor__razon_social",
        "proveedor__nombre1", "proveedor__apellido1"
    )
    inlines = [AnexoInline, ComprobantePagoInline]

@admin.register(ComprobantePago)
class ComprobantePagoAdmin(admin.ModelAdmin):
    list_display = ("cuenta_cobro", "fecha_pago", "valor_pagado", "referencia", "created_at")
    list_filter = ("fecha_pago",)
    search_fields = ("cuenta_cobro__numero", "referencia")


@admin.register(TipoAnexo)
class TipoAnexoAdmin(admin.ModelAdmin):
    list_display = ("codigo", "nombre", "obligatorio", "aplica_a_persona")
    list_filter = ("obligatorio", "aplica_a_persona")
    search_fields = ("codigo", "nombre")


@admin.register(ConfiguracionRadicacion)
class ConfiguracionRadicacionAdmin(admin.ModelAdmin):
    list_display = ("empresa", "salario_minimo_vigente", "porcentaje_umbral", "porcentaje_minimo_ibc")
    readonly_fields = ("umbral_seguridad_social_display",)

    def umbral_seguridad_social_display(self, obj):
        return f"${obj.umbral_seguridad_social:,.2f} COP"
    umbral_seguridad_social_display.short_description = "Umbral calculado"


class InvitacionRadicacionAdmin(admin.ModelAdmin):
    list_display = ("email", "empresa", "proveedor", "contrato", "estado", "created_at", "token")
    list_filter = ("empresa", "estado", "created_at")
    search_fields = ("email", "proveedor__documento", "proveedor__razon_social", "proveedor__nombre1")
    ordering = ("-created_at",)

    readonly_fields = ("token", "created_at", "used_at")

    fieldsets = (
        (None, {"fields": ("empresa", "proveedor", "contrato", "email", "estado")}),
        ("Acceso", {"fields": ("token", "created_at", "used_at")}),
    )

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "proveedor":
            kwargs["queryset"] = (
                Tercero.objects
                .filter(
                    estado=Tercero.Estado.APROBADO,
                    tipos__code__in=["PROVEEDOR", "CONTRATISTA"],
                )
                .distinct()
                .order_by("razon_social", "nombre1", "apellido1")
            )
        return super().formfield_for_foreignkey(db_field, request, **kwargs)


class ItemOrdenCompraInline(admin.TabularInline):
    model = ItemOrdenCompra
    extra = 1
    fields = ('descripcion', 'cantidad', 'valor_unitario', 'valor_total')
    readonly_fields = ('valor_total',)


@admin.register(OrdenCompra)
class OrdenCompraAdmin(admin.ModelAdmin):
    list_display = ['numero_oc', 'tercero', 'empresa', 'valor_total', 'estado', 'fecha_emision']
    list_filter = ['estado', 'empresa', 'tipo']
    search_fields = ['numero_oc', 'objeto', 'tercero__razon_social', 'tercero__nombre1']
    raw_id_fields = ['tercero', 'empresa', 'contrato', 'created_by']
    inlines = [ItemOrdenCompraInline]