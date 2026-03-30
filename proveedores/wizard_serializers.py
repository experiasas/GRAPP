from rest_framework import serializers
from django.utils import timezone
from django.db import transaction
from django.db.models import Q
from decimal import Decimal

from .models import CuentaCobro, TipoAnexo, CuentaCobroAnexo, InvitacionRadicacion, ConfiguracionRadicacion, ComprobantePago, OrdenCompra
from contratos.models import Contrato


class WizardCreateSerializer(serializers.Serializer):
    """
    Serializer para crear una CuentaCobro en estado BORRADOR.
    Infiere tipo_documento desde el tipo_persona del tercero autenticado.
    """
    token = serializers.CharField(required=False, allow_blank=True)
    proveedor_id = serializers.IntegerField(required=False, allow_null=True)

    def validate(self, data):
        token = data.get('token')
        proveedor_id = data.get('proveedor_id')

        request = self.context.get('request')

        if not token and not proveedor_id:
            # Portal de Terceros: inferir proveedor desde JWT si esta autenticado
            if request and request.user.is_authenticated:
                from terceros.models import Tercero
                if hasattr(request.user, 'tercero_perfil'):
                    data['_proveedor'] = request.user.tercero_perfil
                    return data
                else:
                    proveedor = Tercero.objects.filter(email=request.user.email).first()
                    if proveedor:
                        data['_proveedor'] = proveedor
                        return data

            raise serializers.ValidationError(
                "Debe proporcionar 'token', 'proveedor_id' o estar autenticado en el portal."
            )

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
                    'token': 'Invitacion no valida o ya utilizada.'
                })
        else:
            from terceros.models import Tercero
            try:
                proveedor = Tercero.objects.get(id=proveedor_id, estado='APROBADO')
                data['_proveedor'] = proveedor
            except Tercero.DoesNotExist:
                raise serializers.ValidationError({
                    'proveedor_id': 'Proveedor no valido o no aprobado.'
                })

        return data

    def _inferir_tipo_documento(self, proveedor):
        """Infiere el tipo de documento basado en el tipo_persona del tercero."""
        from terceros.models import Tercero
        if proveedor.tipo_persona == Tercero.TipoPersona.JURIDICA:
            return CuentaCobro.TipoDocumento.FACTURA
        return CuentaCobro.TipoDocumento.CUENTA_COBRO

    def create(self, validated_data):
        empresa = self.context.get('empresa')
        if not empresa:
            raise serializers.ValidationError("Empresa no identificada en el contexto.")

        proveedor = validated_data.get('_proveedor')
        invitacion = validated_data.get('_invitacion')
        contrato = invitacion.contrato if invitacion else None
        tipo_documento = self._inferir_tipo_documento(proveedor)

        # Flujo basado en token de invitacion
        if invitacion:
            if invitacion.cuenta_cobro:
                return invitacion.cuenta_cobro

            import uuid
            temp_numero = f"DRAFT-{uuid.uuid4().hex[:8].upper()}"

            cuenta = CuentaCobro.objects.create(
                empresa=empresa,
                proveedor=proveedor,
                contrato=contrato,
                tipo_documento=tipo_documento,
                estado=CuentaCobro.Estado.BORRADOR,
                numero=temp_numero,
                periodo='',
                concepto='',
            )

            invitacion.cuenta_cobro = cuenta
            invitacion.save(update_fields=['cuenta_cobro'])

            return cuenta

        # Flujo sin token: portal de terceros autenticado
        else:
            existing_borrador = CuentaCobro.objects.filter(
                empresa=empresa,
                proveedor=proveedor,
                estado=CuentaCobro.Estado.BORRADOR
            ).first()

            if existing_borrador:
                return existing_borrador

            # Liberar cualquier registro atascado con numero='' y estado != BORRADOR.
            # Esto ocurre cuando un registro fue aprobado/pagado sin que SubmitSerializer
            # asignara un número (p. ej. ediciones manuales vía admin), causando un
            # IntegrityError al intentar crear el nuevo borrador.
            for stuck in CuentaCobro.objects.filter(
                empresa=empresa, proveedor=proveedor, numero='',
            ).exclude(estado=CuentaCobro.Estado.BORRADOR):
                stuck.numero = f"LEGACY-{stuck.id}"
                stuck.save(update_fields=['numero'])

            cuenta = CuentaCobro.objects.create(
                empresa=empresa,
                proveedor=proveedor,
                contrato=contrato,
                tipo_documento=tipo_documento,
                estado=CuentaCobro.Estado.BORRADOR,
                numero='',
                periodo='',
                concepto='',
            )

            return cuenta


