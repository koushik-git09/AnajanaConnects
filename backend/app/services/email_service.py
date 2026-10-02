import logging
import smtplib
import ssl
from email.message import EmailMessage

from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    @classmethod
    def send_password_reset_email(
        cls,
        recipient_email: str,
        recipient_name: str,
        reset_url: str,
    ) -> None:
        """
        Send a branded password reset email via SMTP with STARTTLS.
        Never logs reset tokens, passwords, or credentials.
        """
        if not settings.SMTP_USERNAME or not settings.SMTP_PASSWORD:
            logger.error("SMTP credentials are not configured in environment variables.")
            raise RuntimeError("Email service is temporarily unavailable. Please contact system support.")

        from_email = settings.SMTP_FROM_EMAIL or settings.SMTP_USERNAME
        from_header = f"{settings.SMTP_FROM_NAME} <{from_email}>"

        msg = EmailMessage()
        msg["Subject"] = "Reset your Anjana Connects password"
        msg["From"] = from_header
        msg["To"] = recipient_email

        # Plain text version for non-HTML mail clients
        plain_text = f"""Hello {recipient_name},

We received a request to reset your Anjana Connects account password.

Please open the following link to create a new password:
{reset_url}

This link expires in {settings.PASSWORD_RESET_EXPIRE_MINUTES} minutes and can only be used once.

If you did not request this password reset, you can safely ignore this email. Your password will remain unchanged.

Best regards,
Anjana Connects · HP Gas Agency Team
"""

        # HTML formatted version with brand identity
        html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Reset your Anjana Connects password</title>
</head>
<body style="margin: 0; padding: 24px; background-color: #f7f7f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #202124;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        <table width="560" border="0" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e5e7eb; overflow: hidden; box-shadow: 0 4px 16px rgba(18, 59, 114, 0.06);">
          <!-- Header Banner -->
          <tr>
            <td style="padding: 28px 32px; background: linear-gradient(145deg, #123B72 0%, #0C274D 100%); color: #ffffff;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <h1 style="margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.02em; color: #ffffff;">
                      Anjana <span style="color: #60A5FA;">Connects</span>
                    </h1>
                    <p style="margin: 4px 0 0; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #E31B23;">
                      HP Gas Staff & Agency Portal
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 32px 32px 24px;">
              <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 700; color: #123B72;">
                Password Reset Request
              </h2>
              <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #374151;">
                Hello <strong>{recipient_name}</strong>,
              </p>
              <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #374151;">
                We received a request to reset your Anjana Connects account password. Click the button below to create a new, secure password:
              </p>

              <!-- CTA Button -->
              <table border="0" cellspacing="0" cellpadding="0" style="margin: 28px 0;">
                <tr>
                  <td align="center" style="border-radius: 8px; background-color: #1976D2;">
                    <a href="{reset_url}" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 8px;">
                      Reset My Password
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 12px; font-size: 12px; line-height: 1.5; color: #6B7280;">
                <em>This link is single-use and will expire in <strong>{settings.PASSWORD_RESET_EXPIRE_MINUTES} minutes</strong>.</em>
              </p>

              <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0;" />

              <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #9CA3AF;">
                If you did not request this password reset, you can safely ignore this email. Your account credentials will remain protected.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 16px 32px; background-color: #f7f7f5; border-top: 1px solid #e5e7eb; text-align: center; font-size: 11px; color: #9CA3AF;">
              Anjana Connects · HP Gas Agency Operations Management
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

        msg.set_content(plain_text)
        msg.add_alternative(html_content, subtype="html")

        try:
            context = ssl.create_default_context()
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as server:
                server.ehlo()
                server.starttls(context=context)
                server.ehlo()
                server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
                server.send_message(msg)
            logger.info("Password reset email successfully sent to recipient.")
        except Exception as e:
            logger.error(f"Failed to deliver password reset email: {e.__class__.__name__}")
            raise RuntimeError("Failed to send password reset email. Please verify SMTP configuration.") from e
