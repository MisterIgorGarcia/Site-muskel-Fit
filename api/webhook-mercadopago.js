// api/webhook-mercadopago.js
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido' });

    try {
        const { action, data } = req.body;
        const paymentId = data?.id || req.query['data.id'];

        if (!paymentId) return res.status(200).send('Sem ID de pagamento');

        const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
            headers: { 'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}` }
        });
        const payment = await mpResponse.json();

        if (payment.status === 'approved') {
            const valor = payment.transaction_amount.toFixed(2).replace('.', ',');
            
            const metodos = {
                'pix': 'PIX',
                'credit_card': 'Cartão de Crédito',
                'debit_card': 'Cartão de Débito',
                'bolbradesco': 'Boleto'
            };
            const metodoPagamento = metodos[payment.payment_method_id] || payment.payment_method_id.toUpperCase();

            const dataObj = new Date(payment.date_approved);
            const dataFormatada = dataObj.toLocaleDateString('pt-BR');
            const horaFormatada = dataObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

            // Pega os metadados
            const meta = payment.metadata || {};
            const unidade = meta.unidade || 'Não informada';
            const modalidade = meta.modalidade || 'Não informada';
            const plano = meta.plano || 'Não informado';
            const tipo = meta.tipo === 'matricula' ? 'Matrícula' : 'Pré-Matrícula';
            
            // Pega Nome e Celular EXATOS do formulário
            const nomeAluno = meta.nome_aluno || 'Aluno(a)';
            const celularAluno = meta.celular_aluno || 'Não informado';

            const htmlRecibo = `
            <div style="background-color: #f4f4f4; padding: 20px; font-family: Arial, Helvetica, sans-serif;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #0d0d0d; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">
                    
                    <div style="background-color: #ffd60a; padding: 25px; text-align: center;">
                        <h1 style="color: #0d0d0d; margin: 0; font-size: 28px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase;">MUSKEL FIT</h1>
                        <p style="color: #0d0d0d; margin: 5px 0 0 0; font-size: 14px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">Recibo de Pagamento</p>
                    </div>

                    <div style="text-align: center; padding: 25px 20px 10px 20px;">
                        <span style="background-color: #22c55e; color: #ffffff; padding: 8px 20px; border-radius: 30px; font-size: 13px; font-weight: bold; letter-spacing: 1px; display: inline-block;">
                            ✔ PAGAMENTO APROVADO
                        </span>
                    </div>

                    <div style="padding: 20px 30px;">
                        <p style="color: #999999; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px;">Aluno(a)</p>
                        <p style="color: #ffffff; font-size: 22px; margin-top: 0; font-weight: bold; margin-bottom: 25px; border-bottom: 2px solid #333333; padding-bottom: 15px;">${nomeAluno}</p>

                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 10px 0; color: #999999; font-size: 14px; border-bottom: 1px solid #222222;">Celular:</td>
                                <td style="padding: 10px 0; color: #ffffff; font-size: 14px; text-align: right; border-bottom: 1px solid #222222;">${celularAluno}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px 0; color: #999999; font-size: 14px; border-bottom: 1px solid #222222;">Tipo de Registro:</td>
                                <td style="padding: 10px 0; color: #ffffff; font-size: 14px; text-align: right; border-bottom: 1px solid #222222;"><strong>${tipo}</strong></td>
                            </tr>
                            <tr>
                                <td style="padding: 10px 0; color: #999999; font-size: 14px; border-bottom: 1px solid #222222;">Unidade:</td>
                                <td style="padding: 10px 0; color: #ffffff; font-size: 14px; text-align: right; border-bottom: 1px solid #222222;">${unidade}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px 0; color: #999999; font-size: 14px; border-bottom: 1px solid #222222;">Modalidade:</td>
                                <td style="padding: 10px 0; color: #ffffff; font-size: 14px; text-align: right; border-bottom: 1px solid #222222;">${modalidade}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px 0; color: #999999; font-size: 14px; border-bottom: 1px solid #222222;">Plano:</td>
                                <td style="padding: 10px 0; color: #ffd60a; font-size: 14px; font-weight: bold; text-align: right; border-bottom: 1px solid #222222;">${plano}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px 0; color: #999999; font-size: 14px; border-bottom: 1px solid #222222;">Forma de Pagamento:</td>
                                <td style="padding: 10px 0; color: #ffffff; font-size: 14px; text-align: right; border-bottom: 1px solid #222222;">${metodoPagamento}</td>
                            </tr>
                        </table>
                    </div>

                    <div style="background-color: #1a1a1a; padding: 25px 30px; text-align: right; border-top: 1px solid #333333; border-bottom: 1px solid #333333;">
                        <span style="color: #999999; font-size: 14px; display: block; margin-bottom: 5px;">Valor Pago:</span>
                        <span style="color: #ffd60a; font-size: 32px; font-weight: 900;">R$ ${valor}</span>
                    </div>

                    <div style="padding: 25px 30px; text-align: center; background-color: #0d0d0d;">
                        <p style="color: #666666; font-size: 12px; margin: 0;">ID da Transação: <strong>${payment.id}</strong></p>
                        <p style="color: #666666; font-size: 12px; margin: 5px 0 0 0;">Data de Aprovação: ${dataFormatada} às ${horaFormatada}</p>
                        <p style="color: #999999; font-size: 12px; margin-top: 20px;">Este recibo foi gerado automaticamente pelo sistema de matrículas da Muskel Fit.</p>
                    </div>
                </div>
            </div>
            `;

            // Captura a resposta do Resend para verificar se deu erro
            const emailResponse = await resend.emails.send({
                from: 'Muskel Fit <onboarding@resend.dev>',
                to: process.env.EMAIL_DONO,
                subject: `Pagamento realizado: Aluno ${nomeAluno}`, 
                html: htmlRecibo
            });

            // RAIO-X DO RESEND
            if (emailResponse.error) {
                console.error("ERRO DO RESEND:", emailResponse.error);
            } else {
                console.log("E-mail enviado com sucesso! ID:", emailResponse.data?.id);
            }
        }

        return res.status(200).json({ received: true });
    } catch (error) {
        console.error('Erro no webhook:', error);
        return res.status(500).json({ erro: 'Erro interno' });
    }
}