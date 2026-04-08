from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from django.db.models import Sum, Q, Count
from django.utils import timezone
from django.utils.timesince import timesince
from django.http import HttpResponse
from django.conf import settings
from pathlib import Path
import datetime
import io
import os
import zipfile

from terceros.admin import _aplicar_marca_agua


def _estampar_motivo(pdf_bytes: bytes, motivo: str, usuario, fecha: str) -> bytes:
    """
    Estampa el motivo como marca de agua diagonal centrada en cada página.
    Se aplica DESPUÉS de _aplicar_marca_agua() (logo Experias).
    - Texto diagonal a 45°, semitransparente, centrado en la página.
    - Línea de trazabilidad dentro de la misma rotación, debajo del motivo.
    """
    try:
        from reportlab.pdfgen import canvas as rl_canvas
        from reportlab.lib.colors import Color
        from PyPDF2 import PdfReader, PdfWriter

        nombre_usuario = (usuario.get_full_name() or usuario.username) if usuario else '—'

        doc_reader = PdfReader(io.BytesIO(pdf_bytes))
        writer = PdfWriter()

        for page in doc_reader.pages:
            page_width  = float(page.mediabox.width)
            page_height = float(page.mediabox.height)

            overlay_buf = io.BytesIO()
            c = rl_canvas.Canvas(overlay_buf, pagesize=(page_width, page_height))

            # ── Marca de agua diagonal (solo el motivo) ─────────────────────
            c.saveState()
            c.translate(page_width / 2, page_height / 2)
            c.rotate(45)

            c.setFillColor(Color(0.6, 0.6, 0.6, alpha=0.25))
            c.setFont('Helvetica-Bold', 72)
            c.drawCentredString(0, 0, motivo.upper())

            c.restoreState()

            # ── Pie de página — 3 líneas apiladas ──────────────────────────
            c.setFillColor(Color(0.2, 0.2, 0.2, alpha=0.7))
            c.setFont('Helvetica', 7)

            margin_x  = 20
            line_height = 10

            c.drawString(margin_x, 30,                    f"Descargado por: {nombre_usuario}")
            c.drawString(margin_x, 30 - line_height,      f"Motivo: {motivo}")
            c.drawString(margin_x, 30 - (line_height * 2), f"Fecha: {fecha}")

            c.save()

            overlay_buf.seek(0)
            overlay_page = PdfReader(overlay_buf).pages[0]
            page.merge_page(overlay_page)
            writer.add_page(page)

        out = io.BytesIO()
        writer.write(out)
        return out.getvalue()

    except Exception:
        return pdf_bytes

# Mapeo urgencia → acción requerida (reutilizable en múltiples endpoints)
_URGENCIA_ACCION = {
    'crítica': 'Aprobación urgente',
    'media':   'En revisión',
    'baja':    'Completar',
}


def _clasificar_urgencia(dias_pendiente):
    """Retorna (urgencia, accion) según días transcurridos."""
    if dias_pendiente > 10:
        nivel = 'crítica'
    elif dias_pendiente >= 5:
        nivel = 'media'
    else:
        nivel = 'baja'
    return nivel, _URGENCIA_ACCION[nivel]


def _mes_range(offset=0):
    """Retorna (inicio, fin) de un mes relativo al actual. offset=-1 → mes anterior."""
    hoy = timezone.now().date()
    mes = hoy.month + offset
    anio = hoy.year + (mes - 1) // 12
    mes = ((mes - 1) % 12) + 1
    inicio = datetime.date(anio, mes, 1)
    if mes == 12:
        fin = datetime.date(anio + 1, 1, 1)
    else:
        fin = datetime.date(anio, mes + 1, 1)
    return inicio, fin


