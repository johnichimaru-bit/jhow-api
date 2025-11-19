import { Resend } from 'resend';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { nome, telefone, data, horario, servico } = req.body;

  if (!nome || !telefone || !data || !horario || !servico) {
    return res.status(400).json({ error: 'Dados incompletos' });
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: 'Agendamentos <onboarding@resend.dev>',
      to: 'johnkevindacruz3@gmail.com',
      subject: 'Novo Agendamento Recebido!',
      html: `
        <h2>📅 Novo Agendamento</h2>
        <p><strong>Cliente:</strong> ${nome}</p>
        <p><strong>Telefone:</strong> ${telefone}</p>
        <p><strong>Data:</strong> ${data}</p>
        <p><strong>Horário:</strong> ${horario}</p>
        <p><strong>Serviço:</strong> ${servico}</p>
      `
    });

    return res.status(200).json({ success: true, message: 'Email enviado!' });
  } catch (error) {
    console.error('Erro ao enviar email:', error);
    return res.status(500).json({ error: 'Erro interno ao enviar email' });
  }
}
