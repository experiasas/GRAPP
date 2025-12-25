from django import forms
from .models import Tercero, TipoTercero

class VinculacionTerceroForm(forms.ModelForm):
    
    class Meta:
        model = Tercero
        fields = [
            "tipo_persona",
            "tipo_doc",
            "documento",
            "razon_social",
            "nombre1",
            "nombre2",
            "apellido1",
            "apellido2",
            "email",
            "telefono",
            "direccion",
            "ciudad",
        ]

    def save(self, empresa, commit=True):
        tercero = super().save(commit=False)
        tercero.empresa = empresa
        tercero.estado = Tercero.Estado.PENDIENTE
        if commit:
            tercero.save()
        return tercero
