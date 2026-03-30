from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.decorators import parser_classes
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _nombre_tercero(t):
    if not t:
        return ''
    if t.tipo_persona == 'J':
        return t.razon_social or ''
    parts = [t.nombre1, t.nombre2, t.apellido1, t.apellido2]
    return ' '.join(p for p in parts if p).strip() or t.documento


def _nombre_usuario(u):
    if not u:
        return ''
    return u.get_full_name() or u.username


def _date(d):
    return d.isoformat() if d else None


def _serialize_contrato_list(c):
    return {
        'id':             c.id,
        'numero':         c.numero,
        'empresa':        {'id': c.empresa_id, 'nombre': c.empresa.nombre},
        'contratista':    {'id': c.contratista_id, 'nombre': _nombre_tercero(c.contratista)},
        'tipo_contrato':  {'id': c.tipo_contrato_id, 'nombre': c.tipo_contrato.nombre} if c.tipo_contrato else None,
        'objeto':         c.objeto,
        'estado':         c.estado,
        'prioridad':      c.prioridad,
        'valor_total':    str(c.valor_total),
        'fecha_inicio':   _date(c.fecha_inicio),
        'fecha_fin':      _date(c.fecha_fin),
        'dias_restantes': c.dias_restantes,
        'tiene_otrosi':   c.tiene_otrosi,
        'tiene_polizas':  c.tiene_polizas,
        'created_at':     c.created_at.isoformat(),
    }


def _serialize_contrato_detalle(c):
    base = _serialize_contrato_list(c)
    base.update({
        'dependencia_solicitante': c.dependencia_solicitante,
        'observaciones':           c.observaciones,
        'fecha_solicitud':         _date(c.fecha_solicitud),
        'fecha_contrato':          _date(c.fecha_contrato),
        'fecha_fin_otrosi':        _date(c.fecha_fin_otrosi),
        'valor_sin_iva':           str(c.valor_sin_iva),
        'iva':                     str(c.iva),
        'valor':                   str(c.valor),
        'solicitante':   {'id': c.solicitante_id, 'nombre': _nombre_usuario(c.solicitante)} if c.solicitante else None,
        'empresa_rl':    {'id': c.empresa_rl_id, 'nombre': _nombre_usuario(c.empresa_rl)} if c.empresa_rl else None,
        'tercero_rl':    {'id': c.tercero_rl_id, 'nombre': _nombre_tercero(c.tercero_rl)} if c.tercero_rl else None,
        'created_by':    {'id': c.created_by_id, 'nombre': _nombre_usuario(c.created_by)} if c.created_by else None,
        'polizas':       [_serialize_poliza(p) for p in c.polizas.all()],
        'otrosis':       [_serialize_otrosi(o) for o in c.otrosis.all()],
        'formas_pago':   [_serialize_forma_pago(f) for f in c.formas_pago.all()],
        'condiciones':   [_serialize_condicion(cc) for cc in c.condiciones.all()],
        'anexos':        [_serialize_anexo(a) for a in c.anexos.all()],
        'flujo':         [_serialize_flujo(f) for f in c.flujo.all()],
    })
    return base


def _serialize_poliza(p):
    return {
        'id':             p.id,
        'aseguradora':    p.aseguradora,
        'numero_poliza':  p.numero_poliza,
        'amparo':         p.amparo,
        'valor_asegurado': str(p.valor_asegurado),
        'fecha_inicio':   _date(p.fecha_inicio),
        'fecha_fin':      _date(p.fecha_fin),
        'estado':         p.estado,
        'observaciones':  p.observaciones,
        'archivo_url':    p.archivo.url if p.archivo else None,
    }


def _serialize_otrosi(o):
    return {
        'id':             o.id,
        'numero':         o.numero,
        'fecha':          _date(o.fecha),
        'objeto':         o.objeto,
        'nuevo_valor':    str(o.nuevo_valor) if o.nuevo_valor is not None else None,
        'nueva_fecha_fin': _date(o.nueva_fecha_fin),
        'archivo_url':    o.archivo.url if o.archivo else None,
    }


