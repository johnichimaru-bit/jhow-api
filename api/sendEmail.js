// api/sendEmail.js
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// Helper de CORS
function applyCors(req, res) {
  const origin = req.headers.origin || "*";

  // Se quiser travar em origens específicas, dá pra trocar o "*" por uma lista
  // ex: ["http://127.0.0.1:5500", "https://seu-site.web.app"]
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export default async function handler(req, res) {
  applyCors(req, res);

  // Responde o preflight (OPTIONS) do navegador
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { to, subject, html } = req.body || {};

    if (!to || !subject || !html) {
      return res.status(400).json({
        error: "Campos obrigatórios: to, subject, html",
      });
    }

    const data = await resend.emails.send({
      from: "Agendamentos Jhow Cortes <onboarding@resend.dev>",
      to,
      subject,
      html,
    });

    return res.status(200).json({
      success: true,
      id: data?.id || null,
    });
  } catch (error) {
    console.error("Erro ao enviar e-mail:", error);
    return res.status(500).json({
      error: "Erro ao enviar e-mail",
      details: error?.message || String(error),
    });
  }
}