class WizardStep1Serializer(serializers.ModelSerializer):
    """
    Serializer para Step 1: Datos Generales.
    Para FACTURA, el tercero puede ingresar su numero de factura electrónica.
    Para CUENTA_COBRO, el numero se genera automáticamente al radicar.
    """
    orden_compra = serializers.PrimaryKeyRelatedField(
        queryset=OrdenCompra.objects.filter(estado__in=['APROBADA', 'EN_EJECUCION']),
        required=False,
        allow_null=True,
    )

    class Meta:
        model = CuentaCobro
        fields = ['contrato', 'orden_compra', 'periodo', 'concepto', 'observaciones', 'numero']

    def validate(self, data):
        instance = self.instance
        if instance and instance.estado != CuentaCobro.Estado.BORRADOR:
            raise serializers.ValidationError(
                "Solo se pueden editar cuentas de cobro en estado BORRADOR."
            )
        # Si la OC tiene contrato y el usuario no eligió contrato, heredar
        oc = data.get('orden_compra', getattr(instance, 'orden_compra', None))
        if oc and oc.contrato_id and not data.get('contrato'):
            data['contrato'] = oc.contrato
        return data

    def update(self, instance, validated_data):
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        return instance


class WizardStep2Serializer(serializers.ModelSerializer):
    """
    Serializer para Step 2: Detalle Financiero.
    Maneja IVA configurable (persona juridica) y campos IBC (persona natural).
    """
    class Meta:
        model = CuentaCobro
        fields = [
            'valor_base', 'iva_porcentaje', 'iva_valor',
            'admon', 'imprevistos', 'utilidad', 'valor_total',
            'ibc_valor'
        ]
        read_only_fields = ['valor_total']

    TARIFAS_IVA_VALIDAS = [Decimal('0'), Decimal('5'), Decimal('19')]

    def validate(self, data):
        instance = self.instance
        if instance and instance.estado != CuentaCobro.Estado.BORRADOR:
            raise serializers.ValidationError(
                "Solo se pueden editar cuentas de cobro en estado BORRADOR."
            )

        # Validar valores no negativos
        campos_numericos = ['valor_base', 'iva_valor', 'admon', 'imprevistos', 'utilidad', 'ibc_valor']
        for field in campos_numericos:
            value = data.get(field, getattr(instance, field) if instance else Decimal('0'))
            if value is not None and value < 0:
                raise serializers.ValidationError({
                    field: f"{field} no puede ser negativo."
                })

        # Validación de IVA según responsabilidad tributaria del proveedor
        if instance and instance.tipo_documento == CuentaCobro.TipoDocumento.FACTURA:
            responsable_iva = getattr(instance.proveedor, 'responsable_iva', None) if instance.proveedor else None
            iva_pct = data.get('iva_porcentaje', getattr(instance, 'iva_porcentaje', Decimal('0')))

            if responsable_iva is False:
                # Proveedor NO responsable de IVA: forzar a cero
                data['iva_porcentaje'] = Decimal('0')
                data['iva_valor'] = Decimal('0')
            elif responsable_iva is True:
                # Proveedor SÍ responsable: solo tarifas colombianas permitidas
                if iva_pct is not None and iva_pct not in self.TARIFAS_IVA_VALIDAS:
                    raise serializers.ValidationError({
                        'iva_porcentaje': 'La tarifa de IVA debe ser 0%, 5% o 19%.'
                    })
        else:
            # Cuenta de cobro (persona natural): IVA siempre 0
            iva_pct = data.get('iva_porcentaje', Decimal('0'))
            if iva_pct is not None and (iva_pct < 0 or iva_pct > 100):
                raise serializers.ValidationError({
                    'iva_porcentaje': 'El porcentaje de IVA debe estar entre 0 y 100.'
                })

        return data

    def update(self, instance, validated_data):
        campos_editables = [
            'valor_base', 'iva_porcentaje', 'iva_valor',
            'admon', 'imprevistos', 'utilidad', 'ibc_valor'
        ]
        for field in campos_editables:
            if field in validated_data:
                setattr(instance, field, validated_data[field])

        # Garantizar coherencia IVA si el proveedor no es responsable
        responsable_iva = getattr(instance.proveedor, 'responsable_iva', None) if instance.proveedor else None
        if responsable_iva is False:
            instance.iva_porcentaje = Decimal('0')
            instance.iva_valor = Decimal('0')

        # Recalcular total
        instance.valor_total = instance.recalcular_total()
        instance.save()

        return instance


