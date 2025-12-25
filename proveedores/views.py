from django.shortcuts import render
from django.utils import timezone
from django.shortcuts import render, get_object_or_404      
from .models import InvitacionRadicacion
from .forms import RadicarCuentaCobroForm
# Create your views here
def radicar_cuenta(request, token):
    inv = get_object_or_404(
        InvitacionRadicacion,
        token=token,
        estado=InvitacionRadicacion.Estado.PENDIENTE,
    )

    if request.method == "POST":
        form = RadicarCuentaCobroForm(
            request.POST, request.FILES,
            proveedor=inv.proveedor,
            empresa=inv.empresa
        )
        if form.is_valid():
            form.save()
            inv.estado = InvitacionRadicacion.Estado.USADA
            inv.used_at = timezone.now()
            inv.save()
            return render(request, "proveedores/radicacion_exitosa.html")
    else:
        form = RadicarCuentaCobroForm(proveedor=inv.proveedor, empresa=inv.empresa)

    return render(request, "proveedores/radicar_cuenta.html", {
        "form": form,
        "proveedor": inv.proveedor,
        "email": inv.email,
        "empresa": inv.empresa,
    })