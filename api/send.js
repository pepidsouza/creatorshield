export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { subject, message, userId } = req.body;

  if (!subject || !message || !userId) {
    return res.status(400).json({ error: 'Assunto, mensagem e ID do usuário são obrigatórios.' });
  }

  const SUPABASE_URL = 'https://pmpsegvbypsbuoirtyrt.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_8MdEp51LeQmC9ePkknH4BA_pbW8O0gt';

  try {
    // 1. Busca todos os e-mails da lista deste criador no Supabase
    const supabaseRes = await fetch(`${SUPABASE_URL}/rest/v1/contacts?user_id=eq.${userId}&select=email`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });

    const contacts = await supabaseRes.json();

    if (!contacts || contacts.length === 0) {
      return res.status(400).json({ error: 'Nenhum contato encontrado na sua lista para enviar.' });
    }

    const emailList = contacts.map(c => c.email);

    // 2. Dispara os e-mails utilizando a API do Resend
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
