import nodemailer from 'nodemailer'
import { env } from '../config/env.js'

const smtpConfigured = Boolean(env.SMTP_HOST)

const transporter = smtpConfigured
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    })
  : null

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  if (!transporter) {
    // Pas de SMTP en développement : le lien est affiché dans la console serveur.
    console.log(`\n📧 [DEV] Lien de réinitialisation pour ${to} :\n   ${resetUrl}\n`)
    return
  }
  await transporter.sendMail({
    from: env.MAIL_FROM,
    to,
    subject: 'One Mission — Réinitialisation de ton mot de passe',
    text: `Tu as demandé la réinitialisation de ton mot de passe One Mission.\n\nClique sur ce lien (valable 1 heure) :\n${resetUrl}\n\nSi tu n'es pas à l'origine de cette demande, ignore cet e-mail.`,
    html: `
      <div style="font-family:Inter,system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#141417">Réinitialisation de ton mot de passe</h2>
        <p style="color:#5d5d66">Tu as demandé la réinitialisation de ton mot de passe One Mission. Ce lien est valable 1 heure.</p>
        <p style="margin:28px 0">
          <a href="${resetUrl}" style="background:#ff6a00;color:#fff;padding:12px 22px;border-radius:12px;text-decoration:none;font-weight:600">
            Choisir un nouveau mot de passe
          </a>
        </p>
        <p style="color:#9b9ba4;font-size:13px">Si tu n'es pas à l'origine de cette demande, ignore simplement cet e-mail.</p>
      </div>`,
  })
}
