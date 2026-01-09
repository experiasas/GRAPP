"""
URL configuration for GRAPP project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path


from terceros.views import formulario_vinculacion
from proveedores.views import radicar_cuenta

# API views
from terceros.api_views import vinculacion_api, upload_documento, bulk_upload_documentos, tercero_status
from terceros.viewsets import (
    EstudioViewSet, CursoViewSet, CertificacionViewSet,
    ExperienciaLaboralViewSet, TerceroIdiomaViewSet,
    SeguridadSocialView, IdiomaListView
)
from proveedores.api_views import radicacion_api

from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    # HTML views (mantienen compatibilidad)
    path("vinculacion/<str:token>/", formulario_vinculacion, name="formulario_vinculacion"),
    path("radicacion/<str:token>/", radicar_cuenta, name="radicar_cuenta"),
    
    # API endpoints (nuevos para React)
    path("api/vinculacion/<str:token>/", vinculacion_api, name="vinculacion_api"),
    path("api/radicacion/<str:token>/", radicacion_api, name="radicacion_api"),
    
    # Document upload endpoints
    path("api/terceros/<int:tercero_id>/documentos/<str:documento_tipo_code>/upload", 
         upload_documento, name="upload_documento"),
    path("api/terceros/<int:tercero_id>/documentos/bulk-upload", 
         bulk_upload_documentos, name="bulk_upload_documentos"),
    
    # Tercero status endpoint
    path("api/terceros/<int:tercero_id>/status/",
         tercero_status, name="tercero_status"),
    
    # Profile CRUD endpoints - Estudios
    path("api/terceros/<int:tercero_id>/estudios/", 
         EstudioViewSet.as_view({'get': 'list', 'post': 'create'}), name="tercero_estudios"),
    path("api/terceros/<int:tercero_id>/estudios/<int:pk>/",
         EstudioViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}),
         name="tercero_estudio_detail"),
    
    # Profile CRUD endpoints - Cursos
    path("api/terceros/<int:tercero_id>/cursos/",
         CursoViewSet.as_view({'get': 'list', 'post': 'create'}), name="tercero_cursos"),
    path("api/terceros/<int:tercero_id>/cursos/<int:pk>/",
         CursoViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}),
         name="tercero_curso_detail"),
    
    # Profile CRUD endpoints - Certificaciones
    path("api/terceros/<int:tercero_id>/certificaciones/",
         CertificacionViewSet.as_view({'get': 'list', 'post': 'create'}), name="tercero_certificaciones"),
    path("api/terceros/<int:tercero_id>/certificaciones/<int:pk>/",
         CertificacionViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}),
         name="tercero_certificacion_detail"),
    
    # Profile CRUD endpoints - Experiencias
    path("api/terceros/<int:tercero_id>/experiencias/",
         ExperienciaLaboralViewSet.as_view({'get': 'list', 'post': 'create'}), name="tercero_experiencias"),
    path("api/terceros/<int:tercero_id>/experiencias/<int:pk>/",
         ExperienciaLaboralViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}),
         name="tercero_experiencia_detail"),
    
    # Profile CRUD endpoints - Idiomas
    path("api/terceros/<int:tercero_id>/idiomas/",
         TerceroIdiomaViewSet.as_view({'get': 'list', 'post': 'create'}), name="tercero_idiomas"),
    path("api/terceros/<int:tercero_id>/idiomas/<int:pk>/",
         TerceroIdiomaViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}),
         name="tercero_idioma_detail"),
    
    # Profile singleton - Seguridad Social
    path("api/terceros/<int:tercero_id>/seguridad-social/",
         SeguridadSocialView.as_view(), name="tercero_seguridad_social"),
    
    # Idiomas catalog
    path("api/idiomas/", IdiomaListView.as_view(), name="idiomas_list"),
]

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

