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


@method_decorator(csrf_exempt, name='dispatch')
class TerceroTagsView(APIView):
    """
    GET/PUT/POST /api/terceros/<tercero_id>/tags/
    Manages tags for a tercero
    """
    
    def get(self, request, tercero_id):
        """Returns list of tag names for this tercero"""
        from .models import Tercero, Tag
        
        tercero = get_object_or_404(Tercero, id=tercero_id)
        tags = tercero.tags.all().order_by('nombre')
        tag_names = [tag.nombre for tag in tags]
        
        return Response({'tags': tag_names})
    
    def put(self, request, tercero_id):
        """Replaces all tags for this tercero"""
        from .models import Tercero, Tag
        from django.core.exceptions import ValidationError
        
        tercero = get_object_or_404(Tercero, id=tercero_id)
        tag_names = request.data.get('tags', [])
        
        if not isinstance(tag_names, list):
            return Response(
                {'error': 'tags debe ser una lista de strings'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Normalizar y validar tags
        normalized_tags = []
        for name in tag_names:
            if not isinstance(name, str):
                continue
            
            normalized = name.strip().lower()
            if len(normalized) < 2:
                return Response(
                    {'error': f'Tag "{name}" debe tener al menos 2 caracteres'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            normalized_tags.append(normalized)
        
        # Crear/obtener tags y asociar
        tag_objects = []
        for tag_name in normalized_tags:
            tag, created = Tag.objects.get_or_create(nombre=tag_name)
            tag_objects.append(tag)
        
        # Reemplazar tags (clear + set)
        tercero.tags.set(tag_objects)
        
        return Response({
            'tags': [tag.nombre for tag in tag_objects],
            'message': 'Tags actualizados exitosamente'
        })
    
    def post(self, request, tercero_id):
        """Adds tags without removing existing ones"""
        from .models import Tercero, Tag
        
        tercero = get_object_or_404(Tercero, id=tercero_id)
        tag_names = request.data.get('tags', [])
        
        if not isinstance(tag_names, list):
            return Response(
                {'error': 'tags debe ser una lista de strings'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Normalizar y validar tags
        normalized_tags = []
        for name in tag_names:
            if not isinstance(name, str):
                continue
            
            normalized = name.strip().lower()
            if len(normalized) < 2:
                return Response(
                    {'error': f'Tag "{name}" debe tener al menos 2 caracteres'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            normalized_tags.append(normalized)
        
        # Crear/obtener tags y añadir (sin borrar existentes)
        tag_objects = []
        for tag_name in normalized_tags:
            tag, created = Tag.objects.get_or_create(nombre=tag_name)
            tag_objects.append(tag)
        
        tercero.tags.add(*tag_objects)
        
        # Retornar todos los tags actuales
        all_tags = tercero.tags.all().order_by('nombre')
        
        return Response({
            'tags': [tag.nombre for tag in all_tags],
            'message': f'{len(tag_objects)} tags añadidos'
        })
