// script/admin-dashboard.js

// Verifica se a pessoa tem permissão para ver a página (redundância de segurança)
const cargo = sessionStorage.getItem('adminCargo');
if (!cargo) {
    window.location.href = 'admin.html';
}

// Variáveis globais para o Gráfico Único com Filtros
let instanciaGrafico = null;
let dadosGlobais = { matriculas: [], prematriculas: [] };

async function carregarDados() {
    const btnAtualizar = document.getElementById('btn-atualizar');
    if (btnAtualizar) btnAtualizar.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Buscando...';

    try {
        const resposta = await fetch('/api/admin-dados');
        const dados = await resposta.json();

        if (!resposta.ok) throw new Error('Erro ao buscar');

        // FILTRO POR UNIDADE AQUI
        if (cargo === 'funcionario') {
            const minhaUnidade = sessionStorage.getItem('adminUnidade');
            
            // Se o funcionário TIVER uma unidade, filtramos os dados.
            if (minhaUnidade && minhaUnidade.trim() !== '') {
                dados.matriculas = dados.matriculas.filter(item => item.unidade === minhaUnidade);
                dados.prematriculas = dados.prematriculas.filter(item => item.unidade === minhaUnidade);
            }
            // Se NÃO tiver unidade (vazio), o código não faz nada, 
            // ou seja, ele mantém a lista completa e vê todos os alunos.
        }

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
                
                const colunaAcao = cargo === 'dono' 
                    ? `<td><button onclick="removerRegistro(${item.id}, 'matricula')" style="background: transparent; border: none; color: #ef4444; cursor: pointer;" title="Excluir"><i class="fa-solid fa-trash"></i></button></td>` 
                    : '';

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
                
                const colunaAcao = cargo === 'dono' 
                    ? `<td><button onclick="removerRegistro(${item.id}, 'prematricula')" style="background: transparent; border: none; color: #ef4444; cursor: pointer;" title="Excluir"><i class="fa-solid fa-trash"></i></button></td>` 
                    : '';

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

        //SALVA OS DADOS NA MEMÓRIA GLOBAL PARA O GRÁFICO
        dadosGlobais.matriculas = dados.matriculas;
        dadosGlobais.prematriculas = dados.prematriculas;

        // Desenha o gráfico apenas se for o dono e se o canvas existir na tela
        if (cargo === 'dono' && document.getElementById('grafico-unico')) {
            atualizarGraficoFiltrado();
        }

    } catch (erro) {
        console.error('Erro:', erro);
        alert('Erro ao carregar os dados do banco.');
    } finally {
        if (btnAtualizar) btnAtualizar.innerHTML = '<i class="fa-solid fa-rotate-right"></i> Atualizar Dados';
    }
}

/* ===================== GRÁFICO ÚNICO COM FILTROS ===================== */

function atualizarGraficoFiltrado() {
    // Pega os valores dos filtros (se não existirem na tela, assume o padrão)
    const origemEl = document.getElementById('filtro-origem');
    const agrupamentoEl = document.getElementById('filtro-agrupamento');
    
    const origem = origemEl ? origemEl.value : 'todos';
    const agrupamento = agrupamentoEl ? agrupamentoEl.value : 'plano';

    // 1. Junta os dados baseados na origem selecionada
    let dadosBase = [];
    if (origem === 'todos') {
        dadosBase = [...dadosGlobais.matriculas, ...dadosGlobais.prematriculas];
    } else if (origem === 'matriculas') {
        dadosBase = dadosGlobais.matriculas;
    } else {
        dadosBase = dadosGlobais.prematriculas;
    }

    // 2. Conta as ocorrências baseadas no agrupamento selecionado
    const contagem = {};
    dadosBase.forEach(item => {
        const valor = item[agrupamento] || 'Não informado';
        contagem[valor] = (contagem[valor] || 0) + 1;
    });

    const labels = Object.keys(contagem);
    const data = Object.values(contagem);

    // 3. Desenha ou atualiza o gráfico
    const canvas = document.getElementById('grafico-unico');
    if (!canvas) return;

    const cores = ['#ffd60a', '#3b82f6', '#ef4444', '#22c55e', '#a855f7', '#f97316'];

    if (instanciaGrafico) {
        // Se o gráfico já existe, apenas atualiza os dados
        instanciaGrafico.data.labels = labels;
        instanciaGrafico.data.datasets[0].data = data;
        instanciaGrafico.update();
    } else {
        // Se não existe, cria o gráfico do zero
        instanciaGrafico = new Chart(canvas, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: cores,
                    borderWidth: 2,
                    borderColor: '#141414'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { 
                        position: 'right',
                        labels: { color: '#ffffff', font: { size: 13, family: 'Arial' } } 
                    }
                }
            }
        });
    }
}

/* ===================== REMOVER REGISTRO INDIVIDUAL ===================== */

async function removerRegistro(id, tipo) {
    if (!confirm('Tem certeza que deseja apagar este registro? Essa ação não pode ser desfeita.')) {
        return;
    }

    try {
        const resposta = await fetch('/api/admin-dados', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, tipo })
        });

        if (!resposta.ok) throw new Error('Erro ao excluir registro');

        carregarDados(); // Recarrega a tabela para o registro sumir da tela

    } catch (erro) {
        alert(erro.message);
    }
}

/* ===================== GERENCIAR FUNCIONÁRIOS ===================== */

