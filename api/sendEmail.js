// api/sendEmail.js

export default async function handler(req, res) {
  // ==========================
  // CORS
  // ==========================
  const origin = req.headers.origin || "";

  const isLocalhost =
    origin.startsWith("http://localhost") ||
    origin.startsWith("http://127.0.0.1");

  const allowedProdOrigins = [
    // Painel/admin
    "https://barbearia-john.web.app",
    "https://barbearia-john.firebaseapp.com",

    // Site público + agenda online
    "https://jhowcortesofc.web.app",
    "https://jhowcortesofc.firebaseapp.com",
    "https://jhowcortes.com.br",
  ];

  if (isLocalhost || allowedProdOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else if (allowedProdOrigins.length > 0) {
    res.setHeader("Access-Control-Allow-Origin", allowedProdOrigins[0]);
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }

  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    // ==========================
    // LER BODY (JSON)
    // ==========================
    let data = {};

    if (req.body && Object.keys(req.body).length > 0) {
      data = req.body;
    } else {
      let rawBody = "";
      for await (const chunk of req) {
        rawBody += chunk;
      }
      if (rawBody) {
        data = JSON.parse(rawBody);
      }
    }

    const {
      nomeCliente,
      telefoneCliente,
      telefone, // fallback
      data: dataAgendada,
      horario,
      servico,
      pagamento,
      valorTotal,
      adicionais,
      comentario,
    } = data;

    const telefoneFinal = telefoneCliente || telefone || "-";

    // ==========================
    // CHAVE DA RESEND
    // ==========================
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY não configurada na Vercel");
      return res
        .status(500)
        .json({ error: "Configuração de e-mail ausente no servidor." });
    }

    // ==========================
    // FORMATAÇÕES
    // ==========================
    const valorFormatado =
      typeof valorTotal === "number"
        ? valorTotal.toFixed(2).replace(".", ",")
        : valorTotal || "0,00";

    let dataFormatada = dataAgendada || "-";
    if (
      typeof dataAgendada === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(dataAgendada)
    ) {
      const [ano, mes, dia] = dataAgendada.split("-");
      dataFormatada = `${dia}/${mes}/${ano}`;
    }

    const adicionaisTexto =
      Array.isArray(adicionais) && adicionais.length
        ? `<p><strong>Adicionais:</strong> ${adicionais.join(", ")}</p>`
        : "";

    const comentarioTexto = comentario
      ? `<p><strong>Comentário do cliente:</strong> ${comentario}</p>`
      : "";

    const html = `
      <div style="font-family: Arial, sans-serif; font-size: 14px; color: #222;">
        <h2 style="margin-bottom: 10px;">Novo agendamento na agenda online</h2>

        <p><strong>Cliente:</strong> ${nomeCliente || "-"} (${telefoneFinal})</p>
        <p><strong>Data:</strong> ${dataFormatada} às ${horario || "-"}</p>
        <p><strong>Serviço:</strong> ${servico || "-"}</p>
        ${adicionaisTexto}
        <p><strong>Forma de pagamento:</strong> ${pagamento || "-"}</p>
        <p><strong>Valor total:</strong> R$ ${valorFormatado}</p>
        ${comentarioTexto}

        <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;" />

        <p style="font-size: 12px; color: #777;">
          Este e-mail foi gerado automaticamente pela agenda online da
          <strong>Barbearia Jhow Cortes</strong>.
        </p>
      </div>
    `;

    // ==========================
    // ENVIO VIA RESEND (DOMÍNIO VERIFICADO)
    // ==========================
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Barbearia Jhow Cortes <agendamentos@jhowcortes.com.br>", 
        to: ["jhoventura20@gmail.com"],
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
