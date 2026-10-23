// script/admin-dashboard.js

// Verifica se a pessoa tem permissão para ver a página
const cargo = sessionStorage.getItem('adminCargo');
if (!cargo) {
    window.location.href = 'admin.html';
}

let abaAtual = 'composicao';
let instanciaGraficoHistorico = null;
let intervaloAtualizacao = null;
let carregando = false;
let instanciaGrafico = null;
let dadosGlobais = { matriculas: [], prematriculas: [] };
let funcionarioEditandoUnidadeId = null;

// Variável global para controlar a paginação
let paginacao = {
    matriculas: { pagina: 1, itensPorPagina: 10 },
    prematriculas: { pagina: 1, itensPorPagina: 10 }
};

// ===================== CARREGAR DADOS =====================
async function carregarDados(manual = false) {
    if (carregando) return;
    carregando = true;

    const btnAtualizar = document.getElementById('btn-atualizar');
    if (btnAtualizar && manual) {
        btnAtualizar.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Buscando...';
    }

    try {
        const minhaUnidade = sessionStorage.getItem('adminUnidade');
        let url = '/api/admin-dados';
        
        if (cargo === 'funcionario' && minhaUnidade && minhaUnidade.trim() !== '') {
            url += `?unidade=${encodeURIComponent(minhaUnidade)}`;
        }

        const resposta = await fetch(url);
        const dados = await resposta.json();

        if (!resposta.ok) throw new Error('Erro ao buscar');

        let valorTotal = 0;

        // --- CALCULAR VALOR TOTAL E GUARDAR DADOS ---
        dados.matriculas.forEach(item => { valorTotal += (Number(item.preco) || 0); });
        dados.prematriculas.forEach(item => { valorTotal += (Number(item.preco) || 0); });

        dadosGlobais.matriculas = dados.matriculas;
        dadosGlobais.prematriculas = dados.prematriculas;

        // --- ATUALIZAR CARDS ---
        document.getElementById('total-registros').innerText = dados.matriculas.length + dados.prematriculas.length;
        const cardArrecadado = document.getElementById('total-arrecadado');
        if (cardArrecadado) {
            cardArrecadado.innerText = `R$ ${valorTotal.toFixed(2).replace('.', ',')}`;
        }

        // --- RENDERIZAR AS TABELAS COM PAGINAÇÃO ---
        renderizarTabelaMatriculas();
        renderizarTabelaPrematriculas();

        // --- ATUALIZAR GRÁFICOS ---
        if (cargo === 'dono' && document.getElementById('grafico-unico')) {
            atualizarGraficos();
        }

    } catch (erro) {
        console.error('Erro:', erro);
        if (manual) alert('Erro ao carregar os dados do banco.');
    } finally {
        carregando = false;
        if (btnAtualizar && manual) {
            btnAtualizar.innerHTML = '<i class="fa-solid fa-rotate-right"></i> Atualizar Dados';
        }
    }
}

