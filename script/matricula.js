/* ===================== CONFIGURAÇÃO ===================== */
const CONFIG = {
    whatsapp: '5512991859267',
    tipo: 'matricula'
};

let CATALOGO = null;
let contadorInterval = null;

/* ===================== HELPERS ===================== */
function formatarTelefone(valor) {
    const nums = valor.replace(/\D/g, '');
    if (nums.length <= 10) return nums.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').trim();
    return nums.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').trim();
}

function definirCarregando(carregando) {
    const botao = document.querySelector('#form-matricula button[type="submit"]');
    if (!botao) return;
    if (!botao.dataset.textoOriginal) botao.dataset.textoOriginal = botao.innerHTML;
    botao.disabled = carregando;
    botao.innerHTML = carregando ? 'Aguarde...' : botao.dataset.textoOriginal;
}

/* ===================== DEPENDENTES (PLANOS FAMÍLIA) ===================== */
function getQuantidadeDependentes(planoId) {
    if (!planoId) return 0;
    const match = String(planoId).match(/^familia-(\d+)$/);
    if (!match) return 0;
    const n = parseInt(match[1], 10);
    if (isNaN(n) || n < 2 || n > 10) return 0;
    return n - 1;
}

function renderizarDependentes(qtd) {
    const bloco = document.getElementById('bloco-dependentes');
    const lista = document.getElementById('lista-dependentes');
    if (!bloco || !lista) return;

    if (qtd <= 0) {
        bloco.hidden = true;
        lista.innerHTML = '';
        return;
    }

    bloco.hidden = false;
    let html = '';
    for (let i = 1; i <= qtd; i++) {
        html += `
            <div class="dependente-box" style="border:1px solid #333; border-radius:8px; padding:15px; margin-bottom:15px; background:rgba(255,255,255,0.02);">
                <p style="color:var(--cor-secundaria,#ffd60a); font-weight:bold; margin:0 0 12px 0;">
                    <i class="fa-solid fa-user"></i> Dependente ${i}
                </p>

                <div class="campo">
                    <label for="dep-${i}-nome">Nome completo *</label>
                    <input type="text" id="dep-${i}-nome" name="dep_${i}_nome" required autocomplete="off">
                </div>

                <div class="campo">
                    <label for="dep-${i}-celular">Celular (WhatsApp) *</label>
                    <input type="tel" id="dep-${i}-celular" name="dep_${i}_celular"
                           placeholder="(12) 99999-9999" required autocomplete="off">
                </div>
            </div>
        `;
    }
    lista.innerHTML = html;

    for (let i = 1; i <= qtd; i++) {
        const el = document.getElementById(`dep-${i}-celular`);
        if (el) el.addEventListener('input', e => e.target.value = formatarTelefone(e.target.value));
    }
}

function coletarDependentes(fd, qtd) {
    const dependentes = [];
    for (let i = 1; i <= qtd; i++) {
        const nome    = (fd.get(`dep_${i}_nome`) || '').trim();
        const celular = (fd.get(`dep_${i}_celular`) || '').trim();

        if (!nome || !celular) {
            alert(`Preencha todos os campos do dependente ${i}.`);
            return null;
        }
        if (celular.replace(/\D/g, '').length < 10) {
            alert(`Dependente ${i}: celular inválido.`);
            return null;
        }
        dependentes.push({ nome, celular });
    }
    return dependentes;
}

window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
        if (contadorInterval) clearInterval(contadorInterval);
        const botao = document.querySelector('#form-matricula button[type="submit"]');
        if (botao) {
            botao.disabled = false;
            botao.style.pointerEvents = 'auto';
            botao.style.flexDirection = 'row';
            botao.style.padding = '14px 30px';
            botao.innerHTML = `<i class="fa-solid fa-lock"></i> Ir para o pagamento`;
        }
        const planoEl = document.getElementById('plano');
        if (planoEl) renderizarDependentes(getQuantidadeDependentes(planoEl.value));
    } else {
        definirCarregando(false);
    }
});

/* ===================== CATÁLOGO ===================== */
async function carregarCatalogo() {
    if (CATALOGO) return CATALOGO;
    const resp = await fetch(`/api/catalogo?tipo=${CONFIG.tipo}`, { cache: 'no-cache' });
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
    const nomes = Object.keys(CATALOGO.respostaAPI);
    preencherSelect(sel, nomes, 'Selecione a unidade...', n => n, n => n);
}

