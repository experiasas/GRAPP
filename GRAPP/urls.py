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
from terceros.api_views import vinculacion_api
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
]

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

