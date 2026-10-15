// api/criar-pagamento.js
const { get } = require('@vercel/edge-config');

const PAGINA_RETORNO = {
    'pre-matricula': 'https://muskelfit-academia.vercel.app/pre-matricula/prematricula.html',
    'matricula':     'https://muskelfit-academia.vercel.app/matricula/matricula.html'
};

const TIPO_MP = {
    'PIX':     'bank_transfer',
    'Débito':  'debit_card',
    'Crédito': 'credit_card'
};

const TIPOS_ESCONDIVEIS = ['bank_transfer', 'debit_card', 'credit_card', 'prepaid_card', 'ticket'];

module.exports = async function handler(req, res) {

    if (req.method !== 'POST') {
        return res.status(405).json({ erro: 'Método não permitido' });
    }

    try {
        // ← NOVO: recebe o tipo também
        const { tipo, unidade, modalidade, planoId, pagamento } = req.body || {};

        // ← NOVO: define qual chave do Edge Config e qual página de retorno usar
        const tipoNormalizado = tipo === 'matricula' ? 'matricula' : 'pre-matricula';
        const chaveCatalogo = tipoNormalizado === 'matricula' ? 'unidades-matricula' : 'unidades';
        const paginaRetorno = PAGINA_RETORNO[tipoNormalizado];

        const catalogo = await get(chaveCatalogo);

        if (!catalogo) {
            console.error(`Catálogo '${chaveCatalogo}' não encontrado no Edge Config.`);
            return res.status(500).json({ erro: 'Catálogo indisponível no momento' });
        }

        const unidadeCfg = catalogo?.[unidade];
        if (!unidadeCfg) {
            return res.status(400).json({ erro: 'Unidade não encontrada no catálogo' });
        }

        const modalidadeCfg = unidadeCfg.modalidades?.[modalidade];
        if (!modalidadeCfg) {
            return res.status(400).json({ erro: 'Modalidade indisponível para esta unidade' });
        }

        const plano = modalidadeCfg.planos?.find(p => p.id === planoId);
        if (!plano) {
            return res.status(400).json({ erro: 'Plano indisponível para esta modalidade' });
        }

        const tipoEscolhido = TIPO_MP[pagamento];
        if (!tipoEscolhido) {
            return res.status(400).json({ erro: 'Forma de pagamento inválida' });
        }

        const token = process.env.MP_ACCESS_TOKEN;
        if (!token) {
            console.error('Variável MP_ACCESS_TOKEN não configurada na Vercel.');
            return res.status(500).json({ erro: 'Pagamento indisponível no momento' });
        }

        const prefixoTitulo = tipoNormalizado === 'matricula' ? 'Matrícula' : 'Pré-Matrícula';

        const resposta = await fetch('https://api.mercadopago.com/checkout/preferences', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                items: [{
                    title: `Muskel Fit — ${prefixoTitulo} — ${unidade} — ${modalidade} — ${plano.nome}`,
                    quantity: 1,
                    unit_price: Number(plano.preco),
                    currency_id: 'BRL'
                }],
                back_urls: {
                    success: `${paginaRetorno}?status=success`,
                    pending: `${paginaRetorno}?status=pending`,
                    failure: `${paginaRetorno}?status=failure`
                },
                auto_return: 'approved',
                payment_methods: {
                    excluded_payment_types: TIPOS_ESCONDIVEIS
                        .filter(t => t !== tipoEscolhido)
                        .map(id => ({ id }))
                }
            })
        });

        const dados = await resposta.json();

        if (!resposta.ok || !dados.init_point) {
            console.error('Erro do Mercado Pago:', resposta.status, JSON.stringify(dados));
            return res.status(502).json({ erro: 'Não foi possível criar o pagamento' });
        }

        return res.status(200).json({ url: dados.init_point });

    } catch (erro) {
        console.error('Erro inesperado:', erro);
        return res.status(500).json({ erro: 'Erro interno' });
    }
};