def _serialize_forma_pago(f):
    return {
        'id':            f.id,
        'descripcion':   f.descripcion,
        'valor':         str(f.valor),
        'fecha_estimada': _date(f.fecha_estimada),
        'fecha_pago':    _date(f.fecha_pago),
        'estado':        f.estado,
        'observaciones': f.observaciones,
        'orden':         f.orden,
    }


def _serialize_condicion(c):
    return {
        'id':        c.id,
        'titulo':    c.titulo,
        'contenido': c.contenido,
        'orden':     c.orden,
    }


def _serialize_anexo(a):
    return {
        'id':          a.id,
        'tipo':        {'id': a.tipo_id, 'nombre': a.tipo.nombre} if a.tipo else None,
        'descripcion': a.descripcion,
        'archivo_url': a.archivo.url if a.archivo else None,
        'created_at':  a.created_at.isoformat(),
    }


def _serialize_flujo(f):
    return {
        'id':               f.id,
        'estado_anterior':  f.estado_anterior,
        'estado_nuevo':     f.estado_nuevo,
        'usuario':          _nombre_usuario(f.usuario),
        'observacion':      f.observacion,
        'fecha':            f.fecha.isoformat(),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Catálogos
# ─────────────────────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_tipos_contrato_list(request):
    from .models import TipoContrato
    qs = TipoContrato.objects.filter(activo=True)
    return Response([{'id': t.id, 'nombre': t.nombre} for t in qs])


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_tipos_anexo_contrato_list(request):
    from .models import TipoAnexoContrato
    qs = TipoAnexoContrato.objects.filter(activo=True)
    return Response([{'id': t.id, 'nombre': t.nombre, 'requerido': t.requerido} for t in qs])


# ─────────────────────────────────────────────────────────────────────────────
# Contratos — lista + crear
# ─────────────────────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAdminUser])
def admin_contratos_list(request):
    from .models import Contrato, TipoContrato
    from tenancy.models import Empresa

    if request.method == 'POST':
        return _crear_contrato(request)

    # ── GET paginado ──────────────────────────────────────────────────────────
    search    = request.query_params.get('search', '')
    estado    = request.query_params.get('estado', '')
    prioridad = request.query_params.get('prioridad', '')
    empresa   = request.query_params.get('empresa', '')

    qs = (
        Contrato.objects
        .select_related('empresa', 'contratista', 'tipo_contrato')
        .order_by('-created_at')
    )

    if search:
        qs = qs.filter(
            Q(numero__icontains=search) |
            Q(objeto__icontains=search) |
            Q(contratista__razon_social__icontains=search) |
            Q(contratista__apellido1__icontains=search)
        )
    if estado:
        qs = qs.filter(estado=estado)
    if prioridad:
        qs = qs.filter(prioridad=prioridad)
    if empresa:
        qs = qs.filter(empresa_id=empresa)

    try:
        page      = max(1, int(request.query_params.get('page', 1)))
        page_size = min(100, max(1, int(request.query_params.get('page_size', 20))))
    except ValueError:
        page, page_size = 1, 20

    total  = qs.count()
    offset = (page - 1) * page_size
    rows   = list(qs[offset:offset + page_size])

    return Response({
        'count':     total,
        'page':      page,
        'page_size': page_size,
        'pages':     (total + page_size - 1) // page_size,
        'results':   [_serialize_contrato_list(c) for c in rows],
    })


def _crear_contrato(request):
    from .models import Contrato, TipoContrato
    from tenancy.models import Empresa
    from terceros.models import Tercero

    data   = request.data
    errors = {}

    empresa_id      = data.get('empresa')
    contratista_id  = data.get('contratista')
    numero          = str(data.get('numero', '')).strip()
    objeto          = str(data.get('objeto', '')).strip()
    fecha_inicio    = data.get('fecha_inicio')
    valor_sin_iva   = data.get('valor_sin_iva', 0)
    iva             = data.get('iva', 0)
    valor_total     = data.get('valor_total', 0)

    if not empresa_id:
        errors['empresa'] = 'La empresa es requerida.'
    if not contratista_id:
        errors['contratista'] = 'El contratista es requerido.'
    if not numero:
        errors['numero'] = 'El número de contrato es requerido.'
    elif Contrato.objects.filter(numero=numero).exists():
        errors['numero'] = 'Ya existe un contrato con este número.'
    if not objeto:
        errors['objeto'] = 'El objeto es requerido.'
    if not fecha_inicio:
        errors['fecha_inicio'] = 'La fecha de inicio es requerida.'
    if errors:
        return Response(errors, status=400)

    tipo_contrato_id = data.get('tipo_contrato') or None
    estado = data.get('estado', Contrato.Estado.BORRADOR)
    if estado not in Contrato.Estado.values:
        estado = Contrato.Estado.BORRADOR

    prioridad = data.get('prioridad', Contrato.Prioridad.MEDIA)
    if prioridad not in Contrato.Prioridad.values:
        prioridad = Contrato.Prioridad.MEDIA

    contrato = Contrato.objects.create(
        empresa_id=empresa_id,
        contratista_id=contratista_id,
        tipo_contrato_id=tipo_contrato_id,
        numero=numero,
        objeto=objeto,
        estado=estado,
        prioridad=prioridad,
        dependencia_solicitante=str(data.get('dependencia_solicitante', '')),
        observaciones=str(data.get('observaciones', '')),
        fecha_solicitud=data.get('fecha_solicitud') or None,
        fecha_contrato=data.get('fecha_contrato') or None,
        fecha_inicio=fecha_inicio,
        fecha_fin=data.get('fecha_fin') or None,
        valor_sin_iva=valor_sin_iva,
        iva=iva,
        valor_total=valor_total,
        valor=valor_total,  # legado
        solicitante_id=data.get('solicitante') or None,
        created_by=request.user,
    )

    # Registrar en flujo si se crea con estado distinto a BORRADOR
    if contrato.estado != Contrato.Estado.BORRADOR:
        from .models import ContratoFlujo
        ContratoFlujo.objects.create(
            contrato=contrato,
            estado_anterior='',
            estado_nuevo=contrato.estado,
            usuario=request.user,
            observacion='Creación del contrato',
        )

    contrato = (
        Contrato.objects
        .select_related('empresa', 'contratista', 'tipo_contrato')
        .get(pk=contrato.pk)
    )
    return Response(_serialize_contrato_list(contrato), status=201)


# ─────────────────────────────────────────────────────────────────────────────
# Contrato — detalle + editar
# ─────────────────────────────────────────────────────────────────────────────

@api_view(['GET', 'PATCH'])
@permission_classes([IsAdminUser])
def admin_contrato_detalle(request, contrato_id):
    from .models import Contrato

    contrato = get_object_or_404(
        Contrato.objects
        .select_related('empresa', 'contratista', 'tipo_contrato', 'solicitante', 'empresa_rl', 'tercero_rl', 'created_by')
        .prefetch_related('polizas', 'otrosis', 'formas_pago', 'condiciones', 'anexos__tipo', 'flujo__usuario'),
        pk=contrato_id,
    )

    if request.method == 'PATCH':
        data   = request.data
        errors = {}

        if 'numero' in data:
            numero = str(data['numero']).strip()
            if not numero:
                errors['numero'] = 'El número es requerido.'
            elif Contrato.objects.exclude(pk=contrato_id).filter(numero=numero).exists():
                errors['numero'] = 'Ya existe otro contrato con este número.'
        if 'objeto' in data and not str(data['objeto']).strip():
            errors['objeto'] = 'El objeto es requerido.'
        if errors:
            return Response(errors, status=400)

        fields = [
            'numero', 'objeto', 'tipo_contrato_id', 'estado', 'prioridad',
            'dependencia_solicitante', 'observaciones',
            'fecha_solicitud', 'fecha_contrato', 'fecha_inicio', 'fecha_fin',
            'valor_sin_iva', 'iva', 'valor_total',
            'solicitante_id', 'empresa_rl_id', 'tercero_rl_id',
            'tiene_otrosi', 'tiene_polizas',
        ]
        map_direct = {
            'tipo_contrato': 'tipo_contrato_id',
            'solicitante':   'solicitante_id',
            'empresa_rl':    'empresa_rl_id',
            'tercero_rl':    'tercero_rl_id',
        }
        update_fields = []
        for key, value in data.items():
            attr = map_direct.get(key, key)
            if attr in fields:
                # Normalize empty strings for FK/date fields
                if attr.endswith('_id') or attr.startswith('fecha_'):
                    value = value or None
                setattr(contrato, attr, value)
                update_fields.append(attr)

        # Keep legado valor in sync
        if 'valor_total' in data:
            contrato.valor = contrato.valor_total
            if 'valor' not in update_fields:
                update_fields.append('valor')

        if update_fields:
            contrato.save(update_fields=update_fields)

        # Refresh relations
        contrato.refresh_from_db()
        contrato = (
            Contrato.objects
            .select_related('empresa', 'contratista', 'tipo_contrato', 'solicitante', 'empresa_rl', 'tercero_rl', 'created_by')
            .prefetch_related('polizas', 'otrosis', 'formas_pago', 'condiciones', 'anexos__tipo', 'flujo__usuario')
            .get(pk=contrato_id)
        )

    return Response(_serialize_contrato_detalle(contrato))


# ─────────────────────────────────────────────────────────────────────────────
# Cambio de estado
# ─────────────────────────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_contrato_estado(request, contrato_id):
    from .models import Contrato, ContratoFlujo

    contrato = get_object_or_404(Contrato, pk=contrato_id)
    nuevo_estado = str(request.data.get('estado', '')).strip()
    observacion  = str(request.data.get('observacion', '')).strip()

    if nuevo_estado not in Contrato.Estado.values:
        return Response({'estado': f'Estado inválido. Opciones: {", ".join(Contrato.Estado.values)}'}, status=400)

    estado_anterior = contrato.estado
    contrato.estado = nuevo_estado
    contrato.save(update_fields=['estado'])

    ContratoFlujo.objects.create(
        contrato=contrato,
        estado_anterior=estado_anterior,
        estado_nuevo=nuevo_estado,
        usuario=request.user,
        observacion=observacion,
    )

    return Response({'estado': nuevo_estado, 'estado_anterior': estado_anterior})


# ─────────────────────────────────────────────────────────────────────────────
# Pólizas
# ─────────────────────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAdminUser])
def admin_contrato_polizas(request, contrato_id):
    from .models import Contrato, PolizaContrato
    contrato = get_object_or_404(Contrato, pk=contrato_id)

    if request.method == 'POST':
        errors = {}
        aseguradora  = str(request.data.get('aseguradora', '')).strip()
        amparo       = str(request.data.get('amparo', '')).strip()
        fecha_inicio = request.data.get('fecha_inicio')
        fecha_fin    = request.data.get('fecha_fin')

        if not aseguradora:
            errors['aseguradora'] = 'La aseguradora es requerida.'
        if not amparo:
            errors['amparo'] = 'El amparo es requerido.'
        if not fecha_inicio:
            errors['fecha_inicio'] = 'La fecha de inicio es requerida.'
        if not fecha_fin:
            errors['fecha_fin'] = 'La fecha de fin es requerida.'
        if errors:
            return Response(errors, status=400)

        estado = request.data.get('estado', PolizaContrato.Estado.VIGENTE)
        if estado not in PolizaContrato.Estado.values:
            estado = PolizaContrato.Estado.VIGENTE

        poliza = PolizaContrato.objects.create(
            contrato=contrato,
            aseguradora=aseguradora,
            numero_poliza=str(request.data.get('numero_poliza', '')),
            amparo=amparo,
            valor_asegurado=request.data.get('valor_asegurado', 0),
            fecha_inicio=fecha_inicio,
            fecha_fin=fecha_fin,
            estado=estado,
            observaciones=str(request.data.get('observaciones', '')),
        )
        if not contrato.tiene_polizas:
            contrato.tiene_polizas = True
            contrato.save(update_fields=['tiene_polizas'])
        return Response(_serialize_poliza(poliza), status=201)

    return Response([_serialize_poliza(p) for p in contrato.polizas.all()])


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAdminUser])
def admin_contrato_poliza_detalle(request, contrato_id, poliza_id):
    from .models import PolizaContrato
    poliza = get_object_or_404(PolizaContrato, pk=poliza_id, contrato_id=contrato_id)

    if request.method == 'DELETE':
        poliza.delete()
        return Response(status=204)

    update_fields = []
    for field in ('aseguradora', 'numero_poliza', 'amparo', 'valor_asegurado',
                  'fecha_inicio', 'fecha_fin', 'estado', 'observaciones'):
        if field in request.data:
            setattr(poliza, field, request.data[field])
            update_fields.append(field)
    if update_fields:
        poliza.save(update_fields=update_fields)
    return Response(_serialize_poliza(poliza))


