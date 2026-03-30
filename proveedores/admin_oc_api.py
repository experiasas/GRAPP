from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.db.models import Q

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .models import OrdenCompra, ItemOrdenCompra, EstadoOrdenCompra

_TRANSICIONES_OC = {
    'BORRADOR':     {'EMITIDA', 'ANULADA'},
    'EMITIDA':      {'APROBADA', 'ANULADA'},
    'APROBADA':     {'EN_EJECUCION', 'ANULADA'},
    'EN_EJECUCION': {'CUMPLIDA', 'ANULADA'},
    'CUMPLIDA':     set(),
    'ANULADA':      set(),
}

_ORDERING_WHITELIST = {
    'fecha_emision', '-fecha_emision',
    'valor_total', '-valor_total',
    'numero_oc', '-numero_oc',
    'created_at', '-created_at',
    'estado', '-estado',
}


def _serialize_oc_list(oc):
    return {
        'id':                   oc.id,
        'numero_oc':            oc.numero_oc,
        'tipo':                 oc.tipo,
        'estado':               oc.estado,
        'estado_display':       oc.get_estado_display(),
        'tercero_nombre':       oc.tercero.nombre_mostrar() if hasattr(oc.tercero, 'nombre_mostrar') else str(oc.tercero),
        'tercero_documento':    oc.tercero.documento,
        'empresa_nombre':       oc.empresa.nombre,
        'contrato_numero':      oc.contrato.numero if oc.contrato else None,
        'objeto':               oc.objeto[:100],
        'valor_total':          str(oc.valor_total),
        'valor_radicado':       str(oc.valor_radicado),
        'valor_pendiente':      str(oc.valor_pendiente),
        'porcentaje_ejecutado': oc.porcentaje_ejecutado,
        'fecha_emision':        oc.fecha_emision.isoformat(),
        'fecha_entrega':        oc.fecha_entrega.isoformat() if oc.fecha_entrega else None,
        'radicaciones_count':   oc.cuentas_cobro.exclude(estado='BORRADOR').count(),
        'created_at':           oc.created_at.isoformat(),
    }


def _serialize_oc_detalle(oc):
    return {
        'id':                   oc.id,
        'numero_oc':            oc.numero_oc,
        'tipo':                 oc.tipo,
        'tipo_display':         oc.get_tipo_display(),
        'estado':               oc.estado,
        'estado_display':       oc.get_estado_display(),
        'tercero': {
            'id':           oc.tercero.id,
            'nombre':       oc.tercero.nombre_mostrar() if hasattr(oc.tercero, 'nombre_mostrar') else str(oc.tercero),
            'documento':    oc.tercero.documento,
            'tipo_persona': oc.tercero.tipo_persona,
        },
        'empresa': {
            'id':     oc.empresa.id,
            'nombre': oc.empresa.nombre,
            'nit':    oc.empresa.nit,
        },
        'contrato': {
            'id':     oc.contrato.id,
            'numero': oc.contrato.numero,
            'objeto': getattr(oc.contrato, 'objeto', ''),
        } if oc.contrato else None,
        'valor_sin_iva':        str(oc.valor_sin_iva),
        'iva':                  str(oc.iva),
        'valor_total':          str(oc.valor_total),
        'valor_radicado':       str(oc.valor_radicado),
        'valor_pendiente':      str(oc.valor_pendiente),
        'porcentaje_ejecutado': oc.porcentaje_ejecutado,
        'fecha_emision':        oc.fecha_emision.isoformat(),
        'fecha_entrega':        oc.fecha_entrega.isoformat() if oc.fecha_entrega else None,
        'objeto':               oc.objeto,
        'observaciones':        oc.observaciones,
        'archivo_url':          oc.archivo.url if oc.archivo else None,
        'items': [{
            'id':            item.id,
            'descripcion':   item.descripcion,
            'cantidad':      str(item.cantidad),
            'valor_unitario': str(item.valor_unitario),
            'valor_total':   str(item.valor_total),
        } for item in oc.items.all()],
        'radicaciones_count': oc.cuentas_cobro.exclude(estado='BORRADOR').count(),
        'created_by':  oc.created_by.get_full_name() or oc.created_by.email if oc.created_by else None,
        'created_at':  oc.created_at.isoformat(),
        'updated_at':  oc.updated_at.isoformat(),
        'transiciones_validas': list(_TRANSICIONES_OC.get(oc.estado, set())),
    }


