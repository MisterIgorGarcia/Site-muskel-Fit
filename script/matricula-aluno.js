/* ===================== CONFIGURAÇÃO ===================== */
const CONFIG = {
    whatsapp: '5512991859267',
    tipo: 'matricula-aluno' // <-- Novo tipo para direcionar ao banco correto
};

let CATALOGO = null;
let contadorInterval = null;
let ultimoCepBuscado = '';

/* ===================== HELPERS ===================== */
function formatarTelefone(valor) {
    const nums = valor.replace(/\D/g, '');
    if (nums.length <= 10) return nums.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').trim();
    return nums.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').trim();
}

function formatarCEP(valor) {
    return valor.replace(/\D/g, '').replace(/(\d{5})(\d{0,3})/, '$1-$2');
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

window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
        if (contadorInterval) clearInterval(contadorInterval);
        const botao = document.querySelector('#form-matricula-aluno button[type="submit"]');
        if (botao) {
            botao.disabled = false;
            botao.style.pointerEvents = 'auto';
            botao.style.flexDirection = 'row';
            botao.style.padding = '14px 30px';
            botao.innerHTML = `<i class="fa-solid fa-lock"></i> Ir para o pagamento`;
        }
    }
});

/* ===================== BUSCA DE CEP + BUSCA REVERSA POR RUA ===================== */
function limparCamposEndereco() {
    ['rua', 'bairro', 'cidade'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    ultimoCepBuscado = '';
}

function configurarBuscaCEP() {
    const cepEl = document.getElementById('cep');
    if (!cepEl) return;

    // Ao sair do campo, busca o CEP
    cepEl.addEventListener('blur', async (e) => {
        const cep = e.target.value.replace(/\D/g, '');

        if (cep.length === 0) {
            limparCamposEndereco();
            return;
        }
        if (cep.length !== 8) {
            alert('CEP incompleto. Digite os 8 dígitos (ex: 12700-000).');
            return;
        }
        if (cep === ultimoCepBuscado) return;
        ultimoCepBuscado = cep;

        try {
            const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            const data = await res.json();

            if (data.erro) {
                alert('CEP não encontrado. Confira e tente novamente, ou preencha o endereço manualmente.');
                return;
            }

            document.getElementById('rua').value    = data.logradouro || '';
            document.getElementById('bairro').value = data.bairro     || '';
            document.getElementById('cidade').value = `${data.localidade} - ${data.uf}`;
            document.getElementById('numero_casa')?.focus();
        } catch (err) {
            console.error('[CEP] erro na busca:', err);
            alert('Não foi possível buscar o CEP agora. Preencha manualmente.');
        }
    });

    // Qualquer alteração no CEP reseta o cache de "última busca"
    cepEl.addEventListener('input', () => {
        ultimoCepBuscado = '';
    });
}

async function buscarEnderecoPorRua() {
    const ruaInput = document.getElementById('rua');
    const btnBusca = document.getElementById('btn-buscar-rua');
    if (!ruaInput || !btnBusca) return;

    const rua = ruaInput.value.trim();
    if (rua.length < 3) {
        alert('Digite pelo menos 3 letras do nome da rua para buscar.');
        return;
    }

    const iconeOriginal = btnBusca.innerHTML;
    btnBusca.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    btnBusca.disabled = true;

    try {
        const [resCruzeiro, resLavrinhas] = await Promise.all([
            fetch(`https://viacep.com.br/ws/SP/Cruzeiro/${encodeURIComponent(rua)}/json/`),
            fetch(`https://viacep.com.br/ws/SP/Lavrinhas/${encodeURIComponent(rua)}/json/`)
        ]);

        const dataCruzeiro  = await resCruzeiro.json();
        const dataLavrinhas = await resLavrinhas.json();

        let resultados = [];
        if (Array.isArray(dataCruzeiro))  resultados = resultados.concat(dataCruzeiro);
        if (Array.isArray(dataLavrinhas)) resultados = resultados.concat(dataLavrinhas);

        if (resultados.length === 0) {
            alert('Rua não encontrada em Cruzeiro ou Lavrinhas - SP. Tente digitar o CEP diretamente.');
            return;
        }

        // Pega o primeiro resultado (mesmo comportamento do projeto de referência)
        const data = resultados[0];

        document.getElementById('cep').value    = data.cep;
        document.getElementById('rua').value    = data.logradouro;
        document.getElementById('bairro').value = data.bairro;
        document.getElementById('cidade').value = `${data.localidade} - ${data.uf}`;
        document.getElementById('numero_casa')?.focus();
    } catch (err) {
        console.error('[busca-rua] erro:', err);
        alert('Não foi possível buscar o endereço agora. Digite o CEP manualmente.');
    } finally {
        btnBusca.innerHTML = iconeOriginal;
        btnBusca.disabled = false;
    }
}

/* ===================== CATÁLOGO ===================== */
async function carregarCatalogo() {
    if (CATALOGO) return CATALOGO;
    const resp = await fetch(`/api/catalogo?tipo=matricula`, { cache: 'no-cache' });
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
    preencherSelect(sel, Object.keys(CATALOGO.respostaAPI), 'Selecione a unidade...', n => n, n => n);
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
        return;
    }
    preencherSelect(modalEl, Object.keys(unidade.modalidades), 'Selecione a modalidade...', m => m, m => m);
    modalEl.disabled = false;
}

