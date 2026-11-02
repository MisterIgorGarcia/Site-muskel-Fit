// script/admin-dashboard.js

const cargo = sessionStorage.getItem('adminCargo');
if (!cargo) {
    window.location.href = 'admin.html';
}

let abaAtual = 'composicao';
let instanciaGraficoHistorico = null;
let intervaloAtualizacao = null;
let carregando = false;
let instanciaGrafico = null;
let funcionarioEditandoUnidadeId = null;

let dadosGlobaisCompletos = { matriculas: [], prematriculas: [] };
let dadosCarregados = false;

// FILTROS
let filtroAlunosIncompletos = false;
let filtroAlunoNome = '';

// CACHES DE TABELAS
let dadosMatriculasTabela = []; // NOVO: Cache para os dependentes
let dadosAlunosTabela = [];

let paginacao = {
    matriculas: { pagina: 1, limite: 10, total: 0 },
    prematriculas: { pagina: 1, limite: 10, total: 0 },
    alunos: { pagina: 1, limite: 10, total: 0 }
};

// ===================== CARREGAR DADOS DAS TABELAS (PAGINADO) =====================
async function carregarDados(manual = false) {
    if (carregando) return;
    carregando = true;

    const btnAtualizar = document.getElementById('btn-atualizar');
    if (btnAtualizar && manual) {
        btnAtualizar.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Buscando...';
    }

    try {
        await Promise.all([
            buscarPaginaTabela('matriculas'),
            buscarPaginaTabela('prematriculas'),
            buscarPaginaTabela('alunos')
        ]);

        if (manual || !dadosCarregados) {
            await atualizarCardsEGraficos();
            await verificarDadosIncompletos();
        }

    } catch (erro) {
        console.error('Erro:', erro);
        if (manual) alert('Erro ao carregar os dados do banco.');
    } finally {
        carregando = false;
        if (btnAtualizar && manual) {
            btnAtualizar.innerHTML = '<i class="fa-solid fa-rotate-right"></i> Atualizar';
        }
    }
}

async function buscarPaginaTabela(tipo) {
    const minhaUnidade = sessionStorage.getItem('adminUnidade');
    let url = `/api/admin-dados?tipo=${tipo === 'matriculas' ? 'matricula' : tipo === 'prematriculas' ? 'prematricula' : 'aluno'}&page=${paginacao[tipo].pagina}&limit=${paginacao[tipo].limite}`;
    
    if (cargo === 'funcionario' && minhaUnidade && minhaUnidade.trim() !== '') {
        url += `&unidade=${encodeURIComponent(minhaUnidade)}`;
    }

    if (tipo === 'alunos') {
        if (filtroAlunosIncompletos) url += `&incompletos=true`;
        if (filtroAlunoNome.trim() !== '') url += `&nome=${encodeURIComponent(filtroAlunoNome.trim())}`;
    }

    const resposta = await fetch(url);
    const json = await resposta.json();
    if (!resposta.ok) throw new Error('Erro ao buscar');

    paginacao[tipo].total = json.total;
    
    if (tipo === 'matriculas') renderizarTabelaMatriculas(json.dados);
    else if (tipo === 'prematriculas') renderizarTabelaPrematriculas(json.dados);
    else renderizarTabelaAlunos(json.dados);
}

// ===================== PESQUISA DE ALUNOS =====================
function pesquisarAluno() {
    const input = document.getElementById('busca-aluno-input');
    filtroAlunoNome = input ? input.value : '';
    paginacao.alunos.pagina = 1; // Sempre volta pra página 1 na busca
    buscarPaginaTabela('alunos');
}

function limparPesquisaAluno() {
    const input = document.getElementById('busca-aluno-input');
    if (input) input.value = '';
    filtroAlunoNome = '';
    paginacao.alunos.pagina = 1;
    buscarPaginaTabela('alunos');
}

// ===================== CHECAGEM DE DADOS INCOMPLETOS =====================
async function verificarDadosIncompletos() {
    try {
        const res = await fetch('/api/admin-dados?tipo=aluno&incompletos=true&limit=1');
        if (!res.ok) return;
        const data = await res.json();
        
        const qtd = data.total || 0;
        const alerta = document.getElementById('alerta-incompletos');
        const qtdEl = document.getElementById('qtd-incompletos');
        
        if (qtd > 0 && alerta) {
            qtdEl.textContent = qtd;
            alerta.style.display = 'flex';
        } else if (alerta) {
            alerta.style.display = 'none';
        }
    } catch (e) {
        console.error('Erro ao verificar dados incompletos:', e);
    }
}

