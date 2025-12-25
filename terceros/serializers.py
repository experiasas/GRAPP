from rest_framework import serializers
from .models import InvitacionVinculacion, Tercero, TipoTercero
from tenancy.models import Empresa


class TipoTerceroSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoTercero
        fields = ['code', 'nombre']


class EmpresaBasicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Empresa
        fields = ['id', 'nombre']


class InvitacionVinculacionSerializer(serializers.ModelSerializer):
    tipo_tercero = TipoTerceroSerializer(read_only=True)
    empresa = EmpresaBasicSerializer(read_only=True)
    
    class Meta:
        model = InvitacionVinculacion
        fields = ['email', 'tipo_tercero', 'empresa']


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
