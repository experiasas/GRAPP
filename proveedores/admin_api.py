from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.db.models import Q, Count
from django.core.exceptions import ValidationError

from rest_framework.decorators import api_view, permission_classes
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response

from terceros.admin_api import _clasificar_urgencia

_COMPROBANTE_MAX_BYTES = 10 * 1024 * 1024          # 10 MB
_COMPROBANTE_TIPOS    = {'application/pdf', 'image/jpeg', 'image/png', 'image/jpg'}

# ── Transiciones válidas de estado ────────────────────────────────────────────

_TRANSICIONES = {
    'RADICADA':    {'EN_REVISION', 'APROBADA', 'RECHAZADA'},
    'EN_REVISION': {'APROBADA', 'RECHAZADA'},
    'APROBADA':    {'PAGADA'},
    'RECHAZADA':   {'RADICADA'},
    'PAGADA':      set(),
    'BORRADOR':    set(),
}

# ── Helpers ───────────────────────────────────────────────────────────────────

def _serialize_cuenta_list(c, ahora):
    dias = (ahora - c.created_at).days
    urgencia, _ = _clasificar_urgencia(dias)
    return {
        'id':                   c.id,
        'numero':               c.numero or f'#{c.id}',
        'tercero_id':           c.proveedor_id,
        'tercero_nombre':       c.proveedor.nombre_mostrar(),
        'tipo_documento':       c.tipo_documento,
        'tipo_documento_label': c.get_tipo_documento_display(),
        'periodo':              c.periodo,
        'concepto':             c.concepto,
        'valor_base':           float(c.valor_base),
        'valor_total':          float(c.valor_total),
        'estado':               c.estado,
        'fecha_radicacion':     c.created_at.isoformat(),
        'dias_pendiente':       dias,
        'urgencia':             urgencia,
        'anexos_count':         c.anexos_count,
        'orden_compra': {
            'id':       c.orden_compra_id,
            'numero_oc': c.orden_compra.numero_oc,
        } if c.orden_compra_id else None,
    }