// FUNÇÃO 1: Buscar e Listar
async function carregarUsuarios() {
    try {
        const resposta = await fetch('/api/admin-controle-usuarios');
        const usuarios = await resposta.json();
        const tbody = document.getElementById('tabela-usuarios-body');
        
        if (!tbody) return;
        tbody.innerHTML = '';

        usuarios.forEach(user => {
            // O dono principal (id 1) não pode ser excluído ou editado pela interface de funcionários
            let acoes = `<span style="color: #666; font-size: 0.8rem;"><i class="fa-solid fa-lock"></i> Protegido</span>`;
            
            if (user.id !== 1) {
                acoes = `
                    <button onclick="editarFuncionario(${user.id}, '${user.usuario}')" style="background: transparent; border: none; color: #3b82f6; cursor: pointer; padding: 5px; margin-right: 10px;" title="Editar Login/Senha">
                        <i class="fa-solid fa-pen"></i> Editar
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

// FUNÇÃO 2: Adicionar Funcionário
async function adicionarFuncionario() {
    const usuario = document.getElementById('novo-user').value.trim();
    const senha = document.getElementById('nova-senha').value.trim();
    const unidade = document.getElementById('nova-unidade').value.trim();

    if (!usuario || !senha || !unidade) {
        return alert('Preencha o usuário, a senha e a unidade para adicionar.');
    }

    try {
        const resposta = await fetch('/api/admin-controle-usuarios', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario, senha, unidade, cargo: 'funcionario' }) //
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

// FUNÇÃO 3: Remover Funcionário
async function deletarUsuario(id) {
    if (!confirm('Tem certeza que deseja remover o acesso deste funcionário? Ele não conseguirá mais fazer login.')) {
        return;
    }

    try {
        const resposta = await fetch('/api/admin-controle-usuarios', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });

        const resultado = await resposta.json();

        if (!resposta.ok) throw new Error(resultado.erro || 'Erro ao deletar usuário');

        // Atualiza a tabela na tela
        carregarUsuarios(); 

    } catch (erro) {
        alert(erro.message);
    }
}

/* ===================== FUNÇÕES DE SENHA ===================== */

// 1. Função para o Dono editar um Funcionário
async function editarFuncionario(id, usuarioAtual) {
    const novoUsuario = prompt("Edite o nome de login:", usuarioAtual);
    if (novoUsuario === null) return; // Cancelou
    if (novoUsuario.trim() === '') return alert('O login não pode ficar vazio.');

    const novaSenha = prompt("Digite a NOVA senha (ou deixe em branco para não alterar):");
    if (novaSenha === null) return; // Cancelou

    const dadosAtualizar = { id: id, usuario: novoUsuario.trim() };
    if (novaSenha.trim() !== '') {
        dadosAtualizar.senha = novaSenha.trim();
    }

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

// 2. Função para o usuário logado mudar a própria senha
async function mudarPropriaSenha() {
    const id = sessionStorage.getItem('adminId');
    const usuario = sessionStorage.getItem('adminUsuario');

    if (!id) return alert('Erro ao identificar o usuário. Faça login novamente.');

    const novaSenha = prompt(`Olá, ${usuario}! Digite a sua NOVA senha de acesso:`);
    
    if (novaSenha === null) return; // Cancelou
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
    // Verifica se há dados para exportar
    if (dadosGlobais.matriculas.length === 0 && dadosGlobais.prematriculas.length === 0) {
        return alert('Não há dados cadastrados para exportar no momento.');
    }

    // 1. Junta os dois arrays (Matrículas + Pré-Matrículas)
    const todosOsDados = [...dadosGlobais.matriculas, ...dadosGlobais.prematriculas];

    // 2. Formata os dados: Adiciona o campo "Tipo" e ordena pela data de criação
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
        // Ordena da data mais recente para a mais antiga
        const [diaA, mesA, anoA] = a.Data.split('/');
        const [diaB, mesB, anoB] = b.Data.split('/');
        return new Date(anoB, mesB - 1, diaB) - new Date(anoA, mesA - 1, diaA);
    });

    // 3. Cria um novo arquivo de planilha (Workbook)
    const wb = XLSX.utils.book_new();

    // 4. Converte os dados formatados em uma única planilha
    const ws = XLSX.utils.json_to_sheet(dadosFormatados);

    // 5. Adiciona a planilha ao arquivo
    XLSX.utils.book_append_sheet(wb, ws, "Todos os Registros");

    // 6. Gera o nome do arquivo com Data e Hora atual
    const agora = new Date();
    
    // Formata Data para DD-MM-YYYY
    const dia = String(agora.getDate()).padStart(2, '0');
    const mes = String(agora.getMonth() + 1).padStart(2, '0');
    const ano = agora.getFullYear();
    
    // Formata Hora para HH-MM
    const hora = String(agora.getHours()).padStart(2, '0');
    const minuto = String(agora.getMinutes()).padStart(2, '0');

    // Junta tudo: DadosMuskelfit-25-10-2024-14-30.xlsx
    const nomeArquivo = `DadosMuskelfit-${dia}-${mes}-${ano}-${hora}-${minuto}.xlsx`;

    // 7. Baixa o arquivo
    XLSX.writeFile(wb, nomeArquivo);
}

/* ===================== INICIALIZAÇÃO ===================== */

// Carrega os dados e usuários assim que a página abre
document.addEventListener('DOMContentLoaded', () => {
    carregarDados();
    
    if (document.getElementById('tabela-usuarios-body')) {
        carregarUsuarios();
    }
});