function filtrarIncompletos() {
    filtroAlunosIncompletos = true;
    paginacao.alunos.pagina = 1;
    document.getElementById('busca-aluno-input').value = ''; // Limpa busca por nome
    filtroAlunoNome = '';
    
    buscarPaginaTabela('alunos');
    
    document.getElementById('tabela-alunos-body').scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    const btn = document.querySelector('#alerta-incompletos button');
    if (btn) {
        btn.textContent = 'Limpar Filtro';
        btn.onclick = () => {
            filtroAlunosIncompletos = false;
            btn.textContent = 'Ver Alunos';
            btn.onclick = filtrarIncompletos;
            buscarPaginaTabela('alunos');
        };
    }
}

// ===================== RENDERIZAÇÃO DAS TABELAS =====================
function renderizarTabelaMatriculas(dados) {
    const tbody = document.getElementById('tabela-matriculas-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    dadosMatriculasTabela = dados; // Salva no cache para o modal

    if (dados.length === 0) {
        const colunas = cargo === 'dono' ? 10 : 9; 
        tbody.innerHTML = `<tr><td colspan="${colunas}" style="text-align:center;">Nenhuma matrícula registrada.</td></tr>`;
    } else {
        dados.forEach((item, index) => {
            const data = new Date(item.created_at).toLocaleDateString('pt-BR');
            const valor = Number(item.preco) || 0;
            const pagamentoFormatado = item.pagamento ? item.pagamento.charAt(0).toUpperCase() + item.pagamento.slice(1).toLowerCase() : '-';
            
            // NOVO: Lógica dos dependentes com Hyperlink
            let dependentesHTML = '';
            if (item.dependentes && Array.isArray(item.dependentes) && item.dependentes.length > 0) {
                dependentesHTML = item.dependentes.map((dep, depIndex) => 
                    `<a href="javascript:void(0)" onclick="abrirModalDependente(${index}, ${depIndex})" style="color: var(--cor-secundaria); text-decoration: underline; display: block; margin-bottom: 4px;"><i class="fa-solid fa-user"></i> ${dep.nome.split(' ')[0]}</a>`
                ).join('');
            }

            const colunaValor = cargo === 'dono' ? `<td class="destaque-valor">R$ ${valor.toFixed(2).replace('.', ',')}</td>` : '';
            const colunaAcao = cargo === 'dono' ? `<td><button onclick="removerRegistro(${item.id}, 'matricula')" style="background: transparent; border: none; color: #ef4444; cursor: pointer;" title="Excluir"><i class="fa-solid fa-trash"></i></button></td>` : '';

            tbody.innerHTML += `
                <tr>
                    <td>${data}</td>
                    <td><strong>${item.nome}</strong></td>
                    <td>${item.celular}</td>
                    <td>${item.unidade}</td>
                    <td>${item.modalidade}</td>
                    <td>${item.plano}</td>
                    <td>${dependentesHTML}</td> <!-- NOVA COLUNA AQUI -->
                    ${colunaValor}
                    <td>${pagamentoFormatado}</td>
                    ${colunaAcao}
                </tr>
            `;
        });
    }
    renderizarBotoesPaginacao('matriculas');
}

function renderizarTabelaPrematriculas(dados) {
    const tbody = document.getElementById('tabela-prematriculas-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (dados.length === 0) {
        const colunas = cargo === 'dono' ? 9 : 8; 
        tbody.innerHTML = `<tr><td colspan="${colunas}" style="text-align:center;">Nenhuma pré-matrícula registrada.</td></tr>`;
    } else {
        dados.forEach(item => {
            const data = new Date(item.created_at).toLocaleDateString('pt-BR');
            const valor = Number(item.preco) || 0;
            const pagamentoFormatado = item.pagamento ? item.pagamento.charAt(0).toUpperCase() + item.pagamento.slice(1).toLowerCase() : '-';

            const colunaValor = cargo === 'dono' ? `<td class="destaque-valor">R$ ${valor.toFixed(2).replace('.', ',')}</td>` : '';
            const colunaAcao = cargo === 'dono' ? `<td><button onclick="removerRegistro(${item.id}, 'prematricula')" style="background: transparent; border: none; color: #ef4444; cursor: pointer;" title="Excluir"><i class="fa-solid fa-trash"></i></button></td>` : '';

            tbody.innerHTML += `
                <tr>
                    <td>${data}</td>
                    <td><strong>${item.nome}</strong></td>
                    <td>${item.celular}</td>
                    <td>${item.unidade}</td>
                    <td>${item.modalidade}</td>
                    <td>${item.plano}</td>
                    ${colunaValor}
                    <td>${pagamentoFormatado}</td>
                    ${colunaAcao}
                </tr>
            `;
        });
    }
    renderizarBotoesPaginacao('prematriculas');
}

function renderizarTabelaAlunos(dados) {
    const tbody = document.getElementById('tabela-alunos-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    dadosAlunosTabela = dados;

    if (dados.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;">Nenhum aluno encontrado.</td></tr>`;
    } else {
        dados.forEach((item, index) => {
            const data = new Date(item.created_at).toLocaleDateString('pt-BR');
            const cep = item.cep ? item.cep : '<span style="color:#ef4444;">Falta</span>';
            const endereco = item.rua ? `${item.rua}, ${item.numero_casa || 'S/N'}` : '<span style="color:#ef4444;">Falta</span>';
            const nasc = item.data_nascimento ? item.data_nascimento.split('-').reverse().join('/') : '<span style="color:#ef4444;">Falta</span>';
            const celular = item.celular ? item.celular : '<span style="color:#ef4444;">Falta</span>';
            
            tbody.innerHTML += `
                <tr>
                    <td>${data}</td>
                    <td><strong>${item.nome}</strong></td>
                    <td>${celular}</td>
                    <td>${cep} <br><small style="color:#888;">${endereco}</small></td>
                    <td>${nasc}</td>
                    <td>${item.plano}</td>
                    <td>
                        <button onclick="abrirModalEditarAluno(${index})" style="background: transparent; border: none; color: #3b82f6; cursor: pointer; margin-right: 10px;" title="Completar Dados"><i class="fa-solid fa-pen"></i></button>
                        <button onclick="removerRegistro(${item.id}, 'aluno')" style="background: transparent; border: none; color: #ef4444; cursor: pointer;" title="Excluir"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>
            `;
        });
    }
    renderizarBotoesPaginacao('alunos');
}

// ===================== MODAL DE DETALHES DO DEPENDENTE =====================
function abrirModalDependente(indexMatricula, indexDependente) {
    const matricula = dadosMatriculasTabela[indexMatricula];
    if (!matricula || !matricula.dependentes) return;

    const dep = matricula.dependentes[indexDependente];
    if (!dep) return;

    document.getElementById('dep-detalhe-nome').textContent = dep.nome || 'Não informado';
    document.getElementById('dep-detalhe-celular').textContent = dep.celular || 'Não informado';
    document.getElementById('dep-detalhe-nascimento').textContent = dep.data_nascimento ? dep.data_nascimento.split('-').reverse().join('/') : 'Não informado';
    
    document.getElementById('dep-detalhe-cep').textContent = dep.cep || 'Não informado';
    document.getElementById('dep-detalhe-rua').textContent = dep.rua || 'Não informado';
    document.getElementById('dep-detalhe-numero').textContent = dep.numero_casa || 'Não informado';
    document.getElementById('dep-detalhe-bairro').textContent = dep.bairro || 'Não informado';
    document.getElementById('dep-detalhe-cidade').textContent = dep.cidade || 'Não informado';

    document.getElementById('modal-detalhes-dependente').style.display = 'flex';
}

function fecharModalDependente() {
    document.getElementById('modal-detalhes-dependente').style.display = 'none';
}

// ===================== EDIÇÃO E VIACEP DO ALUNO =====================
function abrirModalEditarAluno(index) {
    const aluno = dadosAlunosTabela[index];
    if (!aluno) return;

    document.getElementById('edit-aluno-id').value = aluno.id;
    document.getElementById('edit-aluno-nome').value = aluno.nome;
    document.getElementById('edit-aluno-celular').value = aluno.celular || '';
    document.getElementById('edit-aluno-nascimento').value = aluno.data_nascimento || '';
    document.getElementById('edit-aluno-cep').value = aluno.cep || '';
    document.getElementById('edit-aluno-rua').value = aluno.rua || '';
    document.getElementById('edit-aluno-numero').value = aluno.numero_casa || '';
    document.getElementById('edit-aluno-bairro').value = aluno.bairro || '';
    document.getElementById('edit-aluno-cidade').value = aluno.cidade || '';

    document.getElementById('modal-editar-aluno').style.display = 'flex';
}

function fecharModalEditarAluno() {
    document.getElementById('modal-editar-aluno').style.display = 'none';
}

function mascaraCEP(input) {
    let val = input.value.replace(/\D/g, '');
    if (val.length > 5) val = val.replace(/^(\d{5})(\d)/, '$1-$2');
    input.value = val;
}

async function buscarCEPAdmin() {
    const cepInput = document.getElementById('edit-aluno-cep');
    const cep = cepInput.value.replace(/\D/g, '');
    
    if (cep.length !== 8) return;

    try {
        const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await res.json();

        if (!data.erro) {
            document.getElementById('edit-aluno-rua').value = data.logradouro || '';
            document.getElementById('edit-aluno-bairro').value = data.bairro || '';
            document.getElementById('edit-aluno-cidade').value = `${data.localidade} - ${data.uf}`;
            document.getElementById('edit-aluno-numero').focus();
        } else {
            alert('CEP não encontrado.');
        }
    } catch (err) {
        console.error('Erro ao buscar CEP:', err);
    }
}

async function salvarEdicaoAluno(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-salvar-aluno');
    btn.innerHTML = 'Salvando...';
    btn.disabled = true;

    const id = document.getElementById('edit-aluno-id').value;
    const dados = {
        tipo: 'aluno',
        id: id,
        celular: document.getElementById('edit-aluno-celular').value.trim() || null,
        data_nascimento: document.getElementById('edit-aluno-nascimento').value || null,
        cep: document.getElementById('edit-aluno-cep').value.trim() || null,
        rua: document.getElementById('edit-aluno-rua').value.trim() || null,
        numero_casa: document.getElementById('edit-aluno-numero').value.trim() || null,
        bairro: document.getElementById('edit-aluno-bairro').value.trim() || null,
        cidade: document.getElementById('edit-aluno-cidade').value.trim() || null
    };

    try {
        const res = await fetch('/api/admin-dados', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });

        if (!res.ok) throw new Error('Erro ao salvar');
        
        alert('Dados atualizados com sucesso!');
        fecharModalEditarAluno();
        dadosCarregados = false;
        carregarDados(true);

    } catch (err) {
        alert('Erro ao salvar os dados. Tente novamente.');
    } finally {
        btn.innerHTML = 'Salvar Dados';
        btn.disabled = false;
    }
}

// ===================== BOTÕES DE PAGINAÇÃO =====================
function renderizarBotoesPaginacao(tipo) {
    const container = document.getElementById(`paginacao-${tipo}`);
    if (!container) return;

    container.innerHTML = '';
    const total = paginacao[tipo].total;
    const limite = paginacao[tipo].limite;
    const totalPaginas = Math.ceil(total / limite) || 1;
    const paginaAtual = paginacao[tipo].pagina;

    if (totalPaginas <= 1) return;

    const btnPrev = document.createElement('button');
    btnPrev.className = 'btn-pagina';
    btnPrev.innerHTML = '«';
    btnPrev.disabled = paginaAtual === 1;
    btnPrev.onclick = () => mudarPagina(tipo, paginaAtual - 1);
    container.appendChild(btnPrev);

    for (let i = 1; i <= totalPaginas; i++) {
        if (i === 1 || i === totalPaginas || (i >= paginaAtual - 2 && i <= paginaAtual + 2)) {
            const btn = document.createElement('button');
            btn.className = `btn-pagina ${i === paginaAtual ? 'ativo' : ''}`;
            btn.innerText = i;
            btn.onclick = () => mudarPagina(tipo, i);
            container.appendChild(btn);
        } else if (i === paginaAtual - 3 || i === paginaAtual + 3) {
            const span = document.createElement('span');
            span.innerText = '...';
            span.style.color = '#666';
            span.style.padding = '0 5px';
            container.appendChild(span);
        }
    }

    const btnNext = document.createElement('button');
    btnNext.className = 'btn-pagina';
    btnNext.innerHTML = '»';
    btnNext.disabled = paginaAtual === totalPaginas;
    btnNext.onclick = () => mudarPagina(tipo, paginaAtual + 1);
    container.appendChild(btnNext);
}

function mudarPagina(tipo, novaPagina) {
    paginacao[tipo].pagina = novaPagina;
    buscarPaginaTabela(tipo);
}

// ===================== BUSCAR TUDO (PARA GRÁFICOS E EXCEL) =====================
async function buscarTodosOsDados() {
    if (dadosCarregados) return dadosGlobaisCompletos;

    const minhaUnidade = sessionStorage.getItem('adminUnidade');
    let queryUnidade = '';
    if (cargo === 'funcionario' && minhaUnidade && minhaUnidade.trim() !== '') {
        queryUnidade = `&unidade=${encodeURIComponent(minhaUnidade)}`;
    }

    // NOVO: Adicionado a busca de 'aluno' no Promise.all
    const [resMat, resPre, resAlu] = await Promise.all([
        fetch(`/api/admin-dados?tipo=matricula&all=true${queryUnidade}`),
        fetch(`/api/admin-dados?tipo=prematricula&all=true${queryUnidade}`),
        fetch(`/api/admin-dados?tipo=aluno&all=true${queryUnidade}`)
    ]);

    if (!resMat.ok || !resPre.ok || !resAlu.ok) throw new Error('Falha ao buscar dados no servidor');

    const dataMat = await resMat.json();
    const dataPre = await resPre.json();
    const dataAlu = await resAlu.json();

    dadosGlobaisCompletos.matriculas = dataMat.dados || [];
    dadosGlobaisCompletos.prematriculas = dataPre.dados || [];
    dadosGlobaisCompletos.alunos = dataAlu.dados || []; // NOVO
    dadosCarregados = true;

    return dadosGlobaisCompletos;
}

async function atualizarCardsEGraficos() {
    try {
        const dados = await buscarTodosOsDados();
        
        let valorTotal = 0;
        dados.matriculas.forEach(item => { valorTotal += (Number(item.preco) || 0); });
        dados.prematriculas.forEach(item => { valorTotal += (Number(item.preco) || 0); });

        document.getElementById('total-registros').innerText = dados.matriculas.length + dados.prematriculas.length;
        const cardArrecadado = document.getElementById('total-arrecadado');
        if (cardArrecadado) cardArrecadado.innerText = `R$ ${valorTotal.toFixed(2).replace('.', ',')}`;

        if (document.getElementById('grafico-unico')) {
            await atualizarGraficos();
        }
    } catch (erro) {
        console.error("Erro ao atualizar cards e gráficos:", erro);
    }
}

// ===================== ATUALIZAÇÃO AUTOMÁTICA =====================
function iniciarAtualizacaoAutomatica() {
    if (intervaloAtualizacao) clearInterval(intervaloAtualizacao);
    intervaloAtualizacao = setInterval(() => {
        if (document.visibilityState === 'visible') {
            dadosCarregados = false; 
            carregarDados(false); 
        }
    }, 10000); 
}

/* ===================== CONTROLE DE LOADING DO GRÁFICO ===================== */
function controlarLoadingGrafico(containerId, status, mensagemErro = '') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const overlayExistente = container.querySelector('.chart-status-overlay');
    if (overlayExistente) overlayExistente.remove();

    if (status === 'hide') return;

    const overlay = document.createElement('div');
    overlay.className = `chart-status-overlay ${status === 'error' ? 'erro' : ''}`;

    if (status === 'loading') {
        overlay.innerHTML = `<div class="spinner"></div><p>Buscando dados do banco...</p>`;
    } else if (status === 'error') {
        overlay.innerHTML = `
            <i class="fa-solid fa-triangle-exclamation"></i>
            <p>${mensagemErro || 'Falha ao carregar os dados.'}</p>
            <button onclick="atualizarGraficos()" class="btn-tentar-novamente">Tentar Novamente</button>
        `;
    }

    container.appendChild(overlay);
}

