// api/criar-pagamento.js
const { get } = require('@vercel/edge-config');

const PAGINA_RETORNO = {
    'pre-matricula':   'https://muskelfit-academia.vercel.app/matriculas/prematricula.html',
    'matricula':       'https://muskelfit-academia.vercel.app/matriculas/matricula.html',
    'matricula-aluno': 'https://muskelfit-academia.vercel.app/matriculas/matricula-aluno.html'
};

const TIPO_MP = {
    'PIX':     'bank_transfer',
    'Débito':  'debit_card',
    'Crédito': 'credit_card'
};

const TIPOS_ESCONDIVEIS = ['bank_transfer', 'debit_card', 'credit_card', 'prepaid_card', 'ticket'];

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido' });

    try {
        const { tipo, unidade, modalidade, planoId, pagamento, nome, celular,
                data_nascimento, cep, numero_casa, rua, bairro, cidade, dependentes } = req.body || {};

        const tiposValidos = ['matricula', 'pre-matricula', 'matricula-aluno'];
        const tipoNormalizado = tiposValidos.includes(tipo) ? tipo : 'pre-matricula';

        const paginaRetorno = PAGINA_RETORNO[tipoNormalizado];

        const catalogo = await get(tipoNormalizado === 'matricula-aluno' ? 'matricula' : tipoNormalizado);
        if (!catalogo) return res.status(500).json({ erro: 'Catálogo indisponível' });

        const unidadeCfg = catalogo?.[unidade];
        if (!unidadeCfg) return res.status(400).json({ erro: 'Unidade não encontrada' });

        const modalidadeCfg = unidadeCfg.modalidades?.[modalidade];
        if (!modalidadeCfg) return res.status(400).json({ erro: 'Modalidade indisponível' });

        const plano = modalidadeCfg.planos?.find(p => p.id === planoId);
        if (!plano) return res.status(400).json({ erro: 'Plano indisponível' });

        const tipoEscolhido = TIPO_MP[pagamento];
        if (!tipoEscolhido) return res.status(400).json({ erro: 'Forma de pagamento inválida' });

        const token = process.env.MP_ACCESS_TOKEN;
        if (!token) return res.status(500).json({ erro: 'Pagamento indisponível' });

        // Prepara dependentes em campos separados (omitindo vazios para evitar 400 do MP)
        const depsArr = Array.isArray(dependentes) ? dependentes : [];
        const dependentesMetadata = {};
        for (let i = 0; i < 4 && i < depsArr.length; i++) {
            const dep = depsArr[i] || {};
            const depSafe = {
                nome: String(dep.nome || '').slice(0, 120),
                celular: String(dep.celular || '').slice(0, 20)
            };
            if (dep.data_nascimento) {
                depSafe.data_nascimento = String(dep.data_nascimento).slice(0, 10);
            }
            dependentesMetadata[`dependente_${i + 1}`] = JSON.stringify(depSafe);
        }

        let prefixoTitulo = 'Pré-Matrícula';
        if (tipoNormalizado === 'matricula') prefixoTitulo = 'Matrícula (Mensalidade)';
        if (tipoNormalizado === 'matricula-aluno') prefixoTitulo = 'Nova Matrícula (Aluno)';

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
                payer: {
                    name: nome || "Aluno Muskel Fit",
                    email: "test_user_123@testuser.com"
                },
                back_urls: {
                    success: `${paginaRetorno}?status=success`,
                    pending: `${paginaRetorno}?status=pending`,
                    failure: `${paginaRetorno}?status=failure`
                },
                auto_return: 'approved',

                metadata: {
                    unidade: unidade,
                    modalidade: modalidade,
                    plano: plano.nome,
                    tipo: tipoNormalizado,
                    nome_aluno: nome,
                    celular_aluno: celular,
                    data_nascimento_aluno: data_nascimento,
                    cep_aluno: cep,
                    numero_casa_aluno: numero_casa,
                    rua_aluno: rua,
                    bairro_aluno: bairro,
                    cidade_aluno: cidade,
                    dependentes_qtd: depsArr.length,
                    ...dependentesMetadata
                },

                notification_url: 'https://muskelfit-academia.vercel.app/api/webhook-mercadopago',

                payment_methods: {
                    excluded_payment_types: TIPOS_ESCONDIVEIS
                        .filter(t => t !== tipoEscolhido)
                        .map(id => ({ id }))
                }
            })
        });

        const dadosMP = await resposta.json();

        if (!resposta.ok || !dadosMP.init_point) {
            console.error('Erro do Mercado Pago:', resposta.status, JSON.stringify(dadosMP));
            return res.status(502).json({ erro: 'Não foi possível criar o pagamento' });
        }

        return res.status(200).json({ url: dadosMP.init_point });

    } catch (erro) {
        console.error('Erro inesperado:', erro);
        return res.status(500).json({ erro: 'Erro interno' });
    }
};