class TipoAnexoNestedSerializer(serializers.ModelSerializer):
    """Serializer anidado para tipo_anexo en respuestas de anexos."""
    class Meta:
        model = TipoAnexo
        fields = ['id', 'codigo', 'nombre', 'obligatorio', 'aplica_a_persona']


class AnexoSerializer(serializers.ModelSerializer):
    """Serializer para crear y listar anexos."""
    tipo_anexo_id = serializers.IntegerField(write_only=True, required=False)
    tipo_anexo_codigo = serializers.CharField(write_only=True, required=False)
    tipo = TipoAnexoNestedSerializer(source='tipo_anexo', read_only=True)
    fecha_subida = serializers.DateTimeField(source='created_at', read_only=True)

    class Meta:
        model = CuentaCobroAnexo
        fields = [
            'id', 'tipo_anexo', 'tipo_anexo_id', 'tipo_anexo_codigo', 'tipo',
            'descripcion', 'archivo', 'fecha_subida', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
        extra_kwargs = {
            'tipo_anexo': {'write_only': True, 'required': False}
        }

    def validate(self, data):
        cuenta_cobro = self.context.get('cuenta_cobro')
        if cuenta_cobro and cuenta_cobro.estado != CuentaCobro.Estado.BORRADOR:
            raise serializers.ValidationError(
                "Solo se pueden agregar anexos a cuentas en estado BORRADOR."
            )

        tipo_anexo_id = data.pop('tipo_anexo_id', None)
        tipo_anexo_codigo = data.pop('tipo_anexo_codigo', None)

        if tipo_anexo_id:
            try:
                tipo_anexo = TipoAnexo.objects.get(id=tipo_anexo_id)
                data['tipo_anexo'] = tipo_anexo
            except TipoAnexo.DoesNotExist:
                raise serializers.ValidationError({
                    'tipo_anexo_id': f'TipoAnexo con ID {tipo_anexo_id} no existe.'
                })
        elif tipo_anexo_codigo:
            try:
                tipo_anexo = TipoAnexo.objects.get(codigo=tipo_anexo_codigo)
                data['tipo_anexo'] = tipo_anexo
            except TipoAnexo.DoesNotExist:
                raise serializers.ValidationError({
                    'tipo_anexo_codigo': f'TipoAnexo con codigo "{tipo_anexo_codigo}" no existe.'
                })

        if 'tipo_anexo' not in data:
            raise serializers.ValidationError({
                'tipo_anexo': 'Debe proporcionar tipo_anexo, tipo_anexo_id, o tipo_anexo_codigo.'
            })

        return data

    def create(self, validated_data):
        cuenta_cobro = self.context.get('cuenta_cobro')
        return CuentaCobroAnexo.objects.create(
            cuenta_cobro=cuenta_cobro,
            **validated_data
        )


class ComprobantePagoSerializer(serializers.ModelSerializer):
    """Serializer para enviar información de comprobantes de pago."""
    class Meta:
        model = ComprobantePago
        fields = ['id', 'archivo', 'fecha_pago', 'valor_pagado', 'referencia', 'created_at']




def _get_tipos_anexo_para_cuenta(cuenta, tipo_persona):
    """
    Obtiene los tipos de anexo aplicables segun tipo de persona.
    Retorna un queryset de TipoAnexo filtrado.
    """
    return TipoAnexo.objects.filter(
        Q(aplica_a_persona=TipoAnexo.AplicaPersona.AMBAS) |
        Q(aplica_a_persona=tipo_persona)
    )


def _evaluar_reglas_seguridad_social(cuenta):
    """
    Evalua si la cuenta requiere documentos de seguridad social obligatorios.
    Solo aplica a persona natural. Retorna dict con info de las reglas.
    """
    tipo_persona = cuenta.proveedor.tipo_persona if cuenta.proveedor else 'JURIDICA'

    if tipo_persona != 'NATURAL':
        return {
            'aplica': False,
            'requiere_ss': False,
            'acumulado_mensual': 0,
            'umbral': 0,
            'porcentaje_minimo_ibc': 0,
        }

    config = ConfiguracionRadicacion.get_for_empresa(cuenta.empresa)
    acumulado = cuenta.get_acumulado_mensual()
    valor_actual = cuenta.valor_base or Decimal('0')
    total_proyectado = acumulado + valor_actual
    umbral = config.umbral_seguridad_social

    return {
        'aplica': True,
        'requiere_ss': total_proyectado > umbral,
        'acumulado_mensual': float(acumulado),
        'valor_actual': float(valor_actual),
        'total_proyectado': float(total_proyectado),
        'umbral': float(umbral),
        'salario_minimo': float(config.salario_minimo_vigente),
        'porcentaje_umbral': float(config.porcentaje_umbral),
        'porcentaje_minimo_ibc': float(config.porcentaje_minimo_ibc),
    }


class WizardRetrieveSerializer(serializers.ModelSerializer):
    """
    Serializer para obtener el estado completo del wizard con flags de completitud.
    Incluye informacion de tipo de persona, acumulado mensual y reglas de seguridad social.
    """
    anexos = AnexoSerializer(many=True, read_only=True)
    comprobantes = ComprobantePagoSerializer(many=True, read_only=True)
    step1_ok = serializers.SerializerMethodField()
    step2_ok = serializers.SerializerMethodField()
    anexos_ok = serializers.SerializerMethodField()
    proveedor_nombre = serializers.SerializerMethodField()
    empresa_nombre = serializers.SerializerMethodField()
    contrato_numero = serializers.CharField(source='contrato.numero', read_only=True, allow_null=True)
    contrato_detalle = serializers.SerializerMethodField()
    orden_compra_detalle = serializers.SerializerMethodField()

    class Meta:
        model = CuentaCobro
        fields = [
            'id', 'empresa', 'empresa_nombre', 'proveedor', 'proveedor_nombre',
            'contrato', 'contrato_numero', 'contrato_detalle',
            'orden_compra', 'orden_compra_detalle',
            'tipo_documento',
            'numero', 'periodo', 'concepto', 'observaciones',
            'valor_base', 'iva_porcentaje', 'iva_valor',
            'admon', 'imprevistos', 'utilidad', 'valor_total',
            'ibc_valor',
            'estado', 'created_at', 'updated_at',
            'anexos', 'comprobantes', 'step1_ok', 'step2_ok', 'anexos_ok'
        ]

    def to_representation(self, instance):
        ret = super().to_representation(instance)

        tipo_persona = instance.proveedor.tipo_persona if instance.proveedor else 'JURIDICA'
        reglas_ss = _evaluar_reglas_seguridad_social(instance)

        return {
            'id': ret['id'],
            'empresa': ret['empresa'],
            'empresa_nombre': ret['empresa_nombre'],
            'proveedor': ret['proveedor'],
            'proveedor_nombre': ret['proveedor_nombre'],
            'estado': ret['estado'],
            'tipo_documento': ret['tipo_documento'],
            'tipo_persona': tipo_persona,
            'contrato': ret.get('contrato'),
            'contrato_numero': ret.get('contrato_numero'),
            'contrato_detalle': ret.get('contrato_detalle'),
            'orden_compra': ret.get('orden_compra'),
            'orden_compra_detalle': ret.get('orden_compra_detalle'),
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
                'iva_porcentaje': ret.get('iva_porcentaje') or 0,
                'iva_valor': ret.get('iva_valor') or 0,
                'admon': ret.get('admon') or 0,
                'imprevistos': ret.get('imprevistos') or 0,
                'utilidad': ret.get('utilidad') or 0,
                'valor_total': ret.get('valor_total') or 0,
                'ibc_valor': ret.get('ibc_valor') or 0,
            },
            'reglas_seguridad_social': reglas_ss,
            'proveedor_responsable_iva': instance.proveedor.responsable_iva if instance.proveedor else None,
            'proveedor_regimen_tributario': instance.proveedor.regimen_tributario if instance.proveedor else None,
            'proveedor_agente_retenedor': instance.proveedor.agente_retenedor if instance.proveedor else None,
            'anexos': ret['anexos'],
            'anexos_count': len(ret['anexos']),
            'comprobantes': ret.get('comprobantes', []),
        }

    def get_proveedor_nombre(self, obj):
        if obj.proveedor:
            return str(obj.proveedor)
        return None

    def get_empresa_nombre(self, obj):
        if obj.empresa:
            return obj.empresa.nombre
        return None

    def get_contrato_detalle(self, obj):
        """Retorna detalles del contrato si esta asignado."""
        if not obj.contrato:
            return None
        return {
            'id': obj.contrato.id,
            'numero': obj.contrato.numero,
            'objeto': obj.contrato.objeto if hasattr(obj.contrato, 'objeto') else None,
            'fecha_inicio': obj.contrato.fecha_inicio if hasattr(obj.contrato, 'fecha_inicio') else None,
            'fecha_fin': obj.contrato.fecha_fin if hasattr(obj.contrato, 'fecha_fin') else None,
        }

    def get_orden_compra_detalle(self, obj):
        """Retorna detalles de la OC si está asignada."""
        if not obj.orden_compra_id:
            return None
        oc = obj.orden_compra
        return {
            'id':                   oc.id,
            'numero_oc':            oc.numero_oc,
            'objeto':               oc.objeto,
            'valor_total':          str(oc.valor_total),
            'valor_pendiente':      str(oc.valor_pendiente),
            'porcentaje_ejecutado': oc.porcentaje_ejecutado,
            'fecha_entrega':        oc.fecha_entrega.isoformat() if oc.fecha_entrega else None,
        }

    def get_step1_ok(self, obj):
        """Step 1 completo si periodo y concepto estan llenos.
        El numero se genera automaticamente al radicar, no es requisito aqui.
        """
        return all([
            obj.periodo,
            obj.concepto,
        ])

    def get_step2_ok(self, obj):
        """Step 2 completo si el valor_total coincide con el recalculado."""
        expected_total = obj.recalcular_total()
        return obj.valor_total == expected_total

    def get_anexos_ok(self, obj):
        """
        Anexos OK si todos los tipos obligatorios estan subidos.
        Filtra por tipo_persona del tercero.
        Evalua reglas de seguridad social para persona natural.
        """
        tipo_persona = obj.proveedor.tipo_persona if obj.proveedor else 'JURIDICA'

        # Obtener tipos obligatorios filtrados por tipo de persona
        tipos_obligatorios = TipoAnexo.objects.filter(
            obligatorio=True
        ).filter(
            Q(aplica_a_persona=TipoAnexo.AplicaPersona.AMBAS) |
            Q(aplica_a_persona=tipo_persona)
        )

        for tipo_obligatorio in tipos_obligatorios:
            if not obj.anexos.filter(tipo_anexo=tipo_obligatorio).exists():
                return False

        # Para persona natural: verificar si requiere SS y si tiene los anexos correspondientes
        if tipo_persona == 'NATURAL':
            reglas = _evaluar_reglas_seguridad_social(obj)
            if reglas['requiere_ss']:
                # Buscar tipos de anexo de seguridad social
                tipos_ss = TipoAnexo.objects.filter(
                    codigo__in=['PLANILLA_SS', 'INFORME_ACTIVIDADES']
                )
                for tipo_ss in tipos_ss:
                    if not obj.anexos.filter(tipo_anexo=tipo_ss).exists():
                        return False

        return True