function preencherPlanosDaModalidade(nomeUnidade, nomeModalidade) {
    const planoEl = document.getElementById('plano');
    const unidade = CATALOGO.respostaAPI[nomeUnidade];

    if (!unidade || !nomeModalidade || !unidade.modalidades[nomeModalidade]) {
        preencherSelect(planoEl, [], 'Selecione a modalidade primeiro...', p => p.id, p => p.texto);
        planoEl.disabled = true;
        return;
    }
    preencherSelect(planoEl, unidade.modalidades[nomeModalidade].planos, 'Selecione um plano...', p => p.id, p => p.texto);
    planoEl.disabled = false;
}

/* ===================== PREVIEW DO PLANO ===================== */
function atualizarPreviewPlano() {
    const previewEl = document.getElementById('preview-plano');
    const planoEl = document.getElementById('plano');
    const unidadeEl = document.getElementById('unidade');
    const modalidadeEl = document.getElementById('modalidade');

    if (!previewEl || !unidadeEl.value || !modalidadeEl.value || !planoEl.value) {
        if (previewEl) previewEl.hidden = true;
        return;
    }

    const plano = CATALOGO.respostaAPI?.[unidadeEl.value]?.modalidades?.[modalidadeEl.value]?.planos?.find(p => p.id === planoEl.value);
    if (!plano) {
        if (previewEl) previewEl.hidden = true;
        return;
    }

    document.getElementById('preview-nome').textContent = plano.texto;
    document.getElementById('preview-valor').textContent = `R$ ${Number(plano.preco).toFixed(2).replace('.', ',')}`;
    previewEl.hidden = false;
}

