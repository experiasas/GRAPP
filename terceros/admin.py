from django.contrib import admin

# Register your models here.
from .models import (
    TipoTercero, Tercero, TerceroTipo,
    DocumentoTipo, DocumentoRequerido, DocumentoTercero,
    Estudio, Curso, Certificacion, ExperienciaLaboral,
    Idioma, TerceroIdioma, SeguridadSocial,
    SolicitudActualizacionTercero , InvitacionVinculacion
)

admin.site.register(TipoTercero)
admin.site.register(TerceroTipo)
admin.site.register(DocumentoTipo)
admin.site.register(DocumentoRequerido)
admin.site.register(DocumentoTercero)

admin.site.register(Estudio)
admin.site.register(Curso)
admin.site.register(Certificacion)
admin.site.register(ExperienciaLaboral)

admin.site.register(Idioma)
admin.site.register(TerceroIdioma)
admin.site.register(SeguridadSocial)

admin.site.register(SolicitudActualizacionTercero)

@admin.register(InvitacionVinculacion)
class InvitacionVinculacionAdmin(admin.ModelAdmin):
    list_display = ("email", "empresa", "tipo_tercero", "estado", "created_at")
    readonly_fields = ("token", "created_at", "used_at")

    fieldsets = (
        (None, {
            "fields": ("empresa", "email", "tipo_tercero", "estado")
        }),
        ("Acceso", {
            "fields": ("token", "created_at", "used_at")
        }),
    )

class TerceroTipoInline(admin.TabularInline):
    model = TerceroTipo
    extra = 1  # cuántas filas vacías muestra

@admin.register(Tercero)
class TerceroAdmin(admin.ModelAdmin):
    inlines = [TerceroTipoInline]
    list_display = (
        "id",
        "empresa",
        "nombre_mostrar",
        "tipo_persona",
        "tipo_doc",
        "documento",
        "estado",
    )
    search_fields = (
        "documento",
        "razon_social",
        "nombre1",
        "apellido1",
        "email",
    )
    list_filter = (
        "estado",
        "tipo_persona",
        "empresa",
    )
