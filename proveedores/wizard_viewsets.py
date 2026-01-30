from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db import transaction

from .models import CuentaCobro, CuentaCobroAnexo, TipoAnexo
from .wizard_serializers import (
    WizardCreateSerializer,
    WizardRetrieveSerializer,
    WizardStep1Serializer,
    WizardStep2Serializer,
    AnexoSerializer,
    SubmitSerializer,
)
from tenancy.models import Empresa


class CuentaCobroWizardViewSet(viewsets.GenericViewSet):
    """
    ViewSet for wizard-based CuentaCobro creation and management.
    
    Endpoints:
    - POST /wizard/ - Create new BORRADOR
    - GET /wizard/{id}/ - Retrieve current state with completion flags
    - PATCH /wizard/{id}/?step=1 - Update step 1 (datos generales)
    - PATCH /wizard/{id}/?step=2 - Update step 2 (detalle financiero)
    - GET /wizard/{id}/anexos/ - List anexos
    - POST /wizard/{id}/anexos/ - Upload anexo
    - DELETE /wizard/{id}/anexos/{anexo_id}/ - Delete anexo
    - POST /wizard/{id}/submit/ - Final submission (BORRADOR -> RADICADA)
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
        """Filter by empresa (tenant) - TODO: implement proper tenant filtering."""
        # For now, return all - in production, filter by request.empresa
        return CuentaCobro.objects.all()

    def get_empresa(self):
        """
        Get empresa from request context.
        TODO: Implement proper tenant resolution (from subdomain, JWT, etc.)
        For now, use first empresa or create a test one.
        """
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
        Create a new CuentaCobro in BORRADOR state.
        """
        serializer = WizardCreateSerializer(
            data=request.data,
            context={'empresa': self.get_empresa(), 'request': request}
        )
        serializer.is_valid(raise_exception=True)
        cuenta = serializer.save()
        
        # Return the created object with retrieve serializer
        return_serializer = WizardRetrieveSerializer(cuenta)
        return Response(return_serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'], url_path='wizard')
    def retrieve_wizard(self, request, pk=None):
        """
        GET /api/cuentas-cobro/{id}/wizard/
        Retrieve current wizard state with completion flags.
        """
        cuenta = self.get_object()
        serializer = WizardRetrieveSerializer(cuenta)
        return Response(serializer.data)

    @action(detail=True, methods=['patch'], url_path='wizard')
    def update_wizard(self, request, pk=None):
        """
        PATCH /api/cuentas-cobro/{id}/wizard/?step=1|2
        Update specific wizard step.
        """
        cuenta = self.get_object()
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
                {'error': 'El parámetro "step" debe ser 1 o 2.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        # Return updated state
        return_serializer = WizardRetrieveSerializer(cuenta)
        return Response(return_serializer.data)

    @action(detail=True, methods=['get'], url_path='anexos')
    def list_anexos(self, request, pk=None):
        """
        GET /api/cuentas-cobro/{id}/anexos/
        List all anexos for this cuenta.
        """
        cuenta = self.get_object()
        anexos = cuenta.anexos.all()
        serializer = AnexoSerializer(anexos, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='anexos')
    def create_anexo(self, request, pk=None):
        """
        POST /api/cuentas-cobro/{id}/anexos/
        Upload a new anexo (multipart/form-data).
        """
        cuenta = self.get_object()
        
        # Validate cuenta is in BORRADOR
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
        Delete an anexo.
        """
        cuenta = self.get_object()
        
        # Validate cuenta is in BORRADOR
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
        Submit cuenta for radicación (BORRADOR -> RADICADA).
        Performs hard validation of all steps.
        """
        cuenta = self.get_object()
        
        serializer = SubmitSerializer(instance=cuenta, data={})
        serializer.is_valid(raise_exception=True)
        
        with transaction.atomic():
            cuenta = serializer.save()
        
        return Response({
            'id': cuenta.id,
            'estado': cuenta.estado,
            'message': 'Cuenta de cobro radicada exitosamente.'
        }, status=status.HTTP_200_OK)


class TipoAnexoViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only viewset for TipoAnexo catalog.
    """
    queryset = TipoAnexo.objects.all()
    
    def list(self, request):
        """GET /api/tipos-anexo/ - List all tipos de anexo."""
        tipos = self.get_queryset()
        data = [
            {
                'id': t.id,
                'codigo': t.codigo,
                'nombre': t.nombre,
                'obligatorio': t.obligatorio
            }
            for t in tipos
        ]
        return Response(data)
