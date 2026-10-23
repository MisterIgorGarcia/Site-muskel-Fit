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
let funcionarioEditandoUnidadeId = null; // Variável global para o Modal

// ===================== CARREGAR DADOS =====================
// O parâmetro 'manual' indica se o usuário clicou no botão (true) ou se é atualização automática (false)
async function carregarDados(manual = false) {
    // Evita atualizações simultâneas (ex: clicar no botão enquanto o automático roda)
    if (carregando) return;
    carregando = true;

    const btnAtualizar = document.getElementById('btn-atualizar');
    // Só mostra o loading no botão se a atualização foi manual
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

        // --- TABELA DE MATRÍCULAS ---
        const tbodyMat = document.getElementById('tabela-matriculas-body');
        tbodyMat.innerHTML = '';
        
        if (dados.matriculas.length === 0) {
            const colunas = cargo === 'dono' ? 8 : 7; 
            tbodyMat.innerHTML = `<tr><td colspan="${colunas}" style="text-align:center;">Nenhuma matrícula registrada.</td></tr>`;
        } else {
            dados.matriculas.forEach(item => {
                const data = new Date(item.created_at).toLocaleDateString('pt-BR');
                const valor = Number(item.preco) || 0;
                valorTotal += valor;

                const colunaValor = cargo === 'dono' ? `<td class="destaque-valor">R$ ${valor.toFixed(2).replace('.', ',')}</td>` : '';
                const colunaAcao = cargo === 'dono' ? `<td><button onclick="removerRegistro(${item.id}, 'matricula')" style="background: transparent; border: none; color: #ef4444; cursor: pointer;" title="Excluir"><i class="fa-solid fa-trash"></i></button></td>` : '';

                tbodyMat.innerHTML += `
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

        // --- TABELA DE PRÉ-MATRÍCULAS ---
        const tbodyPre = document.getElementById('tabela-prematriculas-body');
        tbodyPre.innerHTML = '';

        if (dados.prematriculas.length === 0) {
            const colunas = cargo === 'dono' ? 8 : 7; 
            tbodyPre.innerHTML = `<tr><td colspan="${colunas}" style="text-align:center;">Nenhuma pré-matrícula registrada.</td></tr>`;
        } else {
            dados.prematriculas.forEach(item => {
                const data = new Date(item.created_at).toLocaleDateString('pt-BR');
                const valor = Number(item.preco) || 0;
                valorTotal += valor;

                const colunaValor = cargo === 'dono' ? `<td class="destaque-valor">R$ ${valor.toFixed(2).replace('.', ',')}</td>` : '';
                const colunaAcao = cargo === 'dono' ? `<td><button onclick="removerRegistro(${item.id}, 'prematricula')" style="background: transparent; border: none; color: #ef4444; cursor: pointer;" title="Excluir"><i class="fa-solid fa-trash"></i></button></td>` : '';

                tbodyPre.innerHTML += `
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

        // --- ATUALIZAR CARDS ---
        document.getElementById('total-registros').innerText = dados.matriculas.length + dados.prematriculas.length;
        const cardArrecadado = document.getElementById('total-arrecadado');
        if (cardArrecadado) {
            cardArrecadado.innerText = `R$ ${valorTotal.toFixed(2).replace('.', ',')}`;
        }

        dadosGlobais.matriculas = dados.matriculas;
        dadosGlobais.prematriculas = dados.prematriculas;

        if (cargo === 'dono' && document.getElementById('grafico-unico')) {
            atualizarGraficos();
        }

    } catch (erro) {
        console.error('Erro:', erro);
        // Só mostra alerta se o usuário clicou no botão manualmente, para não encher a tela de alertas de background
        if (manual) alert('Erro ao carregar os dados do banco.');
    } finally {
        carregando = false;
        if (btnAtualizar && manual) {
            btnAtualizar.innerHTML = '<i class="fa-solid fa-rotate-right"></i> Atualizar Dados';
        }
    }
}

// ===================== ATUALIZAÇÃO AUTOMÁTICA =====================
function iniciarAtualizacaoAutomatica() {
    // Limpa qualquer intervalo anterior para evitar duplicidade
    if (intervaloAtualizacao) clearInterval(intervaloAtualizacao);

    // Atualiza a cada ms (Mili-segundos)
    intervaloAtualizacao = setInterval(() => {
        // Só atualiza se a aba do navegador estiver visível (evita gastar recursos à toa)
        if (document.visibilityState === 'visible') {
            carregarDados(false); // Passa false para não mexer no botão
        }
    }, 10000); 
}

/* ===================== GRÁFICO ÚNICO COM FILTROS ===================== */
// 1. Função para controlar qual aba está visível
function mudarAba(aba) {
    abaAtual = aba;
    const btnComp = document.getElementById('btn-aba-composicao');
    const btnHist = document.getElementById('btn-aba-historico');
    const divComp = document.getElementById('div-grafico-composicao');
    const divHist = document.getElementById('div-grafico-historico');
    const filtroAgrupamento = document.getElementById('filtro-agrupamento');

    if (aba === 'composicao') {
        btnComp.classList.add('ativa');
        btnHist.classList.remove('ativa');
        divComp.style.display = 'flex';
        divHist.style.display = 'none';
        filtroAgrupamento.style.display = 'block'; // Mostra o filtro de agrupamento
    } else {
        btnHist.classList.add('ativa');
        btnComp.classList.remove('ativa');
        divComp.style.display = 'none';
        divHist.style.display = 'flex';
        filtroAgrupamento.style.display = 'none'; // Esconde o filtro de agrupamento (não faz sentido no histórico)
    }
    atualizarGraficos(); // Chama a atualização
}

// 2. Função central que decide qual gráfico desenhar
function atualizarGraficos() {
    if (abaAtual === 'composicao') {
        atualizarGraficoPizza();
    } else {
        atualizarGraficoHistorico();
    }
}

// 3. O Gráfico de Pizza (Antigo atualizarGraficoFiltrado)
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

    // Destroi o gráfico antigo para evitar bugs visuais
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

// 4. O Novo Gráfico de Histórico (Eixo X = Datas, Y = Qtd)
function atualizarGraficoHistorico() {
    const origemEl = document.getElementById('filtro-origem');
    const origem = origemEl ? origemEl.value : 'todos';

    let dadosBase = [];
    if (origem === 'todos') {
        dadosBase = [...dadosGlobais.matriculas, ...dadosGlobais.prematriculas];
    } else if (origem === 'matriculas') {
        dadosBase = dadosGlobais.matriculas;
    } else {
        dadosBase = dadosGlobais.prematriculas;
    }

    // Contagem de registros por data
    const contagemPorData = {};
    dadosBase.forEach(item => {
        const data = new Date(item.created_at);
        const dataFormatada = data.toLocaleDateString('pt-BR'); // Formato DD/MM/YYYY
        
        if (!contagemPorData[dataFormatada]) {
            contagemPorData[dataFormatada] = 0;
        }
        contagemPorData[dataFormatada]++;
    });

    // Ordena as datas cronologicamente
    const labels = Object.keys(contagemPorData).sort((a, b) => {
        const [diaA, mesA, anoA] = a.split('/');
        const [diaB, mesB, anoB] = b.split('/');
        return new Date(anoA, mesA - 1, diaA) - new Date(anoB, mesB - 1, diaB);
    });
    
    const dataValues = labels.map(label => contagemPorData[label]);

    const canvas = document.getElementById('grafico-historico');
    if (!canvas) return;

    // Destroi o gráfico antigo
    if (instanciaGraficoHistorico) instanciaGraficoHistorico.destroy();

    instanciaGraficoHistorico = new Chart(canvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Registros por Dia',
                data: dataValues,
                borderColor: '#ffd60a',
                backgroundColor: 'rgba(255, 214, 10, 0.2)',
                borderWidth: 2,
                tension: 0.3, // Deixa a linha curvada
                fill: true,
                pointBackgroundColor: '#ffd60a',
                pointBorderColor: '#0d0d0d',
                pointRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: '#ffffff', font: { size: 13, family: 'Arial' } } }
            },
            scales: {
                x: {
                    ticks: { color: '#aaaaaa' },
                    grid: { color: '#333' }
                },
                y: {
                    beginAtZero: true,
                    ticks: { color: '#aaaaaa', stepSize: 1 }, // Contagem inteira (1, 2, 3...)
                    grid: { color: '#333' }
                }
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
        carregarDados(true); // Passa true para forçar a atualização da tela
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

// Adicionar Funcionário
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

// Remover Funcionário
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

/* ===================== FUNÇÕES DE SENHA E UNIDADE ===================== */
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

// --- LÓGICA DO MODAL DE MUDAR UNIDADE ---
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

// Buscar unidades disponíveis no Edge Config
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

// Mudar a própria senha
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
    // Carga inicial (manual = true para mostrar o loading no botão)
    carregarDados(true);
    
    // Inicia o timer de atualização automática (30s)
    iniciarAtualizacaoAutomatica();

    if (document.getElementById('tabela-usuarios-body')) {
        carregarUsuarios();
        carregarOpcoesDeUnidades(); 
    }

    // Preencher o nome do usuário logado
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

    // Preencher a Badge da Unidade
    const textoUnidadeEl = document.getElementById('texto-unidade-badge');
    if (textoUnidadeEl) {
        let unidadeSalva = sessionStorage.getItem('adminUnidade');
        
        if (!unidadeSalva || unidadeSalva.trim() === '') {
            unidadeSalva = 'Acesso Global';
        }
        
        textoUnidadeEl.textContent = unidadeSalva;
    }
});