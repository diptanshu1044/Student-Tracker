import nodemailer from "nodemailer";
import { env } from "../../config/env";

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) {
    return transporter;
  }

  if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS
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
    from: env.SMTP_FROM,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html
  });
}
