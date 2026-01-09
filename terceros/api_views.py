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
            
            # Crear placeholders de DocumentoTercero para todos los documentos requeridos
            from .models import DocumentoRequerido, DocumentoTercero, DocumentoTipo
            documentos_requeridos = DocumentoRequerido.objects.filter(
                tipo_tercero=invitacion.tipo_tercero
            ).select_related('documento_tipo')
            
            for doc_req in documentos_requeridos:
                DocumentoTercero.objects.create(
                    empresa=invitacion.empresa,
                    tercero=tercero,
                    documento_tipo=doc_req.documento_tipo,
                    estado=DocumentoTercero.Estado.PENDIENTE
                )
            
            # Marcar invitación como usada
            invitacion.estado = InvitacionVinculacion.Estado.USADA
            invitacion.used_at = timezone.now()
            invitacion.save()
            
            return Response({
                'success': True,
                'tercero_id': tercero.id,
                'message': 'Tercero registrado exitosamente'
            }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@csrf_exempt
@api_view(['POST'])
def upload_documento(request, tercero_id, documento_tipo_code):
    """
    Upload a single document file for a tercero.
    
    POST /api/terceros/<tercero_id>/documentos/<documento_tipo_code>/upload
    """
    from .models import Tercero, DocumentoTipo, DocumentoTercero
    
    # Validar que existe el tercero
    tercero = get_object_or_404(Tercero, id=tercero_id)
    
    # Validar que existe el tipo de documento
    documento_tipo = get_object_or_404(DocumentoTipo, code=documento_tipo_code)
    
    # Buscar el DocumentoTercero (placeholder)
    try:
        doc_tercero = DocumentoTercero.objects.get(
            tercero=tercero,
            documento_tipo=documento_tipo
        )
    except DocumentoTercero.DoesNotExist:
        return Response({
            'error': f'No se encontró el documento requerido {documento_tipo_code} para este tercero'
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Validar que se envió un archivo
    if 'archivo' not in request.FILES:
        return Response({
            'error': 'No se recibió ningún archivo'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Guardar el archivo
    doc_tercero.archivo = request.FILES['archivo']
    doc_tercero.estado = DocumentoTercero.Estado.CARGADO
    doc_tercero.save()
    
    return Response({
        'success': True,
        'documento_tipo': documento_tipo_code,
        'message': 'Archivo cargado exitosamente'
    }, status=status.HTTP_200_OK)


@csrf_exempt
@api_view(['POST'])
def bulk_upload_documentos(request, tercero_id):
    """
    Upload multiple document files in a single request.
    
    POST /api/terceros/<tercero_id>/documentos/bulk-upload
    
    Expects multipart/form-data with file fields named by documento_tipo.code
    """
    from .models import Tercero, DocumentoTipo, DocumentoTercero
    
    tercero = get_object_or_404(Tercero, id=tercero_id)
    
    results = []
    errors = []
    
    # Procesar cada archivo recibido
    for field_name, file_obj in request.FILES.items():
        try:
            # field_name debería ser el documento_tipo.code
            documento_tipo = DocumentoTipo.objects.get(code=field_name)
            
            # Buscar el DocumentoTercero
            doc_tercero = DocumentoTercero.objects.get(
                tercero=tercero,
                documento_tipo=documento_tipo
            )
            
            # Guardar archivo
            doc_tercero.archivo = file_obj
            doc_tercero.estado = DocumentoTercero.Estado.CARGADO
            doc_tercero.save()
            
            results.append({
                'documento_tipo': field_name,
                'success': True
            })
            
        except DocumentoTipo.DoesNotExist:
            errors.append({
                'documento_tipo': field_name,
                'error': 'Tipo de documento no válido'
            })
        except DocumentoTercero.DoesNotExist:
            errors.append({
                'documento_tipo': field_name,
                'error': 'Documento no requerido para este tercero'
            })
        except Exception as e:
            errors.append({
                'documento_tipo': field_name,
                'error': str(e)
            })
    
    return Response({
        'success': len(errors) == 0,
        'results': results,
        'errors': errors,
        'total_uploaded': len(results),
        'total_failed': len(errors)
    }, status=status.HTTP_200_OK if len(errors) == 0 else status.HTTP_207_MULTI_STATUS)


@csrf_exempt
@api_view(['GET'])
def tercero_status(request, tercero_id):
    """
    GET /api/terceros/<tercero_id>/status/
    Returns completeness status of documents and profile sections
    """
    tercero = get_object_or_404(Tercero, id=tercero_id)
    
    # Get tipo tercero codes
    tipo_codes = list(tercero.tipos.values_list('code', flat=True))
    
    # Determine if profile is required
    requiere_perfil = any(
        code in ['CONTRATISTA', 'EMPLEADO', 'ASPIRANTE', 'SOCIO']
        for code in tipo_codes
    )
    
    return Response({
        'tercero_id': tercero.id,
        'estado': tercero.estado,
        'tipo_tercero_codes': tipo_codes,
        'requiere_perfil': requiere_perfil,
        'documentos': {
            'items': tercero.get_documentos_status(),
            'completo': tercero.is_documentos_completo()
        },
        'perfil': {
            'secciones': tercero.get_perfil_status(),
            'completo': tercero.is_perfil_completo()
        },
        'puede_enviar_aprobacion': tercero.can_submit_for_approval()
    })
