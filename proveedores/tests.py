from django.test import TestCase
from django.contrib.auth import get_user_model
from decimal import Decimal
from tenancy.models import Empresa
from terceros.models import Tercero, TipoTercero, TerceroTipo
from proveedores.models import CuentaCobro, TipoAnexo, CuentaCobroAnexo, ConfiguracionRadicacion
from contratos.models import Contrato
from proveedores.wizard_serializers import (
    WizardCreateSerializer, SubmitSerializer,
)

User = get_user_model()


class AcumuladoMensualTest(TestCase):
    """
    Tests unitarios para el calculo de acumulado mensual
    en CuentaCobro.get_acumulado_mensual().
    """

    @classmethod
    def setUpTestData(cls):
        cls.empresa = Empresa.objects.create(nombre="Empresa Test", nit="900000001")
        cls.empresa_b = Empresa.objects.create(nombre="Empresa B", nit="900000002")

        cls.proveedor_a = Tercero.objects.create(
            empresa=cls.empresa,
            tipo_persona="NATURAL",
            estado="APROBADO",
            tipo_doc="CC",
            documento="1000000001",
            nombre1="Contratista",
            apellido1="A",
        )
        cls.proveedor_b = Tercero.objects.create(
            empresa=cls.empresa,
            tipo_persona="NATURAL",
            estado="APROBADO",
            tipo_doc="CC",
            documento="1000000002",
            nombre1="Contratista",
            apellido1="B",
        )

    def _crear_cuenta(self, empresa, proveedor, periodo, valor_base, estado, num_sufijo=""):
        """Factory helper para crear cuentas con valores minimos requeridos."""
        contador = CuentaCobro.objects.count()
        return CuentaCobro.objects.create(
            empresa=empresa,
            proveedor=proveedor,
            periodo=periodo,
            numero=f"TEST-{contador:04d}{num_sufijo}",
            concepto="Servicio de prueba",
            tipo_documento=CuentaCobro.TipoDocumento.CUENTA_COBRO,
            estado=estado,
            valor_base=Decimal(str(valor_base)),
            valor_total=Decimal(str(valor_base)),
        )

    def test_suma_radicaciones_del_mismo_periodo(self):
        """
        Una cuenta radicada del mismo proveedor y periodo debe aparecer en el acumulado.
        """
        self._crear_cuenta(self.empresa, self.proveedor_a, "2026-01", 700_000, CuentaCobro.Estado.RADICADA)
        nueva = self._crear_cuenta(self.empresa, self.proveedor_a, "2026-01", 500_000, CuentaCobro.Estado.BORRADOR)

        acumulado = nueva.get_acumulado_mensual()
        self.assertEqual(acumulado, Decimal("700000.00"),
            f"Esperaba acumulado=700000, obtuvo={acumulado}")

    def test_total_proyectado_correcto(self):
        """El total proyectado (acumulado + valor_actual) debe ser $1.200.000."""
        self._crear_cuenta(self.empresa, self.proveedor_a, "2026-02", 700_000, CuentaCobro.Estado.RADICADA)
        nueva = self._crear_cuenta(self.empresa, self.proveedor_a, "2026-02", 500_000, CuentaCobro.Estado.BORRADOR)

        total_proyectado = nueva.get_acumulado_mensual() + nueva.valor_base
        self.assertEqual(total_proyectado, Decimal("1200000.00"),
            f"Total proyectado incorrecto: {total_proyectado}")

    def test_borradores_no_cuentan_en_acumulado(self):
        """Los borradores previos no deben incluirse en el acumulado."""
        self._crear_cuenta(self.empresa, self.proveedor_a, "2026-03", 700_000, CuentaCobro.Estado.BORRADOR)
        nueva = self._crear_cuenta(self.empresa, self.proveedor_a, "2026-03", 500_000, CuentaCobro.Estado.BORRADOR)

        acumulado = nueva.get_acumulado_mensual()
        self.assertEqual(acumulado, Decimal("0"),
            "Los borradores no deben incluirse en el acumulado")

    def test_otro_periodo_no_afecta_acumulado(self):
        """Una radicacion de otro periodo no debe afectar el acumulado del periodo actual."""
        self._crear_cuenta(self.empresa, self.proveedor_a, "2025-12", 700_000, CuentaCobro.Estado.RADICADA)
        nueva = self._crear_cuenta(self.empresa, self.proveedor_a, "2026-04", 500_000, CuentaCobro.Estado.BORRADOR)

        acumulado = nueva.get_acumulado_mensual()
        self.assertEqual(acumulado, Decimal("0"),
            "Una radicacion de otro periodo no debe incluirse en el acumulado")

    def test_otro_proveedor_no_afecta_acumulado(self):
        """El acumulado es por proveedor; otro proveedor en el mismo periodo no suma."""
        self._crear_cuenta(self.empresa, self.proveedor_b, "2026-05", 700_000, CuentaCobro.Estado.RADICADA)
        nueva = self._crear_cuenta(self.empresa, self.proveedor_a, "2026-05", 500_000, CuentaCobro.Estado.BORRADOR)

        acumulado = nueva.get_acumulado_mensual()
        self.assertEqual(acumulado, Decimal("0"),
            "La radicacion de otro proveedor no debe incluirse en el acumulado")

    def test_sin_periodo_retorna_cero(self):
        """Si la cuenta no tiene periodo asignado, el acumulado debe ser 0."""
        contador = CuentaCobro.objects.count()
        cuenta = CuentaCobro.objects.create(
            empresa=self.empresa,
            proveedor=self.proveedor_a,
            periodo="",
            numero=f"TEST-SIN-PERIODO-{contador}",
            concepto="Sin periodo",
            tipo_documento=CuentaCobro.TipoDocumento.CUENTA_COBRO,
            estado=CuentaCobro.Estado.BORRADOR,
            valor_base=Decimal("500000"),
            valor_total=Decimal("500000"),
        )
        self.assertEqual(cuenta.get_acumulado_mensual(), Decimal("0"))

    def test_estados_activos_incluidos(self):
        """EN_REVISION, APROBADA y PAGADA tambien deben sumarse al acumulado."""
        self._crear_cuenta(self.empresa, self.proveedor_a, "2026-06", 200_000, CuentaCobro.Estado.EN_REVISION)
        self._crear_cuenta(self.empresa, self.proveedor_a, "2026-06", 300_000, CuentaCobro.Estado.APROBADA)
        self._crear_cuenta(self.empresa, self.proveedor_a, "2026-06", 100_000, CuentaCobro.Estado.PAGADA)
        nueva = self._crear_cuenta(self.empresa, self.proveedor_a, "2026-06", 50_000, CuentaCobro.Estado.BORRADOR)

        acumulado = nueva.get_acumulado_mensual()
        self.assertEqual(acumulado, Decimal("600000.00"),
            f"Esperaba 600000 sumando EN_REVISION + APROBADA + PAGADA, obtuvo {acumulado}")


