from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from django.db.models import Sum, Q
from django.utils import timezone


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_stats(request):
    from .models import Tercero
    from proveedores.models import CuentaCobro

    hoy = timezone.now().date()
    inicio_mes = hoy.replace(day=1)

    terceros_total = Tercero.objects.count()
    terceros_pendientes = Tercero.objects.filter(estado='PENDIENTE').count()
    terceros_aprobados = Tercero.objects.filter(estado='APROBADO').count()
    cuentas_en_revision = CuentaCobro.objects.filter(estado__in=['EN_REVISION', 'RADICADA']).count()
    valor_mes = CuentaCobro.objects.filter(
        created_at__date__gte=inicio_mes,
        estado__in=['RADICADA', 'EN_REVISION', 'APROBADA', 'PAGADA']
    ).aggregate(total=Sum('valor_total'))['total'] or 0

    return Response({
        'terceros_total': terceros_total,
        'terceros_pendientes': terceros_pendientes,
        'terceros_aprobados': terceros_aprobados,
        'cuentas_en_revision': cuentas_en_revision,
        'valor_mes': float(valor_mes),
    })


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_terceros_list(request):
    from .models import Tercero

    estado = request.query_params.get('estado', '')
    search = request.query_params.get('search', '')

    qs = Tercero.objects.select_related('empresa').prefetch_related('tipos').order_by('-created_at')

    if estado:
        qs = qs.filter(estado=estado)
    if search:
        qs = qs.filter(
            Q(razon_social__icontains=search) |
            Q(nombre1__icontains=search) |
            Q(apellido1__icontains=search) |
            Q(documento__icontains=search) |
            Q(email__icontains=search)
        )

    data = [
        {
            'id': t.id,
            'nombre': t.nombre_mostrar(),
            'tipo_persona': t.tipo_persona,
            'tipo_doc': t.tipo_doc,
            'documento': t.documento,
            'email': t.email or '',
            'estado': t.estado,
            'empresa': str(t.empresa),
            'tipos': list(t.tipos.values_list('nombre', flat=True)),
            'created_at': t.created_at.strftime('%d/%m/%Y'),
        }
        for t in qs[:100]
    ]
    return Response(data)


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

    data = [
        {
            'id': c.id,
            'numero': c.numero or f'#{c.id}',
            'periodo': c.periodo,
            'tipo_documento': c.tipo_documento,
            'proveedor': c.proveedor.nombre_mostrar(),
            'empresa': str(c.empresa),
            'valor_total': float(c.valor_total),
            'estado': c.estado,
            'created_at': c.created_at.strftime('%d/%m/%Y'),
        }
        for c in qs[:100]
    ]
    return Response(data)