/* ===================== GRÁFICOS ===================== */
function mudarAba(aba) {
    abaAtual = aba;
    const btnComp = document.getElementById('btn-aba-composicao');
    const btnHist = document.getElementById('btn-aba-historico');
    const divComp = document.getElementById('div-grafico-composicao');
    const divHist = document.getElementById('div-grafico-historico');

    if (aba === 'composicao') {
        btnComp.classList.add('ativa');
        btnHist.classList.remove('ativa');
        divComp.style.display = 'flex';
        divHist.style.display = 'none';
    } else {
        btnHist.classList.add('ativa');
        btnComp.classList.remove('ativa');
        divComp.style.display = 'none';
        divHist.style.display = 'flex';
    }
    atualizarGraficos(); 
}

async function atualizarGraficos() {
    if (abaAtual === 'composicao') {
        await atualizarGraficoPizza();
    } else {
        await atualizarGraficoHistorico();
    }
}

async function atualizarGraficoPizza() {
    controlarLoadingGrafico('div-grafico-composicao', 'loading');

    try {
        const dados = await buscarTodosOsDados();
        if (!dados || (!dados.matriculas && !dados.prematriculas)) throw new Error("Dados inválidos");

        const origemEl = document.getElementById('filtro-origem');
        const agrupamentoEl = document.getElementById('filtro-agrupamento');
        const origem = origemEl ? origemEl.value : 'todos';
        const agrupamento = agrupamentoEl ? agrupamentoEl.value : 'plano';

        let dadosBase = [];
        if (origem === 'todos') dadosBase = [...dados.matriculas, ...dados.prematriculas];
        else if (origem === 'matriculas') dadosBase = dados.matriculas;
        else dadosBase = dados.prematriculas;

        const contagem = {};
        dadosBase.forEach(item => {
            const valor = item[agrupamento] || 'Não informado';
            contagem[valor] = (contagem[valor] || 0) + 1;
        });

        const canvas = document.getElementById('grafico-unico');
        if (!canvas) return;
        if (instanciaGrafico) instanciaGrafico.destroy();

        instanciaGrafico = new Chart(canvas, {
            type: 'pie',
            data: {
                labels: Object.keys(contagem),
                datasets: [{ data: Object.values(contagem), backgroundColor: ['#ffd60a', '#3b82f6', '#ef4444', '#22c55e', '#a855f7', '#f97316'], borderWidth: 2, borderColor: '#141414' }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: '#ffffff' } } } }
        });

        controlarLoadingGrafico('div-grafico-composicao', 'hide');

    } catch (erro) {
        console.error('Erro Gráfico Pizza:', erro);
        dadosCarregados = false;
        controlarLoadingGrafico('div-grafico-composicao', 'error', 'Não foi possível carregar o gráfico.');
    }
}

