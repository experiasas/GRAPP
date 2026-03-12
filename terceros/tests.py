from django.test import TestCase, RequestFactory
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APIClient

from tenancy.models import Empresa
from .models import (
    TipoTercero, InvitacionVinculacion, Tercero, TerceroTipo,
    DocumentoTipo, DocumentoRequerido, DocumentoTercero,
    TokenActivacionTercero,
)

User = get_user_model()


class VinculacionApiTest(TestCase):
    """
    Tests del endpoint POST /api/vinculacion/<token>/ para
    vincular terceros (persona natural y juridica).
    """

    @classmethod
    def setUpTestData(cls):
        cls.empresa = Empresa.objects.create(nombre="Empresa Test", nit="900111222")
        cls.tipo_proveedor = TipoTercero.objects.create(code="PROVEEDOR", nombre="Proveedor")

        # Tipos de documento requeridos
        cls.doc_rut = DocumentoTipo.objects.create(code="RUT", nombre="RUT")
        cls.doc_cedula = DocumentoTipo.objects.create(code="CEDULA", nombre="Cedula")
        cls.doc_camara = DocumentoTipo.objects.create(code="CAMARA_COMERCIO", nombre="Camara de Comercio")

        # Documentos requeridos: RUT para ambos, Cedula solo natural, Camara solo juridica
        DocumentoRequerido.objects.create(
            tipo_tercero=cls.tipo_proveedor, documento_tipo=cls.doc_rut,
            obligatorio=True, aplica_a_persona="AMBAS"
        )
        DocumentoRequerido.objects.create(
            tipo_tercero=cls.tipo_proveedor, documento_tipo=cls.doc_cedula,
            obligatorio=True, aplica_a_persona="NATURAL"
        )
        DocumentoRequerido.objects.create(
            tipo_tercero=cls.tipo_proveedor, documento_tipo=cls.doc_camara,
            obligatorio=True, aplica_a_persona="JURIDICA"
        )

    def _crear_invitacion(self):
        return InvitacionVinculacion.objects.create(
            empresa=self.empresa,
            email="nuevo@test.com",
            tipo_tercero=self.tipo_proveedor,
        )

    def _payload_natural(self):
        return {
            "tipo_persona": "NATURAL",
            "tipo_doc": "CC",
            "documento": "1234567890",
            "nombre1": "Juan",
            "apellido1": "Perez",
            "email": "juan@test.com",
        }

    def _payload_juridica(self):
        return {
            "tipo_persona": "JURIDICA",
            "tipo_doc": "NIT",
            "documento": "900999888",
            "razon_social": "Empresa Juridica SAS",
            "email": "empresa@test.com",
        }

    # -- Tests GET --

    def test_get_invitacion_datos(self):
        """GET retorna datos de la invitacion."""
        inv = self._crear_invitacion()
        client = APIClient()
        resp = client.get(f"/api/vinculacion/{inv.token}/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["email"], "nuevo@test.com")
        self.assertEqual(resp.data["tipo_tercero"]["code"], "PROVEEDOR")
        self.assertEqual(resp.data["empresa"]["nombre"], "Empresa Test")

    def test_token_invalido_404(self):
        """Token inexistente devuelve 404."""
        client = APIClient()
        resp = client.get("/api/vinculacion/token_que_no_existe/")
        self.assertEqual(resp.status_code, 404)

    def test_token_ya_usado_404(self):
        """Token con estado USADA devuelve 404 (filtro por estado=PENDIENTE)."""
        inv = self._crear_invitacion()
        inv.estado = InvitacionVinculacion.Estado.USADA
        inv.save()
        client = APIClient()
        resp = client.get(f"/api/vinculacion/{inv.token}/")
        self.assertEqual(resp.status_code, 404)

    # -- Tests POST persona natural --

    def test_post_vinculacion_persona_natural(self):
        """POST crea tercero natural y marca invitacion como USADA."""
        inv = self._crear_invitacion()
        client = APIClient()
        resp = client.post(f"/api/vinculacion/{inv.token}/", self._payload_natural(), format="json")

        self.assertEqual(resp.status_code, 201)
        self.assertTrue(resp.data["success"])

        tercero = Tercero.objects.get(id=resp.data["tercero_id"])
        self.assertEqual(tercero.tipo_persona, "NATURAL")
        self.assertEqual(tercero.nombre1, "Juan")
        self.assertEqual(tercero.estado, "PENDIENTE")

        # La invitacion debe marcarse como usada
        inv.refresh_from_db()
        self.assertEqual(inv.estado, InvitacionVinculacion.Estado.USADA)
        self.assertIsNotNone(inv.used_at)

    def test_documentos_placeholder_natural(self):
        """POST crea DocumentoTercero para docs que aplican a NATURAL + AMBAS."""
        inv = self._crear_invitacion()
        client = APIClient()
        resp = client.post(f"/api/vinculacion/{inv.token}/", self._payload_natural(), format="json")
        self.assertEqual(resp.status_code, 201)

        tercero = Tercero.objects.get(id=resp.data["tercero_id"])
        doc_codigos = set(tercero.documentos.values_list("documento_tipo__code", flat=True))
        # Debe tener RUT (AMBAS) y CEDULA (NATURAL), pero NO Camara de Comercio (JURIDICA)
        self.assertIn("RUT", doc_codigos)
        self.assertIn("CEDULA", doc_codigos)
        self.assertNotIn("CAMARA_COMERCIO", doc_codigos)

    # -- Tests POST persona juridica --

    def test_post_vinculacion_persona_juridica(self):
        """POST crea tercero juridico con razon_social."""
        inv = self._crear_invitacion()
        client = APIClient()
        resp = client.post(f"/api/vinculacion/{inv.token}/", self._payload_juridica(), format="json")

        self.assertEqual(resp.status_code, 201)
        tercero = Tercero.objects.get(id=resp.data["tercero_id"])
        self.assertEqual(tercero.tipo_persona, "JURIDICA")
        self.assertEqual(tercero.razon_social, "Empresa Juridica SAS")

    def test_documentos_placeholder_juridica(self):
        """POST crea DocumentoTercero para docs que aplican a JURIDICA + AMBAS."""
        inv = self._crear_invitacion()
        client = APIClient()
        resp = client.post(f"/api/vinculacion/{inv.token}/", self._payload_juridica(), format="json")
        self.assertEqual(resp.status_code, 201)

        tercero = Tercero.objects.get(id=resp.data["tercero_id"])
        doc_codigos = set(tercero.documentos.values_list("documento_tipo__code", flat=True))
        # Debe tener RUT (AMBAS) y Camara (JURIDICA), pero NO Cedula (NATURAL)
        self.assertIn("RUT", doc_codigos)
        self.assertIn("CAMARA_COMERCIO", doc_codigos)
        self.assertNotIn("CEDULA", doc_codigos)

    # -- Tests de error --

    def test_datos_incompletos_400(self):
        """POST sin campos requeridos devuelve 400."""
        inv = self._crear_invitacion()
        client = APIClient()
        resp = client.post(f"/api/vinculacion/{inv.token}/", {}, format="json")
        self.assertEqual(resp.status_code, 400)

    def test_duplicado_409(self):
        """POST con documento ya registrado devuelve 409."""
        # Crear tercero existente
        Tercero.objects.create(
            empresa=self.empresa, tipo_persona="NATURAL",
            tipo_doc="CC", documento="1234567890",
            nombre1="Existente", apellido1="Test",
        )
        inv = self._crear_invitacion()
        client = APIClient()
        resp = client.post(f"/api/vinculacion/{inv.token}/", self._payload_natural(), format="json")
        self.assertEqual(resp.status_code, 409)
        self.assertEqual(resp.data["code"], "TERCERO_DUPLICADO")


class ActivarCuentaTest(TestCase):
    """
    Tests del endpoint GET/POST /api/auth/activar/<token>/
    para activacion de cuentas de terceros.
    """

    @classmethod
    def setUpTestData(cls):
        cls.user_inactivo = User.objects.create_user(
            username="tercero_inactivo",
            email="inactivo@test.com",
            password="temporal123",
            is_active=False,
        )

    def _crear_token(self, usuario=None, expires_delta=None):
        """Crea un token de activacion. Por defecto valido por 48 horas."""
        user = usuario or self.user_inactivo
        expires = timezone.now() + (expires_delta or timedelta(hours=48))
        # Eliminar token anterior si existe para permitir re-creacion
        TokenActivacionTercero.objects.filter(usuario=user).delete()
        return TokenActivacionTercero.objects.create(
            usuario=user,
            expires_at=expires,
        )

    # -- Tests GET --

    def test_get_token_valido(self):
        """GET retorna email y valido=True."""
        token_obj = self._crear_token()
        client = APIClient()
        resp = client.get(f"/api/auth/activar/{token_obj.token}/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["email"], "inactivo@test.com")
        self.assertTrue(resp.data["valido"])

    def test_get_token_expirado_400(self):
        """GET con token expirado retorna 400."""
        token_obj = self._crear_token(expires_delta=timedelta(hours=-1))
        client = APIClient()
        resp = client.get(f"/api/auth/activar/{token_obj.token}/")
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(resp.data["code"], "TOKEN_EXPIRADO")

    def test_token_inexistente_404(self):
        """Token no encontrado devuelve 404."""
        client = APIClient()
        resp = client.get("/api/auth/activar/token_fantasma_no_existe/")
        self.assertEqual(resp.status_code, 404)

    # -- Tests POST --

    def test_post_activa_cuenta(self):
        """POST con password valido activa usuario y elimina token."""
        token_obj = self._crear_token()
        token_str = token_obj.token
        client = APIClient()
        resp = client.post(
            f"/api/auth/activar/{token_str}/",
            {"password": "nuevaclave123"},
            format="json",
        )
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.data["success"])

        # El usuario debe estar activo con la nueva password
        self.user_inactivo.refresh_from_db()
        self.assertTrue(self.user_inactivo.is_active)
        self.assertTrue(self.user_inactivo.check_password("nuevaclave123"))

        # El token debe haber sido eliminado
        self.assertFalse(
            TokenActivacionTercero.objects.filter(token=token_str).exists()
        )

    def test_post_password_corto_400(self):
        """POST con password < 6 caracteres retorna 400."""
        token_obj = self._crear_token()
        client = APIClient()
        resp = client.post(
            f"/api/auth/activar/{token_obj.token}/",
            {"password": "123"},
            format="json",
        )
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(resp.data["code"], "PASSWORD_INVALIDO")

    def test_post_sin_password_400(self):
        """POST sin password retorna 400."""
        token_obj = self._crear_token()
        client = APIClient()
        resp = client.post(
            f"/api/auth/activar/{token_obj.token}/",
            {},
            format="json",
        )
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(resp.data["code"], "PASSWORD_INVALIDO")
