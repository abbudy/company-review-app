// test-send.js
require('dotenv').config();
const nodemailer = require('nodemailer');

async function test() {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT||587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });

  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to: process.env.SMTP_USER,
    subject: "Test email from Company Review app",
    text: "If you get this, SMTP works!"
  });

  console.log("Sent:", info.messageId || info);
}
test().catch(err => console.error("Send failed:", err));
