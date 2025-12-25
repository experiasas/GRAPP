from rest_framework import serializers
from .models import InvitacionRadicacion, CuentaCobro
from terceros.models import Tercero
from tenancy.models import Empresa


class ProveedorBasicSerializer(serializers.ModelSerializer):
    nombre = serializers.SerializerMethodField()
    
    def get_nombre(self, obj):
        return obj.nombre_mostrar()
    
    class Meta:
        model = Tercero
        fields = ['id', 'nombre']


class EmpresaBasicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Empresa
        fields = ['id', 'nombre']


class InvitacionRadicacionSerializer(serializers.ModelSerializer):
    proveedor = ProveedorBasicSerializer(read_only=True)
    empresa = EmpresaBasicSerializer(read_only=True)
    
    class Meta:
        model = InvitacionRadicacion
        fields = ['email', 'proveedor', 'empresa']


class CuentaCobroCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CuentaCobro
        fields = ['numero', 'periodo', 'concepto', 'valor', 'soporte']