/* ===================== REDIRECIONAMENTO ===================== */
async function redirecionarParaPagamento(dados) {
    const botao = document.querySelector('#form-matricula-aluno button[type="submit"]');

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
                // DADOS ENVIADOS PARA O MERCADO PAGO
                data_nascimento: dados.nascimento,
                cep:         dados.cep,
                numero_casa: dados.numero_casa,
                rua:         dados.rua,
                bairro:      dados.bairro,
                cidade:      dados.cidade
            })
        });

        const resultado = await resposta.json();

        if (!resposta.ok || !resultado.url) {
            throw new Error(resultado.erro || 'Resposta inválida da API');
        }

        localStorage.setItem('dadosMatriculaAluno', JSON.stringify(dados));

        let segundos = 5;
        if (botao) {
            botao.style.flexDirection = 'column';
            botao.style.padding = '12px 15px';
            botao.style.lineHeight = '1.3';
            botao.innerHTML = `
                <span style="font-size: 0.8rem; font-weight: normal; text-align: center; margin-bottom: 6px;">
                    ⚠️ Após pagar, clique em <strong>"Voltar para Muskel Fit"</strong> para finalizar!
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
        alert('Não foi possível iniciar o pagamento agora. Tente novamente em instantes ou fale com a academia.');
    }
}

/* ===================== INICIALIZAÇÃO ===================== */
async function iniciarFormulario() {
    const form = document.getElementById('form-matricula-aluno');
    if (!form) return;

    try {
        await carregarCatalogo();
    } catch (e) {
        console.error(e);
        alert('Não foi possível carregar os planos. Recarregue a página.');
        return;
    }

    preencherUnidades();

    // Máscaras
    const celularEl = document.getElementById('celular');
    if (celularEl) celularEl.addEventListener('input', e => e.target.value = formatarTelefone(e.target.value));

    const cepEl = document.getElementById('cep');
    if (cepEl) cepEl.addEventListener('input', e => e.target.value = formatarCEP(e.target.value));

    // Busca automática de CEP + busca reversa por rua
    configurarBuscaCEP();

    const unidadeEl = document.getElementById('unidade');
    const modalidadeEl = document.getElementById('modalidade');
    const planoEl = document.getElementById('plano');

    unidadeEl.addEventListener('change', () => {
        preencherModalidadesDaUnidade(unidadeEl.value);
        atualizarPreviewPlano();
    });
    modalidadeEl.addEventListener('change', () => {
        preencherPlanosDaModalidade(unidadeEl.value, modalidadeEl.value);
        atualizarPreviewPlano();
    });
    planoEl.addEventListener('change', atualizarPreviewPlano);

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const fd = new FormData(e.target);
        const nome        = (fd.get('nome') || '').trim();
        const nascimento  = fd.get('nascimento');
        const celular     = (fd.get('celular') || '').trim();
        const cep         = (fd.get('cep') || '').trim();
        const numero_casa = (fd.get('numero_casa') || '').trim();
        const rua         = (fd.get('rua') || '').trim();
        const bairro      = (fd.get('bairro') || '').trim();
        const cidade      = (fd.get('cidade') || '').trim();
        const unidade     = fd.get('unidade');
        const modalidade  = fd.get('modalidade');
        const planoId     = fd.get('plano');
        const pagamento   = fd.get('pagamento');

        const erroNasc = validarNascimento(nascimento);
        if (erroNasc) return alert(erroNasc);

        if (!nome || !celular || !cep || !numero_casa || !rua || !bairro || !cidade || !planoId || !pagamento) {
            return alert('Preencha todos os campos obrigatórios (*).');
        }
        if (celular.replace(/\D/g, '').length < 10) {
            return alert('Celular inválido.');
        }
        if (cep.replace(/\D/g, '').length < 8) {
            return alert('CEP inválido.');
        }

        const planoObj = CATALOGO.respostaAPI[unidade]?.modalidades[modalidade]?.planos.find(p => p.id === planoId);
        if (!planoObj) return alert('Plano selecionado inválido.');

        const dados = {
            nome, nascimento, celular, cep, numero_casa, rua, bairro, cidade,
            unidade, modalidade,
            planoId: planoObj.id,
            planoTitulo: planoObj.texto,
            preco: planoObj.preco,
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
    const formEl = document.getElementById('form-matricula-aluno');
    const painelConfirmacao = document.getElementById('painel-confirmacao');
    const btnWhats = document.getElementById('btn-enviar-whatsapp');
    const tituloEl = painelConfirmacao?.querySelector('h3');
    const textoEl = painelConfirmacao?.querySelector('p');
    const avisoEl = painelConfirmacao?.querySelector('.aviso-pix');

    if (!formEl || !painelConfirmacao) return;

    const dadosSalvosRaw = localStorage.getItem('dadosMatriculaAluno');
    if (!dadosSalvosRaw) {
        formEl.style.display = 'none';
        painelConfirmacao.hidden = false;
        tituloEl.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Dados não encontrados';
        textoEl.textContent = 'Não conseguimos recuperar seus dados. Preencha novamente.';
        btnWhats.style.display = 'none';
        return;
    }

    const dados = JSON.parse(dadosSalvosRaw);
    formEl.style.display = 'none';

    // Resumo do Pedido
    const resumoEl = document.getElementById('resumo-pedido');
    if (resumoEl && status !== 'failure') {
        resumoEl.style.display = 'block';
        const dataFmt = dados.nascimento.split('-').reverse().join('/');
        const enderecoCompleto = [
            dados.rua && `${dados.rua}, ${dados.numero_casa || 'S/N'}`,
            dados.bairro,
            dados.cidade,
            dados.cep && `CEP ${dados.cep}`
        ].filter(Boolean).join(' — ') || 'Não informado';

        resumoEl.innerHTML = `
            <h4 style="color: var(--cor-secundaria); margin-bottom: 15px; border-bottom: 1px solid #333; padding-bottom: 10px;"><i class="fa-solid fa-receipt"></i> Resumo do Pedido</h4>
            <p style="color: #ccc; margin-bottom: 8px;"><strong>Nome:</strong> ${dados.nome}</p>
            <p style="color: #ccc; margin-bottom: 8px;"><strong>Nascimento:</strong> ${dataFmt}</p>
            <p style="color: #ccc; margin-bottom: 8px;"><strong>Celular:</strong> ${dados.celular}</p>
            <p style="color: #ccc; margin-bottom: 8px;"><strong>Endereço:</strong> ${enderecoCompleto}</p>
            <p style="color: #ccc; margin-bottom: 8px;"><strong>Unidade:</strong> ${dados.unidade}</p>
            <p style="color: #ccc; margin-bottom: 8px;"><strong>Plano:</strong> ${dados.planoTitulo}</p>
            <p style="color: #ccc; margin-bottom: 8px;"><strong>Pagamento:</strong> ${dados.pagamento}</p>
            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px dashed #444;">
                <p style="color: var(--cor-secundaria); font-size: 1.3rem; margin: 0;"><strong>Total: R$ ${Number(dados.preco).toFixed(2).replace('.', ',')}</strong></p>
            </div>
        `;
    }

    let icone, titulo, textoStatus;
    if (status === 'failure') {
        icone = 'fa-solid fa-circle-xmark'; titulo = 'Pagamento não aprovado'; textoStatus = '❌ Pagamento não aprovado';
        textoEl.textContent = 'O pagamento não foi aprovado. Tente novamente ou entre em contato.';
        avisoEl.innerHTML = 'Não se preocupe, você pode tentar novamente.';
    } else if (status === 'pending') {
        icone = 'fa-solid fa-hourglass-half'; titulo = 'Pagamento em processamento'; textoStatus = '⏳ Em processamento';
        textoEl.textContent = 'Seu pagamento está em processamento. Envie seus dados no WhatsApp.';
        avisoEl.innerHTML = 'Assim que for confirmado, você receberá o aviso.';
    } else {
        icone = 'fa-solid fa-circle-check'; titulo = 'Matrícula aprovada!'; textoStatus = '✅ Pagamento aprovado';
        textoEl.textContent = 'Seus dados estão prontos. Clique abaixo para enviar ao WhatsApp:';
        avisoEl.innerHTML = `<strong>Pronto, Matrícula realizada!</strong><br><br>Agora é só ir até a recepção da academia. Seja bem-vindo!<br><i class="fa-solid fa-dumbbell"></i> Bora treinar <i class="fa-solid fa-dumbbell"></i>`;
    }

    tituloEl.innerHTML = `<i class="${icone}"></i> ${titulo}`;

    const enderecoMsg = [
        dados.rua && `${dados.rua}, ${dados.numero_casa || 'S/N'}`,
        dados.bairro,
        dados.cidade,
        dados.cep && `CEP ${dados.cep}`
    ].filter(Boolean).join(' — ');

    const msg = `*NOVA MATRÍCULA — Muskel Fit*\n\n` +
        `*Nome:* ${dados.nome}\n` +
        `*Nascimento:* ${dados.nascimento.split('-').reverse().join('/')}\n` +
        `*Celular:* ${dados.celular}\n` +
        `*Endereço:* ${enderecoMsg}\n` +
        `*Unidade:* ${dados.unidade}\n` +
        `*Modalidade:* ${dados.modalidade}\n` +
        `*Plano:* ${dados.planoTitulo}\n` +
        `*Pagamento:* ${dados.pagamento}\n` +
        `*Status:* ${textoStatus}\n\n` +
        `Aguardo contato para confirmar!`;

    painelConfirmacao.hidden = false;
    painelConfirmacao.scrollIntoView({ behavior: 'smooth', block: 'start' });

    if (status === 'failure') {
        btnWhats.style.display = 'none';
    } else {
        btnWhats.addEventListener('click', () => {
            window.open(`https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`, '_blank');
        });
    }

    localStorage.removeItem('dadosMatriculaAluno');
    sessionStorage.removeItem('acessoMatriculaAluno');
}

if (STATUS_VALIDOS.includes(statusPagamento)) {
    tratarRetornoMercadoPago(statusPagamento);
} else {
    iniciarFormulario();
}