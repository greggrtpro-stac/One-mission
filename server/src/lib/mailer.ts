import nodemailer from 'nodemailer'
import { env } from '../config/env.js'
import { escapeHtml, renderEmailLayout } from './emailTemplate.js'

const smtpConfigured = Boolean(env.SMTP_HOST)

const transporter = smtpConfigured
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    })
  : null

export async function sendEmailVerificationEmail(to: string, verifyUrl: string): Promise<void> {
  if (!transporter) {
    // Pas de SMTP en développement : le lien est affiché dans la console serveur.
    console.log(`\n📧 [DEV] Lien de vérification d'e-mail pour ${to} :\n   ${verifyUrl}\n`)
    return
  }
  const safeUrl = escapeHtml(verifyUrl)
  await transporter.sendMail({
    from: env.MAIL_FROM,
    to,
    subject: 'Confirme ton adresse e-mail — One Mission',
    text: `Bienvenue sur One Mission !\n\nConfirme ton adresse e-mail pour activer ton compte (lien valable 24 heures) :\n${verifyUrl}\n\nSi tu n'es pas à l'origine de cette inscription, ignore cet e-mail : aucun compte ne sera activé.`,
    html: renderEmailLayout({
      preheader: 'Un dernier clic pour activer ton compte One Mission.',
      heading: 'Confirme ton adresse e-mail',
      paragraphs: [
        'Bienvenue sur One Mission ! Il ne reste qu’une étape avant de pouvoir te connecter : confirmer que cette adresse t’appartient bien.',
        'Ce lien est valable <strong>24 heures</strong> et ne peut être utilisé qu’une seule fois.',
      ],
      ctaLabel: 'Confirmer mon adresse',
      ctaUrl: safeUrl,
      note: "Si tu n'es pas à l'origine de cette inscription, ignore simplement cet e-mail : aucun compte ne sera activé.",
    }),
  })
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  if (!transporter) {
    // Pas de SMTP en développement : le lien est affiché dans la console serveur.
    console.log(`\n📧 [DEV] Lien de réinitialisation pour ${to} :\n   ${resetUrl}\n`)
    return
  }
  const safeUrl = escapeHtml(resetUrl)
  await transporter.sendMail({
    from: env.MAIL_FROM,
    to,
    subject: 'Réinitialisation de ton mot de passe — One Mission',
    text: `Tu as demandé la réinitialisation de ton mot de passe One Mission.\n\nClique sur ce lien (valable 1 heure) :\n${resetUrl}\n\nSi tu n'es pas à l'origine de cette demande, ignore cet e-mail.`,
    html: renderEmailLayout({
      preheader: 'Choisis un nouveau mot de passe pour ton compte One Mission.',
      heading: 'Réinitialisation de ton mot de passe',
      paragraphs: [
        'Tu as demandé la réinitialisation de ton mot de passe. Ce lien est valable <strong>1 heure</strong> et ne peut être utilisé qu’une seule fois.',
      ],
      ctaLabel: 'Choisir un nouveau mot de passe',
      ctaUrl: safeUrl,
      note: "Si tu n'es pas à l'origine de cette demande, ignore simplement cet e-mail : ton mot de passe actuel reste inchangé.",
    }),
  })
}
