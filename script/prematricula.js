/* ===================== CONFIGURAÇÃO ===================== */
const CONFIG = {
    whatsapp: '5512991859267'    // número da academia (com DDI+DDD)
};

const CAMINHO_CATALOGO = '../config/catalogo.json';

let CATALOGO = null;   // { unidades: { "Nome": { modalidades: [], planos: [] } } }

/* ===================== HELPERS ===================== */

function formatarTelefone(valor) {
    const nums = valor.replace(/\D/g, '');
    if (nums.length <= 10) {
        return nums.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').trim();
    }
    return nums.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').trim();
}

function validarNascimento(dataStr) {
    if (!dataStr) return 'Informe sua data de nascimento.';
    const data = new Date(dataStr);
    if (isNaN(data)) return 'Data inválida.';

    const hoje = new Date();
    let idade = hoje.getFullYear() - data.getFullYear();
    const m = hoje.getMonth() - data.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < data.getDate())) idade--;

    if (idade < 12)  return 'É necessário ter pelo menos 12 anos.';
    if (idade > 120) return 'Data de nascimento inválida.';
    return null;
}

function definirCarregando(carregando) {
    const botao = document.querySelector('#form-matricula button[type="submit"]');
    if (!botao) return;
    if (!botao.dataset.textoOriginal) botao.dataset.textoOriginal = botao.innerHTML;
    botao.disabled = carregando;
    botao.innerHTML = carregando ? 'Aguarde...' : botao.dataset.textoOriginal;
}
window.addEventListener('pageshow', () => definirCarregando(false));

/* ===================== CATÁLOGO ===================== */

async function carregarCatalogo() {
    if (CATALOGO) return CATALOGO;
    const resp = await fetch(CAMINHO_CATALOGO, { cache: 'no-cache' });
    if (!resp.ok) throw new Error('Falha ao carregar catálogo de planos.');
    CATALOGO = await resp.json();
    return CATALOGO;
}

function preencherSelect(selectEl, itens, placeholder, getValue, getLabel) {
    selectEl.innerHTML = '';
    const opt0 = document.createElement('option');
    opt0.value = '';
    opt0.textContent = placeholder;
    selectEl.appendChild(opt0);

    itens.forEach(item => {
        const opt = document.createElement('option');
        opt.value = getValue(item);
        opt.textContent = getLabel(item);
        selectEl.appendChild(opt);
    });
}

function preencherUnidades() {
    const sel = document.getElementById('unidade');
    const nomes = Object.keys(CATALOGO.unidades);
    preencherSelect(sel, nomes, 'Selecione a unidade...', n => n, n => n);
}

/** Preenche plano + modalidade com base na unidade escolhida. */
function preencherOpcoesDaUnidade(nomeUnidade) {
    const planoEl = document.getElementById('plano');
    const modalEl = document.getElementById('modalidade');
    const unidade = CATALOGO.unidades[nomeUnidade];

    if (!unidade) {
        preencherSelect(planoEl, [], 'Selecione a unidade primeiro...', p => p.id, p => p.texto);
        preencherSelect(modalEl, [], 'Selecione a unidade primeiro...', m => m, m => m);
        planoEl.disabled = true;
        modalEl.disabled = true;
        return;
    }

    preencherSelect(planoEl, unidade.planos,      'Selecione um plano...',      p => p.id, p => p.texto);
    preencherSelect(modalEl, unidade.modalidades, 'Selecione a modalidade...',  m => m,    m => m);

    planoEl.disabled = false;
    modalEl.disabled = false;
}

function selecionarPorCorrespondencia(selectEl, valor) {
    if (!valor || !selectEl) return;
    const alvo = valor.toLowerCase();
    for (const opt of selectEl.options) {
        if (opt.value.toLowerCase() === alvo ||
            opt.textContent.toLowerCase().includes(alvo)) {
            selectEl.value = opt.value;
            return;
        }
    }
}

