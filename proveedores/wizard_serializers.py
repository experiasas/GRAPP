from rest_framework import serializers
from django.utils import timezone
from django.db import transaction
from decimal import Decimal

from .models import CuentaCobro, TipoAnexo, CuentaCobroAnexo, InvitacionRadicacion
from contratos.models import Contrato


class WizardCreateSerializer(serializers.Serializer):
    """
    Serializer for creating a CuentaCobro in BORRADOR state.
    Requires either a valid token (from InvitacionRadicacion) or explicit proveedor_id.
    """
    token = serializers.CharField(required=False, allow_blank=True)
    proveedor_id = serializers.IntegerField(required=False, allow_null=True)

    def validate(self, data):
        token = data.get('token')
        proveedor_id = data.get('proveedor_id')

        if not token and not proveedor_id:
            raise serializers.ValidationError(
                "Debe proporcionar 'token' o 'proveedor_id'."
            )

        # If token provided, validate invitation
        if token:
            try:
                invitacion = InvitacionRadicacion.objects.get(
                    token=token,
                    estado=InvitacionRadicacion.Estado.PENDIENTE
                )
                data['_invitacion'] = invitacion
                data['_proveedor'] = invitacion.proveedor
                data['_empresa'] = invitacion.empresa
            except InvitacionRadicacion.DoesNotExist:
                raise serializers.ValidationError({
                    'token': 'Invitación no válida o ya utilizada.'
                })
        else:
            # TODO: Validate proveedor_id exists and belongs to empresa
            # For now, assume tenant filtering in view
            from terceros.models import Tercero
            try:
                proveedor = Tercero.objects.get(id=proveedor_id, estado='APROBADO')
                data['_proveedor'] = proveedor
                # empresa should come from request context
            except Tercero.DoesNotExist:
                raise serializers.ValidationError({
                    'proveedor_id': 'Proveedor no válido o no aprobado.'
                })

        return data

    def create(self, validated_data):
        # empresa should be injected from view context
        empresa = self.context.get('empresa')
        if not empresa:
            raise serializers.ValidationError("Empresa no identificada en el contexto.")

        proveedor = validated_data.get('_proveedor')
        invitacion = validated_data.get('_invitacion')
        contrato = invitacion.contrato if invitacion else None
        
        # Check for existing BORRADOR to resume
        existing_borrador = CuentaCobro.objects.filter(
            empresa=empresa,
            proveedor=proveedor,
            estado=CuentaCobro.Estado.BORRADOR
        ).first()

        if existing_borrador:
            # Backfill contract if invitation has one and draft doesn't
            if contrato and not existing_borrador.contrato_id:
                existing_borrador.contrato = contrato
                existing_borrador.save(update_fields=['contrato'])
            
            # Re-attach ephemeral invitation id for this session
            if invitacion:
                existing_borrador._invitacion_id = invitacion.id

            return existing_borrador

        # Create new draft with contract pre-assigned
        cuenta = CuentaCobro.objects.create(
            empresa=empresa,
            proveedor=proveedor,
            contrato=contrato,  # ✅ Pre-assign contract from invitation
            estado=CuentaCobro.Estado.BORRADOR,
            numero='',  # Will be filled in step 1
            periodo='',
            concepto='',
        )
        
        # Store invitacion reference if used
        if invitacion:
            cuenta._invitacion_id = invitacion.id

        return cuenta


class WizardStep1Serializer(serializers.ModelSerializer):
    """
    Serializer for Step 1: Datos Generales.
    """
    class Meta:
        model = CuentaCobro
        fields = ['contrato', 'numero', 'periodo', 'concepto', 'observaciones']

    def validate(self, data):
        # Ensure we're only editing BORRADOR
        instance = self.instance
        if instance and instance.estado != CuentaCobro.Estado.BORRADOR:
            raise serializers.ValidationError(
                "Solo se pueden editar cuentas de cobro en estado BORRADOR."
            )
        return data

    def update(self, instance, validated_data):
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        return instance