# ─────────────────────────────────────────────────────────────────────────────
# Otrosíes
# ─────────────────────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAdminUser])
def admin_contrato_otrosis(request, contrato_id):
    from .models import Contrato, OtrosiContrato
    contrato = get_object_or_404(Contrato, pk=contrato_id)

    if request.method == 'POST':
        errors = {}
        numero = request.data.get('numero')
        fecha  = request.data.get('fecha')
        objeto = str(request.data.get('objeto', '')).strip()

        if not numero:
            errors['numero'] = 'El número de otrosí es requerido.'
        elif OtrosiContrato.objects.filter(contrato=contrato, numero=numero).exists():
            errors['numero'] = 'Ya existe un otrosí con este número para este contrato.'
        if not fecha:
            errors['fecha'] = 'La fecha es requerida.'
        if not objeto:
            errors['objeto'] = 'El objeto es requerido.'
        if errors:
            return Response(errors, status=400)

        otrosi = OtrosiContrato.objects.create(
            contrato=contrato,
            numero=numero,
            fecha=fecha,
            objeto=objeto,
            nuevo_valor=request.data.get('nuevo_valor') or None,
            nueva_fecha_fin=request.data.get('nueva_fecha_fin') or None,
        )
        # Actualizar fecha_fin_otrosi en el contrato si se provee
        if otrosi.nueva_fecha_fin:
            contrato.fecha_fin_otrosi = otrosi.nueva_fecha_fin
            contrato.tiene_otrosi = True
            contrato.save(update_fields=['fecha_fin_otrosi', 'tiene_otrosi'])
        elif not contrato.tiene_otrosi:
            contrato.tiene_otrosi = True
            contrato.save(update_fields=['tiene_otrosi'])

        return Response(_serialize_otrosi(otrosi), status=201)

    return Response([_serialize_otrosi(o) for o in contrato.otrosis.all()])


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAdminUser])
def admin_contrato_otrosi_detalle(request, contrato_id, otrosi_id):
    from .models import OtrosiContrato
    otrosi = get_object_or_404(OtrosiContrato, pk=otrosi_id, contrato_id=contrato_id)

    if request.method == 'DELETE':
        otrosi.delete()
        return Response(status=204)

    update_fields = []
    for field in ('numero', 'fecha', 'objeto', 'nuevo_valor', 'nueva_fecha_fin'):
        if field in request.data:
            value = request.data[field]
            if field in ('nuevo_valor', 'nueva_fecha_fin'):
                value = value or None
            setattr(otrosi, field, value)
            update_fields.append(field)
    if update_fields:
        otrosi.save(update_fields=update_fields)
    return Response(_serialize_otrosi(otrosi))


