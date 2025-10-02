import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';

export const dynamic = 'force-dynamic';

function s(v: unknown) { return String(v ?? '').trim(); }

/** TR telefonu E.164’e normalle (90XXXXXXXXXX döner) */
function normalizePhone(raw: unknown): string | null {
  const digits = s(raw).replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('90') && digits.length === 12) return digits;
  if (digits.startsWith('0') && digits.length === 11) return '90' + digits.slice(1);
  if (digits.length === 10 && digits.startsWith('5')) return '90' + digits;
  return null;
}

function hasSMTP() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}
function hasTwilioSMS() {
  return !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM);
}
function hasWhatsAppCloud() {
  return !!(process.env.WHATSAPP_CLOUD_TOKEN && process.env.WHATSAPP_CLOUD_PHONE_ID);
}

async function sendEmail(to: string, subject: string, html: string, text: string) {
  if (!hasSMTP()) throw new Error('SMTP not configured');

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST!,
    port: Number(process.env.SMTP_PORT ?? 465),
    secure: String(process.env.SMTP_PORT ?? '465') === '465',
    auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASS! },
  });

  await transporter.sendMail({
    from: process.env.MAIL_FROM ?? process.env.SMTP_USER!,
    to,
    subject,
    text,
    html,
  });
}

/** Twilio ile SMS */
async function sendSmsViaTwilio(e164Phone: string, body: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const token = process.env.TWILIO_AUTH_TOKEN!;
  const from = process.env.TWILIO_FROM!; // +1..., +90...
  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;

  const params = new URLSearchParams();
  params.set('From', from);
  params.set('To', '+' + e164Phone);       // E.164
  params.set('Body', body);

  const r = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error('Twilio SMS error: ' + t);
  }
}

/** WhatsApp Cloud API (Meta) ile mesaj */
async function sendWhatsAppCloud(e164Phone: string, body: string) {
  const token = process.env.WHATSAPP_CLOUD_TOKEN!;
  const phoneId = process.env.WHATSAPP_CLOUD_PHONE_ID!; // “phone_number_id”
  const url = `https://graph.facebook.com/v19.0/${phoneId}/messages`;

  const r = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: e164Phone, // 90XXXXXXXXXX (başında + olmadan da kabul eder)
      type: 'text',
      text: { body },
    }),
  });

  if (!r.ok) {
    const t = await r.text();
    throw new Error('WhatsApp Cloud error: ' + t);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const identifier = s(body.identifier).toLowerCase();
    if (!identifier) {
      return NextResponse.json({ error: 'E-posta veya telefon gerekli' }, { status: 400 });
    }

    // Kullanıcıyı bul (mail ya da telefon)
    let user = null as null | { id: number; email: string | null; phone: string | null; name: string | null };
    if (identifier.includes('@')) {
      user = await prisma.user.findUnique({
        where: { email: identifier },
        select: { id: true, email: true, phone: true, name: true },
      });
    } else {
      const phone90 = normalizePhone(identifier);
      if (phone90) {
        user = await prisma.user.findUnique({
          where: { phone: phone90 },
          select: { id: true, email: true, phone: true, name: true },
        });
      }
    }

    // Güvenlik: kullanıcı bilgisi sızdırma—daima OK dön
    if (!user) {
      return NextResponse.json({ ok: true });
    }

    // Token üret
    const base = process.env.JWT_SECRET || 'dev';
    const resetSecret = `${base}::reset::${user.id}`; // (istersen passwordHash ekleyebilirsin)
    const token = jwt.sign(
      { sub: String(user.id), ts: Date.now() },
      resetSecret,
      { expiresIn: '30m' }
    );

    const origin = process.env.NEXT_PUBLIC_APP_URL ?? `http://localhost:${process.env.PORT ?? '3000'}`;
    const resetUrl = `${origin}/reset?token=${encodeURIComponent(token)}`;
    const brand = 'BerberPazar';
    const messageText =
`${brand} şifre sıfırlama linkiniz:
${resetUrl}

Bu bağlantı 30 dakika içinde geçerlidir. Eğer isteği siz yapmadıysanız bu mesajı yok sayabilirsiniz.`;

    // Gönderim stratejisi
    const phone90 = normalizePhone(user.phone);
    const preferWhatsApp = hasWhatsAppCloud();
    const preferSMS = hasTwilioSMS();
    const canEmail = hasSMTP() && user.email;

    let delivered = false;
    let channel: 'whatsapp' | 'sms' | 'email' | null = null;

    // 1) Telefon girdi ise ve WhatsApp Cloud varsa → WhatsApp
    if (!identifier.includes('@') && phone90 && preferWhatsApp) {
      await sendWhatsAppCloud(phone90, messageText);
      delivered = true; channel = 'whatsapp';
    }
    // 2) Telefon girdi ise ve Twilio varsa → SMS
    else if (!identifier.includes('@') && phone90 && preferSMS) {
      await sendSmsViaTwilio(phone90, messageText);
      delivered = true; channel = 'sms';
    }
    // 3) E-posta varsa ve SMTP ayarlıysa → E-posta
    else if (canEmail) {
      const html =
        `<p>Merhaba ${user.name ?? ''},</p>
         <p><b>Şifre sıfırlama linkiniz:</b> <a href="${resetUrl}">${resetUrl}</a></p>
         <p>Bu bağlantı 30 dakika geçerlidir.</p>
         <p>– ${brand}</p>`;
      await sendEmail(user.email!, `${brand} • Şifre Sıfırlama`, html, messageText);
      delivered = true; channel = 'email';
    }

    // Hiçbiri yapılamadıysa (ör. sadece telefon var ama SMS/WA yok)
    if (!delivered) {
      return NextResponse.json({
        error: 'Bu kullanıcı için uygun bir gönderim kanalı bulunamadı (SMS/WhatsApp veya SMTP yapılandırın).',
      }, { status: 500 });
    }

    // Üretimde debug linki dönme!
    return NextResponse.json({ ok: true, channel });
  } catch (e: any) {
    console.error('POST /api/auth/forgot error', e);
    return NextResponse.json({ error: e?.message || 'Beklenmeyen hata' }, { status: 500 });
  }
}