def _trend_pct(actual, anterior):
    """Calcula variación porcentual. Retorna 0.0 si anterior es 0."""
    if not anterior:
        return 0.0
    return round(((actual - anterior) / anterior) * 100, 1)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_stats(request):
    from .models import Tercero
    from proveedores.models import CuentaCobro
    from contratos.models import Contrato

    hoy = timezone.now().date()
    inicio_mes, fin_mes = _mes_range(0)
    inicio_ant, fin_ant = _mes_range(-1)

    # ── Terceros ──────────────────────────────────────────────────────────────
    terceros_total     = Tercero.objects.count()
    terceros_pendientes = Tercero.objects.filter(estado='PENDIENTE').count()
    terceros_aprobados  = Tercero.objects.filter(estado='APROBADO').count()

    # Nuevos terceros este mes vs mes anterior (para trend)
    terceros_nuevos_mes = Tercero.objects.filter(
        created_at__date__gte=inicio_mes,
        created_at__date__lt=fin_mes,
    ).count()
    terceros_nuevos_ant = Tercero.objects.filter(
        created_at__date__gte=inicio_ant,
        created_at__date__lt=fin_ant,
    ).count()
    terceros_total_trend_pct = _trend_pct(terceros_nuevos_mes, terceros_nuevos_ant)

    # ── Cuentas mes actual / anterior ────────────────────────────────────────
    ESTADOS_VALOR = ['RADICADA', 'EN_REVISION', 'APROBADA', 'PAGADA']

    qs_mes = CuentaCobro.objects.filter(
        created_at__date__gte=inicio_mes,
        created_at__date__lt=fin_mes,
    ).exclude(estado='BORRADOR')

    qs_ant = CuentaCobro.objects.filter(
        created_at__date__gte=inicio_ant,
        created_at__date__lt=fin_ant,
    ).exclude(estado='BORRADOR')

    cuentas_mes      = qs_mes.count()
    cuentas_mes_anterior = qs_ant.count()
    cuentas_mes_trend_pct = _trend_pct(cuentas_mes, cuentas_mes_anterior)

    valor_mes = qs_mes.filter(
        estado__in=ESTADOS_VALOR
    ).aggregate(t=Sum('valor_total'))['t'] or 0

    valor_mes_anterior = qs_ant.filter(
        estado__in=ESTADOS_VALOR
    ).aggregate(t=Sum('valor_total'))['t'] or 0

    valor_mes_trend_pct = _trend_pct(valor_mes, valor_mes_anterior)

    # ── Pagadas (por fecha real de pago, no por creación de la cuenta) ────────
    from proveedores.models import ComprobantePago

    qs_comp_mes = ComprobantePago.objects.filter(
        fecha_pago__gte=inicio_mes,
        fecha_pago__lt=fin_mes,
    )
    qs_comp_ant = ComprobantePago.objects.filter(
        fecha_pago__gte=inicio_ant,
        fecha_pago__lt=fin_ant,
    )

    cuentas_pagadas_mes       = qs_comp_mes.values('cuenta_cobro').distinct().count()
    valor_pagado_mes          = qs_comp_mes.aggregate(t=Sum('valor_pagado'))['t'] or 0
    valor_pagado_mes_anterior = qs_comp_ant.aggregate(t=Sum('valor_pagado'))['t'] or 0
    valor_pagado_mes_trend_pct = _trend_pct(valor_pagado_mes, valor_pagado_mes_anterior)

    cuentas_en_revision = CuentaCobro.objects.filter(
        estado__in=['EN_REVISION', 'RADICADA']
    ).count()

    # Estado predominante del mes (excluye BORRADOR)
    pred = (
        qs_mes.values('estado')
        .annotate(cnt=Count('id'))
        .order_by('-cnt')
        .first()
    )
    cuentas_estado_predominante = pred['estado'] if pred else None

    # ── Contratos ─────────────────────────────────────────────────────────────
    contratos_activos = Contrato.objects.filter(estado='ACTIVO').count()

    proximos_qs = Contrato.objects.filter(
        estado='ACTIVO',
        fecha_fin__gte=hoy,
        fecha_fin__lte=hoy + datetime.timedelta(days=90),
    ).order_by('fecha_fin')[:3]

    contratos_proximos_vencer = [
        {
            'id': c.id,
            'numero': c.numero,
            'objeto': c.objeto[:40],
            'dias_para_vencer': (c.fecha_fin - hoy).days,
            'valor': float(c.valor),
        }
        for c in proximos_qs
    ]

    # ── Gráfico histórico (6 meses) ───────────────────────────────────────────
    meses_nombres = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
                     'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    monthly_data = []
    for i in range(-5, 1):
        ini, fin = _mes_range(i)
        valor = CuentaCobro.objects.filter(
            created_at__date__gte=ini,
            created_at__date__lt=fin,
            estado__in=ESTADOS_VALOR,
        ).aggregate(t=Sum('valor_total'))['t'] or 0
        monthly_data.append({
            'mes': meses_nombres[ini.month - 1],
            'valor': float(valor),
        })

    # Calcular estado de cada mes respecto al promedio de los 6 meses
    valores = [d['valor'] for d in monthly_data]
    promedio = sum(valores) / len(valores) if any(valores) else 0
    for item in monthly_data:
        if promedio == 0:
            item['estado'] = 'en-meta'
        elif item['valor'] > promedio * 1.1:
            item['estado'] = 'arriba'
        elif item['valor'] < promedio * 0.9:
            item['estado'] = 'debajo'
        else:
            item['estado'] = 'en-meta'

    return Response({
        # Terceros
        'terceros_total': terceros_total,
        'terceros_pendientes': terceros_pendientes,
        'terceros_aprobados': terceros_aprobados,
        'terceros_total_trend_pct': terceros_total_trend_pct,

        # Cuentas
        'cuentas_mes': cuentas_mes,
        'cuentas_mes_anterior': cuentas_mes_anterior,
        'cuentas_mes_trend_pct': cuentas_mes_trend_pct,
        'cuentas_pagadas_mes': cuentas_pagadas_mes,
        'cuentas_en_revision': cuentas_en_revision,
        'cuentas_estado_predominante': cuentas_estado_predominante,

        # Valores
        'valor_mes': float(valor_mes),
        'valor_mes_anterior': float(valor_mes_anterior),
        'valor_mes_trend_pct': valor_mes_trend_pct,
        'valor_pagado_mes': float(valor_pagado_mes),
        'valor_pagado_mes_anterior': float(valor_pagado_mes_anterior),
        'valor_pagado_mes_trend_pct': valor_pagado_mes_trend_pct,

        # Contratos
        'contratos_activos': contratos_activos,
        'contratos_proximos_vencer': contratos_proximos_vencer,

        # Gráfico
        'monthly_data': monthly_data,
    })


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_terceros_list(request):
    from .models import Tercero
    from django.db.models import Count

    estado       = request.query_params.get('estado', '')
    search       = request.query_params.get('search', '')
    tipo_tercero = request.query_params.get('tipo_tercero', '')
    tipo_persona = request.query_params.get('tipo_persona', '')
    ordering     = request.query_params.get('ordering', '-fecha_registro')

    # Paginación real
    try:
        page      = max(1, int(request.query_params.get('page', 1)))
        page_size = min(100, max(1, int(request.query_params.get('page_size', 20))))
    except ValueError:
        page, page_size = 1, 20

    # Ordenamiento seguro (whitelist)
    _ORDER_MAP = {
        'fecha_registro':  'created_at',
        '-fecha_registro': '-created_at',
        'nombre':          'razon_social',
        '-nombre':         '-razon_social',
        'estado':          'estado',
        '-estado':         '-estado',
        'documento':       'documento',
        '-documento':      '-documento',
    }
    db_ordering = _ORDER_MAP.get(ordering, '-created_at')

    qs = (
        Tercero.objects
        .select_related('empresa')
        .prefetch_related('tipos', 'estudios', 'experiencias', 'idiomas')
        .annotate(
            _docs_total=Count('documentos', distinct=True),
            _docs_cargados=Count(
                'documentos',
                filter=Q(documentos__archivo__gt=''),
                distinct=True,
            ),
        )
        .order_by(db_ordering)
    )

    if estado:
        qs = qs.filter(estado=estado)
    if tipo_persona:
        qs = qs.filter(tipo_persona=tipo_persona)
    if tipo_tercero:
        qs = qs.filter(tipos__code=tipo_tercero)
    if search:
        qs = qs.filter(
            Q(razon_social__icontains=search) |
            Q(nombre1__icontains=search) |
            Q(apellido1__icontains=search) |
            Q(documento__icontains=search) |
            Q(email__icontains=search)
        )

    total  = qs.count()
    offset = (page - 1) * page_size
    rows   = list(qs[offset:offset + page_size])

    def _perfil_completo(t):
        """Evaluación ligera usando cache de prefetch_related (sin queries extra)."""
        tipo_codes = [tipo.code for tipo in t.tipos.all()]
        requiere_perfil = any(c in ('CONTRATISTA', 'EMPLEADO', 'ASPIRANTE') for c in tipo_codes)
        if not requiere_perfil:
            return True
        return len(t.estudios.all()) >= 1

    data = []
    for t in rows:
        data.append({
            # ── Campos nuevos para TercerosListPage ──
            'id':                    t.id,
            'nombre_completo':       t.nombre_mostrar(),
            'tipo_persona':          t.tipo_persona,
            'tipo_documento':        t.tipo_doc,
            'numero_documento':      t.documento,
            'email':                 t.email or '',
            'telefono':              t.telefono or t.celular or '',
            'empresa':               str(t.empresa),
            'tipos_tercero':         list(t.tipos.values_list('code', flat=True)),
            'estado':                t.estado,
            'fecha_registro':        t.created_at.isoformat(),
            'documentos_completos':  t._docs_cargados,
            'documentos_total':      t._docs_total,
            'tiene_perfil_completo': _perfil_completo(t),
            # ── Campos legacy (backward compat con AdminDashboard) ──
            'nombre':      t.nombre_mostrar(),
            'tipo_doc':    t.tipo_doc,
            'documento':   t.documento,
            'tipos':       list(t.tipos.values_list('nombre', flat=True)),
            'created_at':  t.created_at.strftime('%d/%m/%Y'),
        })

    return Response({
        'count':     total,
        'page':      page,
        'page_size': page_size,
        'pages':     (total + page_size - 1) // page_size,
        'results':   data,
    })


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_tercero_detalle(request, tercero_id):
    from .models import Tercero
    from django.shortcuts import get_object_or_404

    t = get_object_or_404(
        Tercero.objects
        .select_related('empresa', 'aprobado_por', 'seguridad_social')
        .prefetch_related(
            'tipos',
            'documentos__documento_tipo',
            'estudios',
            'cursos',
            'certificaciones',
            'experiencias',
            'idiomas__idioma',
        ),
        pk=tercero_id,
    )

    # ── Documentos ────────────────────────────────────────────────────────────
    docs_status = t.get_documentos_status()
    documentos = [
        {
            'tipo':       d['code'],
            'nombre':     d['nombre'],
            'estado':     d['estado'],
            'obligatorio': d['obligatorio'],
            'archivo_url': None,  # se enriquece abajo
        }
        for d in docs_status
    ]
    # Enriquecer con URL real del archivo
    docs_cargados = {
        doc.documento_tipo.code: doc.archivo.url if doc.archivo else None
        for doc in t.documentos.all()
        if doc.documento_tipo_id
    }
    for d in documentos:
        d['archivo_url'] = docs_cargados.get(d['tipo'])

    # ── Perfil (datos completos usando cache de prefetch) ─────────────────────
    def _date(d):
        return d.isoformat() if d else None

    def _file_url(field):
        return field.url if field else None

    try:
        ss_obj = t.seguridad_social
        ss = {
            'eps':        ss_obj.eps or '',
            'arl':        ss_obj.arl or '',
            'afp':        ss_obj.afp or '',
            'soporte_url': _file_url(ss_obj.soporte),
        }
    except Exception:
        ss = None

    perfil = {
        'estudios': [
            {
                'id':          e.id,
                'nivel':       e.nivel,
                'institucion': e.institucion,
                'titulo':      e.titulo or '',
                'fecha_inicio': _date(e.fecha_inicio),
                'fecha_fin':    _date(e.fecha_fin),
                'soporte_url':  _file_url(e.soporte),
            }
            for e in t.estudios.all()
        ],
        'cursos': [
            {
                'id':          c.id,
                'nombre':      c.nombre,
                'entidad':     c.entidad or '',
                'horas':       c.horas,
                'soporte_url': _file_url(c.soporte),
            }
            for c in t.cursos.all()
        ],
        'certificaciones': [
            {
                'id':          c.id,
                'nombre':      c.nombre,
                'fabricante':  c.fabricante or '',
                'fecha':       _date(c.fecha),
                'soporte_url': _file_url(c.soporte),
            }
            for c in t.certificaciones.all()
        ],
        'experiencias': [
            {
                'id':          e.id,
                'empresa':     e.empresa,
                'cargo':       e.cargo,
                'fecha_inicio': _date(e.fecha_inicio),
                'fecha_fin':    _date(e.fecha_fin),
                'soporte_url':  _file_url(e.soporte),
            }
            for e in t.experiencias.all()
        ],
        'idiomas': [
            {
                'id':     i.id,
                'idioma': i.idioma.nombre,
                'nivel':  i.nivel,
            }
            for i in t.idiomas.all()
        ],
        'seguridad_social': ss,
    }

    # ── Información tributaria / representante legal / tesorería ─────────────
    informacion_adicional = {
        'responsable_iva':    t.responsable_iva,
        'agente_retenedor':   t.agente_retenedor,
        'regimen_tributario': t.regimen_tributario,
        'tipo_regimen':       t.tipo_regimen,
        # Representante legal (persona jurídica)
        'rl_nombre':    t.rl_nombre,
        'rl_tipo_doc':  t.rl_tipo_doc,
        'rl_documento': t.rl_documento,
        # Contacto de tesorería
        'tes_contacto': t.tes_contacto,
        'tes_cargo':    t.tes_cargo,
        'tes_email':    t.tes_email,
    }

    return Response({
        'id':               t.id,
        'nombre_completo':  t.nombre_mostrar(),
        'tipo_persona':     t.tipo_persona,
        'tipo_documento':   t.tipo_doc,
        'numero_documento': t.documento,
        'email':            t.email or '',
        'telefono':         t.telefono or '',
        'celular':          t.celular or '',
        'direccion':        t.direccion or '',
        'ciudad':           t.ciudad or '',
        'departamento':     t.departamento or '',
        'pais':             t.pais or '',
        'empresa': {
            'id':     t.empresa.id,
            'nombre': t.empresa.nombre,
            'nit':    t.empresa.nit,
        },
        'tipos_tercero': [
            {'code': tipo.code, 'nombre': tipo.nombre}
            for tipo in t.tipos.all()
        ],
        'estado':          t.estado,
        'fecha_registro':  t.created_at.isoformat(),
        'aprobado_por':    t.aprobado_por.email if t.aprobado_por else None,
        'aprobado_at':     t.aprobado_at.isoformat() if t.aprobado_at else None,
        'observaciones':   t.observaciones_aprobacion or '',
        'informacion_adicional': informacion_adicional,
        'documentos':      documentos,
        'perfil':          perfil,
    })


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_cuentas_list(request):
    from proveedores.models import CuentaCobro

    estado = request.query_params.get('estado', '')
    search = request.query_params.get('search', '')

    qs = CuentaCobro.objects.select_related('proveedor', 'empresa').exclude(estado='BORRADOR').order_by('-created_at')

    if estado:
        qs = qs.filter(estado=estado)
    if search:
        qs = qs.filter(
            Q(proveedor__razon_social__icontains=search) |
            Q(proveedor__nombre1__icontains=search) |
            Q(proveedor__apellido1__icontains=search) |
            Q(periodo__icontains=search) |
            Q(numero__icontains=search)
        )

    ahora = timezone.now()

    data = []
    for c in qs[:100]:
        dias_pendiente = (ahora - c.created_at).days
        urgencia, accion = _clasificar_urgencia(dias_pendiente)
        data.append({
            'id': c.id,
            'numero': c.numero or f'#{c.id}',
            'periodo': c.periodo,
            'tipo_documento': c.tipo_documento,
            'proveedor': c.proveedor.nombre_mostrar(),
            'empresa': str(c.empresa),
            'valor_total': float(c.valor_total),
            'estado': c.estado,
            'created_at': c.created_at.strftime('%d/%m/%Y'),
            # Campos enriquecidos
            'dias_pendiente': dias_pendiente,
            'urgencia': urgencia,
            'accion': accion,
            'relativo': timesince(c.created_at, ahora),
        })
    return Response(data)