class WizardStep2Serializer(serializers.ModelSerializer):
    """
    Serializer for Step 2: Detalle Financiero.
    Auto-calculates valor_total based on component values.
    """
    class Meta:
        model = CuentaCobro
        fields = ['valor_base', 'iva_valor', 'admon', 'imprevistos', 'utilidad', 'valor_total']
        read_only_fields = ['valor_total']

    def validate(self, data):
        # Ensure we're only editing BORRADOR
        instance = self.instance
        if instance and instance.estado != CuentaCobro.Estado.BORRADOR:
            raise serializers.ValidationError(
                "Solo se pueden editar cuentas de cobro en estado BORRADOR."
            )

        # Validate all values >= 0 (MinValueValidator should catch this but belt-and-suspenders)
        for field in ['valor_base', 'iva_valor', 'admon', 'imprevistos', 'utilidad']:
            value = data.get(field, getattr(instance, field) if instance else Decimal('0'))
            if value < 0:
                raise serializers.ValidationError({
                    field: f"{field} no puede ser negativo."
                })

        return data

    def update(self, instance, validated_data):
        # Update individual fields
        for field in ['valor_base', 'iva_valor', 'admon', 'imprevistos', 'utilidad']:
            if field in validated_data:
                setattr(instance, field, validated_data[field])
        
        # Always recalculate total
        instance.valor_total = instance.recalcular_total()
        instance.save()
        
        return instance


class AnexoSerializer(serializers.ModelSerializer):
    """
    Serializer for creating/listing anexos.
    """
    tipo_anexo_codigo = serializers.CharField(write_only=True, required=False)
    tipo_anexo_nombre = serializers.CharField(source='tipo_anexo.nombre', read_only=True)
    archivo_url = serializers.FileField(source='archivo', read_only=True)

    class Meta:
        model = CuentaCobroAnexo
        fields = ['id', 'tipo_anexo', 'tipo_anexo_codigo', 'tipo_anexo_nombre', 
                  'descripcion', 'archivo', 'archivo_url', 'created_at']
        read_only_fields = ['id', 'created_at']

    def validate(self, data):
        # Ensure cuenta_cobro is in BORRADOR
        cuenta_cobro = self.context.get('cuenta_cobro')
        if cuenta_cobro and cuenta_cobro.estado != CuentaCobro.Estado.BORRADOR:
            raise serializers.ValidationError(
                "Solo se pueden agregar anexos a cuentas en estado BORRADOR."
            )

        # Handle tipo_anexo by codigo or by id
        tipo_anexo_codigo = data.pop('tipo_anexo_codigo', None)
        if tipo_anexo_codigo:
            try:
                tipo_anexo = TipoAnexo.objects.get(codigo=tipo_anexo_codigo)
                data['tipo_anexo'] = tipo_anexo
            except TipoAnexo.DoesNotExist:
                raise serializers.ValidationError({
                    'tipo_anexo_codigo': f'TipoAnexo con código "{tipo_anexo_codigo}" no existe.'
                })

        return data

    def create(self, validated_data):
        cuenta_cobro = self.context.get('cuenta_cobro')
        return CuentaCobroAnexo.objects.create(
            cuenta_cobro=cuenta_cobro,
            **validated_data
        )


