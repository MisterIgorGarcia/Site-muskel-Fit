/* ===================== CONFIGURAÇÃO ===================== */
const CONFIG = {
    whatsapp: '5512991859267',
    tipo: 'matricula-aluno'
};

let CATALOGO = null;
let contadorInterval = null;
let ultimoCepBuscado = '';
let nomeJaExiste = false;
let timeoutChecagem = null;

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

/* ===================== CHECAGEM DE NOME ===================== */
function configurarChecagemNome() {
    const nomeEl = document.getElementById('nome');
    const msgEl = document.getElementById('status-nome-msg');
    if (!nomeEl || !msgEl) return;

    nomeEl.addEventListener('input', (e) => {
        clearTimeout(timeoutChecagem);
        const nome = e.target.value.trim();

        if (nome.length < 3) {
            msgEl.textContent = '';
            nomeJaExiste = false;
            return;
        }

        msgEl.textContent = 'Verificando disponibilidade...';
        msgEl.style.color = '#ffd60a';

        timeoutChecagem = setTimeout(async () => {
            try {
                const res = await fetch('/api/checar-matricula', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nome })
                });
                const data = await res.json();

                if (data.existe) {
                    msgEl.textContent = '⚠️ Este nome já está no sistema. Vá para a tela de Mensalidade.';
                    msgEl.style.color = '#ef4444';
                    nomeJaExiste = true;
                } else {
                    msgEl.textContent = '✅ Nome disponível para matrícula!';
                    msgEl.style.color = '#22c55e';
                    nomeJaExiste = false;
                }
            } catch (error) {
                msgEl.textContent = '';
                nomeJaExiste = false;
            }
        }, 600);
    });
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
        bloco.style.display = 'none';
        lista.innerHTML = '';
        return;
    }

    bloco.hidden = false;
    bloco.style.display = '';
    
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
                    <label for="dep-${i}-nascimento">Data de nascimento *</label>
                    <input type="date" id="dep-${i}-nascimento" name="dep_${i}_nascimento" required>
                </div>

                <div class="campo">
                    <label for="dep-${i}-celular">Celular (WhatsApp) *</label>
                    <input type="tel" id="dep-${i}-celular" name="dep_${i}_celular"
                           placeholder="(12) 99999-9999" required autocomplete="off">
                </div>

                <div class="campo">
                    <label for="dep-${i}-cep">CEP *</label>
                    <input type="text" id="dep-${i}-cep" name="dep_${i}_cep" 
                           placeholder="Ex: 12700-000" maxlength="9" inputmode="numeric" required autocomplete="off">
                </div>

                <div class="campo">
                    <label for="dep-${i}-rua">Rua / Logradouro *</label>
                    <input type="text" id="dep-${i}-rua" name="dep_${i}_rua" placeholder="Rua" required autocomplete="off">
                </div>

                <div class="campo">
                    <label for="dep-${i}-numero">Número da casa *</label>
                    <input type="text" id="dep-${i}-numero" name="dep_${i}_numero" placeholder="Ex: 123" required autocomplete="off">
                </div>

                <div class="campo">
                    <label for="dep-${i}-bairro">Bairro *</label>
                    <input type="text" id="dep-${i}-bairro" name="dep_${i}_bairro" placeholder="Bairro" required autocomplete="off">
                </div>

                <div class="campo">
                    <label for="dep-${i}-cidade">Cidade / UF *</label>
                    <input type="text" id="dep-${i}-cidade" name="dep_${i}_cidade" placeholder="Cidade - UF" required autocomplete="off">
                </div>
            </div>
        `;
    }
    lista.innerHTML = html;

    for (let i = 1; i <= qtd; i++) {
        const celEl = document.getElementById(`dep-${i}-celular`);
        if (celEl) celEl.addEventListener('input', e => e.target.value = formatarTelefone(e.target.value));

        const cepEl = document.getElementById(`dep-${i}-cep`);
        if (cepEl) {
            cepEl.addEventListener('input', e => e.target.value = formatarCEP(e.target.value));
            cepEl.addEventListener('blur', async (e) => {
                const cep = e.target.value.replace(/\D/g, '');
                if (cep.length !== 8) return;

                try {
                    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                    const data = await res.json();
                    if (!data.erro) {
                        document.getElementById(`dep-${i}-rua`).value = data.logradouro || '';
                        document.getElementById(`dep-${i}-bairro`).value = data.bairro || '';
                        document.getElementById(`dep-${i}-cidade`).value = `${data.localidade} - ${data.uf}`;
                        document.getElementById(`dep-${i}-numero`).focus();
                    } else {
                        Alerta.aviso(`CEP do Dependente ${i}`, 'CEP não encontrado. Confira e tente novamente, ou preencha o endereço manualmente.');
                    }
                } catch (err) {
                    console.error(`[CEP] erro na busca do dependente ${i}:`, err);
                }
            });
        }
    }
}

function coletarDependentes(fd, qtd) {
    const dependentes = [];
    for (let i = 1; i <= qtd; i++) {
        const nome        = (fd.get(`dep_${i}_nome`) || '').trim();
        const nascimento  = fd.get(`dep_${i}_nascimento`) || '';
        const celular     = (fd.get(`dep_${i}_celular`) || '').trim();
        const cep         = (fd.get(`dep_${i}_cep`) || '').trim();
        const rua         = (fd.get(`dep_${i}_rua`) || '').trim();
        const numero_casa = (fd.get(`dep_${i}_numero`) || '').trim();
        const bairro      = (fd.get(`dep_${i}_bairro`) || '').trim();
        const cidade      = (fd.get(`dep_${i}_cidade`) || '').trim();

        if (!nome || !nascimento || !celular || !cep || !rua || !numero_casa || !bairro || !cidade) {
            Alerta.aviso(`Dependente ${i}`, `Preencha todos os campos do dependente ${i}.`);
            return null;
        }
        
        const erroNasc = validarNascimento(nascimento);
        if (erroNasc) {
            Alerta.aviso(`Dependente ${i}`, erroNasc);
            return null;
        }
        if (celular.replace(/\D/g, '').length < 10) {
            Alerta.aviso(`Dependente ${i}`, 'Celular inválido. Use o formato (12) 99999-9999.');
            return null;
        }
        if (cep.replace(/\D/g, '').length < 8) {
            Alerta.aviso(`Dependente ${i}`, 'CEP inválido. Use o formato 12700-000.');
            return null;
        }

        dependentes.push({ 
            nome, celular, data_nascimento: nascimento, cep, rua, numero_casa, bairro, cidade 
        });
    }
    return dependentes;
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
        const planoEl = document.getElementById('plano');
        if (planoEl) renderizarDependentes(getQuantidadeDependentes(planoEl.value));
    }
});

/* ===================== BUSCA DE CEP TITULAR ===================== */
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

    cepEl.addEventListener('blur', async (e) => {
        const cep = e.target.value.replace(/\D/g, '');

        if (cep.length === 0) { limparCamposEndereco(); return; }
        if (cep.length !== 8) { Alerta.aviso('CEP incompleto', 'Digite os 8 dígitos (ex: 12700-000).'); return; }
        if (cep === ultimoCepBuscado) return;
        ultimoCepBuscado = cep;

        try {
            const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            const data = await res.json();

            if (data.erro) {
                Alerta.aviso('CEP não encontrado', 'Confira e tente novamente, ou preencha o endereço manualmente.');
                return;
            }
            document.getElementById('rua').value    = data.logradouro || '';
            document.getElementById('bairro').value = data.bairro     || '';
            document.getElementById('cidade').value = `${data.localidade} - ${data.uf}`;
            document.getElementById('numero_casa')?.focus();
        } catch (err) {
            console.error('[CEP] erro na busca:', err);
            Alerta.erro('Erro ao buscar CEP', 'Não foi possível buscar o CEP agora. Preencha manualmente.');
        }
    });

    cepEl.addEventListener('input', () => { ultimoCepBuscado = ''; });
}

async function buscarEnderecoPorRua() {
    const ruaInput = document.getElementById('rua');
    const btnBusca = document.getElementById('btn-buscar-rua');
    if (!ruaInput || !btnBusca) return;

    const rua = ruaInput.value.trim();
    if (rua.length < 3) { Alerta.aviso('Rua muito curta', 'Digite pelo menos 3 letras do nome da rua para buscar.'); return; }

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
            Alerta.aviso('Rua não encontrada', 'Rua não encontrada em Cruzeiro ou Lavrinhas - SP. Tente digitar o CEP diretamente.');
            return;
        }

        const data = resultados[0];
        document.getElementById('cep').value    = data.cep;
        document.getElementById('rua').value    = data.logradouro;
        document.getElementById('bairro').value = data.bairro;
        document.getElementById('cidade').value = `${data.localidade} - ${data.uf}`;
        document.getElementById('numero_casa')?.focus();
    } catch (err) {
        console.error('[busca-rua] erro:', err);
        Alerta.erro('Erro ao buscar endereço', 'Não foi possível buscar o endereço agora. Digite o CEP manualmente.');
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
    if (!plano) { if (previewEl) previewEl.hidden = true; return; }

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
                data_nascimento: dados.nascimento,
                cep:         dados.cep,
                numero_casa: dados.numero_casa,
                rua:         dados.rua,
                bairro:      dados.bairro,
                cidade:      dados.cidade,
                dependentes: dados.dependentes || []
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
        Alerta.erro('Erro no pagamento', 'Não foi possível iniciar o pagamento agora. Tente novamente em instantes ou fale com a academia.');
    }
}

/* ===================== INICIALIZAÇÃO ===================== */
async function iniciarFormulario() {
    const form = document.getElementById('form-matricula-aluno');
    if (!form) return;

    renderizarDependentes(0);

    try {
        await carregarCatalogo();
    } catch (e) {
        console.error(e);
        Alerta.erro('Erro ao carregar', 'Não foi possível carregar os planos. Recarregue a página.');
        return;
    }

    preencherUnidades();
    configurarChecagemNome();

    const celularEl = document.getElementById('celular');
    if (celularEl) celularEl.addEventListener('input', e => e.target.value = formatarTelefone(e.target.value));

    const cepEl = document.getElementById('cep');
    if (cepEl) cepEl.addEventListener('input', e => e.target.value = formatarCEP(e.target.value));

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
    planoEl.addEventListener('change', () => {
        atualizarPreviewPlano();
        renderizarDependentes(getQuantidadeDependentes(planoEl.value));
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        if (nomeJaExiste) {
            Alerta.erro('Nome já cadastrado', 'Este nome já está no sistema. Vá para a tela de mensalidade.');
            return;
        }

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
        if (erroNasc) {
            Alerta.aviso('Data de nascimento', erroNasc);
            return;
        }

        if (!nome || !celular || !cep || !numero_casa || !rua || !bairro || !cidade || !planoId || !pagamento) {
            Alerta.aviso('Campos obrigatórios', 'Preencha todos os campos obrigatórios (*).');
            return;
        }
        if (celular.replace(/\D/g, '').length < 10) {
            Alerta.aviso('Celular inválido', 'Use o formato (12) 99999-9999.');
            return;
        }
        if (cep.replace(/\D/g, '').length < 8) {
            Alerta.aviso('CEP inválido', 'Use o formato 12700-000.');
            return;
        }

        const planoObj = CATALOGO.respostaAPI[unidade]?.modalidades[modalidade]?.planos.find(p => p.id === planoId);
        if (!planoObj) {
            Alerta.aviso('Plano indisponível', 'O plano selecionado não está disponível nesta modalidade.');
            return;
        }

        const qtdDeps = getQuantidadeDependentes(planoId);
        const dependentes = qtdDeps > 0 ? coletarDependentes(fd, qtdDeps) : [];
        if (dependentes === null) return;

        const dados = {
            nome, nascimento, celular, cep, numero_casa, rua, bairro, cidade,
            unidade, modalidade,
            planoId: planoObj.id,
            planoTitulo: planoObj.texto,
            preco: planoObj.preco,
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

    const dependentes = Array.isArray(dados.dependentes) ? dados.dependentes : [];

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

        let dependentesHTML = '';
        if (dependentes.length > 0) {
            dependentesHTML = `<div style="margin-top:10px; border-top:1px solid #333; padding-top:10px;">
                <p style="color:#ccc; margin-bottom:8px;"><strong>Dependentes:</strong></p>`;
            dependentes.forEach(d => {
                const endDep = [d.rua && `${d.rua}, ${d.numero_casa}`, d.bairro, d.cidade].filter(Boolean).join(' — ');
                dependentesHTML += `<p style="color:#aaa; margin-bottom:4px; font-size:0.9em;">
                    • ${d.nome} (${d.celular}) - ${endDep}
                </p>`;
            });
            dependentesHTML += `</div>`;
        }

        resumoEl.innerHTML = `
            <h4 style="color: var(--cor-secundaria); margin-bottom: 15px; border-bottom: 1px solid #333; padding-bottom: 10px;"><i class="fa-solid fa-receipt"></i> Resumo do Pedido</h4>
            <p style="color: #ccc; margin-bottom: 8px;"><strong>Nome:</strong> ${dados.nome}</p>
            <p style="color: #ccc; margin-bottom: 8px;"><strong>Nascimento:</strong> ${dataFmt}</p>
            <p style="color: #ccc; margin-bottom: 8px;"><strong>Celular:</strong> ${dados.celular}</p>
            <p style="color: #ccc; margin-bottom: 8px;"><strong>Endereço:</strong> ${enderecoCompleto}</p>
            ${dependentesHTML}
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

    let dependentesMsg = '';
    if (dependentes.length > 0) {
        dependentesMsg = `*Dependentes:*\n` + dependentes.map(d => {
            const endDep = [d.rua && `${d.rua}, ${d.numero_casa}`, d.bairro, d.cidade, d.cep && `CEP ${d.cep}`].filter(Boolean).join(' - ');
            return `  - ${d.nome} — ${d.celular} — Nasc: ${d.data_nascimento.split('-').reverse().join('/')}\n    End: ${endDep}`;
        }).join('\n') + '\n';
    }

    const msg = `*NOVA MATRÍCULA — Muskel Fit*\n\n` +
        `*Nome:* ${dados.nome}\n` +
        `*Nascimento:* ${dados.nascimento.split('-').reverse().join('/')}\n` +
        `*Celular:* ${dados.celular}\n` +
        `*Endereço:* ${enderecoMsg}\n` +
        dependentesMsg +
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