# ─────────────────────────────────────────────────────────────────────────────
# Formas de pago
# ─────────────────────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAdminUser])
def admin_contrato_formas_pago(request, contrato_id):
    from .models import Contrato, FormaPagoContrato
    contrato = get_object_or_404(Contrato, pk=contrato_id)

    if request.method == 'POST':
        descripcion = str(request.data.get('descripcion', '')).strip()
        valor       = request.data.get('valor')

        errors = {}
        if not descripcion:
            errors['descripcion'] = 'La descripción es requerida.'
        if valor is None:
            errors['valor'] = 'El valor es requerido.'
        if errors:
            return Response(errors, status=400)

        estado = request.data.get('estado', FormaPagoContrato.Estado.PENDIENTE)
        if estado not in FormaPagoContrato.Estado.values:
            estado = FormaPagoContrato.Estado.PENDIENTE

        forma = FormaPagoContrato.objects.create(
            contrato=contrato,
            descripcion=descripcion,
            valor=valor,
            fecha_estimada=request.data.get('fecha_estimada') or None,
            fecha_pago=request.data.get('fecha_pago') or None,
            estado=estado,
            observaciones=str(request.data.get('observaciones', '')),
            orden=request.data.get('orden', 0),
        )
        return Response(_serialize_forma_pago(forma), status=201)

    return Response([_serialize_forma_pago(f) for f in contrato.formas_pago.all()])


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAdminUser])
def admin_contrato_forma_pago_detalle(request, contrato_id, forma_id):
    from .models import FormaPagoContrato
    forma = get_object_or_404(FormaPagoContrato, pk=forma_id, contrato_id=contrato_id)

    if request.method == 'DELETE':
        forma.delete()
        return Response(status=204)

    update_fields = []
    for field in ('descripcion', 'valor', 'fecha_estimada', 'fecha_pago',
                  'estado', 'observaciones', 'orden'):
        if field in request.data:
            value = request.data[field]
            if field in ('fecha_estimada', 'fecha_pago'):
                value = value or None
            setattr(forma, field, value)
            update_fields.append(field)
    if update_fields:
        forma.save(update_fields=update_fields)
    return Response(_serialize_forma_pago(forma))


