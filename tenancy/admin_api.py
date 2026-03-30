from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404

_TIPOS_CONTACTO = ['RL', 'GER', 'TES', 'CON', 'COM', 'OTR']


def _serialize_contacto(c):
    return {
        'id':          c.id,
        'nombre':      c.nombre,
        'cargo':       c.cargo or '',
        'tipo':        c.tipo,
        'tipo_display': c.get_tipo_display(),
        'email':       c.email or '',
        'telefono':    c.telefono or '',
        'principal':   c.principal,
        'activo':      c.activo,
    }


@api_view(['GET', 'POST'])
@permission_classes([IsAdminUser])
def admin_empresas_list(request):
    from .models import Empresa

    # ── POST — Crear empresa ───────────────────────────────────────────────────
    if request.method == 'POST':
        nombre = request.data.get('nombre', '').strip()
        nit    = request.data.get('nit', '').strip()

        errors = {}
        if not nombre:
            errors['nombre'] = 'El nombre es requerido.'
        if not nit:
            errors['nit'] = 'El NIT es requerido.'
        elif Empresa.objects.filter(nit=nit).exists():
            errors['nit'] = 'Ya existe una empresa con este NIT.'
        if errors:
            return Response(errors, status=400)

        empresa = Empresa.objects.create(
            nombre=nombre,
            nit=nit,
            activa=bool(request.data.get('activa', True)),
        )
        return Response({
            'id':            empresa.id,
            'nombre':        empresa.nombre,
            'nit':           empresa.nit,
            'activa':        empresa.activa,
            'fecha_creacion': empresa.created_at.isoformat(),
        }, status=201)

    # ── GET ────────────────────────────────────────────────────────────────────
    search      = request.query_params.get('search', '')
    page_param  = request.query_params.get('page', None)

    qs = (
        Empresa.objects
        .prefetch_related('contactos')
        .annotate(
            total_terceros=Count('terceros', distinct=True),
            total_contratos=Count('contratos', distinct=True),
            contactos_count=Count('contactos', distinct=True),
        )
        .order_by('nombre')
    )

    if search:
        qs = qs.filter(Q(nombre__icontains=search) | Q(nit__icontains=search))

    # ── Modo simple (sin ?page) — backward compat con InvitarTerceroModal ─────
    if page_param is None:
        data = [{'id': e.id, 'nombre': e.nombre, 'nit': e.nit} for e in qs]
        return Response(data)

    # ── Modo paginado ─────────────────────────────────────────────────────────
    try:
        page      = max(1, int(page_param))
        page_size = min(100, max(1, int(request.query_params.get('page_size', 20))))
    except ValueError:
        page, page_size = 1, 20

    total  = qs.count()
    offset = (page - 1) * page_size
    rows   = list(qs[offset:offset + page_size])

    def _contacto_principal(empresa):
        contactos_activos = [c for c in empresa.contactos.all() if c.activo]
        principal = next((c for c in contactos_activos if c.principal), None)
        return principal or (contactos_activos[0] if contactos_activos else None)

    data = []
    for e in rows:
        cp = _contacto_principal(e)
        data.append({
            'id':              e.id,
            'nombre':          e.nombre,
            'nit':             e.nit,
            'activa':          e.activa,
            'email':           (cp.email or '') if cp else '',
            'telefono':        (cp.telefono or '') if cp else '',
            'total_terceros':  e.total_terceros,
            'total_contratos': e.total_contratos,
            'contactos_count': e.contactos_count,
            'fecha_creacion':  e.created_at.isoformat(),
        })

    return Response({
        'count':     total,
        'page':      page,
        'page_size': page_size,
        'pages':     (total + page_size - 1) // page_size,
        'results':   data,
    })


