export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // Garante a leitura correta do body na Vercel
  const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  const { subject, message, userId, token } = body;

  // Validação detalhada para identificar o campo ausente
  if (!subject) return res.status(400).json({ error: 'O campo Assunto é obrigatório.' });
  if (!message) return res.status(400).json({ error: 'O campo Mensagem é obrigatório.' });
  if (!userId) return res.status(400).json({ error: 'ID do usuário não encontrado. Recarregue a página.' });
  if (!token) return res.status(400).json({ error: 'Sessão inválida. Faça login novamente.' });

  const SUPABASE_URL = 'https://pmpsegvbypsbuoirtyrt.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_8MdEp51LeQmC9ePkknH4BA_pbW8O0gt';

  try {
    // Busca os e-mails dos contatos do criador no Supabase
    const supabaseRes = await fetch(`${SUPABASE_URL}/rest/v1/contacts?select=email`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${token}`
      }
    });

    const contacts = await supabaseRes.json();

    if (!contacts || contacts.length === 0 || contacts.error) {
      return res.status(400).json({ error: 'Nenhum contato encontrado na sua lista.' });
    }

    const emailList = contacts.map(c => c.email);

    // Disparo dos e-mails via Resend API
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'CreatorShield <onboarding@resend.dev>',
        to: emailList,
        subject: subject,
        html: `<div style="font-family: sans-serif; font-size: 15px; color: #1e293b; line-height: 1.6;">${message.replace(/\n/g, '<br>')}</div>`
      })
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok) {
      return res.status(500).json({ error: resendData.message || 'Erro ao enviar via Resend.' });
    }

    return res.status(200).json({ success: true, count: emailList.length });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