@api_view(['PATCH'])
@permission_classes([IsAdminUser])
def admin_cambiar_estado_tercero(request, tercero_id):
    from .models import Tercero
    from django.shortcuts import get_object_or_404

    ESTADOS_PERMITIDOS = (Tercero.Estado.APROBADO, Tercero.Estado.RECHAZADO)

    nuevo_estado = request.data.get('estado', '').upper()
    motivo       = request.data.get('motivo', '').strip()

    if nuevo_estado not in ESTADOS_PERMITIDOS:
        return Response(
            {'error': f'Estado inválido. Use: {", ".join(ESTADOS_PERMITIDOS)}'},
            status=400,
        )

    if nuevo_estado == Tercero.Estado.RECHAZADO and not motivo:
        return Response(
            {'error': 'El motivo es requerido para rechazar un tercero.'},
            status=400,
        )

    t = get_object_or_404(Tercero, pk=tercero_id)
    t.estado = nuevo_estado

    if nuevo_estado == Tercero.Estado.APROBADO:
        t.aprobado_por  = request.user
        t.aprobado_at   = timezone.now()
        t.observaciones_aprobacion = motivo or ''
    else:  # RECHAZADO
        t.observaciones_aprobacion = motivo

    t.save(update_fields=['estado', 'aprobado_por', 'aprobado_at', 'observaciones_aprobacion'])

    return Response({
        'id':          t.id,
        'estado':      t.estado,
        'aprobado_por': t.aprobado_por.email if t.aprobado_por else None,
        'aprobado_at':  t.aprobado_at.isoformat() if t.aprobado_at else None,
        'observaciones': t.observaciones_aprobacion or '',
    })


