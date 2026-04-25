import nodemailer from "nodemailer";
import { env } from "../../config/env";
import { logger } from "../../config/logger";

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

  throw new Error(
    "SMTP is not configured. Set BREVO_SMTP_USER and BREVO_SMTP_PASS in backend/.env"
  );
}

export async function sendMail(input: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}) {
  const currentTransporter = getTransporter();

  try {
    const info = await currentTransporter.sendMail({
      from: env.BREVO_FROM,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html
    });

    logger.info(
      {
        to: input.to,
        subject: input.subject,
        accepted: info.accepted,
        rejected: info.rejected,
        response: info.response,
        messageId: info.messageId
      },
      "Email queued by SMTP provider"
    );

    return {
      accepted: info.accepted,
      rejected: info.rejected,
      response: info.response,
      messageId: info.messageId
    };
  } catch (error) {
    logger.error(
      {
        to: input.to,
        subject: input.subject,
        error: error instanceof Error ? error.message : "unknown"
      },
      "Failed to send email"
    );
    throw error;
  }
}