class WizardRetrieveSerializer(serializers.ModelSerializer):
    """
    Serializer for retrieving current wizard state with completion flags.
    """
    anexos = AnexoSerializer(many=True, read_only=True)
    step1_ok = serializers.SerializerMethodField()
    step2_ok = serializers.SerializerMethodField()
    anexos_ok = serializers.SerializerMethodField()
    proveedor_nombre = serializers.SerializerMethodField()
    contrato_numero = serializers.CharField(source='contrato.numero', read_only=True, allow_null=True)
    contrato_detalle = serializers.SerializerMethodField()

    class Meta:
        model = CuentaCobro
        fields = [
            'id', 'empresa', 'proveedor', 'proveedor_nombre', 'contrato', 'contrato_numero', 'contrato_detalle',
            'numero', 'periodo', 'concepto', 'observaciones',
            'valor_base', 'iva_valor', 'admon', 'imprevistos', 'utilidad', 'valor_total',
            'estado', 'created_at', 'updated_at',
            'anexos', 'step1_ok', 'step2_ok', 'anexos_ok'
        ]

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        
        # Structure for frontend
        return {
            'id': ret['id'],
            'empresa': ret['empresa'],
            'proveedor': ret['proveedor'],
            'proveedor_nombre': ret['proveedor_nombre'],
            'estado': ret['estado'],
            'contrato': ret.get('contrato'),
            'contrato_numero': ret.get('contrato_numero'),
            'contrato_detalle': ret.get('contrato_detalle'),
            'created_at': ret['created_at'],
            'updated_at': ret['updated_at'],
            'step1_ok': ret['step1_ok'],
            'step2_ok': ret['step2_ok'],
            'anexos_ok': ret['anexos_ok'],
            'datos_generales': {
                'numero': ret.get('numero') or '',
                'periodo': ret.get('periodo') or '',
                'concepto': ret.get('concepto') or '',
                'observaciones': ret.get('observaciones') or '',
            },
            'datos_financieros': {
                'valor_base': ret.get('valor_base') or 0,
                'iva_valor': ret.get('iva_valor') or 0,
                'admon': ret.get('admon') or 0,
                'imprevistos': ret.get('imprevistos') or 0,
                'utilidad': ret.get('utilidad') or 0,
                'valor_total': ret.get('valor_total') or 0,
            },
            'anexos': ret['anexos'],
            'anexos_count': len(ret['anexos'])
        }

    def get_proveedor_nombre(self, obj):
        if obj.proveedor:
            return str(obj.proveedor)
        return None
    
    def get_contrato_detalle(self, obj):
        """Return full contract details if assigned."""
        if not obj.contrato:
            return None
        return {
            'id': obj.contrato.id,
            'numero': obj.contrato.numero,
            'objeto': obj.contrato.objeto if hasattr(obj.contrato, 'objeto') else None,
            'fecha_inicio': obj.contrato.fecha_inicio if hasattr(obj.contrato, 'fecha_inicio') else None,
            'fecha_fin': obj.contrato.fecha_fin if hasattr(obj.contrato, 'fecha_fin') else None,
        }

    def get_step1_ok(self, obj):
        """Step 1 is complete if contrato, numero, periodo, concepto are filled."""
        return all([
            obj.contrato_id is not None,
            obj.numero,
            obj.periodo,
            obj.concepto,
        ])

    def get_step2_ok(self, obj):
        """Step 2 is complete if valor_total matches recalculated total."""
        expected_total = obj.recalcular_total()
        return obj.valor_total == expected_total

    def get_anexos_ok(self, obj):
        """Anexos are OK if at least one exists."""
        return obj.anexos.count() > 0


class SubmitSerializer(serializers.Serializer):
    """
    Serializer for final submission with hard validations.
    """
    def validate(self, data):
        cuenta_cobro = self.instance

        if cuenta_cobro.estado != CuentaCobro.Estado.BORRADOR:
            raise serializers.ValidationError(
                "Solo se pueden radicar cuentas en estado BORRADOR."
            )

        errors = {}

        # Step 1 validation
        if not all([cuenta_cobro.contrato_id, cuenta_cobro.numero, 
                    cuenta_cobro.periodo, cuenta_cobro.concepto]):
            errors['step1'] = 'Datos generales incompletos (contrato, numero, periodo, concepto requeridos).'

        # Step 2 validation
        expected_total = cuenta_cobro.recalcular_total()
        if cuenta_cobro.valor_total != expected_total:
            errors['step2'] = f'El valor_total ({cuenta_cobro.valor_total}) no coincide con el cálculo ({expected_total}).'

        # Anexos validation
        anexos_count = cuenta_cobro.anexos.count()
        if anexos_count == 0:
            errors['anexos'] = 'Debe agregar al menos un anexo antes de radicar.'

        # Check obligatory anexos
        tipos_obligatorios = TipoAnexo.objects.filter(obligatorio=True)
        for tipo_obligatorio in tipos_obligatorios:
            if not cuenta_cobro.anexos.filter(tipo_anexo=tipo_obligatorio).exists():
                if 'anexos_obligatorios' not in errors:
                    errors['anexos_obligatorios'] = []
                errors['anexos_obligatorios'].append(
                    f'Falta anexo obligatorio: {tipo_obligatorio.nombre}'
                )

        if errors:
            raise serializers.ValidationError(errors)

        return data

    @transaction.atomic
    def update(self, instance, validated_data):
        """Transition state to RADICADA and mark invitation as used if applicable."""
        instance.estado = CuentaCobro.Estado.RADICADA
        instance.save()

        # If there's an associated invitation, mark it as used
        # (stored during creation in _invitacion_id or lookup by proveedor/empresa)
        invitacion_id = getattr(instance, '_invitacion_id', None)
        if invitacion_id:
            try:
                invitacion = InvitacionRadicacion.objects.get(id=invitacion_id)
                invitacion.estado = InvitacionRadicacion.Estado.USADA
                invitacion.used_at = timezone.now()
                invitacion.save()
            except InvitacionRadicacion.DoesNotExist:
                pass

        return instance
