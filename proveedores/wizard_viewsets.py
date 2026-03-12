from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.db.models import Q

from .models import CuentaCobro, CuentaCobroAnexo, TipoAnexo
from .wizard_serializers import (
    WizardCreateSerializer,
    WizardRetrieveSerializer,
    WizardStep1Serializer,
    WizardStep2Serializer,
    AnexoSerializer,
    SubmitSerializer,
    _get_tipos_anexo_para_cuenta,
)
from tenancy.models import Empresa


class CuentaCobroWizardViewSet(viewsets.GenericViewSet):
    """
    ViewSet para gestion de CuentaCobro basada en wizard.

    Endpoints:
    - POST /wizard/ - Crear nuevo BORRADOR
    - GET /wizard/{id}/ - Obtener estado actual con flags de completitud
    - PATCH /wizard/{id}/?step=1 - Actualizar step 1 (datos generales)
    - PATCH /wizard/{id}/?step=2 - Actualizar step 2 (detalle financiero)
    - GET /wizard/{id}/anexos/ - Listar anexos
    - POST /wizard/{id}/anexos/ - Subir anexo
    - DELETE /wizard/{id}/anexos/{anexo_id}/ - Eliminar anexo
    - POST /wizard/{id}/submit/ - Radicacion final (BORRADOR -> RADICADA)
    - GET /mis-cuentas/ - Listar cuentas del tercero autenticado
    """
    queryset = CuentaCobro.objects.all()

    def get_serializer_class(self):
        if self.action == 'create':
            return WizardCreateSerializer
        elif self.action == 'retrieve':
            return WizardRetrieveSerializer
        elif self.action == 'partial_update':
            step = self.request.query_params.get('step')
            if step == '1':
                return WizardStep1Serializer
            elif step == '2':
                return WizardStep2Serializer
        elif self.action == 'submit':
            return SubmitSerializer
        elif self.action in ['list_anexos', 'create_anexo']:
            return AnexoSerializer
        return WizardRetrieveSerializer

    def get_queryset(self):
        return CuentaCobro.objects.all()

    def get_empresa(self):
        """
        Obtiene la empresa del contexto.
        Si el usuario tiene un tercero asociado, usa la empresa del tercero.
        """
        request = self.request
        if request and request.user.is_authenticated:
            if hasattr(request.user, 'tercero_perfil') and request.user.tercero_perfil:
                return request.user.tercero_perfil.empresa
            else:
                from terceros.models import Tercero
                tercero = Tercero.objects.filter(email=request.user.email).first()
                if tercero:
                    return tercero.empresa

        empresa = Empresa.objects.first()
        if not empresa:
            empresa = Empresa.objects.create(
                nombre="Empresa Test",
                nit="900000000-1"
            )
        return empresa

    @action(detail=False, methods=['post'], url_path='wizard')
    def create_wizard(self, request):
        """
        POST /api/cuentas-cobro/wizard/
        Crea una nueva CuentaCobro en estado BORRADOR.
        """
        serializer = WizardCreateSerializer(
            data=request.data,
            context={'empresa': self.get_empresa(), 'request': request}
        )
        serializer.is_valid(raise_exception=True)
        cuenta = serializer.save()

        return_serializer = WizardRetrieveSerializer(cuenta)
        return Response(return_serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get', 'patch'], url_path='wizard')
    def wizard_detail(self, request, pk=None):
        """
        GET /api/cuentas-cobro/{id}/wizard/ - Obtener estado del wizard
        PATCH /api/cuentas-cobro/{id}/wizard/?step=1|2 - Actualizar paso especifico
        """
        cuenta = self.get_object()

        if request.method == 'GET':
            serializer = WizardRetrieveSerializer(cuenta)
            return Response(serializer.data)

        elif request.method == 'PATCH':
            step = request.query_params.get('step')

            if step == '1':
                serializer = WizardStep1Serializer(
                    cuenta, data=request.data, partial=True
                )
            elif step == '2':
                serializer = WizardStep2Serializer(
                    cuenta, data=request.data, partial=True
                )
            else:
                return Response(
                    {'error': 'El parametro "step" debe ser 1 o 2.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            serializer.is_valid(raise_exception=True)
            serializer.save()

            return_serializer = WizardRetrieveSerializer(cuenta)
            return Response(return_serializer.data)

    @action(detail=True, methods=['get', 'post'], url_path='anexos')
    def handle_anexos(self, request, pk=None):
        """
        GET /api/cuentas-cobro/{id}/anexos/ - Listar anexos
        POST /api/cuentas-cobro/{id}/anexos/ - Crear anexo
        """
        cuenta = self.get_object()

        if request.method == 'GET':
            anexos = cuenta.anexos.all()
            serializer = AnexoSerializer(anexos, many=True)
            return Response(serializer.data)

        elif request.method == 'POST':
            if cuenta.estado != CuentaCobro.Estado.BORRADOR:
                return Response(
                    {'error': 'Solo se pueden agregar anexos a cuentas en estado BORRADOR.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            serializer = AnexoSerializer(
                data=request.data,
                context={'cuenta_cobro': cuenta, 'request': request}
            )
            serializer.is_valid(raise_exception=True)
            serializer.save()

            return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['delete'], url_path='anexos/(?P<anexo_id>[0-9]+)')
    def delete_anexo(self, request, pk=None, anexo_id=None):
        """
        DELETE /api/cuentas-cobro/{id}/anexos/{anexo_id}/
        Eliminar un anexo.
        """
        cuenta = self.get_object()

        if cuenta.estado != CuentaCobro.Estado.BORRADOR:
            return Response(
                {'error': 'Solo se pueden eliminar anexos de cuentas en estado BORRADOR.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        anexo = get_object_or_404(CuentaCobroAnexo, id=anexo_id, cuenta_cobro=cuenta)
        anexo.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'], url_path='submit')
    def submit(self, request, pk=None):
        """
        POST /api/cuentas-cobro/{id}/submit/
        Radicar cuenta (BORRADOR -> RADICADA) con validaciones completas.
        """
        cuenta = self.get_object()

        serializer = SubmitSerializer(instance=cuenta, data={})
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            cuenta = serializer.save()

        return Response({
            'id': cuenta.id,
            'estado': cuenta.estado,
            'message': 'Cuenta radicada exitosamente.'
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='tipos-anexo')
    def tipos_anexo_filtrados(self, request, pk=None):
        """
        GET /api/cuentas-cobro/{id}/tipos-anexo/
        Retorna tipos de anexo filtrados por tipo de persona del tercero,
        con indicador de obligatoriedad dinamica segun reglas de seguridad social.
        """
        cuenta = self.get_object()
        tipo_persona = cuenta.proveedor.tipo_persona if cuenta.proveedor else 'JURIDICA'

        tipos = _get_tipos_anexo_para_cuenta(cuenta, tipo_persona)

        # Evaluar si seguridad social es requerida para marcar anexos como obligatorios
        from .wizard_serializers import _evaluar_reglas_seguridad_social
        reglas = _evaluar_reglas_seguridad_social(cuenta)

        data = []
        for t in tipos:
            es_obligatorio = t.obligatorio
            # Si se requiere SS y el tipo es de seguridad social, marcarlo como obligatorio
            if reglas.get('requiere_ss') and t.codigo in ['PLANILLA_SS', 'INFORME_ACTIVIDADES']:
                es_obligatorio = True

            data.append({
                'id': t.id,
                'codigo': t.codigo,
                'nombre': t.nombre,
                'obligatorio': es_obligatorio,
                'aplica_a_persona': t.aplica_a_persona,
            })

        return Response(data)

    @action(detail=False, methods=['get'], url_path='mis-cuentas')
    def mis_cuentas(self, request):
        """
        GET /api/cuentas-cobro/mis-cuentas/
        Retorna las cuentas del tercero autenticado junto con un resumen
        contextual de acumulado mensual y reglas de seguridad social.
        """
        if not request.user.is_authenticated:
            return Response(
                {'detail': 'No autenticado.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        from terceros.models import Tercero
        from .models import ConfiguracionRadicacion

        tercero = None
        if hasattr(request.user, 'tercero_perfil'):
            tercero = request.user.tercero_perfil
        else:
            tercero = Tercero.objects.filter(email=request.user.email).first()

        if not tercero:
            return Response({
                'cuentas': [],
                'resumen': None,
            })

        cuentas = CuentaCobro.objects.filter(
            proveedor=tercero
        ).order_by('-created_at')

        lista = []
        for c in cuentas:
            tiene_consecutivo = (
                c.estado != 'BORRADOR'
                and c.numero
                and not c.numero.startswith('DRAFT-')
            )
            lista.append({
                'id': c.id,
                'consecutivo': c.numero if tiene_consecutivo else None,
                'mes_servicio': c.periodo or '',
                'estado': c.estado,
                'tipo_documento': c.tipo_documento,
                'valor_total': float(c.valor_total),
                'created_at': c.created_at.isoformat(),
            })

        # Calcular resumen contextual
        tipo_persona = getattr(tercero, 'tipo_persona', 'NATURAL')
        es_natural = tipo_persona == 'NATURAL'

        resumen = {
            'tipo_persona': tipo_persona,
            'acumulado_mensual': 0,
            'umbral_ss': 0,
            'requiere_ss': False,
            'porcentaje_progreso': 0,
        }

        if es_natural:
            # Calcular acumulado mensual del tercero usando el campo `periodo` (YYYY-MM).
            # Se usa el mes actual como referencia para el dashboard.
            from django.utils import timezone
            from django.db.models import Sum
            now = timezone.now()
            periodo_actual = now.strftime('%Y-%m')  # ej: "2026-03"

            ESTADOS_ACTIVOS = ['RADICADA', 'EN_REVISION', 'APROBADA', 'APROBADO', 'PAGADA']

            acumulado = CuentaCobro.objects.filter(
                proveedor=tercero,
                estado__in=ESTADOS_ACTIVOS,
                periodo=periodo_actual,
            ).aggregate(total=Sum('valor_base'))['total'] or 0

            # Incluir el borrador activo del mismo mes (si existe y tiene valor)
            borrador_actual = CuentaCobro.objects.filter(
                proveedor=tercero,
                estado='BORRADOR',
                periodo=periodo_actual,
            ).aggregate(total=Sum('valor_base'))['total'] or 0

            acumulado_total = float(acumulado) + float(borrador_actual)

            # Obtener configuracion de la empresa
            empresa = tercero.empresa
            config = ConfiguracionRadicacion.objects.filter(
                empresa=empresa
            ).first()

            if config:
                umbral = float(config.umbral_seguridad_social)
            else:
                # Valor por defecto: 1 SMMLV 2026
                umbral = float(1_750_905.00)

            porcentaje = min((acumulado_total / umbral) * 100, 100) if umbral > 0 else 0

            resumen = {
                'tipo_persona': tipo_persona,
                'acumulado_mensual': acumulado_total,
                'umbral_ss': umbral,
                'requiere_ss': acumulado_total >= umbral,
                'porcentaje_progreso': round(porcentaje, 1),
            }

        return Response({
            'cuentas': lista,
            'resumen': resumen,
        })


class TipoAnexoViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet de solo lectura para el catalogo de TipoAnexo."""
    queryset = TipoAnexo.objects.all()

    def list(self, request):
        """GET /api/tipos-anexo/ - Listar todos los tipos de anexo."""
        tipos = self.get_queryset()
        data = [
            {
                'id': t.id,
                'codigo': t.codigo,
                'nombre': t.nombre,
                'obligatorio': t.obligatorio,
                'aplica_a_persona': t.aplica_a_persona,
            }
            for t in tipos
        ]
        return Response(data)
