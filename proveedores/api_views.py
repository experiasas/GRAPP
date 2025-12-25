from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt

from .models import InvitacionRadicacion
from .serializers import InvitacionRadicacionSerializer, CuentaCobroCreateSerializer


@csrf_exempt  # TODO: Implementar autenticación adecuada en producción
@api_view(['GET', 'POST'])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def radicacion_api(request, token):
    """
    API endpoint para radicación de cuentas de cobro.
    
    GET: Retorna datos de la invitación (empresa, proveedor, email)
    POST: Crea la cuenta de cobro y marca la invitación como usada
    """
    invitacion = get_object_or_404(
        InvitacionRadicacion,
        token=token,
        estado=InvitacionRadicacion.Estado.PENDIENTE
    )
    
    if request.method == 'GET':
        serializer = InvitacionRadicacionSerializer(invitacion)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        serializer = CuentaCobroCreateSerializer(data=request.data)
        if serializer.is_valid():
            # Crear cuenta de cobro
            cuenta = serializer.save(
                empresa=invitacion.empresa,
                proveedor=invitacion.proveedor,
                estado='RADICADA'
            )
            
            # Marcar invitación como usada
            invitacion.estado = InvitacionRadicacion.Estado.USADA
            invitacion.used_at = timezone.now()
            invitacion.save()
            
            return Response({
                'success': True,
                'id': cuenta.id,
                'message': 'Cuenta de cobro radicada exitosamente'
            }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
