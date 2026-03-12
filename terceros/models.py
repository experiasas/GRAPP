from django.db import models

# Create your models here.
# terceros/models.py
import os
from uuid import uuid4
from django.db import models
from django.contrib.auth import get_user_model
from django.utils.crypto import get_random_string

from tenancy.models import Empresa  

def upload_doc_tercero(instance, filename):
    ext = os.path.splitext(filename)[1].lower()
    return (
        f"terceros/anexos/"
        f"{instance.empresa_id}/"
        f"{instance.tercero_id}/"
        f"{instance.documento_tipo.code}/"
        f"{uuid4().hex}{ext}"
    )

User = get_user_model()


# -------------------------
# 1) Tipos de tercero
# -------------------------
class TipoTercero(models.Model):
    """
    Cliente, Proveedor, Contratista/Empleado, Socio, Aspirante.
    """
    code = models.CharField(max_length=30, unique=True)  # CLIENTE, PROVEEDOR, CONTRATISTA, SOCIO, ASPIRANTE
    nombre = models.CharField(max_length=60)
    

    def __str__(self):
        return self.nombre


class InvitacionVinculacion(models.Model):
    class Estado(models.TextChoices):
        PENDIENTE = "PENDIENTE", "Pendiente"
        USADA = "USADA", "Usada"
        EXPIRADA = "EXPIRADA", "Expirada"

    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE)
    email = models.EmailField()
    estado = models.CharField(max_length=20, choices=Estado.choices, default=Estado.PENDIENTE)

    token = models.CharField(max_length=64, unique=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    used_at = models.DateTimeField(null=True, blank=True)

    tipo_tercero = models.ForeignKey(
        TipoTercero,
        on_delete=models.PROTECT,
        related_name="invitaciones"
    )

    def save(self, *args, **kwargs):
        if not self.token:
            self.token = get_random_string(48)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.email} ({self.estado})"