/* ===================== FUNÇÕES DE RENDERIZAÇÃO DAS TABELAS ===================== */
function renderizarTabelaMatriculas() {
    const tbody = document.getElementById('tabela-matriculas-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    const dados = dadosGlobais.matriculas;
    const { pagina, itensPorPagina } = paginacao.matriculas;
    const totalPaginas = Math.ceil(dados.length / itensPorPagina) || 1;

    if (pagina > totalPaginas) paginacao.matriculas.pagina = totalPaginas;

    const inicio = (paginacao.matriculas.pagina - 1) * itensPorPagina;
    const fim = inicio + itensPorPagina;
    const dadosPaginados = dados.slice(inicio, fim);

    if (dados.length === 0) {
        const colunas = cargo === 'dono' ? 8 : 7; 
        tbody.innerHTML = `<tr><td colspan="${colunas}" style="text-align:center;">Nenhuma matrícula registrada.</td></tr>`;
    } else {
        dadosPaginados.forEach(item => {
            const data = new Date(item.created_at).toLocaleDateString('pt-BR');
            const valor = Number(item.preco) || 0;

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
                    ${colunaValor}
                    ${colunaAcao}
                </tr>
            `;
        });
    }
    renderizarBotoesPaginacao('matriculas', totalPaginas);
}

function renderizarTabelaPrematriculas() {
    const tbody = document.getElementById('tabela-prematriculas-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    const dados = dadosGlobais.prematriculas;
    const { pagina, itensPorPagina } = paginacao.prematriculas;
    const totalPaginas = Math.ceil(dados.length / itensPorPagina) || 1;

    if (pagina > totalPaginas) paginacao.prematriculas.pagina = totalPaginas;

    const inicio = (paginacao.prematriculas.pagina - 1) * itensPorPagina;
    const fim = inicio + itensPorPagina;
    const dadosPaginados = dados.slice(inicio, fim);

    if (dados.length === 0) {
        const colunas = cargo === 'dono' ? 8 : 7; 
        tbody.innerHTML = `<tr><td colspan="${colunas}" style="text-align:center;">Nenhuma pré-matrícula registrada.</td></tr>`;
    } else {
        dadosPaginados.forEach(item => {
            const data = new Date(item.created_at).toLocaleDateString('pt-BR');
            const valor = Number(item.preco) || 0;

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
                    ${colunaAcao}
                </tr>
            `;
        });
    }
    renderizarBotoesPaginacao('prematriculas', totalPaginas);
}

/* ===================== CONTROLE DOS BOTÕES DE PAGINAÇÃO ===================== */
function renderizarBotoesPaginacao(tipo, totalPaginas) {
    const container = document.getElementById(`paginacao-${tipo}`);
    if (!container) return;

    container.innerHTML = '';
    if (totalPaginas <= 1) return;

    const paginaAtual = paginacao[tipo].pagina;

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
    if (tipo === 'matriculas') {
        renderizarTabelaMatriculas();
    } else {
        renderizarTabelaPrematriculas();
    }
}

// ===================== ATUALIZAÇÃO AUTOMÁTICA =====================
function iniciarAtualizacaoAutomatica() {
    if (intervaloAtualizacao) clearInterval(intervaloAtualizacao);
    intervaloAtualizacao = setInterval(() => {
        if (document.visibilityState === 'visible') {
            carregarDados(false); 
        }
    }, 10000); 
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

function atualizarGraficos() {
    if (abaAtual === 'composicao') {
        atualizarGraficoPizza();
    } else {
        atualizarGraficoHistorico();
    }
}

function atualizarGraficoPizza() {
    const origemEl = document.getElementById('filtro-origem');
    const agrupamentoEl = document.getElementById('filtro-agrupamento');
    const origem = origemEl ? origemEl.value : 'todos';
    const agrupamento = agrupamentoEl ? agrupamentoEl.value : 'plano';

    let dadosBase = [];
    if (origem === 'todos') {
        dadosBase = [...dadosGlobais.matriculas, ...dadosGlobais.prematriculas];
    } else if (origem === 'matriculas') {
        dadosBase = dadosGlobais.matriculas;
    } else {
        dadosBase = dadosGlobais.prematriculas;
    }

    const contagem = {};
    dadosBase.forEach(item => {
        const valor = item[agrupamento] || 'Não informado';
        contagem[valor] = (contagem[valor] || 0) + 1;
    });

    const labels = Object.keys(contagem);
    const data = Object.values(contagem);
    const canvas = document.getElementById('grafico-unico');
    if (!canvas) return;

    if (instanciaGrafico) instanciaGrafico.destroy();

    const cores = ['#ffd60a', '#3b82f6', '#ef4444', '#22c55e', '#a855f7', '#f97316'];

    instanciaGrafico = new Chart(canvas, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{ data: data, backgroundColor: cores, borderWidth: 2, borderColor: '#141414' }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right', labels: { color: '#ffffff', font: { size: 13, family: 'Arial' } } }
            }
        }
    });
}

