from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

from .models import (
    Tercero, Estudio, Curso, Certificacion, ExperienciaLaboral,
    TerceroIdioma, SeguridadSocial, Idioma
)
from .serializers import (
    EstudioSerializer, CursoSerializer, CertificacionSerializer,
    ExperienciaLaboralSerializer, TerceroIdiomaSerializer,
    SeguridadSocialSerializer, IdiomaSerializer
)


# ========================================
# ViewSets para CRUD de Perfil
# ========================================

class EstudioViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing educational background (Estudios).
    Nested under /api/terceros/<tercero_id>/estudios/
    """
    serializer_class = EstudioSerializer
    
    def get_queryset(self):
        tercero_id = self.kwargs.get('tercero_id')
        return Estudio.objects.filter(tercero_id=tercero_id).order_by('-fecha_inicio')
    
    def perform_create(self, serializer):
        tercero_id = self.kwargs.get('tercero_id')
        tercero = get_object_or_404(Tercero, id=tercero_id)
        serializer.save(tercero=tercero)


class CursoViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing courses and training (Cursos).
    Nested under /api/terceros/<tercero_id>/cursos/
    """
    serializer_class = CursoSerializer
    
    def get_queryset(self):
        tercero_id = self.kwargs.get('tercero_id')
        return Curso.objects.filter(tercero_id=tercero_id).order_by('-created_at')
    
    def perform_create(self, serializer):
        tercero_id = self.kwargs.get('tercero_id')
        tercero = get_object_or_404(Tercero, id=tercero_id)
        serializer.save(tercero=tercero)


class CertificacionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing certifications (Certificaciones).
    Nested under /api/terceros/<tercero_id>/certificaciones/
    """
    serializer_class = CertificacionSerializer
    
    def get_queryset(self):
        tercero_id = self.kwargs.get('tercero_id')
        return Certificacion.objects.filter(tercero_id=tercero_id).order_by('-fecha')
    
    def perform_create(self, serializer):
        tercero_id = self.kwargs.get('tercero_id')
        tercero = get_object_or_404(Tercero, id=tercero_id)
        serializer.save(tercero=tercero)


class ExperienciaLaboralViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing work experience (Experiencia Laboral).
    Nested under /api/terceros/<tercero_id>/experiencias/
    """
    serializer_class = ExperienciaLaboralSerializer
    
    def get_queryset(self):
        tercero_id = self.kwargs.get('tercero_id')
        return ExperienciaLaboral.objects.filter(tercero_id=tercero_id).order_by('-fecha_inicio')
    
    def perform_create(self, serializer):
        tercero_id = self.kwargs.get('tercero_id')
        tercero = get_object_or_404(Tercero, id=tercero_id)
        serializer.save(tercero=tercero)


class TerceroIdiomaViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing tercero languages (Idiomas).
    Nested under /api/terceros/<tercero_id>/idiomas/
    """
    serializer_class = TerceroIdiomaSerializer
    
    def get_queryset(self):
        tercero_id = self.kwargs.get('tercero_id')
        return TerceroIdioma.objects.filter(tercero_id=tercero_id).select_related('idioma')
    
    def perform_create(self, serializer):
        tercero_id = self.kwargs.get('tercero_id')
        tercero = get_object_or_404(Tercero, id=tercero_id)
        serializer.save(tercero=tercero)


# ========================================
# API Views para casos especiales
# ========================================

@method_decorator(csrf_exempt, name='dispatch')
class SeguridadSocialView(APIView):
    """
    Singleton view for managing social security information.
    GET/PUT /api/terceros/<tercero_id>/seguridad-social/
    """
    
    def get(self, request, tercero_id):
        tercero = get_object_or_404(Tercero, id=tercero_id)
        
        try:
            seguridad_social = tercero.seguridad_social
            serializer = SeguridadSocialSerializer(seguridad_social)
            return Response(serializer.data)
        except SeguridadSocial.DoesNotExist:
            return Response({
                'eps': None,
                'arl': None,
                'afp': None,
                'soporte': None,
                'updated_at': None
            }, status=status.HTTP_200_OK)
    
    def put(self, request, tercero_id):
        tercero = get_object_or_404(Tercero, id=tercero_id)
        
        try:
            seguridad_social = tercero.seguridad_social
            serializer = SeguridadSocialSerializer(seguridad_social, data=request.data)
        except SeguridadSocial.DoesNotExist:
            serializer = SeguridadSocialSerializer(data=request.data)
        
        if serializer.is_valid():
            serializer.save(tercero=tercero)
            return Response(serializer.data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def patch(self, request, tercero_id):
        tercero = get_object_or_404(Tercero, id=tercero_id)
        
        try:
            seguridad_social = tercero.seguridad_social
            serializer = SeguridadSocialSerializer(
                seguridad_social,
                data=request.data,
                partial=True
            )
        except SeguridadSocial.DoesNotExist:
            serializer = SeguridadSocialSerializer(data=request.data, partial=True)
        
        if serializer.is_valid():
            serializer.save(tercero=tercero)
            return Response(serializer.data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@method_decorator(csrf_exempt, name='dispatch')
class IdiomaListView(APIView):
    """
    GET /api/idiomas/
    Returns catalog of available languages
    """
    
    def get(self, request):
        idiomas = Idioma.objects.all().order_by('nombre')
        serializer = IdiomaSerializer(idiomas, many=True)
        return Response(serializer.data)