function preencherModalidadesDaUnidade(nomeUnidade) {
    const modalEl = document.getElementById('modalidade');
    const planoEl = document.getElementById('plano');
    const unidade = CATALOGO.respostaAPI[nomeUnidade];

    preencherSelect(planoEl, [], 'Selecione a modalidade primeiro...', p => p.id, p => p.texto);
    planoEl.disabled = true;

    if (!unidade) {
        preencherSelect(modalEl, [], 'Selecione a unidade primeiro...', m => m, m => m);
        modalEl.disabled = true;
        renderizarDependentes(0);
        return;
    }
    preencherSelect(modalEl, Object.keys(unidade.modalidades), 'Selecione a modalidade...', m => m, m => m);
    modalEl.disabled = false;
    renderizarDependentes(0);
}

function preencherPlanosDaModalidade(nomeUnidade, nomeModalidade) {
    const planoEl = document.getElementById('plano');
    const unidade = CATALOGO.respostaAPI[nomeUnidade];

    if (!unidade || !nomeModalidade || !unidade.modalidades[nomeModalidade]) {
        preencherSelect(planoEl, [], 'Selecione a modalidade primeiro...', p => p.id, p => p.texto);
        planoEl.disabled = true;
        renderizarDependentes(0);
        return;
    }
    preencherSelect(planoEl, unidade.modalidades[nomeModalidade].planos, 'Selecione um plano...', p => p.id, p => p.texto);
    planoEl.disabled = false;
    renderizarDependentes(0);
}

function selecionarPorCorrespondencia(selectEl, valor) {
    if (!valor || !selectEl) return;
    const alvo = valor.toLowerCase();
    for (const opt of selectEl.options) {
        if (opt.value.toLowerCase() === alvo || opt.textContent.toLowerCase().includes(alvo)) {
            selectEl.value = opt.value;
            return;
        }
    }
}

/* ===================== PREVIEW DO PLANO ===================== */
function atualizarPreviewPlano() {
    const previewEl    = document.getElementById('preview-plano');
    const nomeEl       = document.getElementById('preview-nome');
    const valorEl      = document.getElementById('preview-valor');
    const planoEl      = document.getElementById('plano');
    const unidadeEl    = document.getElementById('unidade');
    const modalidadeEl = document.getElementById('modalidade');

    if (!previewEl || !nomeEl || !valorEl) return;

    const unidade    = unidadeEl?.value;
    const modalidade = modalidadeEl?.value;
    const planoId    = planoEl?.value;

    if (!unidade || !modalidade || !planoId || !CATALOGO) {
        previewEl.hidden = true;
        return;
    }

    const plano = CATALOGO?.respostaAPI?.[unidade]?.modalidades?.[modalidade]?.planos?.find(p => p.id === planoId);
    if (!plano) { previewEl.hidden = true; return; }

    nomeEl.textContent  = plano.texto;
    valorEl.textContent = `R$ ${Number(plano.preco).toFixed(2).replace('.', ',')}`;
    previewEl.hidden    = false;
}

/* ===================== REDIRECIONAMENTO PRO PAGAMENTO ===================== */
async function redirecionarParaPagamento(dados) {
    const botao = document.querySelector('#form-matricula button[type="submit"]');

    if (botao) {
        botao.disabled = true;
        botao.style.pointerEvents = 'none';
        botao.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Processando...`;
    }

    try {
        if (botao) botao.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Gerando PIX...`;

        const resposta = await fetch('/api/criar-pagamento', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tipo:       CONFIG.tipo,
                unidade:    dados.unidade,
                modalidade: dados.modalidade,
                planoId:    dados.planoId,
                pagamento:  dados.pagamento,
                nome:       dados.nome,
                celular:    dados.celular,
                dependentes: dados.dependentes || []
            })
        });

        const resultado = await resposta.json();

        if (!resposta.ok || !resultado.url) {
            throw new Error(resultado.erro || 'Resposta inválida da API');
        }

        localStorage.setItem('dadosMatricula', JSON.stringify(dados));

        let segundos = 5;
        if (botao) {
            botao.style.flexDirection = 'column';
            botao.style.padding = '12px 15px';
            botao.style.lineHeight = '1.3';
            botao.innerHTML = `
                <span style="font-size: 0.8rem; font-weight: normal; text-align: center; margin-bottom: 6px;">
                    ⚠️ Após pagar o PIX, clique em <strong>"Voltar para Muskel Fit Academia"</strong> na tela do Mercado Pago para finalizar o pagamento da mensalidade!
                </span>
                <span style="font-weight: bold; font-size: 1.1rem; display: flex; align-items: center; gap: 8px;">
                    <i class="fa-solid fa-hourglass-half fa-spin"></i> Redirecionando em <span id="timer-btn">${segundos}</span>s...
                </span>
            `;
        }

        contadorInterval = setInterval(() => {
            segundos--;
            const timerBtnEl = document.getElementById('timer-btn');
            if (timerBtnEl) timerBtnEl.textContent = segundos;
            if (segundos <= 0) {
                clearInterval(contadorInterval);
                window.location.href = resultado.url;
            }
        }, 1000);

    } catch (erro) {
        console.error('Erro ao criar pagamento:', erro);
        if (botao) {
            botao.disabled = false;
            botao.style.pointerEvents = 'auto';
            botao.style.flexDirection = 'row';
            botao.style.padding = '14px 30px';
            botao.innerHTML = `<i class="fa-solid fa-lock"></i> Ir para o pagamento`;
        }
        alert('Não foi possível iniciar o pagamento agora. Tente novamente em instantes ou fale com a academia pelo WhatsApp.');
    }
}

