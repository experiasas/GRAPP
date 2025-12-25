from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt

from .models import InvitacionVinculacion
from .serializers import InvitacionVinculacionSerializer, TerceroCreateSerializer


@csrf_exempt  # TODO: Implementar autenticación adecuada en producción
@api_view(['GET', 'POST'])
def vinculacion_api(request, token):
    """
    API endpoint para vinculación de terceros.
    
    GET: Retorna datos de la invitación (empresa, email, tipo_tercero)
    POST: Crea el tercero y marca la invitación como usada
    """
    invitacion = get_object_or_404(
        InvitacionVinculacion,
        token=token,
        estado=InvitacionVinculacion.Estado.PENDIENTE
    )
    
    if request.method == 'GET':
        serializer = InvitacionVinculacionSerializer(invitacion)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        serializer = TerceroCreateSerializer(data=request.data)
        if serializer.is_valid():
            # Crear tercero
            tercero = serializer.save(
                empresa=invitacion.empresa,
                estado='PENDIENTE'
            )
            
            # Asignar tipo desde invitación
            tercero.tipos.add(invitacion.tipo_tercero)
            
            # Marcar invitación como usada
            invitacion.estado = InvitacionVinculacion.Estado.USADA
            invitacion.used_at = timezone.now()
            invitacion.save()
            
            return Response({
                'success': True,
                'id': tercero.id,
                'message': 'Tercero registrado exitosamente'
            }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