async function atualizarGraficoHistorico() {
    controlarLoadingGrafico('div-grafico-historico', 'loading');

    try {
        const dados = await buscarTodosOsDados();
        if (!dados || (!dados.matriculas && !dados.prematriculas)) throw new Error("Dados inválidos");

        const origemEl = document.getElementById('filtro-origem');
        const agrupamentoEl = document.getElementById('filtro-agrupamento');
        const origem = origemEl ? origemEl.value : 'todos';
        const agrupamento = agrupamentoEl ? agrupamentoEl.value : 'plano';

        let dadosBase = [];
        if (origem === 'todos') dadosBase = [...dados.matriculas, ...dados.prematriculas];
        else if (origem === 'matriculas') dadosBase = dados.matriculas;
        else dadosBase = dados.prematriculas;

        const datasUnicas = [...new Set(dadosBase.map(item => new Date(item.created_at).toLocaleDateString('pt-BR')))].sort((a, b) => {
            const [dA, mA, aA] = a.split('/'); const [dB, mB, aB] = b.split('/');
            return new Date(aA, mA - 1, dA) - new Date(aB, mB - 1, dB);
        });

        const categoriasUnicas = [...new Set(dadosBase.map(item => item[agrupamento] || 'Não informado'))];
        const cores = ['#ffd60a', '#3b82f6', '#ef4444', '#22c55e', '#a855f7', '#f97316'];

        const datasets = categoriasUnicas.map((cat, i) => {
            const dataVals = datasUnicas.map(data => dadosBase.filter(item => (item[agrupamento] || 'Não informado') === cat && new Date(item.created_at).toLocaleDateString('pt-BR') === data).length);
            const cor = cores[i % cores.length];
            return { label: cat, data: dataVals, borderColor: cor, backgroundColor: cor + '33', borderWidth: 2, tension: 0.3, fill: false, pointBackgroundColor: cor };
        });

        const canvas = document.getElementById('grafico-historico');
        if (!canvas) return;
        if (instanciaGraficoHistorico) instanciaGraficoHistorico.destroy();

        instanciaGraficoHistorico = new Chart(canvas, {
            type: 'line',
            data: { labels: datasUnicas, datasets: datasets },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#ffffff' } } }, scales: { x: { ticks: { color: '#aaaaaa' }, grid: { color: '#333' } }, y: { beginAtZero: true, ticks: { color: '#aaaaaa', stepSize: 1 }, grid: { color: '#333' } } } }
        });

        controlarLoadingGrafico('div-grafico-historico', 'hide');

    } catch (erro) {
        console.error('Erro Gráfico Histórico:', erro);
        dadosCarregados = false;
        controlarLoadingGrafico('div-grafico-historico', 'error', 'Não foi possível carregar o histórico.');
    }
}

