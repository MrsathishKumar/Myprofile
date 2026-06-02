// ============================================================
//  server.js  –  Sathish Kumar Portfolio Backend
//  Email  → Gmail SMTP via Nodemailer
//  SMS    → Twilio
// ============================================================

require('dotenv').config();

const express    = require('express');
const cors       = require('cors');
const nodemailer = require('nodemailer');
const twilio     = require('twilio');

const app  = express();
const PORT = process.env.PORT || 3000;

// ─────────────────────────────────────────────────────────────
//  STARTUP: validate every required env var up front
// ─────────────────────────────────────────────────────────────
const REQUIRED = {
  EMAIL_USER          : 'Your Gmail address            e.g. sathish292003@gmail.com',
  EMAIL_PASS          : 'Gmail App Password (16 chars)  e.g. abcd efgh ijkl mnop',
  OWNER_EMAIL         : 'Email to receive messages      e.g. sathish292003@gmail.com',
  TWILIO_ACCOUNT_SID  : 'Twilio Account SID             starts with AC...',
  TWILIO_AUTH_TOKEN   : 'Twilio Auth Token              from twilio.com/console',
  TWILIO_PHONE_NUMBER : 'Your Twilio number (E.164)     e.g. +12345678901',
  OWNER_PHONE         : 'Your mobile (E.164)            e.g. +919585879853',
};

let configOk = true;
console.log('\n──────────────────────────────────────────');
console.log('  Checking .env configuration…');
console.log('──────────────────────────────────────────');
for (const [key, hint] of Object.entries(REQUIRED)) {
  const val = process.env[key];
  if (!val || val.trim() === '' || val.includes('your_') || /X{4,}/i.test(val)) {
    console.warn(`⚠️  MISSING  ${key}`);
    console.warn(`            ${hint}`);
    configOk = false;
  } else {
    const masked = val.length > 6 ? val.slice(0, 4) + '****' + val.slice(-4) : '****';
    console.log(`✅  ${key.padEnd(22)} ${masked}`);
  }
}
console.log('──────────────────────────────────────────');
if (!configOk) {
  console.warn('\n⚠️  Fix the missing values in .env, then restart: npm start\n');
} else {
  console.log('\n✅  All credentials set — ready!\n');
}

// ─────────────────────────────────────────────────────────────
//  Middleware
// ─────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));   // serves portfolio.html + images/