@api_view(['GET', 'POST'])
@permission_classes([IsAdminUser])
def admin_ordenes_compra_list(request):
    if request.method == 'POST':
        return _crear_oc(request)

    search   = request.query_params.get('search', '').strip()
    estado   = request.query_params.get('estado', '').strip()
    tercero  = request.query_params.get('tercero', '').strip()
    empresa  = request.query_params.get('empresa', '').strip()
    contrato = request.query_params.get('contrato', '').strip()
    ordering = request.query_params.get('ordering', '-created_at').strip()

    try:
        page      = max(1, int(request.query_params.get('page', 1)))
        page_size = min(100, max(1, int(request.query_params.get('page_size', 20))))
    except (ValueError, TypeError):
        page, page_size = 1, 20

    if ordering not in _ORDERING_WHITELIST:
        ordering = '-created_at'

    qs = OrdenCompra.objects.select_related('tercero', 'empresa', 'contrato').order_by(ordering)

    if search:
        qs = qs.filter(
            Q(numero_oc__icontains=search)
            | Q(objeto__icontains=search)
            | Q(tercero__razon_social__icontains=search)
            | Q(tercero__nombre1__icontains=search)
            | Q(tercero__apellido1__icontains=search)
        )
    if estado:
        qs = qs.filter(estado=estado)
    if tercero:
        try:
            qs = qs.filter(tercero_id=int(tercero))
        except ValueError:
            pass
    if empresa:
        try:
            qs = qs.filter(empresa_id=int(empresa))
        except ValueError:
            pass
    if contrato:
        try:
            qs = qs.filter(contrato_id=int(contrato))
        except ValueError:
            pass

    total = qs.count()
    pages = max(1, (total + page_size - 1) // page_size)
    page  = min(page, pages)
    start = (page - 1) * page_size

    return Response({
        'count':     total,
        'page':      page,
        'page_size': page_size,
        'pages':     pages,
        'results':   [_serialize_oc_list(oc) for oc in qs[start:start + page_size]],
    })


def _crear_oc(request):
    data = request.data

    required = ['tercero', 'empresa', 'objeto', 'valor_sin_iva', 'valor_total', 'fecha_emision']
    missing = [f for f in required if not data.get(f)]
    if missing:
        return Response({'error': f'Campos requeridos: {", ".join(missing)}'}, status=400)

    from terceros.models import Tercero
    from tenancy.models import Empresa
    from contratos.models import Contrato

    try:
        tercero = Tercero.objects.get(id=data['tercero'])
    except Tercero.DoesNotExist:
        return Response({'error': 'Tercero no encontrado.'}, status=400)

    try:
        empresa = Empresa.objects.get(id=data['empresa'])
    except Empresa.DoesNotExist:
        return Response({'error': 'Empresa no encontrada.'}, status=400)

    contrato = None
    if data.get('contrato'):
        try:
            contrato = Contrato.objects.get(id=data['contrato'])
        except Contrato.DoesNotExist:
            return Response({'error': 'Contrato no encontrado.'}, status=400)

    try:
        from datetime import date
        fecha_emision = date.fromisoformat(data['fecha_emision'])
        fecha_entrega = date.fromisoformat(data['fecha_entrega']) if data.get('fecha_entrega') else None
    except ValueError:
        return Response({'error': 'Formato de fecha inválido (use YYYY-MM-DD).'}, status=400)

    oc = OrdenCompra.objects.create(
        numero_oc=data.get('numero_oc', ''),
        tipo=data.get('tipo', 'COMPRA'),
        tercero=tercero,
        empresa=empresa,
        contrato=contrato,
        objeto=data['objeto'],
        valor_sin_iva=data['valor_sin_iva'],
        iva=data.get('iva', 0),
        valor_total=data['valor_total'],
        fecha_emision=fecha_emision,
        fecha_entrega=fecha_entrega,
        estado=data.get('estado', 'BORRADOR'),
        observaciones=data.get('observaciones', ''),
        created_by=request.user,
    )

    # Crear ítems si se envían
    items = data.get('items', [])
    for item in items:
        if item.get('descripcion') and item.get('valor_unitario'):
            ItemOrdenCompra.objects.create(
                orden_compra=oc,
                descripcion=item['descripcion'],
                cantidad=item.get('cantidad', 1),
                valor_unitario=item['valor_unitario'],
            )

    return Response(_serialize_oc_detalle(oc), status=201)


@api_view(['GET', 'PATCH'])
@permission_classes([IsAdminUser])
def admin_orden_compra_detalle(request, oc_id):
    oc = get_object_or_404(
        OrdenCompra.objects.select_related('tercero', 'empresa', 'contrato', 'created_by').prefetch_related('items'),
        pk=oc_id
    )

    if request.method == 'GET':
        return Response(_serialize_oc_detalle(oc))

    # PATCH
    data = request.data
    campos_editables = ['objeto', 'observaciones', 'valor_sin_iva', 'iva', 'valor_total', 'fecha_entrega', 'numero_oc']
    for campo in campos_editables:
        if campo in data:
            setattr(oc, campo, data[campo])

    if 'contrato' in data:
        from contratos.models import Contrato
        if data['contrato']:
            try:
                oc.contrato = Contrato.objects.get(id=data['contrato'])
            except Contrato.DoesNotExist:
                return Response({'error': 'Contrato no encontrado.'}, status=400)
        else:
            oc.contrato = None

    oc.save()
    return Response(_serialize_oc_detalle(oc))


@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_orden_compra_estado(request, oc_id):
    oc = get_object_or_404(OrdenCompra, pk=oc_id)

    nuevo_estado = (request.data.get('estado') or '').upper().strip()
    transiciones = _TRANSICIONES_OC.get(oc.estado, set())

    if nuevo_estado not in transiciones:
        return Response(
            {'error': f'Transición inválida: {oc.estado} → {nuevo_estado}.'},
            status=400,
        )

    if nuevo_estado == 'ANULADA' and not request.data.get('motivo'):
        return Response({'error': 'El motivo de anulación es obligatorio.'}, status=400)

    if nuevo_estado == 'ANULADA' and request.data.get('motivo'):
        oc.observaciones = request.data['motivo']

    oc.estado = nuevo_estado
    oc.save(update_fields=['estado', 'observaciones', 'updated_at'])

    return Response({'ok': True, 'estado': oc.estado, 'estado_display': oc.get_estado_display()})


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_orden_compra_radicaciones(request, oc_id):
    oc = get_object_or_404(OrdenCompra, pk=oc_id)
    radicaciones = oc.cuentas_cobro.exclude(estado='BORRADOR').select_related('proveedor').order_by('-created_at')

    return Response([{
        'id':           r.id,
        'numero':       r.numero or f'#{r.id}',
        'periodo':      r.periodo,
        'valor_total':  float(r.valor_total),
        'estado':       r.estado,
        'estado_display': r.get_estado_display(),
        'fecha':        r.created_at.isoformat(),
    } for r in radicaciones])


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_mis_ordenes_compra_portal(request):
    """Endpoint para el portal de terceros: OCs del tercero logueado."""
    from terceros.models import Tercero
    tercero = Tercero.objects.filter(email=request.user.email).first()
    if not tercero:
        return Response([])

    ocs = OrdenCompra.objects.filter(
        tercero=tercero,
        estado__in=['APROBADA', 'EN_EJECUCION']
    ).select_related('contrato').order_by('-fecha_emision')

    return Response([{
        'id':                   oc.id,
        'numero_oc':            oc.numero_oc,
        'objeto':               oc.objeto,
        'valor_total':          str(oc.valor_total),
        'valor_pendiente':      str(oc.valor_pendiente),
        'porcentaje_ejecutado': oc.porcentaje_ejecutado,
        'contrato': {
            'id':     oc.contrato.id,
            'numero': oc.contrato.numero,
        } if oc.contrato else None,
        'fecha_entrega': oc.fecha_entrega.isoformat() if oc.fecha_entrega else None,
    } for oc in ocs])