/* ===================== REMOVER REGISTRO ===================== */
async function removerRegistro(id, tipo) {
    if (!confirm('Tem certeza que deseja apagar este registro? Essa ação não pode ser desfeita.')) return;

    try {
        const resposta = await fetch('/api/admin-dados', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, tipo: tipo })
        });
        if (!resposta.ok) throw new Error('Erro ao excluir registro');
        
        dadosCarregados = false; 
        carregarDados(true); 
    } catch (erro) {
        alert(erro.message);
    }
}

/* ===================== GERENCIAR FUNCIONÁRIOS ===================== */
async function carregarUsuarios() {
    try {
        const resposta = await fetch('/api/admin-controle-usuarios');
        const usuarios = await resposta.json();
        const tbody = document.getElementById('tabela-usuarios-body');
        
        if (!tbody) return;
        tbody.innerHTML = '';

        usuarios.forEach(user => {
            let acoes = `<span style="color: #666; font-size: 0.8rem;"><i class="fa-solid fa-lock"></i> Protegido</span>`;
            
            if (user.id !== 1) {
                acoes = `
                    <button onclick="editarFuncionario(${user.id}, '${user.usuario}')" style="background: transparent; border: none; color: #3b82f6; cursor: pointer; padding: 5px; margin-right: 10px;" title="Editar Login/Senha">
                        <i class="fa-solid fa-pen"></i> Editar
                    </button>
                    <button onclick="abrirModalUnidade(${user.id}, '${user.unidade || ''}')" style="background: transparent; border: none; color: #eab308; cursor: pointer; padding: 5px; margin-right: 10px;" title="Mudar Unidade">
                        <i class="fa-solid fa-building"></i> Mudar Unidade
                    </button>
                    <button onclick="deletarUsuario(${user.id})" style="background: transparent; border: none; color: #ef4444; cursor: pointer; padding: 5px;" title="Remover Acesso">
                        <i class="fa-solid fa-trash"></i> Remover
                    </button>
                `;
            }

            tbody.innerHTML += `
                <tr>
                    <td>#${user.id}</td>
                    <td><strong>${user.usuario}</strong></td>
                    <td><span style="background: ${user.cargo === 'dono' ? '#ffd60a' : '#333'}; color: ${user.cargo === 'dono' ? '#000' : '#fff'}; padding: 3px 8px; border-radius: 4px; font-size: 0.8rem;">${user.cargo}</span></td>
                    <td>${user.unidade || '-'}</td>
                    <td>${acoes}</td>
                </tr>
            `;
        });
    } catch (erro) {
        console.error('Erro ao carregar usuários:', erro);
    }
}