# -------------------------
# 2) Tercero (núcleo)
# -------------------------
class Tercero(models.Model):
    class Estado(models.TextChoices):
        BORRADOR = "BORRADOR", "Borrador"
        PENDIENTE = "PENDIENTE", "Pendiente aprobación"
        APROBADO = "APROBADO", "Aprobado"
        RECHAZADO = "RECHAZADO", "Rechazado"

    class TipoPersona(models.TextChoices):
        NATURAL = "NATURAL", "Persona natural"
        JURIDICA = "JURIDICA", "Persona jurídica"

    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="terceros")
    usuario = models.OneToOneField(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="tercero_perfil", help_text="Usuario vinculado para portal de terceros")

    # Forma de persona
    tipo_persona = models.CharField(max_length=20, choices=TipoPersona.choices, default=TipoPersona.JURIDICA)

    # Identificación
    tipo_doc = models.CharField(max_length=30)  # CC, CE, NIT, PASAPORTE, etc.
    documento = models.CharField(max_length=40)

    # Natural
    nombre1 = models.CharField(max_length=60, blank=True, null=True)
    nombre2 = models.CharField(max_length=60, blank=True, null=True)
    apellido1 = models.CharField(max_length=60, blank=True, null=True)
    apellido2 = models.CharField(max_length=60, blank=True, null=True)

    # Jurídica
    razon_social = models.CharField(max_length=200, blank=True, null=True)

    # Contacto / ubicación
    email = models.EmailField(blank=True, null=True)
    telefono = models.CharField(max_length=30, blank=True, null=True)
    celular = models.CharField(max_length=30, blank=True, null=True)
    direccion = models.CharField(max_length=200, blank=True, null=True)
    ciudad = models.CharField(max_length=80, blank=True, null=True)
    departamento = models.CharField(max_length=80, blank=True, null=True)
    pais = models.CharField(max_length=80, blank=True, null=True)
    cod_postal = models.CharField(max_length=20, blank=True, null=True)

    # Tributario (si lo necesitas en vinculación)
    tipo_regimen = models.CharField(max_length=50, blank=True, null=True)
    responsabilidades_tributarias = models.TextField(blank=True, null=True)

    # Información tributaria estructurada (principalmente persona jurídica)
    class RegimenTributario(models.TextChoices):
        ORDINARIO = "ORDINARIO", "Régimen Ordinario"
        SIMPLE    = "SIMPLE",    "Régimen Simple de Tributación"

    responsable_iva = models.BooleanField(
        null=True, blank=True,
        verbose_name="Responsable de IVA",
        help_text="¿El tercero es responsable de IVA ante la DIAN?"
    )
    agente_retenedor = models.BooleanField(
        null=True, blank=True,
        verbose_name="Agente Retenedor",
        help_text="¿El tercero actúa como agente retenedor?"
    )
    regimen_tributario = models.CharField(
        max_length=20,
        choices=RegimenTributario.choices,
        null=True, blank=True,
        verbose_name="Régimen Tributario",
        help_text="Régimen tributario del tercero"
    )

    # Facturación electrónica (requisito para Cliente)
    email_facturacion_electronica = models.EmailField(blank=True, null=True)

    # Representante legal (para jurídica)
    rl_nombre = models.CharField(max_length=120, blank=True, null=True)
    rl_tipo_doc = models.CharField(max_length=30, blank=True, null=True)
    rl_documento = models.CharField(max_length=40, blank=True, null=True)

    # Tesorería/finanzas (opcional)
    tes_contacto = models.CharField(max_length=120, blank=True, null=True)
    tes_cargo = models.CharField(max_length=120, blank=True, null=True)
    tes_email = models.EmailField(blank=True, null=True)

    # Flujo aprobación
    estado = models.CharField(max_length=20, choices=Estado.choices, default=Estado.BORRADOR)
    aprobado_por = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="terceros_aprobados")
    aprobado_at = models.DateTimeField(null=True, blank=True)
    observaciones_aprobacion = models.TextField(blank=True, null=True)

    # Tipos asignados (cliente/proveedor/...)
    tipos = models.ManyToManyField(TipoTercero, through="TerceroTipo", related_name="terceros")
    
    # Tags para búsqueda y categorización
    tags = models.ManyToManyField('Tag', blank=True, related_name='terceros')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("empresa", "tipo_doc", "documento")
    
    # ========================================
    # Métodos de Completitud para Wizard
    # ========================================
    
    def get_documentos_status(self):
        """
        Retorna el estado de documentos requeridos para este tercero,
        filtrados por tipo_persona.
        """
        from .models import DocumentoRequerido
        from django.db.models import Q
        
        # Obtener todos los tipos asignados a este tercero
        tipos_asignados = self.tipos.all()
        if not tipos_asignados.exists():
            return []
        
        # Filtrar documentos por tipo_tercero Y tipo_persona
        # Incluir documentos que aplican a AMBAS o al tipo_persona específico
        requeridos = DocumentoRequerido.objects.filter(
            tipo_tercero__in=tipos_asignados
        ).filter(
            Q(aplica_a_persona=DocumentoRequerido.AplicaPersona.AMBAS) |
            Q(aplica_a_persona=self.tipo_persona)
        ).select_related('documento_tipo').distinct()
        
        docs_estado = []
        for req in requeridos:
            doc = self.documentos.filter(documento_tipo=req.documento_tipo).first()
            docs_estado.append({
                'code': req.documento_tipo.code,
                'nombre': req.documento_tipo.nombre,
                'obligatorio': req.obligatorio,
                'estado': doc.estado if doc else 'PENDIENTE',
                'cargado': bool(doc and doc.archivo)
            })
        
        return docs_estado
    
    def get_perfil_status(self):
        """
        Retorna completitud de secciones de perfil según tipo de tercero.
        """
        tipo_codes = list(self.tipos.values_list('code', flat=True))
        
        # Determinar qué secciones aplican según tipo
        requiere_perfil_completo = any(
            code in ['CONTRATISTA', 'EMPLEADO', 'ASPIRANTE'] 
            for code in tipo_codes
        )
        
        requiere_idiomas = any(
            code in ['CONTRATISTA', 'EMPLEADO', 'ASPIRANTE', 'SOCIO']
            for code in tipo_codes
        )
        
        perfil = {}
        
        if requiere_perfil_completo:
            perfil['estudios'] = {
                'count': self.estudios.count(),
                'completo': self.estudios.count() >= 1  # al menos 1 estudio
            }
            perfil['cursos'] = {
                'count': self.cursos.count(),
                'completo': True  # opcional
            }
            perfil['certificaciones'] = {
                'count': self.certificaciones.count(),
                'completo': True  # opcional
            }
            perfil['experiencias'] = {
                'count': self.experiencias.count(),
                'completo': self.experiencias.count() >= 0  # opcional
            }
            perfil['seguridad_social'] = {
                'completo': hasattr(self, 'seguridad_social')
            }
        
        if requiere_idiomas:
            perfil['idiomas'] = {
                'count': self.idiomas.count(),
                'completo': self.idiomas.count() >= 1  # al menos 1 idioma
            }
        
        return perfil
    
    def is_documentos_completo(self):
        """
        Verifica si todos los documentos obligatorios están cargados,
        filtrados por tipo_persona.
        """
        from .models import DocumentoRequerido
        from django.db.models import Q
        
        tipos_asignados = self.tipos.all()
        if not tipos_asignados.exists():
            return False
        
        # Filtrar documentos obligatorios por tipo_persona
        requeridos = DocumentoRequerido.objects.filter(
            tipo_tercero__in=tipos_asignados,
            obligatorio=True
        ).filter(
            Q(aplica_a_persona=DocumentoRequerido.AplicaPersona.AMBAS) |
            Q(aplica_a_persona=self.tipo_persona)
        ).distinct()
       
        for req in requeridos:
            doc = self.documentos.filter(
                documento_tipo=req.documento_tipo
            ).first()
            
            # Documento debe existir, tener archivo y estar cargado
            if not doc or doc.estado != 'CARGADO' or not doc.archivo:
                return False
        
        return True
    
    def is_perfil_completo(self):
        """
        Verifica si el perfil está completo según tipo de tercero.
        """
        perfil = self.get_perfil_status()
        
        # Si no requiere perfil adicional, está completo
        if not perfil:
            return True
        
        # Verificar cada sección requerida
        for seccion, data in perfil.items():
            if not data.get('completo', True):
                return False
        
        return True
    
    def can_submit_for_approval(self):
        """
        Verifica si está listo para enviar a aprobación.
        """
        return self.is_documentos_completo() and self.is_perfil_completo()
    
    # ========================================

    def __str__(self):
        return self.nombre_mostrar()

    def nombre_mostrar(self) -> str:
        if self.tipo_persona == self.TipoPersona.JURIDICA:
            return self.razon_social or f"{self.tipo_doc} {self.documento}"
        partes = [self.nombre1, self.nombre2, self.apellido1, self.apellido2]
        nombre = " ".join([p for p in partes if p])
        return nombre or f"{self.tipo_doc} {self.documento}"