class RadicacionNaturalTest(TestCase):
    """
    Tests del flujo de radicacion de cuentas de cobro para persona natural:
    creacion de borrador, reutilizacion del existente, y submit con validaciones.
    """

    @classmethod
    def setUpTestData(cls):
        cls.empresa = Empresa.objects.create(nombre="Empresa Radicacion", nit="900333444")
        cls.tipo_proveedor = TipoTercero.objects.create(code="PROVEEDOR_NAT", nombre="Proveedor Natural")

        cls.proveedor_natural = Tercero.objects.create(
            empresa=cls.empresa,
            tipo_persona="NATURAL",
            estado="APROBADO",
            tipo_doc="CC",
            documento="5550001111",
            nombre1="Ana",
            apellido1="Lopez",
        )
        TerceroTipo.objects.create(tercero=cls.proveedor_natural, tipo=cls.tipo_proveedor)

        cls.contrato = Contrato.objects.create(
            empresa=cls.empresa,
            contratista=cls.proveedor_natural,
            numero="CTR-NAT-001",
            objeto="Consultoria de prueba",
            valor=Decimal("5000000"),
            estado=Contrato.Estado.ACTIVO,
            fecha_inicio="2026-01-01",
            fecha_fin="2026-12-31",
        )

        # Tipo de anexo obligatorio para que el submit funcione
        cls.tipo_anexo_cuenta = TipoAnexo.objects.create(
            codigo="CUENTA_COBRO_DOC",
            nombre="Documento de Cuenta de Cobro",
            obligatorio=True,
            aplica_a_persona="AMBAS",
        )

        # Garantizar que la configuracion existe
        ConfiguracionRadicacion.get_for_empresa(cls.empresa)

        # Crear usuario autenticado vinculado al proveedor
        cls.user = User.objects.create_user(
            username="ana_nat", email="ana@test.com", password="pass1234"
        )
        cls.proveedor_natural.usuario = cls.user
        cls.proveedor_natural.save()

    def _crear_borrador_directo(self, **overrides):
        """Crea un borrador directamente via modelo para tests aislados."""
        defaults = dict(
            empresa=self.empresa,
            proveedor=self.proveedor_natural,
            contrato=self.contrato,
            tipo_documento=CuentaCobro.TipoDocumento.CUENTA_COBRO,
            estado=CuentaCobro.Estado.BORRADOR,
            numero="",
            periodo="2026-03",
            concepto="Servicio mensual de consultoria",
            valor_base=Decimal("500000"),
            iva_valor=Decimal("0"),
            valor_total=Decimal("500000"),
            ibc_valor=Decimal("200000"),
        )
        defaults.update(overrides)
        return CuentaCobro.objects.create(**defaults)

    def test_crear_borrador_persona_natural(self):
        """WizardCreateSerializer crea CuentaCobro tipo CUENTA_COBRO en BORRADOR."""
        # Limpiar borradores previos para este test
        CuentaCobro.objects.filter(
            empresa=self.empresa, proveedor=self.proveedor_natural,
            estado=CuentaCobro.Estado.BORRADOR
        ).delete()

        from unittest.mock import MagicMock
        mock_request = MagicMock()
        mock_request.user = self.user
        mock_request.user.is_authenticated = True

        serializer = WizardCreateSerializer(
            data={},
            context={"empresa": self.empresa, "request": mock_request},
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        cuenta = serializer.save()

        self.assertEqual(cuenta.estado, CuentaCobro.Estado.BORRADOR)
        self.assertEqual(cuenta.tipo_documento, CuentaCobro.TipoDocumento.CUENTA_COBRO)
        self.assertEqual(cuenta.proveedor, self.proveedor_natural)

    def test_reusar_borrador_existente(self):
        """Si ya existe un borrador del proveedor, lo retorna en vez de crear uno nuevo."""
        existente = self._crear_borrador_directo()

        from unittest.mock import MagicMock
        mock_request = MagicMock()
        mock_request.user = self.user
        mock_request.user.is_authenticated = True

        serializer = WizardCreateSerializer(
            data={},
            context={"empresa": self.empresa, "request": mock_request},
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        cuenta = serializer.save()

        self.assertEqual(cuenta.id, existente.id)

    def test_submit_radicacion_completa(self):
        """Borrador con step1+step2+anexos transiciona a RADICADA."""
        # Limpiar borradores previos
        CuentaCobro.objects.filter(
            empresa=self.empresa, proveedor=self.proveedor_natural,
            estado=CuentaCobro.Estado.BORRADOR
        ).delete()

        cuenta = self._crear_borrador_directo()

        # Agregar anexo obligatorio (archivo simulado)
        from django.core.files.uploadedfile import SimpleUploadedFile
        archivo = SimpleUploadedFile("cuenta.pdf", b"contenido-pdf", content_type="application/pdf")
        CuentaCobroAnexo.objects.create(
            cuenta_cobro=cuenta, tipo_anexo=self.tipo_anexo_cuenta,
            archivo=archivo,
        )

        serializer = SubmitSerializer(instance=cuenta, data={})
        self.assertTrue(serializer.is_valid(), serializer.errors)
        cuenta = serializer.save()

        self.assertEqual(cuenta.estado, CuentaCobro.Estado.RADICADA)

    def test_consecutivo_generado(self):
        """Tras submit, el numero sigue formato YYYY-NNNN."""
        CuentaCobro.objects.filter(
            empresa=self.empresa, proveedor=self.proveedor_natural,
            estado=CuentaCobro.Estado.BORRADOR
        ).delete()

        cuenta = self._crear_borrador_directo()
        from django.core.files.uploadedfile import SimpleUploadedFile
        archivo = SimpleUploadedFile("doc.pdf", b"pdf-content", content_type="application/pdf")
        CuentaCobroAnexo.objects.create(
            cuenta_cobro=cuenta, tipo_anexo=self.tipo_anexo_cuenta,
            archivo=archivo,
        )

        serializer = SubmitSerializer(instance=cuenta, data={})
        serializer.is_valid(raise_exception=True)
        cuenta = serializer.save()

        # Formato esperado: YYYY-NNNN
        self.assertRegex(cuenta.numero, r"^\d{4}-\d{4}$")

    def test_submit_sin_periodo_falla(self):
        """Submit sin datos generales devuelve error de validacion."""
        CuentaCobro.objects.filter(
            empresa=self.empresa, proveedor=self.proveedor_natural,
            estado=CuentaCobro.Estado.BORRADOR
        ).delete()

        cuenta = self._crear_borrador_directo(periodo="", concepto="")
        serializer = SubmitSerializer(instance=cuenta, data={})
        self.assertFalse(serializer.is_valid())
        self.assertIn("step1", serializer.errors)

    def test_submit_sin_anexos_falla(self):
        """Submit sin anexos devuelve error de validacion."""
        CuentaCobro.objects.filter(
            empresa=self.empresa, proveedor=self.proveedor_natural,
            estado=CuentaCobro.Estado.BORRADOR
        ).delete()

        cuenta = self._crear_borrador_directo()
        # Sin agregar ningun anexo
        serializer = SubmitSerializer(instance=cuenta, data={})
        self.assertFalse(serializer.is_valid())
        self.assertIn("anexos", serializer.errors)


class RadicacionJuridicaTest(TestCase):
    """
    Tests del flujo de radicacion de facturas para persona juridica.
    """

    @classmethod
    def setUpTestData(cls):
        cls.empresa = Empresa.objects.create(nombre="Empresa Factura", nit="900555666")
        cls.tipo_proveedor = TipoTercero.objects.create(code="PROVEEDOR_JUR", nombre="Proveedor Juridico")

        cls.proveedor_juridico = Tercero.objects.create(
            empresa=cls.empresa,
            tipo_persona="JURIDICA",
            estado="APROBADO",
            tipo_doc="NIT",
            documento="900888777",
            razon_social="Tech Solutions SAS",
        )
        TerceroTipo.objects.create(tercero=cls.proveedor_juridico, tipo=cls.tipo_proveedor)

        cls.contrato = Contrato.objects.create(
            empresa=cls.empresa,
            contratista=cls.proveedor_juridico,
            numero="CTR-JUR-001",
            objeto="Desarrollo de software",
            valor=Decimal("10000000"),
            estado=Contrato.Estado.ACTIVO,
            fecha_inicio="2026-01-01",
            fecha_fin="2026-12-31",
        )

        cls.tipo_anexo_factura = TipoAnexo.objects.create(
            codigo="FACTURA_DOC_JUR",
            nombre="Factura Electronica",
            obligatorio=True,
            aplica_a_persona="JURIDICA",
        )

        ConfiguracionRadicacion.get_for_empresa(cls.empresa)

        cls.user = User.objects.create_user(
            username="tech_jur", email="tech@solutions.com", password="pass1234"
        )
        cls.proveedor_juridico.usuario = cls.user
        cls.proveedor_juridico.save()

    def _crear_borrador_directo(self, **overrides):
        """Crea un borrador de factura directamente."""
        defaults = dict(
            empresa=self.empresa,
            proveedor=self.proveedor_juridico,
            contrato=self.contrato,
            tipo_documento=CuentaCobro.TipoDocumento.FACTURA,
            estado=CuentaCobro.Estado.BORRADOR,
            numero="",
            periodo="2026-03",
            concepto="Desarrollo sprint 5",
            valor_base=Decimal("2000000"),
            iva_porcentaje=Decimal("19.00"),
            iva_valor=Decimal("380000"),
            valor_total=Decimal("2380000"),
            ibc_valor=Decimal("0"),
        )
        defaults.update(overrides)
        return CuentaCobro.objects.create(**defaults)

    def test_crear_borrador_persona_juridica(self):
        """WizardCreateSerializer crea CuentaCobro tipo FACTURA en BORRADOR."""
        CuentaCobro.objects.filter(
            empresa=self.empresa, proveedor=self.proveedor_juridico,
            estado=CuentaCobro.Estado.BORRADOR
        ).delete()

        from unittest.mock import MagicMock
        mock_request = MagicMock()
        mock_request.user = self.user
        mock_request.user.is_authenticated = True

        serializer = WizardCreateSerializer(
            data={},
            context={"empresa": self.empresa, "request": mock_request},
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        cuenta = serializer.save()

        self.assertEqual(cuenta.estado, CuentaCobro.Estado.BORRADOR)
        self.assertEqual(cuenta.tipo_documento, CuentaCobro.TipoDocumento.FACTURA)

    def test_submit_factura_completa(self):
        """Factura con IVA y anexo obligatorio transiciona a RADICADA."""
        CuentaCobro.objects.filter(
            empresa=self.empresa, proveedor=self.proveedor_juridico,
            estado=CuentaCobro.Estado.BORRADOR
        ).delete()

        cuenta = self._crear_borrador_directo()

        from django.core.files.uploadedfile import SimpleUploadedFile
        archivo = SimpleUploadedFile("factura.pdf", b"pdf-factura", content_type="application/pdf")
        CuentaCobroAnexo.objects.create(
            cuenta_cobro=cuenta, tipo_anexo=self.tipo_anexo_factura,
            archivo=archivo,
        )

        serializer = SubmitSerializer(instance=cuenta, data={})
        self.assertTrue(serializer.is_valid(), serializer.errors)
        cuenta = serializer.save()

        self.assertEqual(cuenta.estado, CuentaCobro.Estado.RADICADA)

    def test_iva_calculado_correctamente(self):
        """IVA del 19% sobre valor_base de $2.000.000 = $380.000."""
        cuenta = self._crear_borrador_directo()
        iva = cuenta.calcular_iva_desde_porcentaje()
        self.assertEqual(iva, Decimal("380000.00"))

    def test_submit_sin_anexo_obligatorio_falla(self):
        """Submit sin el anexo de factura obligatorio devuelve error."""
        CuentaCobro.objects.filter(
            empresa=self.empresa, proveedor=self.proveedor_juridico,
            estado=CuentaCobro.Estado.BORRADOR
        ).delete()

        cuenta = self._crear_borrador_directo()
        # Sin agregar ningun anexo
        serializer = SubmitSerializer(instance=cuenta, data={})
        self.assertFalse(serializer.is_valid())
        self.assertTrue(
            "anexos" in serializer.errors or "anexos_obligatorios" in serializer.errors
        )

    def test_no_requiere_ibc(self):
        """Persona juridica no necesita IBC (ibc_valor puede ser 0)."""
        CuentaCobro.objects.filter(
            empresa=self.empresa, proveedor=self.proveedor_juridico,
            estado=CuentaCobro.Estado.BORRADOR
        ).delete()

        cuenta = self._crear_borrador_directo(ibc_valor=Decimal("0"))

        from django.core.files.uploadedfile import SimpleUploadedFile
        archivo = SimpleUploadedFile("fact.pdf", b"pdf", content_type="application/pdf")
        CuentaCobroAnexo.objects.create(
            cuenta_cobro=cuenta, tipo_anexo=self.tipo_anexo_factura,
            archivo=archivo,
        )

        serializer = SubmitSerializer(instance=cuenta, data={})
        self.assertTrue(serializer.is_valid(), serializer.errors)
        # No debe haber error de IBC para persona juridica
        self.assertNotIn("ibc", serializer.errors if not serializer.is_valid() else {})