/* ===================== INICIALIZAÇÃO ===================== */
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

    ['telefone', 'celular'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('input', e => { e.target.value = formatarTelefone(e.target.value); });
    });

    const unidadeEl    = document.getElementById('unidade');
    const modalidadeEl = document.getElementById('modalidade');
    const planoEl      = document.getElementById('plano');

    const params = new URLSearchParams(window.location.search);

    selecionarPorCorrespondencia(unidadeEl, params.get('unidade'));
    preencherModalidadesDaUnidade(unidadeEl.value);
    selecionarPorCorrespondencia(modalidadeEl, params.get('modalidade'));
    preencherPlanosDaModalidade(unidadeEl.value, modalidadeEl.value);
    selecionarPorCorrespondencia(planoEl, params.get('plano'));

    atualizarPreviewPlano();
    renderizarDependentes(getQuantidadeDependentes(planoEl.value));

    unidadeEl.addEventListener('change', () => {
        preencherModalidadesDaUnidade(unidadeEl.value);
        atualizarPreviewPlano();
    });

    modalidadeEl.addEventListener('change', () => {
        preencherPlanosDaModalidade(unidadeEl.value, modalidadeEl.value);
        atualizarPreviewPlano();
    });

    planoEl.addEventListener('change', () => {
        atualizarPreviewPlano();
        renderizarDependentes(getQuantidadeDependentes(planoEl.value));
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const fd = new FormData(e.target);
        const nome       = (fd.get('nome') || '').trim();
        const celular    = (fd.get('celular') || '').trim();
        const unidade    = fd.get('unidade');
        const modalidade = fd.get('modalidade');
        const planoId    = fd.get('plano');
        const pagamento  = fd.get('pagamento');

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

        const unidadeCfg = CATALOGO.respostaAPI[unidade];
        if (!unidadeCfg) { alert('Unidade inválida.'); return; }

        const modalidadeCfg = unidadeCfg.modalidades[modalidade];
        if (!modalidadeCfg) {
            alert('A modalidade selecionada não está disponível nesta unidade.');
            return;
        }

        const planoObj = modalidadeCfg.planos.find(p => p.id === planoId);
        if (!planoObj) {
            alert('O plano selecionado não está disponível nesta modalidade.');
            return;
        }

        // Coleta dependentes (se plano família)
        const qtdDeps = getQuantidadeDependentes(planoId);
        const dependentes = qtdDeps > 0 ? coletarDependentes(fd, qtdDeps) : [];
        if (dependentes === null) return;

        const dados = {
            nome, celular,
            unidade,
            modalidade,
            planoId:     planoObj.id,
            planoTitulo: planoObj.texto,
            preco:       planoObj.preco,
            pagamento,
            dependentes
        };

        redirecionarParaPagamento(dados);
    });
}

/* ===================== RETORNO DO MERCADO PAGO ===================== */
const urlParams = new URLSearchParams(window.location.search);
const statusPagamento = urlParams.get('status');
const STATUS_VALIDOS = ['success', 'approved', 'pending', 'failure'];