// ─────────────────────────────────────────────────────────────
//  Gmail transporter  (port 465 SSL)
// ─────────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host  : 'smtp.gmail.com',
  port  : 465,
  secure: true,
  auth  : {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ─────────────────────────────────────────────────────────────
//  Twilio client
// ─────────────────────────────────────────────────────────────
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// ─────────────────────────────────────────────────────────────
//  HTML escape
// ─────────────────────────────────────────────────────────────
function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─────────────────────────────────────────────────────────────
//  POST /api/contact
// ─────────────────────────────────────────────────────────────
app.post('/api/contact', async (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!name?.trim() || !email?.trim() || !subject?.trim() || !message?.trim()) {
    return res.status(400).json({ success: false, error: 'All fields are required.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, error: 'Invalid email address.' });
  }

  let emailSent = false;
  let smsSent   = false;
  const errors  = [];
  const timeIST = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  // ── 1. Email ───────────────────────────────────────────────
  try {
    await transporter.sendMail({
      from   : `"Portfolio Contact" <${process.env.EMAIL_USER}>`,
      to     : process.env.OWNER_EMAIL,
      replyTo: email,
      subject: `📩 New Portfolio Message: ${subject}`,
      html   : `
<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:auto;
            background:#0a0a1a;color:#fff;border-radius:12px;
            overflow:hidden;border:2px solid #00ff88;">
  <div style="background:linear-gradient(135deg,#00ff88,#ffd633);padding:24px;text-align:center;">
    <h2 style="margin:0;color:#000;font-size:22px;letter-spacing:1px;">📬 NEW CONTACT MESSAGE</h2>
    <p style="margin:6px 0 0;color:#000;font-size:14px;">From your Portfolio Website</p>
  </div>
  <div style="padding:30px;">
    <table style="width:100%;border-collapse:collapse;font-size:15px;">
      <tr>
        <td style="padding:10px 0;color:#00ff88;font-weight:600;width:90px;">Name</td>
        <td style="padding:10px 0;">${escapeHtml(name)}</td>
      </tr>
      <tr style="border-top:1px solid rgba(255,255,255,0.1);">
        <td style="padding:10px 0;color:#00ff88;font-weight:600;">Email</td>
        <td style="padding:10px 0;"><a href="mailto:${escapeHtml(email)}" style="color:#ffd633;">${escapeHtml(email)}</a></td>
      </tr>
      <tr style="border-top:1px solid rgba(255,255,255,0.1);">
        <td style="padding:10px 0;color:#00ff88;font-weight:600;">Subject</td>
        <td style="padding:10px 0;">${escapeHtml(subject)}</td>
      </tr>
    </table>
    <div style="margin-top:20px;padding:20px;background:rgba(0,255,136,0.06);border-radius:8px;border-left:3px solid #00ff88;">
      <p style="margin:0 0 8px;color:#00ff88;font-weight:600;">Message</p>
      <p style="margin:0;color:#ddd;line-height:1.8;white-space:pre-wrap;">${escapeHtml(message)}</p>
    </div>
    <div style="margin-top:24px;text-align:center;">
      <a href="mailto:${escapeHtml(email)}"
         style="display:inline-block;background:linear-gradient(45deg,#00ff88,#ffd633);
                color:#000;text-decoration:none;padding:12px 28px;
                border-radius:24px;font-weight:700;font-size:15px;">
        ↩ Reply to ${escapeHtml(name)}
      </a>
    </div>
  </div>
  <div style="background:rgba(0,0,0,0.3);padding:14px;text-align:center;font-size:12px;color:#777;">
    © 2025 SathishKumar Portfolio &nbsp;|&nbsp; Received at ${timeIST} IST
  </div>
</div>`,
    });
    emailSent = true;
    console.log(`✅ Email → ${process.env.OWNER_EMAIL}`);
  } catch (err) {
    console.error('❌ Email error:', err.message);
    errors.push('Email failed: ' + err.message);
  }

  // ── 2. SMS via Twilio ──────────────────────────────────────
  try {
    await twilioClient.messages.create({
      from: process.env.TWILIO_PHONE_NUMBER,   // e.g. +12345678901
      to  : process.env.OWNER_PHONE,           // e.g. +919585879853
      body:
        `📩 Portfolio msg from ${name}\n` +
        `Email: ${email}\n` +
        `Subject: ${subject}\n` +
        `Msg: ${message.slice(0, 120)}${message.length > 120 ? '...' : ''}`,
    });
    smsSent = true;
    console.log(`✅ SMS → ${process.env.OWNER_PHONE}`);
  } catch (err) {
    console.error('❌ SMS error:', err.message);
    errors.push('SMS failed: ' + err.message);
  }

  // ── Response ───────────────────────────────────────────────
  if (emailSent || smsSent) {
    return res.status(200).json({ success: true, emailSent, smsSent, errors });
  }
  return res.status(500).json({
    success: false,
    error  : 'Both notifications failed. Check .env and restart.',
    details: errors,
  });
});

// ─────────────────────────────────────────────────────────────
//  GET /api/health
// ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    time  : new Date().toISOString(),
    config: {
      email              : !!process.env.EMAIL_USER && !!process.env.EMAIL_PASS ? '✅' : '❌ missing',
      twilio_sid         : !!process.env.TWILIO_ACCOUNT_SID   ? '✅' : '❌ missing',
      twilio_token       : !!process.env.TWILIO_AUTH_TOKEN     ? '✅' : '❌ missing',
      twilio_from_number : process.env.TWILIO_PHONE_NUMBER     || '❌ NOT SET',
      owner_phone        : process.env.OWNER_PHONE             || '❌ NOT SET',
    },
  });
});

// ─────────────────────────────────────────────────────────────
//  Start
// ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀  Server  → http://localhost:${PORT}`);
  console.log(`📬  API     → POST http://localhost:${PORT}/api/contact`);
  console.log(`🌐  Site    → http://localhost:${PORT}/portfolio.html\n`);
});