class TerceroTipo(models.Model):
    tercero = models.ForeignKey(Tercero, on_delete=models.CASCADE)
    tipo = models.ForeignKey(TipoTercero, on_delete=models.PROTECT)

    class Meta:
        unique_together = ("tercero", "tipo")
        verbose_name = "Tipo de Tercero"
        verbose_name_plural = "Tipos de Terceros"

    def __str__(self):
        return f"{self.tercero} - {self.tipo}"


# -------------------------
# 3) Documentos (Anexos)
# -------------------------
class DocumentoTipo(models.Model):
    """
    Tipos de documentos anexos: RUT, Cámara y Comercio, Cédula RL, NDA,
    Tratamiento datos, Declaración Origen Fondos, Estados Financieros, SS, etc.
    """
    code = models.CharField(max_length=40, unique=True)  # RUT, CAMARA_COMERCIO, CEDULA_RL, NDA, TRATAMIENTO_DATOS, DOF, EEFF, SS...
    nombre = models.CharField(max_length=120)

    def __str__(self):
        return self.nombre


class DocumentoRequerido(models.Model):
    """
    Documentos requeridos por tipo de tercero y tipo de persona.
    
    Ej: Cliente requiere RUT, Cámara y Comercio, Cédula RL, EEFF, DOF, NDA, Tratamiento.
        Proveedor requiere RUT, Cámara y Comercio, Cédula RL, Certificación Bancaria, NDA, Tratamiento.
    
    El campo aplica_a_persona permite filtrar documentos según si el tercero es
    persona natural o jurídica.
    """
    class AplicaPersona(models.TextChoices):
        AMBAS = "AMBAS", "Ambas"
        NATURAL = "NATURAL", "Persona natural"
        JURIDICA = "JURIDICA", "Persona jurídica"
    
    tipo_tercero = models.ForeignKey(TipoTercero, on_delete=models.CASCADE, related_name="documentos_requeridos")
    documento_tipo = models.ForeignKey(DocumentoTipo, on_delete=models.PROTECT)
    obligatorio = models.BooleanField(default=True)
    aplica_a_persona = models.CharField(
        max_length=20,
        choices=AplicaPersona.choices,
        default=AplicaPersona.AMBAS,
        help_text="Indica si este documento aplica a personas naturales, jurídicas o ambas"
    )

    class Meta:
        unique_together = ("tipo_tercero", "documento_tipo", "aplica_a_persona")

    def __str__(self):
        return f"{self.tipo_tercero} - {self.documento_tipo} - {self.aplica_a_persona}"