class SubmitSerializer(serializers.Serializer):
    """
    Serializer para la radicacion final con validaciones duras.
    Diferencia validaciones segun tipo de persona.
    """
    def validate(self, data):
        cuenta_cobro = self.instance

        if cuenta_cobro.estado != CuentaCobro.Estado.BORRADOR:
            raise serializers.ValidationError(
                "Solo se pueden radicar cuentas en estado BORRADOR."
            )

        errors = {}
        tipo_persona = cuenta_cobro.proveedor.tipo_persona if cuenta_cobro.proveedor else 'JURIDICA'

        # Validacion Step 1
        if not all([cuenta_cobro.periodo, cuenta_cobro.concepto]):
            errors['step1'] = 'Datos generales incompletos. Periodo y concepto son obligatorios.'

        # Para FACTURA, el numero debe ser ingresado por el tercero
        if cuenta_cobro.tipo_documento == CuentaCobro.TipoDocumento.FACTURA:
            numero = cuenta_cobro.numero or ''
            if not numero or numero.startswith('DRAFT-'):
                errors['numero'] = 'El número de factura es obligatorio. Ingréselo en el Paso 1.'

        # Validacion Step 2
        expected_total = cuenta_cobro.recalcular_total()
        if cuenta_cobro.valor_total != expected_total:
            errors['step2'] = f'El valor_total ({cuenta_cobro.valor_total}) no coincide con el calculo ({expected_total}).'

        # Validacion de Anexos: al menos uno
        anexos_count = cuenta_cobro.anexos.count()
        if anexos_count == 0:
            errors['anexos'] = 'Debe agregar al menos un anexo antes de radicar.'

        # Validacion de anexos obligatorios filtrados por tipo de persona
        tipos_obligatorios = TipoAnexo.objects.filter(
            obligatorio=True
        ).filter(
            Q(aplica_a_persona=TipoAnexo.AplicaPersona.AMBAS) |
            Q(aplica_a_persona=tipo_persona)
        )
        for tipo_obligatorio in tipos_obligatorios:
            if not cuenta_cobro.anexos.filter(tipo_anexo=tipo_obligatorio).exists():
                if 'anexos_obligatorios' not in errors:
                    errors['anexos_obligatorios'] = []
                errors['anexos_obligatorios'].append(
                    f'Falta anexo obligatorio: {tipo_obligatorio.nombre}'
                )

        # Validaciones de seguridad social para persona natural
        if tipo_persona == 'NATURAL':
            reglas = _evaluar_reglas_seguridad_social(cuenta_cobro)
            if reglas['requiere_ss']:
                # Verificar anexos de seguridad social
                tipos_ss = TipoAnexo.objects.filter(
                    codigo__in=['PLANILLA_SS', 'INFORME_ACTIVIDADES']
                )
                for tipo_ss in tipos_ss:
                    if not cuenta_cobro.anexos.filter(tipo_anexo=tipo_ss).exists():
                        if 'seguridad_social' not in errors:
                            errors['seguridad_social'] = []
                        errors['seguridad_social'].append(
                            f'El acumulado mensual supera el umbral. Falta: {tipo_ss.nombre}'
                        )

                # Verificar IBC minimo
                config = ConfiguracionRadicacion.get_for_empresa(cuenta_cobro.empresa)
                if cuenta_cobro.valor_base and cuenta_cobro.valor_base > 0:
                    ibc_minimo = (cuenta_cobro.valor_base * config.porcentaje_minimo_ibc / Decimal('100'))
                    if cuenta_cobro.ibc_valor < ibc_minimo:
                        errors['ibc'] = (
                            f'El IBC (${cuenta_cobro.ibc_valor:,.0f}) debe ser al menos el '
                            f'{config.porcentaje_minimo_ibc}% del valor base '
                            f'(${ibc_minimo:,.0f}).'
                        )

        if errors:
            raise serializers.ValidationError(errors)

        return data

    @transaction.atomic
    def update(self, instance, validated_data):
        """Transiciona el estado a RADICADA.
        - CUENTA_COBRO: asigna numero consecutivo oficial auto-generado.
        - FACTURA: conserva el numero ingresado por el tercero (ya validado).
        """
        if instance.tipo_documento == CuentaCobro.TipoDocumento.CUENTA_COBRO:
            # Generar el consecutivo oficial bloqueando para evitar duplicados.
            consecutivo = (
                CuentaCobro.objects
                .select_for_update()
                .filter(
                    empresa=instance.empresa,
                    tipo_documento=CuentaCobro.TipoDocumento.CUENTA_COBRO,
                    estado__in=[
                        CuentaCobro.Estado.RADICADA,
                        CuentaCobro.Estado.EN_REVISION,
                        CuentaCobro.Estado.APROBADA,
                        CuentaCobro.Estado.PAGADA,
                        CuentaCobro.Estado.RECHAZADA,
                    ]
                )
                .count() + 1
            )
            anio_actual = timezone.now().year
            instance.numero = f"{anio_actual}-{consecutivo:04d}"

        instance.estado = CuentaCobro.Estado.RADICADA
        instance.save()

        try:
            if hasattr(instance, 'invitacion_origen') and instance.invitacion_origen:
                invitacion = instance.invitacion_origen
                invitacion.estado = InvitacionRadicacion.Estado.USADA
                invitacion.used_at = timezone.now()
                invitacion.save()
        except InvitacionRadicacion.DoesNotExist:
            pass

        return instance
