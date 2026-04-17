import nodemailer from "nodemailer";
import { env } from "../../config/env";

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) {
    return transporter;
  }

  if (env.BREVO_SMTP_USER && env.BREVO_SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: env.BREVO_SMTP_HOST,
      port: env.BREVO_SMTP_PORT,
      secure: env.BREVO_SMTP_PORT === 465,
      auth: {
        user: env.BREVO_SMTP_USER,
        pass: env.BREVO_SMTP_PASS
      }
    });
    return transporter;
  }

  transporter = nodemailer.createTransport({ jsonTransport: true });
  return transporter;
}

export async function sendMail(input: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}) {
  const currentTransporter = getTransporter();

  await currentTransporter.sendMail({
    from: env.BREVO_FROM,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html
  });
}
