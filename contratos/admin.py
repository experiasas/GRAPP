from django.contrib import admin
from .models import Contrato


@admin.register(Contrato)
class ContratoAdmin(admin.ModelAdmin):
    list_display = ("numero", "empresa", "contratista", "valor", "estado", "fecha_inicio", "fecha_fin")
    list_filter = ("empresa", "estado", "fecha_inicio")
    search_fields = ("numero", "objeto", "contratista__documento", "contratista__razon_social")
    date_hierarchy = "fecha_inicio"
