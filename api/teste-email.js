// api/teste-email.js
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
    try {
        await resend.emails.send({
            from: 'Muskel Fit <onboarding@resend.dev>',
            to: process.env.EMAIL_DONO,
            subject: 'Teste de Integração - Muskel Fit',
            html: '<h1>Parabéns! Seu sistema de e-mail está funcionando!</h1><p>Se você recebeu isso, o Resend está configurado corretamente.</p>'
        });
        return res.status(200).json({ mensagem: "E-mail enviado com sucesso!" });
    } catch (error) {
        return res.status(500).json({ erro: error.message });
    }
}