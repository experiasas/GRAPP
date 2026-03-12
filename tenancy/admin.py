from django.contrib import admin
from .models import Empresa, ContactoEmpresa


@admin.register(Empresa)
class EmpresaAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'nit', 'activa', 'created_at')
    list_filter = ('activa', 'created_at')
    search_fields = ('nombre', 'nit')
    ordering = ('nombre',)


@admin.register(ContactoEmpresa)
class ContactoEmpresaAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'empresa', 'tipo', 'cargo', 'email', 'telefono', 'principal', 'activo')
    list_filter = ('empresa', 'tipo', 'principal', 'activo', 'created_at')
    search_fields = ('nombre', 'cargo', 'email', 'telefono', 'empresa__nombre')
    ordering = ('empresa', 'tipo', 'nombre')
    
    fieldsets = (
        ('Información Básica', {
            'fields': ('empresa', 'nombre', 'cargo', 'tipo')
        }),
        ('Información de Contacto', {
            'fields': ('email', 'telefono')
        }),
        ('Estado', {
            'fields': ('principal', 'activo')
        }),
        ('Fechas', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ('created_at', 'updated_at')