# ─────────────────────────────────────────────────────────────────────────────
# Anexos (con upload de archivo)
# ─────────────────────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAdminUser])
@parser_classes([MultiPartParser, FormParser])
def admin_contrato_anexos(request, contrato_id):
    from .models import Contrato, ContratoAnexo, TipoAnexoContrato
    contrato = get_object_or_404(Contrato, pk=contrato_id)

    if request.method == 'POST':
        archivo = request.FILES.get('archivo')
        if not archivo:
            return Response({'archivo': 'El archivo es requerido.'}, status=400)

        tipo_id = request.data.get('tipo') or None
        anexo = ContratoAnexo.objects.create(
            contrato=contrato,
            tipo_id=tipo_id,
            descripcion=str(request.data.get('descripcion', '')),
            archivo=archivo,
            created_by=request.user,
        )
        # Refresh to get tipo relation
        anexo = ContratoAnexo.objects.select_related('tipo').get(pk=anexo.pk)
        return Response(_serialize_anexo(anexo), status=201)

    return Response([_serialize_anexo(a) for a in contrato.anexos.select_related('tipo').all()])


@api_view(['DELETE'])
@permission_classes([IsAdminUser])
def admin_contrato_anexo_detalle(request, contrato_id, anexo_id):
    from .models import ContratoAnexo
    anexo = get_object_or_404(ContratoAnexo, pk=anexo_id, contrato_id=contrato_id)
    anexo.delete()
    return Response(status=204)