async function adicionarFuncionario() {
    const usuario = document.getElementById('novo-user').value.trim();
    const senha = document.getElementById('nova-senha').value.trim();
    const unidade = document.getElementById('nova-unidade').value;

    if (!usuario || !senha || !unidade) {
        return alert('Preencha o usuário, a senha e selecione a unidade para adicionar.');
    }

    try {
        const resposta = await fetch('/api/admin-controle-usuarios', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario, senha, unidade, cargo: 'funcionario' })
        });

        const resultado = await resposta.json();
        if (!resposta.ok) throw new Error(resultado.erro || 'Erro ao adicionar funcionário');

        alert('Funcionário adicionado com sucesso!');
        document.getElementById('novo-user').value = '';
        document.getElementById('nova-senha').value = '';
        document.getElementById('nova-unidade').value = '';
        carregarUsuarios(); 

    } catch (erro) {
        alert(erro.message);
    }
}

async function deletarUsuario(id) {
    if (!confirm('Tem certeza que deseja remover o acesso deste funcionário?')) return;

    try {
        const resposta = await fetch('/api/admin-controle-usuarios', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        const resultado = await resposta.json();
        if (!resposta.ok) throw new Error(resultado.erro || 'Erro ao deletar usuário');
        carregarUsuarios(); 
    } catch (erro) {
        alert(erro.message);
    }
}

async function editarFuncionario(id, usuarioAtual) {
    const novoUsuario = prompt("Edite o nome de login:", usuarioAtual);
    if (novoUsuario === null) return;
    if (novoUsuario.trim() === '') return alert('O login não pode ficar vazio.');

    const novaSenha = prompt("Digite a NOVA senha (ou deixe em branco para não alterar):");
    if (novaSenha === null) return;

    const dadosAtualizar = { id: id, usuario: novoUsuario.trim() };
    if (novaSenha.trim() !== '') dadosAtualizar.senha = novaSenha.trim();

    try {
        const resposta = await fetch('/api/admin-controle-usuarios', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dadosAtualizar)
        });
        const resultado = await resposta.json();
        if (!resposta.ok) throw new Error(resultado.erro || 'Erro ao editar funcionário');
        alert('Dados do funcionário atualizados com sucesso!');
        carregarUsuarios(); 
    } catch (erro) {
        alert(erro.message);
    }
}

