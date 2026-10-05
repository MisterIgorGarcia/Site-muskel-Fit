// api/criar-pagamento.js
//
// "API" mínima da Muskel Fit.
// Recebe o plano e a forma de pagamento escolhidos no formulário, cria o
// pagamento no Mercado Pago (já com a URL de retorno) e devolve o link do checkout.
//
// Por que isso precisa rodar no servidor?
// A URL de retorno (back_urls) só é definida quando o pagamento é criado pela
// API do Mercado Pago, e isso exige o Access Token, que é SECRETO.
// Aqui no servidor ele fica seguro; no JavaScript do site qualquer pessoa o veria.

/* ===================== CONFIGURAÇÃO ===================== */

// Página para onde o cliente volta depois de pagar
const PAGINA_RETORNO = 'https://muskelfit-academia.vercel.app/pre-matricula/prematricula.html';

// ⚠️ CONFIRA OS VALORES: é exatamente o que será cobrado do cliente.
// A chave é o nome curto do plano (o mesmo texto que aparece no <select>).
// Os preços ficam AQUI (e não no navegador) para ninguém conseguir alterar o valor.
const PLANOS = {
    'Mensal':            90,
    'Trimestral':        255,
    'Semestral':         480,
    'Anual':             900,
    'Família 2 pessoas': 150,
    'Família 3 pessoas': 200,
    'Família 4 pessoas': 250,
    'Família 5 pessoas': 300,
    'Adolescente':       75,
    'Idoso':             75,
    '3x na Semana':      75,
    'Professor':         75
};

// Forma de pagamento do formulário -> tipo correspondente no Mercado Pago
const TIPO_MP = {
    'PIX':     'bank_transfer',
    'Débito':  'debit_card',
    'Crédito': 'credit_card'
};

// Tipos que podem ser escondidos do checkout (todos menos o escolhido são escondidos)
const TIPOS_ESCONDIVEIS = ['bank_transfer', 'debit_card', 'credit_card', 'prepaid_card', 'ticket'];

/* ===================== FUNÇÃO DA API ===================== */

module.exports = async function handler(req, res) {

    // Só aceita POST (é o que o formulário envia)
    if (req.method !== 'POST') {
        return res.status(405).json({ erro: 'Método não permitido' });
    }

    try {
        const { plano, pagamento } = req.body || {};

        // O <select> envia algo como "Mensal — R$ 90,00": procuramos o nome curto dentro dele
        const nomePlano = Object.keys(PLANOS).find(nome =>
            String(plano || '').toLowerCase().includes(nome.toLowerCase())
        );
        const tipoEscolhido = TIPO_MP[pagamento];

        if (!nomePlano || !tipoEscolhido) {
            return res.status(400).json({ erro: 'Plano ou forma de pagamento inválidos' });
        }

        const token = process.env.MP_ACCESS_TOKEN;
        if (!token) {
            console.error('Variável MP_ACCESS_TOKEN não configurada na Vercel.');
            return res.status(500).json({ erro: 'Pagamento indisponível no momento' });
        }

        // Cria a "preferência de pagamento" no Mercado Pago
        const resposta = await fetch('https://api.mercadopago.com/checkout/preferences', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                items: [{
                    title: `Muskel Fit — Plano ${nomePlano}`,
                    quantity: 1,
                    unit_price: PLANOS[nomePlano],
                    currency_id: 'BRL'
                }],

                // ✅ URLs de retorno: cobrimos os 3 cenários possíveis
                back_urls: {
                    success: `${PAGINA_RETORNO}?status=success`,
                    pending: `${PAGINA_RETORNO}?status=pending`,
                    failure: `${PAGINA_RETORNO}?status=failure`
                },
                auto_return: 'approved',

                // Mostra só a forma de pagamento que o cliente escolheu no formulário
                payment_methods: {
                    excluded_payment_types: TIPOS_ESCONDIVEIS
                        .filter(tipo => tipo !== tipoEscolhido)
                        .map(id => ({ id }))
                }
            })
        });

        const dados = await resposta.json();

        if (!resposta.ok || !dados.init_point) {
            console.error('Erro do Mercado Pago:', resposta.status, JSON.stringify(dados));
            return res.status(502).json({ erro: 'Não foi possível criar o pagamento' });
        }

        // init_point = link do checkout do Mercado Pago
        return res.status(200).json({ url: dados.init_point });

    } catch (erro) {
        console.error('Erro inesperado:', erro);
        return res.status(500).json({ erro: 'Erro interno' });
    }
};