class DocumentoTercero(models.Model):
    class Estado(models.TextChoices):
        PENDIENTE = "PENDIENTE", "Pendiente"
        CARGADO = "CARGADO", "Cargado"
        APROBADO = "APROBADO", "Aprobado"
        RECHAZADO = "RECHAZADO", "Rechazado"

    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="documentos_terceros")
    tercero = models.ForeignKey(Tercero, on_delete=models.CASCADE, related_name="documentos")
    documento_tipo = models.ForeignKey(DocumentoTipo, on_delete=models.PROTECT)

    archivo = models.FileField(
    upload_to=upload_doc_tercero,
    max_length=500,   # defensivo
    blank=True,
    null=True
)
    estado = models.CharField(max_length=20, choices=Estado.choices, default=Estado.PENDIENTE)

    # Campos listos para "firma digital + QR" (MVP2)
    firmado = models.BooleanField(default=False)
    qr_value = models.CharField(max_length=255, blank=True, null=True)
    hash_integridad = models.CharField(max_length=128, blank=True, null=True)

    observaciones = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("tercero", "documento_tipo")

    def __str__(self):
        return f"{self.tercero} - {self.documento_tipo} - {self.estado}"


# -------------------------
# 4) Datos extra para Contratista/Aspirante/Socio
# -------------------------
class Estudio(models.Model):
    class Nivel(models.TextChoices):
        BACHILLER = "BACHILLER", "Bachiller"
        TECNICO = "TECNICO", "Técnico"
        TECNOLOGO = "TECNOLOGO", "Tecnólogo"
        PROFESIONAL = "PROFESIONAL", "Profesional"
        POSGRADO = "POSGRADO", "Posgrado"

    tercero = models.ForeignKey(Tercero, on_delete=models.CASCADE, related_name="estudios")
    nivel = models.CharField(max_length=20, choices=Nivel.choices)
    institucion = models.CharField(max_length=200)
    titulo = models.CharField(max_length=200, blank=True, null=True)
    fecha_inicio = models.DateField(blank=True, null=True)
    fecha_fin = models.DateField(blank=True, null=True)
    soporte = models.FileField(upload_to="terceros/estudios/", blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)


class Curso(models.Model):
    tercero = models.ForeignKey(Tercero, on_delete=models.CASCADE, related_name="cursos")
    nombre = models.CharField(max_length=200)
    entidad = models.CharField(max_length=200, blank=True, null=True)
    horas = models.PositiveIntegerField(blank=True, null=True)
    soporte = models.FileField(upload_to="terceros/cursos/", blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)


class Certificacion(models.Model):
    tercero = models.ForeignKey(Tercero, on_delete=models.CASCADE, related_name="certificaciones")
    nombre = models.CharField(max_length=200)
    fabricante = models.CharField(max_length=200, blank=True, null=True)  # "certificaciones de fabricantes"
    fecha = models.DateField(blank=True, null=True)
    soporte = models.FileField(upload_to="terceros/certificaciones/", blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)


class ExperienciaLaboral(models.Model):
    tercero = models.ForeignKey(Tercero, on_delete=models.CASCADE, related_name="experiencias")
    empresa = models.CharField(max_length=200)
    cargo = models.CharField(max_length=200)
    fecha_inicio = models.DateField(blank=True, null=True)
    fecha_fin = models.DateField(blank=True, null=True)
    soporte = models.FileField(upload_to="terceros/experiencia/", blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)