@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_crear_invitacion(request):
    from .models import TipoTercero, InvitacionVinculacion
    from tenancy.models import Empresa

    email        = request.data.get('email', '').strip()
    tipo_code    = request.data.get('tipo_tercero', '').strip().upper()
    empresa_id   = request.data.get('empresa_id')

    # Validaciones básicas
    errors = {}
    if not email:
        errors['email'] = 'El email es requerido.'
    if not tipo_code:
        errors['tipo_tercero'] = 'El tipo de tercero es requerido.'
    if not empresa_id:
        errors['empresa_id'] = 'La empresa es requerida.'
    if errors:
        return Response(errors, status=400)

    # Resolver FKs
    try:
        tipo_tercero = TipoTercero.objects.get(code=tipo_code)
    except TipoTercero.DoesNotExist:
        return Response({'tipo_tercero': f'Tipo "{tipo_code}" no existe.'}, status=400)

    try:
        empresa = Empresa.objects.get(pk=empresa_id)
    except Empresa.DoesNotExist:
        return Response({'empresa_id': 'Empresa no encontrada.'}, status=400)

    # Crear invitación (el token se genera automáticamente en save())
    inv = InvitacionVinculacion.objects.create(
        empresa=empresa,
        email=email,
        tipo_tercero=tipo_tercero,
    )

    return Response({
        'id':          inv.id,
        'token':       inv.token,
        'email':       inv.email,
        'tipo_tercero': tipo_code,
        'empresa':     empresa.nombre,
        'link':        f'/vinculacion/{inv.token}',
        'created_at':  inv.created_at.isoformat(),
    }, status=201)



