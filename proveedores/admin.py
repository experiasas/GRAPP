from django.contrib import admin
from .models import CuentaCobro, InvitacionRadicacion

# Register your models here.
@admin.register(CuentaCobro)
class CuentaCobroAdmin(admin.ModelAdmin):
    list_display = ("id", "empresa", "proveedor", "numero", "periodo", "valor", "estado", "created_at")
    list_filter = ("empresa", "estado", "periodo")
    search_fields = ("numero", "proveedor__documento", "proveedor__razon_social", "proveedor__nombre1", "proveedor__apellido1")


@admin.register(InvitacionRadicacion)
class InvitacionRadicacionAdmin(admin.ModelAdmin):
    list_display = ("email", "empresa", "proveedor", "estado", "created_at", "token")
    list_filter = ("empresa", "estado", "created_at")
    search_fields = ("email", "proveedor__documento", "proveedor__razon_social", "proveedor__nombre1")
    ordering = ("-created_at",)

    readonly_fields = ("token", "created_at", "used_at")

    fieldsets = (
        (None, {"fields": ("empresa", "proveedor", "email", "estado")}),
        ("Acceso", {"fields": ("token", "created_at", "used_at")}),
    )