# ── Endpoints ─────────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_cuentas_cobro_list(request):
    from .models import CuentaCobro

    estado   = request.query_params.get('estado', '').strip()
    search   = request.query_params.get('search', '').strip()
    tercero  = request.query_params.get('tercero', '').strip()
    periodo  = request.query_params.get('periodo', '').strip()
    ordering = request.query_params.get('ordering', '-created_at').strip()

    try:
        page      = max(1, int(request.query_params.get('page', 1)))
        page_size = min(100, max(1, int(request.query_params.get('page_size', 20))))
    except (ValueError, TypeError):
        page, page_size = 1, 20

    _ORDERING_WHITELIST = {
        'created_at', '-created_at',
        'valor_total', '-valor_total',
        'periodo', '-periodo',
        'estado', '-estado',
        'numero', '-numero',
    }
    if ordering not in _ORDERING_WHITELIST:
        ordering = '-created_at'

    qs = (
        CuentaCobro.objects
        .select_related('proveedor', 'empresa', 'contrato', 'orden_compra')
        .annotate(anexos_count=Count('anexos'))
        .exclude(estado='BORRADOR')
        .order_by(ordering)
    )

    if estado:
        qs = qs.filter(estado=estado)
    if tercero:
        try:
            qs = qs.filter(proveedor_id=int(tercero))
        except ValueError:
            pass
    if periodo:
        qs = qs.filter(periodo__icontains=periodo)
    if search:
        qs = qs.filter(
            Q(numero__icontains=search)
            | Q(concepto__icontains=search)
            | Q(proveedor__razon_social__icontains=search)
            | Q(proveedor__nombre1__icontains=search)
            | Q(proveedor__apellido1__icontains=search)
        )

    total = qs.count()
    pages = max(1, (total + page_size - 1) // page_size)
    page  = min(page, pages)
    start = (page - 1) * page_size

    ahora = timezone.now()
    results = [_serialize_cuenta_list(c, ahora) for c in qs[start: start + page_size]]

    return Response({
        'count':     total,
        'page':      page,
        'page_size': page_size,
        'pages':     pages,
        'results':   results,
    })


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_cuenta_cobro_detalle(request, cuenta_id):
    from .models import CuentaCobro

    c = get_object_or_404(
        CuentaCobro.objects
        .select_related('proveedor', 'empresa', 'contrato', 'orden_compra')
        .prefetch_related('anexos__tipo_anexo', 'comprobantes'),
        pk=cuenta_id,
    )

    p = c.proveedor
    tercero_info = {
        'id':               p.id,
        'nombre':           p.nombre_mostrar(),
        'tipo_documento':   p.tipo_doc,
        'numero_documento': p.documento,
    }

    contrato_info = None
    if c.contrato_id:
        contrato_info = {
            'id':     c.contrato_id,
            'numero': c.contrato.numero,
        }

    orden_compra_info = None
    if c.orden_compra_id:
        orden_compra_info = {
            'id':               c.orden_compra_id,
            'numero_oc':        c.orden_compra.numero_oc,
            'objeto':           c.orden_compra.objeto,
            'valor_total':      str(c.orden_compra.valor_total),
            'valor_pendiente':  str(c.orden_compra.valor_pendiente),
        }

    anexos = [
        {
            'id':          a.id,
            'tipo_anexo':  a.tipo_anexo.nombre,
            'descripcion': a.descripcion,
            'archivo_url': a.archivo.url if a.archivo else None,
            'fecha_carga': a.created_at.isoformat(),
        }
        for a in c.anexos.all()
    ]

    comprobante = c.comprobantes.order_by('-created_at').first()
    comprobante_info = None
    if comprobante:
        comprobante_info = {
            'fecha_pago':   comprobante.fecha_pago.isoformat(),
            'valor_pagado': float(comprobante.valor_pagado),
            'referencia':   comprobante.referencia or '',
            'archivo_url':  comprobante.archivo.url if comprobante.archivo else None,
        }

    return Response({
        'id':                   c.id,
        'numero':               c.numero or f'#{c.id}',
        'tercero':              tercero_info,
        'contrato':             contrato_info,
        'orden_compra':         orden_compra_info,
        'tipo_documento':       c.tipo_documento,
        'tipo_documento_label': c.get_tipo_documento_display(),
        'periodo':              c.periodo,
        'concepto':         c.concepto,
        'observaciones':    c.observaciones or '',
        'valor_base':       float(c.valor_base),
        'iva_porcentaje':   float(c.iva_porcentaje),
        'iva_valor':        float(c.iva_valor),
        'admon':            float(c.admon),
        'imprevistos':      float(c.imprevistos),
        'utilidad':         float(c.utilidad),
        'valor_total':      float(c.valor_total),
        'estado':           c.estado,
        'fecha_radicacion': c.created_at.isoformat(),
        'updated_at':       c.updated_at.isoformat(),
        'comprobante':      comprobante_info,
        'anexos':           anexos,
    })


@api_view(['PATCH'])
@permission_classes([IsAdminUser])
def admin_cuenta_cobro_estado(request, cuenta_id):
    from .models import CuentaCobro, ComprobantePago

    c = get_object_or_404(CuentaCobro, pk=cuenta_id)

    nuevo_estado           = (request.data.get('estado') or '').upper().strip()
    observaciones_revision = (request.data.get('observaciones_revision') or '').strip()

    transiciones_validas = _TRANSICIONES.get(c.estado, set())
    if nuevo_estado not in transiciones_validas:
        return Response(
            {'error': f'Transición inválida: {c.estado} → {nuevo_estado}.'},
            status=400,
        )

    if nuevo_estado == 'RECHAZADA' and not observaciones_revision:
        return Response(
            {'error': 'El motivo de rechazo es obligatorio.'},
            status=400,
        )

    c.estado = nuevo_estado
    if observaciones_revision:
        c.observaciones = observaciones_revision

    c.save(update_fields=['estado', 'observaciones', 'updated_at'])

    # ── Comprobante de pago (opcional al marcar PAGADA) ──────────────────────
    if nuevo_estado == 'PAGADA':
        archivo     = request.FILES.get('comprobante')
        fecha_pago  = (request.data.get('fecha_pago') or '').strip()

        if archivo:
            # Validar tipo
            content_type = getattr(archivo, 'content_type', '') or ''
            if content_type not in _COMPROBANTE_TIPOS:
                return Response(
                    {'error': 'El comprobante debe ser PDF o imagen (JPG, PNG).'},
                    status=400,
                )
            # Validar tamaño
            if archivo.size > _COMPROBANTE_MAX_BYTES:
                return Response(
                    {'error': 'El comprobante no puede superar 10 MB.'},
                    status=400,
                )

        if archivo or fecha_pago:
            from datetime import date
            try:
                fecha = date.fromisoformat(fecha_pago) if fecha_pago else date.today()
            except ValueError:
                return Response({'error': 'Formato de fecha inválido (use YYYY-MM-DD).'}, status=400)

            comprobante = ComprobantePago(
                cuenta_cobro=c,
                fecha_pago=fecha,
                valor_pagado=c.valor_total,
            )
            if archivo:
                comprobante.archivo = archivo
            comprobante.save()

    return Response({'ok': True, 'estado': c.estado})
