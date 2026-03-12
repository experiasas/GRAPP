import io
import zipfile
from pathlib import Path

from django.contrib import admin
from django.http import HttpResponse
from django.conf import settings

# Register your models here.
from .models import (
    TipoTercero, Tercero, TerceroTipo,
    DocumentoTipo, DocumentoRequerido, DocumentoTercero,
    Estudio, Curso, Certificacion, ExperienciaLaboral,
    Idioma, TerceroIdioma, SeguridadSocial,
    SolicitudActualizacionTercero , InvitacionVinculacion
)

def _aplicar_marca_agua(pdf_bytes: bytes, marca_path: Path) -> bytes:
    """
    Coloca marca_agua.pdf como fondo y el contenido del documento encima.
    El PDF de marca ya tiene la opacidad adecuada incorporada.
    Devuelve el PDF original sin modificar si algo falla.
    """
    try:
        import copy
        from PyPDF2 import PdfReader, PdfWriter

        marca_reader = PdfReader(str(marca_path))
        doc_reader = PdfReader(io.BytesIO(pdf_bytes))
        writer = PdfWriter()

        for doc_page in doc_reader.pages:
            wm = copy.copy(marca_reader.pages[0])
            wm.merge_page(doc_page)
            writer.add_page(wm)

        out = io.BytesIO()
        writer.write(out)
        return out.getvalue()
    except Exception:
        return pdf_bytes  # si falla, devuelve el original intacto


admin.site.register(TipoTercero)
admin.site.register(TerceroTipo)
admin.site.register(DocumentoTipo)
admin.site.register(DocumentoRequerido)
admin.site.register(DocumentoTercero)

admin.site.register(Estudio)
admin.site.register(Curso)
admin.site.register(Certificacion)
admin.site.register(ExperienciaLaboral)

admin.site.register(Idioma)
admin.site.register(TerceroIdioma)
admin.site.register(SeguridadSocial)

admin.site.register(SolicitudActualizacionTercero)

@admin.register(InvitacionVinculacion)
class InvitacionVinculacionAdmin(admin.ModelAdmin):
    list_display = ("email", "empresa", "tipo_tercero", "estado", "created_at")
    readonly_fields = ("token", "created_at", "used_at")

    fieldsets = (
        (None, {
            "fields": ("empresa", "email", "tipo_tercero", "estado")
        }),
        ("Acceso", {
            "fields": ("token", "created_at", "used_at")
        }),
    )

class TerceroTipoInline(admin.TabularInline):
    model = TerceroTipo
    extra = 1  # cuántas filas vacías muestra