function abrirModalUnidade(id, unidadeAtual) {
    funcionarioEditandoUnidadeId = id;
    const select = document.getElementById('select-mudar-unidade');
    select.value = unidadeAtual;
    document.getElementById('modal-mudar-unidade').style.display = 'flex';
}

function fecharModalUnidade() {
    document.getElementById('modal-mudar-unidade').style.display = 'none';
    funcionarioEditandoUnidadeId = null;
}

async function salvarNovaUnidade() {
    if (!funcionarioEditandoUnidadeId) return;
    
    const novaUnidade = document.getElementById('select-mudar-unidade').value;

    try {
        const resposta = await fetch('/api/admin-controle-usuarios', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: funcionarioEditandoUnidadeId, unidade: novaUnidade })
        });

        const resultado = await resposta.json();
        if (!resposta.ok) throw new Error(resultado.erro || 'Erro ao mudar unidade');

        alert('Unidade do funcionário atualizada com sucesso! Ele deve relogar para ver a mudança.');
        fecharModalUnidade();
        carregarUsuarios(); 

    } catch (erro) {
        alert(erro.message);
    }
}

async function carregarOpcoesDeUnidades() {
    try {
        const [resMatricula, resPreMatricula] = await Promise.all([
            fetch('/api/catalogo?tipo=matricula'),
            fetch('/api/catalogo?tipo=pre-matricula')
        ]);

        const dataMatricula = await resMatricula.json();
        const dataPreMatricula = await resPreMatricula.json();

        let unidades = [];

        if (dataMatricula.respostaAPI) {
            unidades = unidades.concat(Object.keys(dataMatricula.respostaAPI));
        }
        if (dataPreMatricula.respostaAPI) {
            unidades = unidades.concat(Object.keys(dataPreMatricula.respostaAPI));
        }

        unidades = [...new Set(unidades)].sort();

        const selectAdd = document.getElementById('nova-unidade');
        if (selectAdd) {
            selectAdd.innerHTML = '<option value="">Selecione a unidade...</option>';
            unidades.forEach(u => {
                selectAdd.innerHTML += `<option value="${u}">${u}</option>`;
            });
        }

        const selectModal = document.getElementById('select-mudar-unidade');
        if (selectModal) {
            selectModal.innerHTML = '<option value="">Todas as Unidades (Acesso Global)</option>';
            unidades.forEach(u => {
                selectModal.innerHTML += `<option value="${u}">${u}</option>`;
            });
        }

    } catch (erro) {
        console.error('Erro ao buscar unidades do Edge Config:', erro);
        alert('Aviso: Não foi possível carregar a lista de unidades.');
    }
}