function atualizarGraficoHistorico() {
    const origemEl = document.getElementById('filtro-origem');
    const agrupamentoEl = document.getElementById('filtro-agrupamento');
    const origem = origemEl ? origemEl.value : 'todos';
    const agrupamento = agrupamentoEl ? agrupamentoEl.value : 'plano';

    let dadosBase = [];
    if (origem === 'todos') {
        dadosBase = [...dadosGlobais.matriculas, ...dadosGlobais.prematriculas];
    } else if (origem === 'matriculas') {
        dadosBase = dadosGlobais.matriculas;
    } else {
        dadosBase = dadosGlobais.prematriculas;
    }

    const datasUnicas = [...new Set(dadosBase.map(item => new Date(item.created_at).toLocaleDateString('pt-BR')))].sort((a, b) => {
        const [diaA, mesA, anoA] = a.split('/');
        const [diaB, mesB, anoB] = b.split('/');
        return new Date(anoA, mesA - 1, diaA) - new Date(anoB, mesB - 1, diaB);
    });

    const categoriasUnicas = [...new Set(dadosBase.map(item => item[agrupamento] || 'Não informado'))];
    const cores = ['#ffd60a', '#3b82f6', '#ef4444', '#22c55e', '#a855f7', '#f97316', '#06b6d4', '#ec4899'];

    const datasets = categoriasUnicas.map((categoria, index) => {
        const dataValues = datasUnicas.map(data => {
            return dadosBase.filter(item => 
                (item[agrupamento] || 'Não informado') === categoria && 
                new Date(item.created_at).toLocaleDateString('pt-BR') === data
            ).length;
        });

        const cor = cores[index % cores.length];

        return {
            label: categoria,
            data: dataValues,
            borderColor: cor,
            backgroundColor: cor + '33',
            borderWidth: 2,
            tension: 0.3,
            fill: false,
            pointBackgroundColor: cor,
            pointBorderColor: '#0d0d0d',
            pointRadius: 4
        };
    });

    const canvas = document.getElementById('grafico-historico');
    if (!canvas) return;

    if (instanciaGraficoHistorico) instanciaGraficoHistorico.destroy();

    instanciaGraficoHistorico = new Chart(canvas, {
        type: 'line',
        data: {
            labels: datasUnicas,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: '#ffffff', font: { size: 13, family: 'Arial' } } }
            },
            scales: {
                x: { ticks: { color: '#aaaaaa' }, grid: { color: '#333' } },
                y: { beginAtZero: true, ticks: { color: '#aaaaaa', stepSize: 1 }, grid: { color: '#333' } }
            }
        }
    });
}

/* ===================== REMOVER REGISTRO ===================== */
async function removerRegistro(id, tipo) {
    if (!confirm('Tem certeza que deseja apagar este registro? Essa ação não pode ser desfeita.')) return;

    try {
        const resposta = await fetch('/api/admin-dados', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, tipo })
        });
        if (!resposta.ok) throw new Error('Erro ao excluir registro');
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

/* ===================== EXPORTAR PARA EXCEL ===================== */
function exportarExcel() {
    if (dadosGlobais.matriculas.length === 0 && dadosGlobais.prematriculas.length === 0) {
        return alert('Não há dados cadastrados para exportar no momento.');
    }

    const todosOsDados = [...dadosGlobais.matriculas, ...dadosGlobais.prematriculas];
    const dadosFormatados = todosOsDados.map(item => {
        return {
            Data: new Date(item.created_at).toLocaleDateString('pt-BR'),
            Tipo: item.tipo === 'pre-matricula' ? 'Pré-Matrícula' : 'Matrícula',
            Nome: item.nome,
            Celular: item.celular,
            Unidade: item.unidade,
            Modalidade: item.modalidade,
            Plano: item.plano,
            Valor: item.preco,
            Pagamento: item.pagamento
        };
    }).sort((a, b) => {
        const [diaA, mesA, anoA] = a.Data.split('/');
        const [diaB, mesB, anoB] = b.Data.split('/');
        return new Date(anoB, mesB - 1, diaB) - new Date(anoA, mesA - 1, diaA);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(dadosFormatados);
    XLSX.utils.book_append_sheet(wb, ws, "Todos os Registros");

    const agora = new Date();
    const dia = String(agora.getDate()).padStart(2, '0');
    const mes = String(agora.getMonth() + 1).padStart(2, '0');
    const ano = agora.getFullYear();
    const hora = String(agora.getHours()).padStart(2, '0');
    const minuto = String(agora.getMinutes()).padStart(2, '0');

    const nomeArquivo = `DadosMuskelfit-${dia}-${mes}-${ano}-${hora}-${minuto}.xlsx`;
    XLSX.writeFile(wb, nomeArquivo);
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