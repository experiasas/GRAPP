"""
terceros/emails.py
Envío de correo de activación de cuenta para terceros aprobados.
"""
import base64
from pathlib import Path
from django.core.mail import send_mail
from django.conf import settings


def _logo_base64() -> str | None:
    """
    Carga el logo desde el frontend y lo codifica como base64.
    Retorna None si no encuentra el archivo.
    """
    logo_path = getattr(settings, 'EMAIL_LOGO_PATH', None)
    if not logo_path:
        logo_path = Path(settings.BASE_DIR) / 'frontend' / 'public' / 'explogo.png'
    try:
        with open(logo_path, 'rb') as f:
            return base64.b64encode(f.read()).decode()
    except (FileNotFoundError, IOError):
        return None


def enviar_correo_activacion(tercero, token_obj):
    """
    Envía al tercero recién aprobado el enlace para crear su contraseña.

    Args:
        tercero: instancia de Tercero
        token_obj: instancia de TokenActivacionTercero
    """
    if not tercero.email:
        return

    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
    link    = f"{frontend_url}/activar-cuenta/{token_obj.token}"
    nombre  = tercero.nombre_mostrar()
    empresa = getattr(tercero.empresa, 'nombre', str(tercero.empresa))

    asunto = 'Tu acceso a GRAPP ha sido aprobado'

    # ── Texto plano ──────────────────────────────────────────────────────────
    cuerpo_texto = (
        f"¡Hola, {nombre}!\n\n"
        f"Tu registro en {empresa} fue aprobado. "
        f"Crea tu contraseña en el siguiente enlace (válido 48 h):\n\n"
        f"{link}\n\n"
        f"— {empresa}"
    )

    # ── Paleta Experias ──────────────────────────────────────────────────────
    NAVY     = '#0a1628'   # Azul navy — fondo exterior, header, CTA
    NAVY_MID = '#1e3a5f'   # Navy medio — hover / acento
    GREEN    = '#16a34a'   # Verde éxito — banda APROBADO
    GREEN_BG = '#f0fdf4'   # Verde claro — fondo banda
    CREAM    = '#faf8f4'   # Crema — fondo caja de contenido
    INK      = '#0f172a'   # Tinta oscura — texto principal
    MUTED    = '#64748b'   # Gris — texto secundario

    # ── Logo ────────────────────────────────────────────────────────────────
    logo_b64 = _logo_base64()
    if logo_b64:
        logo_tag = (
            f'<img src="data:image/png;base64,{logo_b64}" '
            f'alt="Experias S.A.S." width="160" '
            f'style="display:block;margin:0 auto 20px;max-width:160px;height:auto;" />'
        )
    else:
        logo_tag = (
            f'<p style="font-family:Arial,Helvetica,sans-serif;font-size:20px;'
            f'font-weight:700;color:#ffffff;margin:0 0 20px;letter-spacing:1px;">'
            f'EXPERIAS S.A.S.</p>'
        )

    # ── HTML ─────────────────────────────────────────────────────────────────
    cuerpo_html = f"""<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>{asunto}</title>
</head>
<body style="margin:0;padding:0;background:{NAVY};
             font-family:Georgia,'Times New Roman',serif;">

  <table width="100%" cellpadding="0" cellspacing="0"
         style="background:{NAVY};padding:48px 16px 56px;">
    <tr><td align="center">

      <!-- CARD -->
      <table width="560" cellpadding="0" cellspacing="0"
             style="background:#ffffff;border-radius:4px;
                    box-shadow:0 8px 40px rgba(0,0,0,0.45);
                    overflow:hidden;">

        <!-- Header navy con logo -->
        <tr>
          <td style="background:{NAVY};padding:36px 48px 28px;
                     text-align:center;border-radius:4px 4px 0 0;">
            {logo_tag}
            <!-- Línea separadora sutil -->
            <div style="width:40px;height:1px;
                        background:rgba(255,255,255,0.2);
                        margin:0 auto;"></div>
          </td>
        </tr>

        <!-- Banda verde: APROBADO -->
        <tr>
          <td style="background:{GREEN_BG};padding:12px 48px;
                     border-top:3px solid {GREEN};
                     border-bottom:1px solid #bbf7d0;
                     text-align:center;">
            <span style="font-family:Arial,Helvetica,sans-serif;
                         font-size:11px;font-weight:700;letter-spacing:3px;
                         color:{GREEN};text-transform:uppercase;">
              ✓ &nbsp; Acceso Aprobado
            </span>
          </td>
        </tr>

        <!-- Titular -->
        <tr>
          <td style="padding:40px 48px 0;text-align:center;">
            <h1 style="margin:0;font-size:26px;font-weight:700;
                       color:{INK};line-height:1.3;letter-spacing:-0.5px;">
              Tu cuenta está lista,<br>{nombre.split()[0]}.
            </h1>
          </td>
        </tr>

        <!-- Cuerpo -->
        <tr>
          <td style="padding:28px 48px 0;">
            <table width="100%" cellpadding="0" cellspacing="0"
                   style="background:{CREAM};
                          border-left:3px solid {NAVY_MID};
                          border-radius:0 4px 4px 0;">
              <tr>
                <td style="padding:24px 28px;">
                  <p style="margin:0 0 14px;font-size:15px;
                             color:{INK};line-height:1.75;">
                    Hola <strong>{nombre}</strong>,
                  </p>
                  <p style="margin:0 0 14px;font-size:15px;
                             color:{INK};line-height:1.75;">
                    Tu registro como tercero en <strong>{empresa}</strong>
                    ha sido revisado y
                    <span style="font-weight:600;">aprobado</span>
                    por el equipo administrativo.
                  </p>
                  <p style="margin:0;font-size:15px;
                             color:{INK};line-height:1.75;">
                    Haz clic en el botón para crear tu contraseña y acceder
                    al portal. El enlace expira en <strong>48&nbsp;horas</strong>.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="padding:32px 48px 8px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center"
                    style="background:{NAVY};border-radius:3px;">
                  <a href="{link}"
                     style="display:block;padding:17px 0;
                            font-family:Arial,Helvetica,sans-serif;
                            font-size:13px;font-weight:700;
                            letter-spacing:2px;text-transform:uppercase;
                            color:#ffffff;text-decoration:none;">
                    Activar mi cuenta &rarr;
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Enlace plano -->
        <tr>
          <td style="padding:14px 48px 0;text-align:center;">
            <p style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;
                       font-size:11px;color:{MUTED};">
              Si el botón no funciona, copia este enlace en tu navegador:
            </p>
            <p style="margin:0;font-family:'Courier New',Courier,monospace;
                       font-size:10px;word-break:break-all;">
              <a href="{link}" style="color:{MUTED};">{link}</a>
            </p>
          </td>
        </tr>

        <!-- Separador -->
        <tr>
          <td style="padding:28px 48px 0;">
            <div style="height:1px;background:#e2e8f0;"></div>
          </td>
        </tr>

        <!-- ¿Tienes preguntas? -->
        <tr>
          <td style="padding:22px 48px 0;text-align:center;">
            <p style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;
                       font-size:13px;font-weight:700;color:{INK};">
              ¿Tienes preguntas?
            </p>
            <p style="margin:0;font-family:Arial,Helvetica,sans-serif;
                       font-size:12px;color:{MUTED};line-height:1.6;">
              Responde este correo o contacta al administrador de {empresa}.<br>
              Nuestro equipo está listo para ayudarte.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:{NAVY};padding:22px 48px 28px;
                     border-radius:0 0 4px 4px;margin-top:28px;
                     text-align:center;">
          </td>
        </tr>

      </table>

      <!-- Sub-footer: empresa + aviso legal -->
      <table width="560" cellpadding="0" cellspacing="0"
             style="margin-top:-4px;">
        <tr>
          <td style="background:{NAVY};padding:0 48px 28px;
                     border-radius:0 0 4px 4px;text-align:center;">
            <p style="margin:0;font-family:Arial,Helvetica,sans-serif;
                       font-size:11px;color:rgba(255,255,255,0.4);
                       letter-spacing:0.5px;">
              {empresa} &nbsp;·&nbsp; Powered by GRAPP
            </p>
            <p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;
                       font-size:10px;color:rgba(255,255,255,0.2);">
              Si no solicitaste este acceso, ignora este mensaje.
            </p>
          </td>
        </tr>
      </table>

    </td></tr>
  </table>

</body>
</html>"""

    remitente = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@grapp.app')

    send_mail(
        subject=asunto,
        message=cuerpo_texto,
        from_email=remitente,
        recipient_list=[tercero.email],
        html_message=cuerpo_html,
        fail_silently=False,
    )