async function mudarPropriaSenha() {
    const id = sessionStorage.getItem('adminId');
    const usuario = sessionStorage.getItem('adminUsuario');
    if (!id) return alert('Erro ao identificar o usuário. Faça login novamente.');

    const novaSenha = prompt(`Olá, ${usuario}! Digite a sua NOVA senha de acesso:`);
    if (novaSenha === null) return;
    if (novaSenha.trim().length < 4) return alert('A senha precisa ter pelo menos 4 caracteres.');

    try {
        const resposta = await fetch('/api/admin-controle-usuarios', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: Number(id), senha: novaSenha.trim() })
        });
        if (!resposta.ok) throw new Error('Erro ao atualizar a senha.');
        alert('Sua senha foi alterada com sucesso!');
    } catch (erro) {
        alert(erro.message);
    }
}

/* ===================== INICIALIZAÇÃO ===================== */
document.addEventListener('DOMContentLoaded', () => {
    carregarDados(true);
    iniciarAtualizacaoAutomatica();

    if (document.getElementById('tabela-usuarios-body')) {
        carregarUsuarios();
        carregarOpcoesDeUnidades(); 
    }

    const nomeUsuarioEl = document.getElementById('nome-usuario-logado');
    if (nomeUsuarioEl) {
        const nomeLogado = sessionStorage.getItem('adminUsuario');
        if (nomeLogado) {
            const nomeFormatado = nomeLogado.charAt(0).toUpperCase() + nomeLogado.slice(1);
            nomeUsuarioEl.textContent = nomeFormatado;
        } else {
            nomeUsuarioEl.textContent = 'Usuário';
        }
    }

    const textoUnidadeEl = document.getElementById('texto-unidade-badge');
    if (textoUnidadeEl) {
        let unidadeSalva = sessionStorage.getItem('adminUnidade');
        if (!unidadeSalva || unidadeSalva.trim() === '') {
            unidadeSalva = 'Acesso Global';
        }
        textoUnidadeEl.textContent = unidadeSalva;
    }
});