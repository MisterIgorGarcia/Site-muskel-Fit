// api/webhook-mercadopago.js
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido' });

    try {
        const { action, data } = req.body;
        const paymentId = data?.id || req.query['data.id'];

        if (!paymentId) return res.status(200).send('Sem ID');

        const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
            headers: { 'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}` }
        });
        const payment = await mpResponse.json();

        if (payment.status === 'approved') {
            const valor = payment.transaction_amount.toFixed(2).replace('.', ',');
            const nomeAluno = payment.payer.first_name || 'Aluno';
            const metodo = payment.payment_method_id.toUpperCase();
            
            // Formatando a data bonitinha
            const dataObj = new Date(payment.date_approved);
            const dataPagamento = dataObj.toLocaleDateString('pt-BR') + ' às ' + dataObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

            // Pegando os dados do plano que enviamos
            const meta = payment.metadata || {};
            const unidade = meta.unidade || 'Não informada';
            const modalidade = meta.modalidade || 'Não informada';
            const plano = meta.plano || 'Não informado';
            const tipo = meta.tipo === 'matricula' ? 'Matrícula' : 'Pré-Matrícula';

            // TEMPLATE DO E-MAIL (ESTILO PREMIUM MUSKEL FIT)
            const htmlRecibo = `
            <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; text-align: center;">
                <div style="max-width: 500px; margin: 0 auto; background-color: #0d0d0d; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.2); text-align: left;">
                    
                    <!-- Cabeçalho -->
                    <div style="background-color: #ffd60a; padding: 20px; text-align: center;">
                        <h1 style="color: #0d0d0d; margin: 0; font-size: 24px; font-weight: 900; letter-spacing: 1px;">MUSKEL FIT</h1>
                        <p style="color: #0d0d0d; margin: 5px 0 0 0; font-size: 14px; font-weight: bold;">Comprovante de Pagamento</p>
                    </div>

                    <!-- Status -->
                    <div style="text-align: center; padding: 20px 20px 0 20px;">
                        <span style="background-color: #22c55e; color: #fff; padding: 6px 15px; border-radius: 20px; font-size: 12px; font-weight: bold; letter-spacing: 1px;">✔ PAGAMENTO APROVADO</span>
                    </div>

                    <!-- Dados do Aluno -->
                    <div style="padding: 20px 30px;">
                        <p style="color: #999; font-size: 12px; text-transform: uppercase; margin-bottom: 5px;">Aluno(a)</p>
                        <p style="color: #fff; font-size: 18px; margin-top: 0; font-weight: bold; border-bottom: 1px solid #333; padding-bottom: 15px;">${nomeAluno}</p>

                        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                            <tr>
                                <td style="padding: 8px 0; color: #999; font-size: 13px;">Unidade:</td>
                                <td style="padding: 8px 0; color: #fff; font-size: 13px; text-align: right;">${unidade}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #999; font-size: 13px;">Tipo:</td>
                                <td style="padding: 8px 0; color: #fff; font-size: 13px; text-align: right;">${tipo}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #999; font-size: 13px;">Modalidade:</td>
                                <td style="padding: 8px 0; color: #fff; font-size: 13px; text-align: right;">${modalidade}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #999; font-size: 13px;">Plano:</td>
                                <td style="padding: 8px 0; color: #ffd60a; font-size: 13px; font-weight: bold; text-align: right;">${plano}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #999; font-size: 13px;">Método:</td>
                                <td style="padding: 8px 0; color: #fff; font-size: 13px; text-align: right;">${metodo}</td>
                            </tr>
                        </table>
                    </div>

                    <!-- Valor Total -->
                    <div style="background-color: #141414; padding: 20px 30px; border-top: 1px dashed #333; border-bottom: 1px dashed #333; display: flex; justify-content: space-between; align-items: center;">
                        <span style="color: #fff; font-size: 14px; font-weight: bold;">VALOR TOTAL:</span>
                        <span style="color: #ffd60a; font-size: 24px; font-weight: 900;">R$ ${valor}</span>
                    </div>

                    <!-- Rodapé -->
                    <div style="padding: 20px 30px; text-align: center;">
                        <p style="color: #666; font-size: 11px; margin: 0;">ID da Transação: ${payment.id}</p>
                        <p style="color: #666; font-size: 11px; margin: 5px 0 0 0;">Aprovado em: ${dataPagamento}</p>
                        <p style="color: #999; font-size: 12px; margin-top: 20px;">Este é um e-mail automático gerado pelo sistema de matrículas.</p>
                    </div>
                </div>
            </div>
            `;

            await resend.emails.send({
                from: 'Muskel Fit <onboarding@resend.dev>',
                to: process.env.EMAIL_DONO,
                subject: `✅ Pagamento Aprovado - ${nomeAluno} (${unidade})`,
                html: htmlRecibo // Envia o template bonito
            });
        }

        return res.status(200).json({ received: true });
    } catch (error) {
        console.error('Erro no webhook:', error);
        return res.status(500).json({ erro: 'Erro interno' });
    }
}