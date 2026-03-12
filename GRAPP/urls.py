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
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from terceros.views import formulario_vinculacion
from proveedores.views import radicar_cuenta

# API views
from terceros.api_views import vinculacion_api, upload_documento, bulk_upload_documentos, tercero_status, get_tercero_detail, get_documentos_requeridos_filtrados, activar_cuenta_tercero, auth_me
from terceros.admin_api import admin_stats, admin_terceros_list, admin_cuentas_list
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from terceros.viewsets import (
    EstudioViewSet, CursoViewSet, CertificacionViewSet,
    ExperienciaLaboralViewSet, TerceroIdiomaViewSet,
    SeguridadSocialView, IdiomaListView, TerceroTagsView
)
# from proveedores.api_views import radicacion_api # Obsoleto: Portal de terceros
from proveedores.wizard_viewsets import CuentaCobroWizardViewSet, TipoAnexoViewSet

from django.conf import settings
from django.conf.urls.static import static

# DRF Router for wizard endpoints
router = DefaultRouter()
router.register(r'cuentas-cobro', CuentaCobroWizardViewSet, basename='cuentacobro')
router.register(r'tipos-anexo', TipoAnexoViewSet, basename='tipoanexo')

urlpatterns = [
    path('admin/', admin.site.urls),
    # HTML views (mantienen compatibilidad)
    path("vinculacion/<str:token>/", formulario_vinculacion, name="formulario_vinculacion"),
    path("radicacion/<str:token>/", radicar_cuenta, name="radicar_cuenta"),
    
    # API endpoints (nuevos para React)
    path("api/vinculacion/<str:token>/", vinculacion_api, name="vinculacion_api"),
    # path("api/radicacion/<str:token>/", radicacion_api, name="radicacion_api"), # Obsoleto: reemplazado por NuevaRadicacion
    
    # Document upload endpoints
    path("api/terceros/<int:tercero_id>/documentos/<str:documento_tipo_code>/upload", 
         upload_documento, name="upload_documento"),
    path("api/terceros/<int:tercero_id>/documentos/bulk-upload", 
         bulk_upload_documentos, name="bulk_upload_documentos"),
    
    
    # Tercero status endpoint
    path("api/terceros/<int:tercero_id>/status/",
         tercero_status, name="tercero_status"),

    # Tercero detail endpoint (persistence)
    path("api/terceros/<int:tercero_id>/",
            get_tercero_detail, name="tercero_detail"),
    
    # Filtered documents endpoint
    path("api/vinculacion/<str:token>/documentos/",
         get_documentos_requeridos_filtrados, name="documentos_filtrados"),

    # Activación de cuenta para terceros
    path("api/auth/activar/<str:token>/",
         activar_cuenta_tercero, name="activar_cuenta_tercero"),
         
    # JWT Authentication Endpoints
    path('api/auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/me/', auth_me, name='auth_me'),

    # Admin API endpoints
    path('api/admin/stats/', admin_stats, name='admin_stats'),
    path('api/admin/terceros/', admin_terceros_list, name='admin_terceros_list'),
    path('api/admin/cuentas/', admin_cuentas_list, name='admin_cuentas_list'),

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
    
    # Tags endpoints
    path("api/terceros/<int:tercero_id>/tags/", TerceroTagsView.as_view(), name="tercero_tags"),
    
    # Wizard API endpoints (DRF router)
    path('api/', include(router.urls)),
]

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

