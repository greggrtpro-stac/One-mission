/**
 * Gabarit HTML partagé pour tous les e-mails transactionnels One Mission.
 * Mise en page par tableaux (compatibilité Outlook/clients historiques),
 * styles inline uniquement (la plupart des webmails retirent les <style>),
 * largeur fixe 480px avec une marge fluide pour rester responsive sur mobile.
 */

const INK = '#141417'
const MUTED = '#5d5d66'
const FAINT = '#9b9ba4'
const SURFACE = '#f6f6f4'
const CARD = '#ffffff'
const LINE = '#e7e7e2'
const ACCENT = '#7c3aed'
const ACCENT_HOVER = '#6d28d9'

export interface EmailLayoutOptions {
  /** Texte d'aperçu (prévisualisation dans la boîte de réception, invisible à l'ouverture). */
  preheader: string
  heading: string
  /** Paragraphes du corps, déjà échappés — un <p> par entrée. */
  paragraphs: string[]
  ctaLabel: string
  ctaUrl: string
  /** Note secondaire sous le bouton (ex. durée de validité du lien). */
  note?: string
}

/** Échappe le minimum nécessaire pour insérer une valeur dynamique (adresse, lien) dans du HTML. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function renderEmailLayout({
  preheader,
  heading,
  paragraphs,
  ctaLabel,
  ctaUrl,
  note,
}: EmailLayoutOptions): string {
  const paragraphsHtml = paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 16px;color:${MUTED};font-size:15px;line-height:1.6;">${p}</p>`,
    )
    .join('')

  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <title>${escapeHtml(heading)}</title>
  </head>
  <body style="margin:0;padding:0;background:${SURFACE};font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${SURFACE};padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="width:100%;max-width:480px;background:${CARD};border:1px solid ${LINE};border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:28px 32px 0;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="width:26px;height:26px;border-radius:8px;background:${ACCENT};text-align:center;vertical-align:middle;">
                      <span style="color:#ffffff;font-size:14px;font-weight:700;line-height:26px;">1</span>
                    </td>
                    <td style="padding-left:9px;color:${INK};font-size:16px;font-weight:700;">One Mission</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 8px;">
                <h1 style="margin:0 0 16px;color:${INK};font-size:21px;font-weight:700;line-height:1.3;">${escapeHtml(heading)}</h1>
                ${paragraphsHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="border-radius:12px;background:${ACCENT};">
                      <a href="${ctaUrl}" style="display:inline-block;padding:13px 26px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:12px;background:${ACCENT};" target="_blank" rel="noopener">${escapeHtml(ctaLabel)}</a>
                    </td>
                  </tr>
                </table>
                ${note ? `<p style="margin:16px 0 0;color:${FAINT};font-size:12.5px;line-height:1.6;">${note}</p>` : ''}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;border-top:1px solid ${LINE};">
                <p style="margin:0;color:${FAINT};font-size:12px;line-height:1.6;">
                  Si le bouton ne fonctionne pas, copie ce lien dans ton navigateur :<br />
                  <a href="${ctaUrl}" style="color:${ACCENT_HOVER};word-break:break-all;">${ctaUrl}</a>
                </p>
              </td>
            </tr>
          </table>
          <p style="margin:20px 0 0;color:${FAINT};font-size:11.5px;">
            One Mission — cet e-mail t'a été envoyé automatiquement, merci de ne pas y répondre.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`
}