@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_documentos_recientes(request):
    from .models import DocumentoTercero

    desde = timezone.now() - datetime.timedelta(hours=48)
    ahora = timezone.now()

    qs = (
        DocumentoTercero.objects
        .filter(created_at__gte=desde)
        .exclude(estado='PENDIENTE', archivo='')  # excluir pendientes sin archivo
        .select_related('tercero', 'documento_tipo')
        .order_by('-created_at')[:5]
    )

    data = [
        {
            'id': d.id,
            'documento_tipo_code': d.documento_tipo.code,
            'documento_tipo_nombre': d.documento_tipo.nombre,
            'tercero_id': d.tercero.id,
            'tercero_nombre': d.tercero.nombre_mostrar(),
            'estado': d.estado,
            'created_at': d.created_at.isoformat(),
            'relativo': timesince(d.created_at, ahora),
        }
        for d in qs
    ]

    return Response({'count': len(data), 'results': data})


@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_descargar_documentos_tercero(request, tercero_id):
    from .models import Tercero, DocumentoTercero, DescargaDocumentosTercero
    from django.shortcuts import get_object_or_404

    motivo = request.data.get('motivo', '').strip().upper()
    if not motivo:
        return Response({'error': 'El motivo es requerido'}, status=400)
    if len(motivo) < 3:
        return Response({'error': 'Mínimo 3 caracteres'}, status=400)
    if len(motivo) > 10:
        return Response({'error': 'El motivo no puede superar 10 caracteres'}, status=400)

    t = get_object_or_404(Tercero, pk=tercero_id)

    if t.estado != 'APROBADO':
        return Response(
            {'error': 'Solo se pueden descargar documentos de terceros aprobados'},
            status=400,
        )

    docs = DocumentoTercero.objects.filter(
        tercero=t,
    ).exclude(archivo='').select_related('documento_tipo')

    if not docs.exists():
        return Response({'error': 'Sin documentos'}, status=404)

    marca_path = Path(getattr(settings, 'MARCA_AGUA_PATH', Path(settings.BASE_DIR) / 'marca_agua.pdf'))
    fecha_str  = datetime.datetime.now().strftime('%d/%m/%Y %H:%M')
    buffer = io.BytesIO()
    archivos_incluidos = []

    with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
        for doc in docs:
            try:
                with open(doc.archivo.path, 'rb') as f:
                    contenido = f.read()
            except (FileNotFoundError, ValueError):
                continue

            nombre_original = os.path.basename(doc.archivo.name)
            _, ext = os.path.splitext(nombre_original.lower())

            if ext == '.pdf':
                if marca_path.exists():
                    contenido = _aplicar_marca_agua(contenido, marca_path)   # 1. Logo Experias
                contenido = _estampar_motivo(contenido, motivo, request.user, fecha_str)  # 2. Motivo diagonal

            tipo_code = doc.documento_tipo.code if doc.documento_tipo_id else 'doc'
            nombre_zip = f'{tipo_code}_{nombre_original}'
            zf.writestr(nombre_zip, contenido)
            archivos_incluidos.append(nombre_zip)

    zip_bytes = buffer.getvalue()
    if not archivos_incluidos:
        return Response({'error': 'Sin documentos'}, status=404)

    DescargaDocumentosTercero.objects.create(
        tercero=t,
        usuario=request.user,
        motivo=motivo,
        cantidad_archivos=len(archivos_incluidos),
    )

    response = HttpResponse(zip_bytes, content_type='application/zip')
    response['Content-Disposition'] = (
        f'attachment; filename="documentos_{t.documento}.zip"'
    )
    return response


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_historial_descargas_tercero(request, tercero_id):
    from .models import Tercero, DescargaDocumentosTercero
    from django.shortcuts import get_object_or_404

    t = get_object_or_404(Tercero, pk=tercero_id)
    qs = (
        DescargaDocumentosTercero.objects
        .filter(tercero=t)
        .select_related('usuario')
    )

    data = [
        {
            'id': d.id,
            'usuario': (d.usuario.get_full_name() or d.usuario.username) if d.usuario else '—',
            'motivo': d.motivo,
            'fecha': d.fecha.isoformat(),
            'cantidad_archivos': d.cantidad_archivos,
        }
        for d in qs
    ]
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_terceros_pendientes(request):
    from .models import Tercero

    ahora = timezone.now()

    qs = (
        Tercero.objects.filter(estado='PENDIENTE')
        .select_related('empresa')
        .prefetch_related('documentos')
        .order_by('-created_at')[:10]
    )

    data = []
    for t in qs:
        dias_pendiente = (ahora - t.created_at).days
        urgencia, accion = _clasificar_urgencia(dias_pendiente)

        tiene_docs_pendientes = t.documentos.filter(estado='PENDIENTE').exists()
        sin_docs = not t.documentos.exists()

        if sin_docs:
            tarea = 'Carga de documentos'
        elif tiene_docs_pendientes:
            tarea = 'Revisión de documentos'
        else:
            tarea = 'Revisión de perfil'

        data.append({
            'id': t.id,
            'nombre': t.nombre_mostrar(),
            'tipo_persona': t.tipo_persona,
            'documento': t.documento,
            'email': t.email or '',
            'empresa': str(t.empresa),
            'dias_pendiente': dias_pendiente,
            'urgencia': urgencia,
            'accion': accion,
            'tarea': tarea,
            'relativo': timesince(t.created_at, ahora),
        })
    return Response(data)