function tratarRetornoMercadoPago(status) {
    const formEl            = document.getElementById('form-matricula');
    const painelConfirmacao = document.getElementById('painel-confirmacao');
    const btnWhats          = document.getElementById('btn-enviar-whatsapp');
    const tituloEl          = painelConfirmacao?.querySelector('h3');
    const textoEl           = painelConfirmacao?.querySelector('p');
    const avisoEl           = painelConfirmacao?.querySelector('.aviso-pix');

    if (!formEl || !painelConfirmacao || !btnWhats || !tituloEl || !textoEl) {
        console.warn('Elementos do retorno não encontrados.');
        return;
    }

    const dadosSalvosRaw = localStorage.getItem('dadosMatricula');

    if (!dadosSalvosRaw) {
        formEl.style.display = 'none';
        const secaoAjuda = document.querySelector('.matricula-ajuda');
        if (secaoAjuda) secaoAjuda.style.display = 'none';
        const seloSeguranca = document.querySelector('.selo-seguranca');
        if (seloSeguranca) seloSeguranca.style.display = 'none';
        const secaoHero = document.querySelector('.matricula-hero');
        if (secaoHero) secaoHero.style.display = 'none';

        document.querySelectorAll('.btn-amarelo').forEach(btn => {
            if (btn.id !== 'btn-enviar-whatsapp') btn.style.display = 'none';
        });

        painelConfirmacao.hidden = false;
        tituloEl.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Dados não encontrados';
        textoEl.textContent = 'Não conseguimos recuperar seus dados. Preencha o formulário novamente.';
        btnWhats.style.display = 'none';
        return;
    }

    const dados = JSON.parse(dadosSalvosRaw);
    const dependentes = Array.isArray(dados.dependentes) ? dados.dependentes : [];
    formEl.style.display = 'none';

    const secaoAjuda = document.querySelector('.matricula-ajuda');
    if (secaoAjuda) secaoAjuda.style.display = 'none';
    const seloSeguranca = document.querySelector('.selo-seguranca');
    if (seloSeguranca) seloSeguranca.style.display = 'none';
    const secaoHero = document.querySelector('.matricula-hero');
    if (secaoHero) secaoHero.style.display = 'none';

    document.querySelectorAll('.btn-amarelo').forEach(btn => {
        if (btn.id !== 'btn-enviar-whatsapp') btn.style.display = 'none';
    });

    let icone, titulo, textoStatus;
    if (status === 'failure') {
        icone = 'fa-solid fa-circle-xmark';
        titulo = 'Pagamento não aprovado';
        textoStatus = '❌ Pagamento não aprovado';
        textoEl.textContent = 'O pagamento não foi aprovado. Você pode tentar novamente ou entrar em contato com a academia pelo WhatsApp.';
        if (avisoEl) avisoEl.innerHTML = 'Não se preocupe, você pode tentar novamente ou falar com a gente pelo WhatsApp.';
    } else if (status === 'pending') {
        icone = 'fa-solid fa-hourglass-half';
        titulo = 'Pagamento em processamento';
        textoStatus = '⏳ Pagamento em processamento';
        textoEl.textContent = 'Seu pagamento está em processamento. Envie seus dados no WhatsApp para a academia confirmar.';
        if (avisoEl) avisoEl.innerHTML = 'Assim que o pagamento for confirmado, você receberá o aviso. Já pode enviar seus dados no WhatsApp.';
    } else {
        icone = 'fa-solid fa-circle-check';
        titulo = 'Pagamento aprovado!';
        textoStatus = '✅ Pagamento aprovado';
        textoEl.textContent = 'Seus dados estão prontos. Clique abaixo para enviar ao WhatsApp:';
        if (avisoEl) {
            avisoEl.innerHTML = `
                <strong>Pronto, Mensalidade paga!</strong><br>
                </br>Agora é só ir até a recepção da academia. Seja bem vindo !<br>
                <i class="fa-solid fa-dumbbell"></i> Bora treinar <i class="fa-solid fa-dumbbell"></i>
            `;
        }
    }

    tituloEl.innerHTML = `<i class="${icone}"></i> ${titulo}`;

    const dependentesMsg = dependentes.length > 0
        ? `*Dependentes:*\n` + dependentes.map(d => `  - ${d.nome} — ${d.celular}`).join('\n') + '\n'
        : '';

    const msg =
        `*PAGAMENTO DE MENSALIDADE — Muskel Fit*\n\n` +
        `*Nome:* ${dados.nome}\n` +
        `*Celular:* ${dados.celular}\n` +
        dependentesMsg +
        `*Unidade:* ${dados.unidade}\n` +
        `*Modalidade:* ${dados.modalidade}\n` +
        `*Plano:* ${dados.planoTitulo}\n` +
        `*Pagamento:* ${dados.pagamento}\n` +
        `*Status:* ${textoStatus}\n\n` +
        `Aguardo contato para confirmar o pagamento da mensalidade!`;

    painelConfirmacao.hidden = false;
    painelConfirmacao.scrollIntoView({ behavior: 'smooth', block: 'start' });

    if (status === 'failure') {
        btnWhats.style.display = 'none';
    } else {
        btnWhats.addEventListener('click', () => {
            window.open(`https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`, '_blank');
        });
    }

    localStorage.removeItem('dadosMatricula');
    sessionStorage.removeItem('acessoMatricula');
}

/* ===================== BOOT ===================== */
if (STATUS_VALIDOS.includes(statusPagamento)) {
    tratarRetornoMercadoPago(statusPagamento);
} else {
    iniciarFormulario();
}