@admin.register(Tercero)
class TerceroAdmin(admin.ModelAdmin):
    inlines = [TerceroTipoInline]
    actions = ["aprobar_terceros", "descargar_documentos_zip"]
    list_display = (
        "id",
        "empresa",
        "nombre_mostrar",
        "tipo_persona",
        "tipo_doc",
        "documento",
        "estado",
    )
    search_fields = (
        "documento",
        "razon_social",
        "nombre1",
        "apellido1",
        "email",
    )
    list_filter = (
        "estado",
        "tipo_persona",
        "empresa",
    )

    def save_model(self, request, obj, form, change):
        """
        Detecta cuando el estado cambia a APROBADO desde el formulario
        de edición individual y dispara la creación de usuario + envío de correo.
        """
        estado_anterior = None
        if change:
            estado_anterior = Tercero.objects.filter(pk=obj.pk).values_list("estado", flat=True).first()

        # Registrar quién aprobó si cambia a APROBADO
        if obj.estado == Tercero.Estado.APROBADO and estado_anterior != Tercero.Estado.APROBADO:
            from django.utils import timezone
            obj.aprobado_por = request.user
            obj.aprobado_at = timezone.now()

        super().save_model(request, obj, form, change)

        # Disparar flujo de activación si acaba de ser aprobado
        if obj.estado == Tercero.Estado.APROBADO and estado_anterior != Tercero.Estado.APROBADO:
            self._activar_tercero(request, obj)

    def _activar_tercero(self, request, tercero):
        """Crea usuario, genera token y envía correo de activación."""
        from django.contrib.auth import get_user_model
        from django.utils import timezone
        from django.utils.crypto import get_random_string
        from datetime import timedelta
        from .models import TokenActivacionTercero

        User = get_user_model()

        # Crear o enlazar usuario si no tiene uno aún
        if tercero.email and not tercero.usuario:
            user_existente = User.objects.filter(email=tercero.email).first()
            if not user_existente:
                username = tercero.email
                if User.objects.filter(username=username).exists():
                    username = f"{tercero.email.split('@')[0]}_{tercero.id}"
                user_existente = User.objects.create_user(
                    username=username,
                    email=tercero.email,
                    password=None,
                    is_active=False,
                )

            # Verificar que el usuario no esté ya vinculado a otro tercero
            ya_vinculado = Tercero.objects.filter(
                usuario=user_existente
            ).exclude(pk=tercero.pk).exists()

            if ya_vinculado:
                self.message_user(
                    request,
                    f"El usuario con email {tercero.email} ya está vinculado a otro tercero. "
                    f"No se generó acceso para {tercero}.",
                    level="warning",
                )
                return

            tercero.usuario = user_existente
            tercero.save(update_fields=["usuario"])

        if not tercero.usuario:
            self.message_user(
                request,
                f"{tercero} aprobado, pero no tiene email — no se generó acceso.",
                level="warning",
            )
            return

        # Crear o renovar token
        token_obj, created = TokenActivacionTercero.objects.get_or_create(usuario=tercero.usuario)
        if not created and not token_obj.is_valid():
            token_obj.token = get_random_string(64)
            token_obj.expires_at = timezone.now() + timedelta(hours=48)
            token_obj.save()

        # Enviar correo
        try:
            from .emails import enviar_correo_activacion
            enviar_correo_activacion(tercero, token_obj)
            self.message_user(request, f"Correo de activación enviado a {tercero.email}.")
        except Exception as exc:
            self.message_user(
                request,
                f"{tercero} aprobado, pero falló el envío del correo: {exc}",
                level="warning",
            )

    @admin.action(description="Aprobar y generar acceso para seleccionados")
    def aprobar_terceros(self, request, queryset):
        from django.utils import timezone

        aprobados_count = 0
        for tercero in queryset:
            if tercero.estado != Tercero.Estado.APROBADO:
                tercero.estado = Tercero.Estado.APROBADO
                tercero.aprobado_por = request.user
                tercero.aprobado_at = timezone.now()
                tercero.save()
                self._activar_tercero(request, tercero)
                aprobados_count += 1

        self.message_user(request, f"{aprobados_count} tercero(s) aprobados. Se enviaron los correos de activación.")

    @admin.action(description="Descargar documentos como ZIP (con marca de agua)")
    def descargar_documentos_zip(self, request, queryset):
        marca_path = Path(getattr(settings, "MARCA_AGUA_PATH", Path(settings.BASE_DIR) / "marca_agua.pdf"))
        varios = queryset.count() > 1

        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
            for tercero in queryset:
                docs = tercero.documentos.filter(archivo__isnull=False).exclude(archivo="").select_related("documento_tipo")
                carpeta = "".join(c for c in tercero.nombre_mostrar() if c.isalnum() or c in " _-")[:50].strip()

                for doc in docs:
                    try:
                        ext = Path(doc.archivo.name).suffix.lower()
                        tipo_nombre = "".join(c for c in doc.documento_tipo.nombre if c.isalnum() or c in " _-")
                        filename = f"{tipo_nombre}{ext}"
                        arcname = f"{carpeta}/{filename}" if varios else filename

                        with doc.archivo.open("rb") as f:
                            contenido = f.read()

                        if ext == ".pdf" and marca_path.exists():
                            contenido = _aplicar_marca_agua(contenido, marca_path)

                        zf.writestr(arcname, contenido)
                    except Exception:
                        continue

        buffer.seek(0)

        if varios:
            zip_name = "documentos_terceros.zip"
        else:
            t = queryset.first()
            safe = "".join(c for c in t.nombre_mostrar() if c.isalnum() or c in " _-")[:40].strip()
            zip_name = f"{t.documento}_{safe}.zip"

        response = HttpResponse(buffer.read(), content_type="application/zip")
        response["Content-Disposition"] = f'attachment; filename="{zip_name}"'
        return response

