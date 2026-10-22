// script/admin-dashboard.js

// Verifica se a pessoa tem permissão para ver a página (redundância de segurança)
const cargo = sessionStorage.getItem('adminCargo');
if (!cargo) {
    window.location.href = 'admin.html';
}

async function carregarDados() {
    const btnAtualizar = document.getElementById('btn-atualizar');
    if (btnAtualizar) btnAtualizar.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Buscando...';

    try {
        const resposta = await fetch('/api/admin-dados');
        const dados = await resposta.json();

        if (!resposta.ok) throw new Error('Erro ao buscar');

        let valorTotal = 0;

                // --- TABELA DE MATRÍCULAS ---
        const tbodyMat = document.getElementById('tabela-matriculas-body');
        tbodyMat.innerHTML = '';
        
        if (dados.matriculas.length === 0) {
            const colunas = cargo === 'dono' ? 7 : 6; // Mudou de 6:5 para 7:6
            tbodyMat.innerHTML = `<tr><td colspan="${colunas}" style="text-align:center;">Nenhuma matrícula registrada.</td></tr>`;
        } else {
            dados.matriculas.forEach(item => {
                const data = new Date(item.created_at).toLocaleDateString('pt-BR');
                const valor = Number(item.preco) || 0;
                valorTotal += valor;

                // Se for dono, mostra a coluna de valor. Se for funcionário, esconde.
                const colunaValor = cargo === 'dono' ? `<td class="destaque-valor">R$ ${valor.toFixed(2).replace('.', ',')}</td>` : '';
                
                // NOVO: Botão de excluir (só aparece para o dono)
                const colunaAcao = cargo === 'dono' 
                    ? `<td><button onclick="removerRegistro(${item.id}, 'matricula')" style="background: transparent; border: none; color: #ef4444; cursor: pointer;" title="Excluir"><i class="fa-solid fa-trash"></i></button></td>` 
                    : '';

                tbodyMat.innerHTML += `
                    <tr>
                        <td>${data}</td>
                        <td><strong>${item.nome}</strong></td>
                        <td>${item.celular}</td>
                        <td>${item.unidade}</td>
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
            const colunas = cargo === 'dono' ? 7 : 6; // Mudou de 6:5 para 7:6
            tbodyPre.innerHTML = `<tr><td colspan="${colunas}" style="text-align:center;">Nenhuma pré-matrícula registrada.</td></tr>`;
        } else {
            dados.prematriculas.forEach(item => {
                const data = new Date(item.created_at).toLocaleDateString('pt-BR');
                const valor = Number(item.preco) || 0;
                valorTotal += valor;

                const colunaValor = cargo === 'dono' ? `<td class="destaque-valor">R$ ${valor.toFixed(2).replace('.', ',')}</td>` : '';
                
                // NOVO: Botão de excluir (só aparece para o dono)
                const colunaAcao = cargo === 'dono' 
                    ? `<td><button onclick="removerRegistro(${item.id}, 'prematricula')" style="background: transparent; border: none; color: #ef4444; cursor: pointer;" title="Excluir"><i class="fa-solid fa-trash"></i></button></td>` 
                    : '';

                tbodyPre.innerHTML += `
                    <tr>
                        <td>${data}</td>
                        <td><strong>${item.nome}</strong></td>
                        <td>${item.celular}</td>
                        <td>${item.unidade}</td>
                        <td>${item.plano}</td>
                        ${colunaValor}
                        ${colunaAcao}
                    </tr>
                `;
            });
        }

        // --- ATUALIZAR CARDS ---
        document.getElementById('total-registros').innerText = dados.matriculas.length + dados.prematriculas.length;
        
        // O valor total só existe na tela do dono
        const cardArrecadado = document.getElementById('total-arrecadado');
        if (cardArrecadado) {
            cardArrecadado.innerText = `R$ ${valorTotal.toFixed(2).replace('.', ',')}`;
        }

    } catch (erro) {
        console.error('Erro:', erro);
        alert('Erro ao carregar os dados do banco.');
    } finally {
        if (btnAtualizar) btnAtualizar.innerHTML = '<i class="fa-solid fa-rotate-right"></i> Atualizar Dados';
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

// Assim que a página carregar, busca a lista de funcionários (apenas se os elementos existirem na tela)
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('tabela-usuarios-body')) {
        carregarUsuarios();
    }
});

// FUNÇÃO 1: Buscar e Listar
async function carregarUsuarios() {
    try {
        const resposta = await fetch('/api/admin-controle-usuarios');
        const usuarios = await resposta.json();
        const tbody = document.getElementById('tabela-usuarios-body');
        
        if (!tbody) return;
        tbody.innerHTML = '';

        usuarios.forEach(user => {
            // O dono principal (id 1) não pode ser excluído pela interface
            let acoes = `<span style="color: #666; font-size: 0.8rem;"><i class="fa-solid fa-lock"></i> Protegido</span>`;
            
            if (user.id !== 1) {
                acoes = `
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

    if (!usuario || !senha) {
        return alert('Preencha o nome de usuário e a senha para adicionar.');
    }

    try {
        const resposta = await fetch('/api/admin-controle-usuarios', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario, senha, cargo: 'funcionario' })
        });

        const resultado = await resposta.json();

        if (!resposta.ok) throw new Error(resultado.erro || 'Erro ao adicionar funcionário');

        alert('Funcionário adicionado com sucesso!');
        
        // Limpa os campos após adicionar
        document.getElementById('novo-user').value = '';
        document.getElementById('nova-senha').value = '';
        
        // Atualiza a tabela na tela
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

/* ===================== RENDERIZAR GRÁFICOS ===================== */

// Variável global para armazenar as instâncias dos gráficos (evita sobreposição ao atualizar)
let graficos = {};

function renderizarGraficos(todosOsRegistros) {
    // Se não for dono, não desenha os gráficos
    if (cargo !== 'dono') return;

    // Função auxiliar para contar as ocorrências
    function contarOcorrencias(array, propriedade) {
        const contagem = {};
        array.forEach(item => {
            const valor = item[propriedade] || 'Não informado';
            contagem[valor] = (contagem[valor] || 0) + 1;
        });
        return {
            labels: Object.keys(contagem),
            data: Object.values(contagem)
        };
    }

    // Cores do tema da academia para os gráficos
    const cores = ['#ffd60a', '#3b82f6', '#ef4444', '#22c55e', '#a855f7', '#f97316'];
    const configuracaoBase = {
        plugins: {
            legend: { labels: { color: '#ffffff', font: { size: 11 } } }
        }
    };

    // Se os gráficos já existirem, destrói eles antes de criar os novos
    Object.values(graficos).forEach(grafico => grafico.destroy());

    // 1. Gráfico de Planos
    const dadosPlano = contarOcorrencias(todosOsRegistros, 'plano');
    graficos.planos = new Chart(document.getElementById('chartPlanos'), {
        type: 'pie',
        data: {
            labels: dadosPlano.labels,
            datasets: [{ data: dadosPlano.data, backgroundColor: cores, borderWidth: 1 }]
        },
        options: configuracaoBase
    });

    // 2. Gráfico de Unidades
    const dadosUnidade = contarOcorrencias(todosOsRegistros, 'unidade');
    graficos.unidades = new Chart(document.getElementById('chartUnidades'), {
        type: 'pie',
        data: {
            labels: dadosUnidade.labels,
            datasets: [{ data: dadosUnidade.data, backgroundColor: cores, borderWidth: 1 }]
        },
        options: configuracaoBase
    });

    // 3. Gráfico de Modalidades
    const dadosModalidade = contarOcorrencias(todosOsRegistros, 'modalidade');
    graficos.modalidades = new Chart(document.getElementById('chartModalidades'), {
        type: 'pie',
        data: {
            labels: dadosModalidade.labels,
            datasets: [{ data: dadosModalidade.data, backgroundColor: cores, borderWidth: 1 }]
        },
        options: configuracaoBase
    });

    // 4. Gráfico de Pagamentos
    const dadosPagamento = contarOcorrencias(todosOsRegistros, 'pagamento');
    graficos.pagamentos = new Chart(document.getElementById('chartPagamentos'), {
        type: 'pie',
        data: {
            labels: dadosPagamento.labels,
            datasets: [{ data: dadosPagamento.data, backgroundColor: cores, borderWidth: 1 }]
        },
        options: configuracaoBase
    });
}

// Carrega os dados assim que a página abre
document.addEventListener('DOMContentLoaded', carregarDados);