@api_view(['GET', 'PATCH'])
@permission_classes([IsAdminUser])
def admin_empresa_detalle(request, empresa_id):
    from .models import Empresa

    empresa = get_object_or_404(
        Empresa.objects.prefetch_related('contactos'),
        pk=empresa_id,
    )

    # ── PATCH — Editar empresa ─────────────────────────────────────────────────
    if request.method == 'PATCH':
        errors = {}
        nombre = request.data.get('nombre', empresa.nombre)
        if isinstance(nombre, str):
            nombre = nombre.strip()
        nit = request.data.get('nit', empresa.nit)
        if isinstance(nit, str):
            nit = nit.strip()

        if 'nombre' in request.data and not nombre:
            errors['nombre'] = 'El nombre es requerido.'
        if 'nit' in request.data:
            if not nit:
                errors['nit'] = 'El NIT es requerido.'
            elif Empresa.objects.exclude(pk=empresa_id).filter(nit=nit).exists():
                errors['nit'] = 'Ya existe otra empresa con este NIT.'
        if errors:
            return Response(errors, status=400)

        update_fields = []
        if 'nombre' in request.data:
            empresa.nombre = nombre
            update_fields.append('nombre')
        if 'nit' in request.data:
            empresa.nit = nit
            update_fields.append('nit')
        if 'activa' in request.data:
            empresa.activa = bool(request.data['activa'])
            update_fields.append('activa')

        if update_fields:
            empresa.save(update_fields=update_fields)

    # ── GET / respuesta post-PATCH ─────────────────────────────────────────────
    from django.db.models import Count, Q
    from terceros.models import Tercero
    from contratos.models import Contrato

    contactos = [
        {
            'id':            c.id,
            'nombre':        c.nombre,
            'cargo':         c.cargo or '',
            'tipo':          c.tipo,
            'tipo_display':  c.get_tipo_display(),
            'email':         c.email or '',
            'telefono':      c.telefono or '',
            'principal':     c.principal,
            'activo':        c.activo,
        }
        for c in empresa.contactos.all()
    ]

    st = Tercero.objects.filter(empresa=empresa).aggregate(
        total=Count('id'),
        aprobados=Count('id', filter=Q(estado='APROBADO')),
        pendientes=Count('id', filter=Q(estado='PENDIENTE')),
    )
    sc = Contrato.objects.filter(empresa=empresa).aggregate(
        total=Count('id'),
        vigentes=Count('id', filter=Q(estado='ACTIVO')),
    )

    return Response({
        'id':            empresa.id,
        'nombre':        empresa.nombre,
        'nit':           empresa.nit,
        'activa':        empresa.activa,
        'fecha_creacion': empresa.created_at.isoformat(),
        'contactos':     contactos,
        'stats': {
            'total_terceros':     st['total'],
            'terceros_aprobados': st['aprobados'],
            'terceros_pendientes': st['pendientes'],
            'total_contratos':    sc['total'],
            'contratos_vigentes': sc['vigentes'],
        },
    })


@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_empresa_contacto_crear(request, empresa_id):
    from .models import Empresa, ContactoEmpresa

    empresa = get_object_or_404(Empresa, pk=empresa_id)

    nombre = request.data.get('nombre', '').strip()
    tipo   = request.data.get('tipo', '').strip().upper()

    errors = {}
    if not nombre:
        errors['nombre'] = 'El nombre es requerido.'
    if not tipo or tipo not in _TIPOS_CONTACTO:
        errors['tipo'] = f'Tipo inválido. Opciones: {", ".join(_TIPOS_CONTACTO)}'
    if errors:
        return Response(errors, status=400)

    contacto = ContactoEmpresa.objects.create(
        empresa=empresa,
        nombre=nombre,
        cargo=request.data.get('cargo', '') or '',
        tipo=tipo,
        email=request.data.get('email', '') or None,
        telefono=request.data.get('telefono', '') or None,
        principal=bool(request.data.get('principal', False)),
        activo=True,
    )
    return Response(_serialize_contacto(contacto), status=201)


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAdminUser])
def admin_empresa_contacto_detalle(request, empresa_id, contacto_id):
    from .models import ContactoEmpresa

    contacto = get_object_or_404(ContactoEmpresa, pk=contacto_id, empresa_id=empresa_id)

    if request.method == 'DELETE':
        contacto.delete()
        return Response(status=204)

    # PATCH
    errors = {}
    nombre = request.data.get('nombre', contacto.nombre)
    if isinstance(nombre, str):
        nombre = nombre.strip()
    tipo = request.data.get('tipo', contacto.tipo)
    if isinstance(tipo, str):
        tipo = tipo.strip().upper()

    if 'nombre' in request.data and not nombre:
        errors['nombre'] = 'El nombre es requerido.'
    if 'tipo' in request.data and tipo not in _TIPOS_CONTACTO:
        errors['tipo'] = 'Tipo inválido.'
    if errors:
        return Response(errors, status=400)

    update_fields = []
    if 'nombre' in request.data:
        contacto.nombre = nombre
        update_fields.append('nombre')
    if 'cargo' in request.data:
        contacto.cargo = request.data['cargo'] or ''
        update_fields.append('cargo')
    if 'tipo' in request.data:
        contacto.tipo = tipo
        update_fields.append('tipo')
    if 'email' in request.data:
        contacto.email = request.data['email'] or None
        update_fields.append('email')
    if 'telefono' in request.data:
        contacto.telefono = request.data['telefono'] or None
        update_fields.append('telefono')
    if 'principal' in request.data:
        contacto.principal = bool(request.data['principal'])
        update_fields.append('principal')

    if update_fields:
        contacto.save(update_fields=update_fields)

    return Response(_serialize_contacto(contacto))
