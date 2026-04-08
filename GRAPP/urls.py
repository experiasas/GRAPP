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
from terceros.admin_api import (
    admin_stats, admin_terceros_list, admin_tercero_detalle,
    admin_cambiar_estado_tercero, admin_crear_invitacion,
    admin_cuentas_list, admin_terceros_pendientes, admin_documentos_recientes,
    admin_descargar_documentos_tercero, admin_historial_descargas_tercero,
    admin_tipos_tercero, admin_tipo_tercero_detalle,
)
from tenancy.admin_api import (
    admin_empresas_list, admin_empresa_detalle,
    admin_empresa_contacto_crear, admin_empresa_contacto_detalle,
)
from proveedores.admin_api import (
    admin_cuentas_cobro_list, admin_cuenta_cobro_detalle, admin_cuenta_cobro_estado,
)
from proveedores.admin_oc_api import (
    admin_ordenes_compra_list, admin_orden_compra_detalle,
    admin_orden_compra_estado, admin_orden_compra_radicaciones,
    admin_mis_ordenes_compra_portal,
)
from contratos.admin_api import (
    admin_tipos_contrato_list, admin_tipos_anexo_contrato_list,
    admin_contratos_list, admin_contrato_detalle, admin_contrato_estado,
    admin_contrato_polizas, admin_contrato_poliza_detalle,
    admin_contrato_otrosis, admin_contrato_otrosi_detalle,
    admin_contrato_formas_pago, admin_contrato_forma_pago_detalle,
    admin_contrato_anexos, admin_contrato_anexo_detalle,
)
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
    path('api/admin/tipos-tercero/', admin_tipos_tercero, name='admin_tipos_tercero'),
    path('api/admin/tipos-tercero/<int:tipo_id>/', admin_tipo_tercero_detalle, name='admin_tipo_tercero_detalle'),
    path('api/admin/terceros/<int:tercero_id>/detalle/', admin_tercero_detalle, name='admin_tercero_detalle'),
    path('api/admin/terceros/<int:tercero_id>/estado/', admin_cambiar_estado_tercero, name='admin_cambiar_estado_tercero'),
    path('api/admin/invitaciones/', admin_crear_invitacion, name='admin_crear_invitacion'),
    path('api/admin/empresas/', admin_empresas_list, name='admin_empresas_list'),
    path('api/admin/empresas/<int:empresa_id>/', admin_empresa_detalle, name='admin_empresa_detalle'),
    path('api/admin/empresas/<int:empresa_id>/contactos/', admin_empresa_contacto_crear, name='admin_empresa_contacto_crear'),
    path('api/admin/empresas/<int:empresa_id>/contactos/<int:contacto_id>/', admin_empresa_contacto_detalle, name='admin_empresa_contacto_detalle'),
    # Contratos — catálogos
    path('api/admin/tipos-contrato/', admin_tipos_contrato_list, name='admin_tipos_contrato_list'),
    path('api/admin/tipos-anexo-contrato/', admin_tipos_anexo_contrato_list, name='admin_tipos_anexo_contrato_list'),

    # Contratos — CRUD
    path('api/admin/contratos/', admin_contratos_list, name='admin_contratos_list'),
    path('api/admin/contratos/<int:contrato_id>/', admin_contrato_detalle, name='admin_contrato_detalle'),
    path('api/admin/contratos/<int:contrato_id>/estado/', admin_contrato_estado, name='admin_contrato_estado'),

    # Contratos — pólizas
    path('api/admin/contratos/<int:contrato_id>/polizas/', admin_contrato_polizas, name='admin_contrato_polizas'),
    path('api/admin/contratos/<int:contrato_id>/polizas/<int:poliza_id>/', admin_contrato_poliza_detalle, name='admin_contrato_poliza_detalle'),

    # Contratos — otrosíes
    path('api/admin/contratos/<int:contrato_id>/otrosis/', admin_contrato_otrosis, name='admin_contrato_otrosis'),
    path('api/admin/contratos/<int:contrato_id>/otrosis/<int:otrosi_id>/', admin_contrato_otrosi_detalle, name='admin_contrato_otrosi_detalle'),

    # Contratos — formas de pago
    path('api/admin/contratos/<int:contrato_id>/formas-pago/', admin_contrato_formas_pago, name='admin_contrato_formas_pago'),
    path('api/admin/contratos/<int:contrato_id>/formas-pago/<int:forma_id>/', admin_contrato_forma_pago_detalle, name='admin_contrato_forma_pago_detalle'),

    # Contratos — anexos
    path('api/admin/contratos/<int:contrato_id>/anexos/', admin_contrato_anexos, name='admin_contrato_anexos'),
    path('api/admin/contratos/<int:contrato_id>/anexos/<int:anexo_id>/', admin_contrato_anexo_detalle, name='admin_contrato_anexo_detalle'),

    path('api/admin/cuentas/', admin_cuentas_list, name='admin_cuentas_list'),
    # Cuentas de cobro — admin completo
    path('api/admin/cuentas-cobro/', admin_cuentas_cobro_list, name='admin_cuentas_cobro_list'),
    path('api/admin/cuentas-cobro/<int:cuenta_id>/detalle/', admin_cuenta_cobro_detalle, name='admin_cuenta_cobro_detalle'),
    path('api/admin/cuentas-cobro/<int:cuenta_id>/estado/', admin_cuenta_cobro_estado, name='admin_cuenta_cobro_estado'),
    path('api/admin/terceros/<int:tercero_id>/descargar-documentos/', admin_descargar_documentos_tercero, name='admin_descargar_documentos_tercero'),
    path('api/admin/terceros/<int:tercero_id>/descargas/', admin_historial_descargas_tercero, name='admin_historial_descargas_tercero'),
    path('api/admin/terceros-pendientes/', admin_terceros_pendientes, name='admin_terceros_pendientes'),
    path('api/admin/documentos-recientes/', admin_documentos_recientes, name='admin_documentos_recientes'),

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

    # Órdenes de Compra — admin CRUD
    path('api/admin/ordenes-compra/', admin_ordenes_compra_list, name='admin_ordenes_compra_list'),
    path('api/admin/ordenes-compra/<int:oc_id>/', admin_orden_compra_detalle, name='admin_orden_compra_detalle'),
    path('api/admin/ordenes-compra/<int:oc_id>/estado/', admin_orden_compra_estado, name='admin_orden_compra_estado'),
    path('api/admin/ordenes-compra/<int:oc_id>/radicaciones/', admin_orden_compra_radicaciones, name='admin_orden_compra_radicaciones'),

    # Portal terceros: OCs disponibles
    path('api/mis-ordenes-compra/', admin_mis_ordenes_compra_portal, name='mis_ordenes_compra'),
]

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