class Idioma(models.Model):
    code = models.CharField(max_length=30, unique=True)  # ES, EN, PT, FR...
    nombre = models.CharField(max_length=80)

    def __str__(self):
        return self.nombre


class TerceroIdioma(models.Model):
    class Nivel(models.TextChoices):
        BASICO = "BASICO", "Básico"
        INTERMEDIO = "INTERMEDIO", "Intermedio"
        AVANZADO = "AVANZADO", "Avanzado"
        NATIVO = "NATIVO", "Nativo"

    tercero = models.ForeignKey(Tercero, on_delete=models.CASCADE, related_name="idiomas")
    idioma = models.ForeignKey(Idioma, on_delete=models.PROTECT)
    nivel = models.CharField(max_length=20, choices=Nivel.choices)

    class Meta:
        unique_together = ("tercero", "idioma")


class SeguridadSocial(models.Model):
    """
    Para Contratista/Empleado y Aspirante: "SS"
    Puedes ampliarlo (EPS/ARL/AFP) según necesites.
    """
    tercero = models.OneToOneField(Tercero, on_delete=models.CASCADE, related_name="seguridad_social")
    eps = models.CharField(max_length=120, blank=True, null=True)
    arl = models.CharField(max_length=120, blank=True, null=True)
    afp = models.CharField(max_length=120, blank=True, null=True)
    soporte = models.FileField(upload_to="terceros/seguridad_social/", blank=True, null=True)
    updated_at = models.DateTimeField(auto_now=True)


# -------------------------
# 5) Tags para categorización y búsqueda
# -------------------------
class Tag(models.Model):
    """
    Tags para categorizar terceros (tecnologia, biomedico, cctv, etc).
    Los nombres se normalizan automáticamente (lowercase, trim).
    """
    nombre = models.CharField(max_length=50, unique=True, db_index=True)
    slug = models.SlugField(max_length=50, unique=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['nombre']
    
    def save(self, *args, **kwargs):
        # Normalizar nombre: lowercase y trim
        if self.nombre:
            self.nombre = self.nombre.strip().lower()
        
        # Generar slug si no existe
        if not self.slug:
            from django.utils.text import slugify
            self.slug = slugify(self.nombre)
        
        super().save(*args, **kwargs)
    
    def clean(self):
        from django.core.exceptions import ValidationError
        if self.nombre and len(self.nombre.strip()) < 2:
            raise ValidationError('El tag debe tener al menos 2 caracteres')
    
    def __str__(self):
        return self.nombre


# -------------------------
# 6) Actualización de datos con código + aprobación
# -------------------------
class SolicitudActualizacionTercero(models.Model):
    class Estado(models.TextChoices):
        PENDIENTE = "PENDIENTE", "Pendiente"
        APROBADA = "APROBADA", "Aprobada"
        RECHAZADA = "RECHAZADA", "Rechazada"

    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="solicitudes_actualizacion")
    tercero = models.ForeignKey(Tercero, on_delete=models.CASCADE, related_name="solicitudes_actualizacion")

    codigo = models.CharField(max_length=12, unique=True, editable=False)
    cambios = models.JSONField()  # {"email": "...", "direccion": "..."} etc.
    estado = models.CharField(max_length=20, choices=Estado.choices, default=Estado.PENDIENTE)

    solicitado_por = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="solicitudes_actualizacion_creadas")
    aprobado_por = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="solicitudes_actualizacion_aprobadas")
    observaciones = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.codigo:
            self.codigo = get_random_string(12).upper()
        super().save(*args, **kwargs)

# -------------------------
# 7) Activación y Acceso de Terceros
# -------------------------
class TokenActivacionTercero(models.Model):
    usuario = models.OneToOneField(User, on_delete=models.CASCADE, related_name="token_activacion_tercero")
    token = models.CharField(max_length=64, unique=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    def is_valid(self):
        from django.utils import timezone
        return self.expires_at > timezone.now()

    def save(self, *args, **kwargs):
        from django.utils import timezone
        from datetime import timedelta
        if not self.token:
            self.token = get_random_string(64)
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(hours=48)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Token de {self.usuario.email}"