/* ===================== REDIRECIONAMENTO PRO PAGAMENTO ===================== */

async function redirecionarParaPagamento(dados) {
    definirCarregando(true);
    //tratamento de excessao
    try {
        const resposta = await fetch('/api/criar-pagamento', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                unidade:   dados.unidade,
                planoId:   dados.planoId,
                pagamento: dados.pagamento
            })
        });

        const resultado = await resposta.json();

        if (!resposta.ok || !resultado.url) {
            throw new Error(resultado.erro || 'Resposta inválida da API');
        }

        localStorage.setItem('dadosMatricula', JSON.stringify(dados));
        window.location.href = resultado.url;

    } catch (erro) {
        console.error('Erro ao criar pagamento:', erro);
        definirCarregando(false);
        alert(
            'Não foi possível iniciar o pagamento agora. ' +
            'Tente novamente em instantes ou fale com a academia pelo WhatsApp.'
        );
    }
}

/* ===================== INICIALIZAÇÃO (só quando NÃO é retorno do MP) ===================== */

async function iniciarFormulario() {
    const form = document.getElementById('form-matricula');
    if (!form) return;

    try {
        await carregarCatalogo();
    } catch (e) {
        console.error(e);
        alert('Não foi possível carregar as opções de planos. Recarregue a página.');
        return;
    }

    preencherUnidades();

    // Máscara nos telefones
    ['telefone', 'celular'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('input', e => {
            e.target.value = formatarTelefone(e.target.value);
        });
    });

    const unidadeEl = document.getElementById('unidade');

    // Pré-seleção via URL (?unidade=...&plano=...&modalidade=...)
    const params = new URLSearchParams(window.location.search);
    selecionarPorCorrespondencia(unidadeEl, params.get('unidade'));
    preencherOpcoesDaUnidade(unidadeEl.value);
    selecionarPorCorrespondencia(document.getElementById('plano'),      params.get('plano'));
    selecionarPorCorrespondencia(document.getElementById('modalidade'), params.get('modalidade'));

    // Trocou de unidade → repopula plano/modalidade
    unidadeEl.addEventListener('change', () => {
        preencherOpcoesDaUnidade(unidadeEl.value);
    });

    // Submit
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const fd = new FormData(e.target);
        const nome       = (fd.get('nome') || '').trim();
        const nascimento = fd.get('nascimento');
        const telefone   = (fd.get('telefone') || '').trim() || '—';
        const celular    = (fd.get('celular') || '').trim();
        const unidade    = fd.get('unidade');
        const modalidade = fd.get('modalidade');
        const planoId    = fd.get('plano');
        const pagamento  = fd.get('pagamento');

        // -------- Validações --------
        const erroNasc = validarNascimento(nascimento);
        if (erroNasc) { alert(erroNasc); return; }

        if (!nome || !celular || !planoId || !pagamento) {
            alert('Preencha todos os campos obrigatórios (*).');
            return;
        }
        if (!unidade || !modalidade) {
            alert('Selecione a unidade e a modalidade.');
            return;
        }
        if (celular.replace(/\D/g, '').length < 10) {
            alert('Celular inválido. Use o formato (12) 99999-9999.');
            return;
        }

        // -------- Confere contra o catálogo (segurança) --------
        const unidadeCfg = CATALOGO.unidades[unidade];
        if (!unidadeCfg) { alert('Unidade inválida.'); return; }

        const planoObj = unidadeCfg.planos.find(p => p.id === planoId);
        if (!planoObj) {
            alert('O plano selecionado não está disponível nesta unidade.');
            return;
        }
        if (!unidadeCfg.modalidades.includes(modalidade)) {
            alert('A modalidade selecionada não está disponível nesta unidade.');
            return;
        }

        const dados = {
            nome, nascimento, telefone, celular,
            unidade,
            modalidade,
            planoId:    planoObj.id,
            planoTitulo: planoObj.texto,
            preco:      planoObj.preco,
            pagamento
        };

        redirecionarParaPagamento(dados);
    });
}

