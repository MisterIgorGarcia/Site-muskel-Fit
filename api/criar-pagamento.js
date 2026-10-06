// api/criar-pagamento.js
//
// "API" mínima da Muskel Fit.
// Recebe a unidade, modalidade, o plano e a forma de pagamento escolhidos no formulário,
// cria o pagamento no Mercado Pago (já com a URL de retorno) e devolve o link do checkout.
//
// Por que isso precisa rodar no servidor?
// A URL de retorno (back_urls) só é definida quando o pagamento é criado pela
// API do Mercado Pago, e isso exige o Access Token, que é SECRETO.
// Aqui no servidor ele fica seguro; no JavaScript do site qualquer pessoa o veria.
//
// Por que o preço NÃO está mais neste arquivo?
// Agora cada unidade tem suas próprias modalidades, e cada modalidade tem seus planos e preços.
// Tudo fica no Vercel Edge Config — a MESMA fonte que o site usa.
// Assim nunca existe divergência entre o valor mostrado e o valor cobrado,
// e os preços podem ser alterados pelo painel da Vercel sem precisar de um novo deploy.

/* ===================== CONFIGURAÇÃO ===================== */

// Importa a função oficial para ler os dados do Edge Config (Banco de dados online)
const { get } = require('@vercel/edge-config');

// Página para onde o cliente volta depois de pagar
const PAGINA_RETORNO = 'https://muskelfit-academia.vercel.app/pre-matricula/prematricula.html';

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
        // O formulário agora envia: unidade, modalidade, planoId e pagamento
        const { unidade, modalidade, planoId, pagamento } = req.body || {};

        // --- BUSCA O CATÁLOGO NO EDGE CONFIG ---
        // A chave foi salva no painel da Vercel como 'unidades'
        const catalogo = await get('unidades');
        
        if (!catalogo) {
            console.error('Catálogo não encontrado no Edge Config.');
            return res.status(500).json({ erro: 'Catálogo indisponível no momento' });
        }

        // --- Procura a unidade no catálogo ---
        const unidadeCfg = catalogo.unidades?.[unidade];
        if (!unidadeCfg) {
            return res.status(400).json({ erro: 'Unidade não encontrada no catálogo' });
        }

        // --- Procura a modalidade dentro da unidade ---
        // Isso garante que o usuário não envie uma modalidade que não existe para aquela unidade
        const modalidadeCfg = unidadeCfg.modalidades?.[modalidade];
        if (!modalidadeCfg) {
            return res.status(400).json({ erro: 'Modalidade indisponível para esta unidade' });
        }

        // --- Procura o plano dentro da modalidade (validação de verdade) ---
        // Isso impede que alguém adultere o HTML e envie um plano com preço diferente
        const plano = modalidadeCfg.planos?.find(p => p.id === planoId);
        if (!plano) {
            return res.status(400).json({ erro: 'Plano indisponível para esta modalidade' });
        }

        // --- Valida a forma de pagamento ---
        const tipoEscolhido = TIPO_MP[pagamento];
        if (!tipoEscolhido) {
            return res.status(400).json({ erro: 'Forma de pagamento inválida' });
        }

        // --- Access Token (fica só no servidor, nunca no navegador) ---
        const token = process.env.MP_ACCESS_TOKEN; //conecta ao processo do ambiente do vercel atraves do MP_ACCESS_TOKEN configurado dentro da conta do vercel
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
                    // Título agora inclui a modalidade também para identificação clara
                    title: `Muskel Fit — ${unidade} — ${modalidade} — ${plano.nome}`,
                    quantity: 1,
                    // Number() garante que o MP receba número puro
                    unit_price: Number(plano.preco),
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