from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.db import transaction, IntegrityError
from django.db.models import Q
from django.conf import settings
import logging
logger = logging.getLogger(__name__)
        
from .models import InvitacionVinculacion, Tercero
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
      
        logger = logging.getLogger(__name__)
        
        serializer = TerceroCreateSerializer(data=request.data)
        if not serializer.is_valid():
            # Return specific validation errors
            return Response({
                'message': 'Datos inválidos. Por favor revise los campos.',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            with transaction.atomic():
                # Check if tercero already exists with same document
                tipo_doc = request.data.get('tipo_doc')
                documento = request.data.get('documento')
                existing_tercero = Tercero.objects.filter(
                    empresa=invitacion.empresa,
                    tipo_doc=tipo_doc,
                    documento=documento
                ).first()
                
                if existing_tercero:
                    logger.warning(f"Tercero duplicado detectado: {existing_tercero.id}, token={token}")
                    return Response({
                        'message': f'Ya existe un tercero registrado con el documento {tipo_doc} {documento}',
                        'code': 'TERCERO_DUPLICADO',
                        'tercero_id': existing_tercero.id
                    }, status=status.HTTP_409_CONFLICT)
                
                # Crear tercero
                tercero = serializer.save(
                    empresa=invitacion.empresa,
                    estado='PENDIENTE'
                )
                logger.info(f"[VINCULACION] tipo_persona guardado: {tercero.tipo_persona}")
                
                # Asignar tipo desde invitación
                tercero.tipos.add(invitacion.tipo_tercero)
                
                # Crear placeholders de DocumentoTercero para todos los documentos requeridos
                # Filtrar por tipo_tercero Y tipo_persona
                from .models import DocumentoRequerido, DocumentoTercero
                
                tipo_persona = request.data.get('tipo_persona', 'NATURAL')
                logger.info(f"[VINCULACION] tipo_persona recibido: {tipo_persona}")
                
                documentos_requeridos = DocumentoRequerido.objects.filter(
                    tipo_tercero=invitacion.tipo_tercero
                ).filter(
                    Q(aplica_a_persona=DocumentoRequerido.AplicaPersona.AMBAS) |
                    Q(aplica_a_persona=tipo_persona)
                ).select_related('documento_tipo')
                
                # Usar get_or_create para evitar IntegrityError
                for doc_req in documentos_requeridos:
                    DocumentoTercero.objects.get_or_create(
                        empresa=invitacion.empresa,
                        tercero=tercero,
                        documento_tipo=doc_req.documento_tipo,
                        defaults={'estado': DocumentoTercero.Estado.PENDIENTE}
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
        
        except IntegrityError as e:
            logger.error(f"IntegrityError en vinculación: {str(e)}, token={token}, data={request.data}")
            return Response({
                'message': 'Error al procesar el registro. Por favor intente nuevamente o contacte soporte.',
                'code': 'ERROR_INTEGRIDAD',
                'detail': str(e) if settings.DEBUG else None
            }, status=status.HTTP_409_CONFLICT)
        
        except Exception as e:
            logger.error(f"Error inesperado en vinculación: {str(e)}, token={token}", exc_info=True)
            return Response({
                'message': 'Ocurrió un error al procesar su solicitud. Por favor intente nuevamente.',
                'code': 'ERROR_INTERNO',
                'detail': str(e) if settings.DEBUG else None
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@csrf_exempt
@api_view(['POST'])
def upload_documento(request, tercero_id, documento_tipo_code):
    """
    Upload a single document file for a tercero.
    
    POST /api/terceros/<tercero_id>/documentos/<documento_tipo_code>/upload
    """
    from .models import Tercero, DocumentoTipo, DocumentoTercero
    import logging
    
    logger = logging.getLogger(__name__)
    
    # Validar que existe el tercero
    tercero = get_object_or_404(Tercero, id=tercero_id)
    
    # Validar que existe el tipo de documento
    documento_tipo = get_object_or_404(DocumentoTipo, code=documento_tipo_code)
    
    # Validar que se envió un archivo
    if 'archivo' not in request.FILES:
        return Response({
            'message': 'No se recibió ningún archivo. Por favor seleccione un archivo para subir.',
            'code': 'ARCHIVO_FALTANTE'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Usar update_or_create para evitar duplicados
        # Si existe: actualiza archivo y estado
        # Si no existe: crea nuevo registro
        doc_tercero, created = DocumentoTercero.objects.update_or_create(
            tercero=tercero,
            documento_tipo=documento_tipo,
            defaults={
                'empresa': tercero.empresa,
                'archivo': request.FILES['archivo'],
                'estado': DocumentoTercero.Estado.CARGADO
            }
        )
        
        action = 'cargado' if created else 'actualizado'
        logger.info(f"Documento {documento_tipo_code} {action} para tercero {tercero_id}")
        
        return Response({
            'success': True,
            'documento_tipo': documento_tipo_code,
            'message': f'Archivo {action} exitosamente',
            'created': created
        }, status=status.HTTP_200_OK)
    
    except Exception as e:
        logger.error(f"Error al subir documento: {str(e)}, tercero={tercero_id}, tipo={documento_tipo_code}", exc_info=True)
        return Response({
            'message': 'Error al cargar el archivo. Por favor intente nuevamente.',
            'code': 'ERROR_UPLOAD',
            'detail': str(e) if settings.DEBUG else None
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


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


@csrf_exempt
@api_view(['GET'])
def get_tercero_detail(request, tercero_id):
    """
    GET /api/terceros/<tercero_id>/
    Returns basic details of the Tercero for form persistence.
    """
    from .models import Tercero
    from .serializers import TerceroCreateSerializer

    tercero = get_object_or_404(Tercero, id=tercero_id)
    serializer = TerceroCreateSerializer(tercero)
    return Response(serializer.data)


@csrf_exempt
@api_view(['GET'])
def get_documentos_requeridos_filtrados(request, token):
    from .models import InvitacionVinculacion, DocumentoRequerido
    from .serializers import DocumentoRequeridoSerializer
    from django.db.models import Q

    invitacion = get_object_or_404(
        InvitacionVinculacion,
        token=token,
        estado__in=[
            InvitacionVinculacion.Estado.PENDIENTE,
            InvitacionVinculacion.Estado.USADA
        ]
    )

    tipo_persona = request.GET.get('tipo_persona', '').upper()

    logger.info(
        f"[DOCS_FILTRADOS] token={token} "
        f"tipo_persona={tipo_persona} "
        f"raw_qs={request.META.get('QUERY_STRING')}"
    )

    if tipo_persona not in ['NATURAL', 'JURIDICA']:
        return Response(
            {'error': 'tipo_persona debe ser NATURAL o JURIDICA'},
            status=status.HTTP_400_BAD_REQUEST
        )

    documentos = DocumentoRequerido.objects.filter(
        tipo_tercero=invitacion.tipo_tercero
    ).filter(
        Q(aplica_a_persona=DocumentoRequerido.AplicaPersona.AMBAS) |
        Q(aplica_a_persona=tipo_persona)
    ).select_related('documento_tipo')

    print("[DOCS_FILTRADOS]", token, tipo_persona, request.META.get("QUERY_STRING"))
    print("[DOCS_FILTRADOS] docs:", list(documentos.values_list("documento_tipo__code", "aplica_a_persona")))

    serializer = DocumentoRequeridoSerializer(documentos, many=True)
    return Response(serializer.data)

