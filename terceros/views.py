
# Create your views here.
from django.shortcuts import render, get_object_or_404, redirect
from django.http import HttpResponseForbidden
from django.utils import timezone

from .models import InvitacionVinculacion
from .forms import VinculacionTerceroForm


def formulario_vinculacion(request, token):
    invitacion = get_object_or_404(
        InvitacionVinculacion,
        token=token,
        estado=InvitacionVinculacion.Estado.PENDIENTE
    )

    if request.method == "POST":
        form = VinculacionTerceroForm(request.POST)
        if form.is_valid():
            tercero = form.save(empresa=invitacion.empresa)

            #  Tipo bloqueado por invitación
            tercero.tipos.add(invitacion.tipo_tercero)

            # Marcar invitación como usada
            invitacion.estado = InvitacionVinculacion.Estado.USADA
            invitacion.used_at = timezone.now()
            invitacion.save()

            return render(request, "terceros/vinculacion_exitosa.html")
    else:
        form = VinculacionTerceroForm()

    return render(request, "terceros/vinculacion_form.html", {
        "form": form,
        "email": invitacion.email,
        "tipo_tercero": invitacion.tipo_tercero,  # para mostrar en UI
    })