# ─────────────────────────────────────────────────────────────────────────────
# CRUD Tipos de Tercero
# ─────────────────────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAdminUser])
def admin_tipos_tercero(request):
    from .models import TipoTercero
    import re

    if request.method == 'GET':
        qs = TipoTercero.objects.annotate(
            total_terceros=Count('tercerotipo', distinct=True),
            total_invitaciones=Count('invitaciones', distinct=True),
        ).order_by('nombre')
        return Response([
            {
                'id':                 t.id,
                'code':               t.code,
                'nombre':             t.nombre,
                'descripcion':        t.descripcion,
                'activo':             t.activo,
                'total_terceros':     t.total_terceros,
                'total_invitaciones': t.total_invitaciones,
            }
            for t in qs
        ])

    # POST — crear
    code        = request.data.get('code', '').strip().upper()
    nombre      = request.data.get('nombre', '').strip()
    descripcion = request.data.get('descripcion', '').strip()
    activo      = request.data.get('activo', True)
    if isinstance(activo, str):
        activo = activo.lower() not in ('false', '0', '')

    errors = {}
    if not code:
        errors['code'] = 'El código es requerido.'
    elif not re.match(r'^[A-Z][A-Z0-9_]{0,29}$', code):
        errors['code'] = 'Solo letras mayúsculas, números y guiones bajos.'
    elif TipoTercero.objects.filter(code=code).exists():
        errors['code'] = f'Ya existe un tipo con el código "{code}".'
    if not nombre:
        errors['nombre'] = 'El nombre es requerido.'
    elif len(nombre) > 60:
        errors['nombre'] = 'Máximo 60 caracteres.'
    if len(descripcion) > 300:
        errors['descripcion'] = 'Máximo 300 caracteres.'
    if errors:
        return Response(errors, status=400)

    t = TipoTercero.objects.create(code=code, nombre=nombre, descripcion=descripcion, activo=activo)
    return Response({
        'id': t.id, 'code': t.code, 'nombre': t.nombre,
        'descripcion': t.descripcion, 'activo': t.activo,
        'total_terceros': 0, 'total_invitaciones': 0,
    }, status=201)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAdminUser])
