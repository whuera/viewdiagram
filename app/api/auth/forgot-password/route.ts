import { NextResponse } from 'next/server'

export async function POST() {
  const adminEmail = process.env.ADMIN_EMAIL || 'whuera@gmail.com'
  const adminPassword = process.env.ADMIN_PASSWORD || '(no configurada)'
  // TODO: connect nodemailer/Resend to send real email
  console.log(`[forgot-password] Enviar contraseña admin a: ${adminEmail} / pass: ${adminPassword}`)
  return NextResponse.json({ ok: true })
}