/* ===================== RETORNO DO MERCADO PAGO ===================== */

const urlParams = new URLSearchParams(window.location.search);
const statusPagamento = urlParams.get('status');
const STATUS_VALIDOS = ['success', 'approved', 'pending', 'failure'];

function tratarRetornoMercadoPago(status) {
    const formEl           = document.getElementById('form-matricula');
    const painelConfirmacao = document.getElementById('painel-confirmacao');
    const btnWhats         = document.getElementById('btn-enviar-whatsapp');
    const tituloEl         = painelConfirmacao?.querySelector('h3');
    const textoEl          = painelConfirmacao?.querySelector('p');

    if (!formEl || !painelConfirmacao || !btnWhats || !tituloEl || !textoEl) {
        console.warn('Elementos do retorno não encontrados.');
        return;
    }

    const dadosSalvosRaw = localStorage.getItem('dadosMatricula');

    if (!dadosSalvosRaw) {
        painelConfirmacao.hidden = false;
        tituloEl.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Dados não encontrados';
        textoEl.textContent = 'Não conseguimos recuperar seus dados. Preencha o formulário novamente.';
        btnWhats.style.display = 'none';
        return;
    }

    const dados = JSON.parse(dadosSalvosRaw);
    formEl.style.display = 'none';

    let icone, titulo, textoStatus;
    if (status === 'failure') {
        icone = 'fa-solid fa-circle-xmark';
        titulo = 'Pagamento não aprovado';
        textoStatus = '❌ Pagamento não aprovado';
        textoEl.textContent = 'O pagamento não foi aprovado. Você pode tentar novamente ou entrar em contato com a academia pelo WhatsApp.';
    } else if (status === 'pending') {
        icone = 'fa-solid fa-hourglass-half';
        titulo = 'Pagamento em processamento';
        textoStatus = '⏳ Pagamento em processamento';
        textoEl.textContent = 'Seu pagamento está em processamento. Envie seus dados no WhatsApp para a academia confirmar.';
    } else {
        icone = 'fa-solid fa-circle-check';
        titulo = 'Pagamento aprovado!';
        textoStatus = '✅ Pagamento aprovado';
        textoEl.textContent = 'Seus dados estão prontos. Clique abaixo para enviar ao WhatsApp:';
    }

    tituloEl.innerHTML = `<i class="${icone}"></i> ${titulo}`;

    const [a, m, d] = dados.nascimento.split('-');
    const dataFmt = `${d}/${m}/${a}`;

    const msg =
        `*PRÉ-MATRÍCULA — Muskel Fit*\n\n` +
        `*Nome:* ${dados.nome}\n` +
        `*Nascimento:* ${dataFmt}\n` +
        `*Telefone:* ${dados.telefone}\n` +
        `*Celular:* ${dados.celular}\n` +
        `*Unidade:* ${dados.unidade}\n` +
        `*Modalidade:* ${dados.modalidade}\n` +
        `*Plano:* ${dados.planoTitulo}\n` +
        `*Pagamento:* ${dados.pagamento}\n` +
        `*Status:* ${textoStatus}\n\n` +
        `Aguardo contato para confirmar a matrícula!`;

    painelConfirmacao.hidden = false;
    painelConfirmacao.scrollIntoView({ behavior: 'smooth', block: 'start' });

    if (status === 'failure') {
        btnWhats.style.display = 'none';
        const aviso = painelConfirmacao.querySelector('.aviso-pix');
        if (aviso) aviso.textContent = 'Tente novamente ou fale com a academia.';
    } else {
        btnWhats.addEventListener('click', () => {
            window.open(
                `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`,
                '_blank'
            );
        });
    }

    localStorage.removeItem('dadosMatricula');
}

/* ===================== BOOT ===================== */

if (STATUS_VALIDOS.includes(statusPagamento)) {
    tratarRetornoMercadoPago(statusPagamento);
} else {
    iniciarFormulario();
}