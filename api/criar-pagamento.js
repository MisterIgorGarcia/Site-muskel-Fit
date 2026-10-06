// api/criar-pagamento.js
//
// "API" mínima da Muskel Fit.
// Recebe a unidade, o plano e a forma de pagamento escolhidos no formulário,
// cria o pagamento no Mercado Pago (já com a URL de retorno) e devolve o link do checkout.
//
// Por que isso precisa rodar no servidor?
// A URL de retorno (back_urls) só é definida quando o pagamento é criado pela
// API do Mercado Pago, e isso exige o Access Token, que é SECRETO.
// Aqui no servidor ele fica seguro; no JavaScript do site qualquer pessoa o veria.
//
// Por que o preço NÃO está mais neste arquivo?
// Agora cada unidade tem seus próprios planos e preços, e tudo fica em
// config/catalogo.json — a MESMA fonte que o site usa para montar os <select>.
// Assim nunca existe divergência entre o valor mostrado e o valor cobrado.

/* ===================== CONFIGURAÇÃO ===================== */

// Catálogo único de unidades, planos e modalidades.
// Para adicionar/alterar planos, edite o arquivo config/catalogo.json.
const path = require('path');
const fs = require('fs');

// Constrói o caminho absoluto usando o diretório atual do projeto (process.cwd())
const catalogoPath = path.join(process.cwd(), 'pre-matricula', 'catalogos', 'catalogo.json');
// Lê o arquivo e transforma em objeto JSON
const catalogo = JSON.parse(fs.readFileSync(catalogoPath, 'utf8'));

//const catalogo = require('../pre-matricula/catalogos/catalogo.json'); //conecta ao JSON, caminho dele// COMENTADO, SO ALTERE SE FOR TIRAR DO VERCEL//

// Página para onde o cliente volta depois de pagar
const PAGINA_RETORNO = 'https://muskelfit-academia.vercel.app/pre-matricula/prematricula.html'; //retorna o usuario para esta pagina

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
        // O formulário envia: unidade (nome exato), planoId (id curto) e pagamento
        const { unidade, planoId, pagamento } = req.body || {};

        // --- Procura a unidade no catálogo ---
        const unidadeCfg = catalogo.unidades?.[unidade];
        if (!unidadeCfg) {
            return res.status(400).json({ erro: 'Unidade não encontrada no catálogo' });
        }

        // --- Procura o plano dentro da unidade (validação de verdade) ---
        // Isso impede que alguém adultere o HTML e envie, por exemplo,
        // o plano "anual" com preço de "mensal" — aqui o preço vem sempre do catálogo.
        const plano = unidadeCfg.planos?.find(p => p.id === planoId);
        if (!plano) {
            return res.status(400).json({ erro: 'Plano indisponível para esta unidade' });
        }

        // --- Valida a forma de pagamento ---
        const tipoEscolhido = TIPO_MP[pagamento];
        if (!tipoEscolhido) {
            return res.status(400).json({ erro: 'Forma de pagamento inválida' });
        }

        // --- Access Token (fica só no servidor, nunca no navegador) ---
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
                    // Título inclui a unidade para o cliente (e a academia) identificarem de onde veio
                    title: `Muskel Fit — ${unidade} — ${plano.nome}`,
                    quantity: 1,
                    // Number() garante que o MP receba número puro, mesmo se o JSON tiver string
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