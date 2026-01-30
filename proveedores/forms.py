from django import forms
from .models import CuentaCobro
from terceros.models import Tercero

class RadicarCuentaCobroForm(forms.ModelForm):
    """
    LEGACY FORM - kept for backward compatibility with template-based views.
    New wizard flow should use DRF serializers instead.
    """
    class Meta:
        model = CuentaCobro
        fields = ["numero", "periodo", "concepto", "valor_base"]

    def __init__(self, *args, proveedor=None, empresa=None, **kwargs):
        super().__init__(*args, **kwargs)
        self._proveedor = proveedor
        self._empresa = empresa

    def clean(self):
        cleaned = super().clean()
        # Validación dura (seguridad)
        if not self._proveedor:
            raise forms.ValidationError("Proveedor no válido.")
        if self._proveedor.estado != "APROBADO":
            raise forms.ValidationError("El proveedor aún no está aprobado.")
        if not self._proveedor.tipos.filter(code__in=["PROVEEDOR", "CONTRATISTA"]).exists():
            raise forms.ValidationError("Este tercero no es proveedor/contratista.")
        return cleaned

    def save(self, commit=True):
        obj = super().save(commit=False)
        obj.proveedor = self._proveedor
        obj.empresa = self._empresa
        obj.valor_total = obj.recalcular_total()
        obj.estado = CuentaCobro.Estado.RADICADA
        if commit:
            obj.save()
        return obj