// api/sendEmail.js

export default async function handler(req, res) {
  // ----- CORS -----
  const allowedOrigins = [
    "http://127.0.0.1:5500",
    "http://localhost:5500",
    // quando for rodar em produção, adicione aqui o domínio do seu site, por ex.:
    // "https://SEU-DOMINIO.web.app",
    // "https://SEU-DOMINIO.firebaseapp.com",
  ];

  const origin = req.headers.origin;
  const corsOrigin = allowedOrigins.includes(origin)
    ? origin
    : allowedOrigins[0];

  res.setHeader("Access-Control-Allow-Origin", corsOrigin);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Responde o preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    // ----- LER BODY (como JSON) -----
    let rawBody = "";
    for await (const chunk of req) {
      rawBody += chunk;
    }

    const data = JSON.parse(rawBody || "{}");

    const {
      nomeCliente,
      telefoneCliente,
      data: dataAgendada,
      horario,
      servico,
      pagamento,
      valorTotal,
    } = data;

    // ----- CHAVE DA RESEND -----
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY não configurada na Vercel");
      return res
        .status(500)
        .json({ error: "Configuração de e-mail ausente no servidor." });
    }

    // ----- CONTEÚDO DO E-MAIL -----
    const valorFormatado =
      typeof valorTotal === "number"
        ? valorTotal.toFixed(2).replace(".", ",")
        : valorTotal || "0,00";

    const html = `
      <h2>Novo agendamento na agenda online</h2>
      <p><strong>Cliente:</strong> ${nomeCliente || "-"} (${telefoneCliente || "-"})</p>
      <p><strong>Data:</strong> ${dataAgendada || "-"} às ${horario || "-"}</p>
      <p><strong>Serviço:</strong> ${servico || "-"}</p>
      <p><strong>Pagamento:</strong> ${pagamento || "-"}</p>
      <p><strong>Valor total:</strong> R$ ${valorFormatado}</p>
    `;

    // ----- CHAMADA HTTP PARA A RESEND (sem SDK) -----
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // endereço de teste permitido pela Resend
        from: "Jhow Cortes <onboarding@resend.dev>",
        to: ["johnkevindacruz3@gmail.com"], // <-- pra onde vai chegar o aviso
        subject: "Novo agendamento - Barbearia Jhow Cortes",
        html,
      }),
    });

    const dataResend = await response.json();

    if (!response.ok) {
      console.error("Erro ao enviar e-mail na Resend:", dataResend);
      return res
        .status(500)
        .json({ error: "Falha ao enviar e-mail de notificação." });
    }

    return res.status(200).json({ ok: true, id: dataResend.id });
  } catch (error) {
    console.error("Erro inesperado na função sendEmail:", error);
    return res.status(500).json({ error: "Erro interno no servidor." });
  }
}