def admin_tipo_tercero_detalle(request, tipo_id):
    from .models import TipoTercero
    from django.shortcuts import get_object_or_404
    from django.db.models import Count
    from django.db.models.deletion import ProtectedError
    import re

    t = get_object_or_404(TipoTercero, pk=tipo_id)

    if request.method == 'GET':
        total_terceros     = t.tercerotipo_set.count()
        total_invitaciones = t.invitaciones.count()
        return Response({
            'id':                 t.id,
            'code':               t.code,
            'nombre':             t.nombre,
            'descripcion':        t.descripcion,
            'activo':             t.activo,
            'total_terceros':     total_terceros,
            'total_invitaciones': total_invitaciones,
        })

    if request.method == 'PATCH':
        nombre      = request.data.get('nombre', t.nombre).strip()
        code        = request.data.get('code', t.code).strip().upper()
        descripcion = request.data.get('descripcion', t.descripcion).strip()
        activo      = request.data.get('activo', t.activo)
        if isinstance(activo, str):
            activo = activo.lower() not in ('false', '0', '')

        errors = {}
        if not code:
            errors['code'] = 'El código es requerido.'
        elif not re.match(r'^[A-Z][A-Z0-9_]{0,29}$', code):
            errors['code'] = 'Solo letras mayúsculas, números y guiones bajos.'
        elif TipoTercero.objects.filter(code=code).exclude(pk=tipo_id).exists():
            errors['code'] = f'Ya existe un tipo con el código "{code}".'
        if not nombre:
            errors['nombre'] = 'El nombre es requerido.'
        elif len(nombre) > 60:
            errors['nombre'] = 'Máximo 60 caracteres.'
        if len(descripcion) > 300:
            errors['descripcion'] = 'Máximo 300 caracteres.'
        if errors:
            return Response(errors, status=400)

        t.code        = code
        t.nombre      = nombre
        t.descripcion = descripcion
        t.activo      = activo
        t.save(update_fields=['code', 'nombre', 'descripcion', 'activo'])
        return Response({
            'id': t.id, 'code': t.code, 'nombre': t.nombre,
            'descripcion': t.descripcion, 'activo': t.activo,
        })

    # DELETE
    try:
        t.delete()
        return Response(status=204)
    except ProtectedError:
        return Response(
            {'error': 'No se puede eliminar: este tipo está siendo usado por terceros o invitaciones.'},
            status=409,
        )
