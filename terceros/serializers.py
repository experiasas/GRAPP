from rest_framework import serializers
from .models import (
    InvitacionVinculacion, Tercero, TipoTercero, DocumentoRequerido,
    Estudio, Curso, Certificacion, ExperienciaLaboral,
    Idioma, TerceroIdioma, SeguridadSocial, Tag
)
from tenancy.models import Empresa


class TipoTerceroSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoTercero
        fields = ['code', 'nombre']


class EmpresaBasicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Empresa
        fields = ['id', 'nombre']


class DocumentoRequeridoSerializer(serializers.ModelSerializer):
    """Serializer for required documents per tipo_tercero"""
    documento_tipo_code = serializers.CharField(source='documento_tipo.code')
    documento_tipo_nombre = serializers.CharField(source='documento_tipo.nombre')
    
    class Meta:
        model = DocumentoRequerido
        fields = ['documento_tipo_code', 'documento_tipo_nombre', 'obligatorio', 'aplica_a_persona']


class InvitacionVinculacionSerializer(serializers.ModelSerializer):
    tipo_tercero = TipoTerceroSerializer(read_only=True)
    empresa = EmpresaBasicSerializer(read_only=True)
    documentos_requeridos = serializers.SerializerMethodField()
    
    class Meta:
        model = InvitacionVinculacion
        fields = ['email', 'tipo_tercero', 'empresa', 'documentos_requeridos']
    
    def get_documentos_requeridos(self, obj):
        """Return list of required documents for this tipo_tercero"""
        docs = DocumentoRequerido.objects.filter(tipo_tercero=obj.tipo_tercero)
        return DocumentoRequeridoSerializer(docs, many=True).data



class TerceroCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tercero
        fields = [
            'tipo_persona', 'tipo_doc', 'documento',
            'nombre1', 'nombre2', 'apellido1', 'apellido2',
            'razon_social', 'email', 'telefono', 'celular',
            'direccion', 'ciudad', 'departamento', 'pais', 'cod_postal',
            'tipo_regimen', 'responsabilidades_tributarias',
            'email_facturacion_electronica',
            'rl_nombre', 'rl_tipo_doc', 'rl_documento',
            'tes_contacto', 'tes_cargo', 'tes_email'
        ]


# ========================================
# Serializers para Información Adicional / Perfil
# ========================================

class EstudioSerializer(serializers.ModelSerializer):
    """Serializer for educational background"""
    nivel_display = serializers.CharField(source='get_nivel_display', read_only=True)
    
    class Meta:
        model = Estudio
        fields = [
            'id', 'nivel', 'nivel_display', 'institucion', 'titulo',
            'fecha_inicio', 'fecha_fin', 'soporte', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
    
    def validate(self, data):
        if data.get('fecha_inicio') and data.get('fecha_fin'):
            if data['fecha_fin'] < data['fecha_inicio']:
                raise serializers.ValidationError(
                    "La fecha de finalización no puede ser anterior a la fecha de inicio"
                )
        return data


class CursoSerializer(serializers.ModelSerializer):
    """Serializer for courses and training"""
    
    class Meta:
        model = Curso
        fields = ['id', 'nombre', 'entidad', 'horas', 'soporte', 'created_at']
        read_only_fields = ['id', 'created_at']


class CertificacionSerializer(serializers.ModelSerializer):
    """Serializer for certifications (including vendor certifications)"""
    
    class Meta:
        model = Certificacion
        fields = ['id', 'nombre', 'fabricante', 'fecha', 'soporte', 'created_at']
        read_only_fields = ['id', 'created_at']


class ExperienciaLaboralSerializer(serializers.ModelSerializer):
    """Serializer for work experience"""
    
    class Meta:
        model = ExperienciaLaboral
        fields = [
            'id', 'empresa', 'cargo', 'fecha_inicio', 'fecha_fin',
            'soporte', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
    
    def validate(self, data):
        if data.get('fecha_inicio') and data.get('fecha_fin'):
            if data['fecha_fin'] < data['fecha_inicio']:
                raise serializers.ValidationError(
                    "La fecha de finalización no puede ser anterior a la fecha de inicio"
                )
        return data


class IdiomaSerializer(serializers.ModelSerializer):
    """Serializer for language catalog"""
    
    class Meta:
        model = Idioma
        fields = ['code', 'nombre']


class TerceroIdiomaSerializer(serializers.ModelSerializer):
    """Serializer for tercero languages with proficiency level"""
    idioma = IdiomaSerializer(read_only=True)
    idioma_code = serializers.CharField(write_only=True)
    nivel_display = serializers.CharField(source='get_nivel_display', read_only=True)
    
    class Meta:
        model = TerceroIdioma
        fields = ['id', 'idioma', 'idioma_code', 'nivel', 'nivel_display']
        read_only_fields = ['id']
    
    def create(self, validated_data):
        idioma_code = validated_data.pop('idioma_code')
        idioma = Idioma.objects.get(code=idioma_code)
        validated_data['idioma'] = idioma
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        if 'idioma_code' in validated_data:
            idioma_code = validated_data.pop('idioma_code')
            instance.idioma = Idioma.objects.get(code=idioma_code)
        return super().update(instance, validated_data)


class SeguridadSocialSerializer(serializers.ModelSerializer):
    """Serializer for social security information"""
    
    class Meta:
        model = SeguridadSocial
        fields = ['eps', 'arl', 'afp', 'soporte', 'updated_at']
        read_only_fields = ['updated_at']


# ========================================
# Serializers para Tags System
# ========================================

class TagSerializer(serializers.ModelSerializer):
    """Serializer for Tag model"""
    
    class Meta:
        model = Tag
        fields = ['nombre', 'slug', 'created_at']
        read_only_fields = ['slug', 'created_at']
