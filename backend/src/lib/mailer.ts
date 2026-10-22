import nodemailer from "nodemailer";
import { env } from "../config/env.js";

const transport = env.SMTP_HOST
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS ?? "" } : undefined,
    })
  : null;

export async function sendMail(msg: { to: string; subject: string; text: string }) {
  if (!transport) {
    console.log(`\n[mail:console] to=${msg.to}\nsubject: ${msg.subject}\n${msg.text}\n`);
    return;
  }
  try {
    await transport.sendMail({ from: env.MAIL_FROM, ...msg });
  } catch (error) {
    // Never fail the request (or leak whether an account exists) because mail failed.
    console.error("Failed to send mail:", error);
  }
}
